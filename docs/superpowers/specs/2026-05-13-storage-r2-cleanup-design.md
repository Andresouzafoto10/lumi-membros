# Storage R2 Cleanup — Design

**Date:** 2026-05-13
**Author:** Lumi-CEO + Dev (Andre)
**Status:** Approved (architecture); awaiting plan write-out

## Goal

Eliminar Supabase Storage do projeto Lumi Membros. Todo upload, leitura, signed URL e download de mídia/arquivos passa a ocorrer exclusivamente em Cloudflare R2 (bucket `lumi-membros`).

## Context

Auditoria executada em 2026-05-13 sobre o projeto `gdbkbeurjjtjgmrmfngk`:

- 14 buckets em `storage.buckets`, todos públicos
- 6 arquivos órfãos em 3 buckets:
  - `home-covers/` (3 arquivos JPG, ~2.66 MB)
  - `thumbnails/certificates/` (2 arquivos JPG, ~362 KB)
  - `lesson-materials/` (1 PNG, ~68 KB)
- **0 rows** no DB referenciam `supabase.co/storage` em colunas obviamente associadas (avatar_url, cover_url, banner_url, image_url, icon_url, file_path, logo_url, background_url)
- **0 hits** em busca text/jsonb (community_posts.body/images/attachments, post_comments.body, lesson_comments.body, course_lessons.description/materials, platform_settings.theme, certificate_templates.blocks, profiles.bio)
- Frontend: nenhum upload aponta para Supabase Storage; tudo passa por `useR2Upload` → `r2-presigned` Edge Function
- Edge Function `download-material`: contém branches que chamam `supabase.storage.from("lesson-materials").download()` e `.createSignedUrl()`. Caminho dormente — único `lesson_materials` ativo já tem `file_path` apontando R2.
- Migration `001_initial_schema.sql` cria o bucket `lesson-materials` (linhas 1235-1259) com duas RLS policies (admin insert + admin delete).

Conclusão: não há migração de dados em produção. Trata-se de limpeza de:
1. arquivos órfãos (não referenciados)
2. dead code path em Edge Function
3. infraestrutura residual de bucket + policies

## Non-Goals

- Trocar `image-proxy` Edge Function (continua proxiando R2)
- Tocar em `r2-presigned` (já é R2-only)
- Re-migrar arquivos já em R2

## Architecture

Cinco fases sequenciais com checkpoint humano entre cada uma.

### Phase 1 — Backup orfãos para R2 `legacy/`

Script local em `lumi-membros/scripts/migrate-supabase-storage.mjs`. Lê `.env` do projeto. Para cada uma das 6 chaves em `storage.objects`:

1. `supabase.storage.from(bucket).download(path)` via service role
2. SHA-256 checksum do buffer
3. `PutObjectCommand` no R2 (`@aws-sdk/client-s3`) na chave `legacy/<bucket>/<path>`
4. `HeadObjectCommand` no R2 confirma 200 + tamanho correspondente
5. Append linha em `lumi-membros/scripts/migration-manifest.json`:
   ```json
   {
     "source": { "bucket": "...", "path": "...", "size": 123, "sha256": "..." },
     "destination": { "bucket": "lumi-membros", "key": "legacy/...", "publicUrl": "https://..." },
     "migrated_at": "2026-05-13T..."
   }
   ```

Falha em qualquer arquivo aborta a fase. Manifest commitado em git. Nada é deletado de Supabase.

**Reversível:** sim. Refazer = re-rodar script.

### Phase 2 — Rewrite `download-material` Edge Function para R2-only

Substituir o bloco em `supabase/functions/download-material/index.ts:103-174`:

- Remove: `supabase.storage.from("lesson-materials").download(material.file_path)`
- Remove: `supabase.storage.from("lesson-materials").createSignedUrl(material.file_path, 60)`
- Novo fluxo:
  - `material.file_path` é sempre URL R2 pública (validar com `URL` constructor; rejeitar se não for `https://...`)
  - Se `isPdf && material.drm_enabled`:
    - `fetch(material.file_path)` → `ArrayBuffer`
    - watermark via `pdf-lib` (lógica existente intacta)
    - retornar bytes
  - Senão:
    - `return Response.redirect(material.file_path, 302)` (R2 já é público; não precisa signed URL)

Deploy via `mcp__supabase__deploy_edge_function`.

Smoke test obrigatório antes de seguir:
- Material PDF com DRM ON: download retorna PDF com watermark
- Material não-PDF: 302 redirect funciona no browser

**Reversível:** redeploy versão antiga via git history.

### Phase 3 — Migration SQL removendo bucket + policies

Criar `supabase/migrations/002_remove_supabase_storage.sql`:

```sql
-- Remove RLS policies do bucket lesson-materials
DROP POLICY IF EXISTS "Admins can upload lesson materials" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete lesson materials" ON storage.objects;

-- (buckets em si serão removidos na Fase 4, após confirmação de Phase 2)
```

Aplicar via `mcp__supabase__apply_migration`. Atualizar `001_initial_schema.sql` removendo o bloco `INSERT INTO storage.buckets` + as duas policies (mantém sync com a realidade do banco).

### Phase 4 — Delete buckets + objects Supabase

Via SQL:
```sql
DELETE FROM storage.objects;  -- 6 rows órfãos
DELETE FROM storage.buckets;  -- 14 buckets
```

(Não há mais nada que dependa deles. Backup completo em R2 `legacy/`.)

### Phase 5 — Validação + docs

1. Smoke test manual no app rodando local (`npm run dev`):
   - Upload avatar (cover na perfil) → confirma URL R2
   - Upload material em lição admin → confirma URL R2
   - Download material com DRM → confirma watermark
2. Update `CLAUDE.md`:
   - Seção "Storage": remover linha "Supabase Storage (legacy) — Bucket `lesson-materials`..." 
   - Substituir por: "Storage exclusivamente em Cloudflare R2. Bucket `lumi-membros`. Backup histórico de órfãos em prefix `legacy/`."
   - Seção Edge Functions → `download-material`: remover menção "Supabase Storage" do parágrafo
3. Commit final:
   - `scripts/migrate-supabase-storage.mjs`
   - `scripts/migration-manifest.json`
   - `supabase/functions/download-material/index.ts` (R2-only)
   - `supabase/migrations/001_initial_schema.sql` (sem bucket lesson-materials)
   - `supabase/migrations/002_remove_supabase_storage.sql`
   - `CLAUDE.md`

## Data Flow

### Antes
```
Lesson Material download
  → frontend chama download-material EF
  → EF baixa de supabase.storage.from("lesson-materials")
  → EF watermark / redirect signed URL
```

### Depois
```
Lesson Material download
  → frontend chama download-material EF
  → EF fetch da URL R2 pública (material.file_path)
  → EF watermark (se DRM) ou 302 redirect direto
```

Upload e demais paths (avatar, cover, banner, post media, certificate background) já são R2-only via `r2-presigned` + `useR2Upload`. Nada muda neles.

## Testing Strategy

- **Phase 1:** script verifica HEAD R2 = 200 para cada arquivo migrado; checksum buffer = checksum subida
- **Phase 2:** smoke test manual de download com DRM (visual inspection do watermark)
- **Phase 3:** `apply_migration` retorna sucesso; `\d storage.buckets` confirma policies removidas
- **Phase 4:** `SELECT count(*) FROM storage.objects` = 0; `SELECT count(*) FROM storage.buckets` = 0
- **Phase 5:** smoke test upload + render dos 3 tipos críticos (avatar, banner, material)

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Row escondido apontando URL órfã | Baixa (auditado) | Baixo | Backup em R2 `legacy/` permite restaurar a qualquer momento |
| download-material quebra após rewrite | Média | Médio | Smoke test antes Phase 3; redeploy reverte |
| URL R2 pública não-cacheada falha em fetch dentro da EF | Baixa | Médio | Test fetch da EF antes de Phase 4 (CORS e CF rate limits) |
| Migration 002 falha por policy renomeada | Baixa | Baixo | `DROP POLICY IF EXISTS` é idempotente |
| `pdf-lib` mudança de comportamento ao receber buffer via fetch (vs `.download()`) | Baixa | Médio | Mesma estrutura de bytes; smoke test confirma |

## Open Questions

Nenhuma. Auditoria fechou o escopo.

## Approval Log

- Phase 1-5 architecture: **approved 2026-05-13**
- Spec doc review: **pending**
