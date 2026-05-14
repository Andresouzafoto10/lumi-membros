# Posts Fixados Multi-Escopo — Design

**Data:** 2026-05-14
**Status:** Aprovado para implementação
**Stakeholder:** André (founder)

## Objetivo

Permitir que administradores fixem posts da comunidade em três destinos independentes — comunidade específica, feed global e sidebar direita ("Mais curtidos do mês") — para destacar conteúdo relevante para os alunos.

## Contexto atual

O modelo atual suporta apenas **1 post fixado por comunidade**, via campo `communities.pinned_post_id`. Não há pin para o feed global nem curadoria manual da sidebar de "Mais curtidos". A sidebar é 100% automática (top 3 por likes).

## Decisões de produto

| Decisão | Escolha |
|--------|---------|
| Tipo de fixação | Post existente (não anúncio dedicado) |
| Escopos | Comunidade + Feed global + Sidebar (3 destinos independentes) |
| Limite por escopo | Máximo 3 pins |
| Ordenação | Mais recente fixado primeiro (`pinned_at DESC`) |
| Sidebar | Admin pins acima, auto-top (por likes) preenche restante até 3 |
| Permissão | `isAdmin` (owner / admin / support / moderator) |
| UX de fixar | Menu `...` no PostCard → modal com checkboxes de destino |
| Visual | Badge discreto "Fixado" + ícone Pin no topo do card |
| Pin cross-community | Aluno sem acesso à comunidade origem vê o post fixado no feed |

## Arquitetura

### Schema (Supabase PostgreSQL)

```sql
CREATE TYPE pin_scope AS ENUM ('community', 'feed', 'sidebar');

CREATE TABLE pinned_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  scope pin_scope NOT NULL,
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  pinned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT scope_community_consistency CHECK (
    (scope = 'community' AND community_id IS NOT NULL) OR
    (scope IN ('feed', 'sidebar') AND community_id IS NULL)
  )
);

CREATE UNIQUE INDEX pinned_posts_unique
  ON pinned_posts (post_id, scope, COALESCE(community_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX pinned_posts_scope_idx ON pinned_posts (scope, pinned_at DESC);
CREATE INDEX pinned_posts_community_idx ON pinned_posts (community_id, pinned_at DESC)
  WHERE community_id IS NOT NULL;
```

**Limite de 3 por escopo** — enforçado por trigger:

```sql
CREATE OR REPLACE FUNCTION enforce_pinned_posts_limit()
RETURNS trigger AS $$
DECLARE
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM pinned_posts
  WHERE scope = NEW.scope
    AND community_id IS NOT DISTINCT FROM NEW.community_id;
  IF cnt >= 3 THEN
    RAISE EXCEPTION 'Limite de 3 posts fixados por destino' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_pinned_posts_limit_trg
  BEFORE INSERT ON pinned_posts
  FOR EACH ROW EXECUTE FUNCTION enforce_pinned_posts_limit();
```

### RLS

```sql
ALTER TABLE pinned_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pinned_posts_select_authenticated" ON pinned_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pinned_posts_admin_write" ON pinned_posts
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());
```

`is_admin_user()` hoje cobre owner/admin/support. A decisão é incluir moderator também, então adicionar policy adicional:

```sql
CREATE POLICY "pinned_posts_moderator_write" ON pinned_posts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'moderator'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'moderator'));
```

Frontend usa `useAuth().isAdmin` (já retorna `true` para os 4 roles) para condicional do menu "Fixar".

### Migration de dados existentes

```sql
INSERT INTO pinned_posts (post_id, scope, community_id, pinned_at, pinned_by)
SELECT
  c.pinned_post_id,
  'community'::pin_scope,
  c.id,
  COALESCE(c.updated_at, now()),
  (SELECT id FROM profiles WHERE role = 'owner' LIMIT 1)
FROM communities c
WHERE c.pinned_post_id IS NOT NULL;

ALTER TABLE communities DROP COLUMN pinned_post_id;
```

Atualizar `supabase/migrations/001_initial_schema.sql` para refletir o novo estado.

## Frontend

### Tipos (`src/types/student.ts`)

```ts
export type PinScope = 'community' | 'feed' | 'sidebar';

export interface PinnedPost {
  id: string;
  postId: string;
  scope: PinScope;
  communityId: string | null;
  pinnedAt: string;
  pinnedBy: string;
}
```

Remover `pinnedPostId` da interface `Community`.

### Hook `src/hooks/usePinnedPosts.ts` (novo)

API:
- `pinnedByScope(scope, communityId?)` → `PinnedPost[]` ordenado `pinned_at DESC`
- `pinPost({ postId, scope, communityId? })` → mutation
- `unpinPost({ pinId })` → mutation
- `isPinned(postId, scope, communityId?)` → `boolean`
- `getPinDestinations(postId)` → `{ community: boolean, feed: boolean, sidebar: boolean }`

React Query: fetch único de todas as rows (dataset pequeno — máx 3 × N comunidades + 3 + 3). Invalidação após mutation.

### Hook `useCommunities` (atualizar)

- Remover field `pinnedPostId` do retorno
- Remover métodos `pinPost`/`unpinPost` (movidos para `usePinnedPosts`)

### Componente `PostCard` (atualizar)

- Adicionar menu `DropdownMenu` no header do card, visível só se `isAdmin`
- Item "📌 Fixar..." abre `PinPostDialog`
- Adicionar `<PinBadge />` quando `isPinned` no escopo da página atual
  ```tsx
  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary/70">
    <Pin className="h-3 w-3" /> Fixado
  </div>
  ```
  Renderizado acima do nome do autor.

### Componente `PinPostDialog` (novo, `src/components/community/`)

```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>Fixar publicação</DialogHeader>
    <Checkbox checked={inCommunity} disabled={!post.communityId}>
      Fixar nesta comunidade
    </Checkbox>
    <Checkbox checked={inFeed}>Fixar no feed global</Checkbox>
    <Checkbox checked={inSidebar}>Destacar na sidebar (mais curtidos)</Checkbox>
    <p className="text-xs text-muted-foreground">
      Máximo 3 fixados por destino. Os mais recentes aparecem primeiro.
    </p>
    <Button onClick={save}>Salvar</Button>
  </DialogContent>
</Dialog>
```

- Initial state = `getPinDestinations(post.id)`
- Save: diff de checkboxes → `pinPost` para destinos adicionados, `unpinPost` para removidos
- Erro de limite (trigger BD) → toast: "Limite de 3 fixados atingido neste destino. Desafixe um antes."

### Página `CommunityPage` (`src/pages/student/CommunityPage.tsx`)

Substituir:
```ts
const pinnedPost = community?.pinnedPostId ? findPost(community.pinnedPostId) : null;
```
por:
```ts
const pinnedRows = pinnedByScope('community', community.id);
const pinnedPosts = pinnedRows.map(r => findPost(r.postId)).filter(Boolean);
const pinnedIds = new Set(pinnedPosts.map(p => p.id));
const regularPosts = communityPosts.filter(p => !pinnedIds.has(p.id));
```

Render `pinnedPosts.map(...)` no topo antes de `regularPosts`.

### Página `CommunityFeedPage` (`src/pages/student/CommunityFeedPage.tsx`)

Adicionar:
```ts
const feedPins = pinnedByScope('feed');
const pinnedPosts = feedPins.map(r => findPost(r.postId)).filter(Boolean);
const pinnedIds = new Set(pinnedPosts.map(p => p.id));
const regularPosts = posts.filter(p => !pinnedIds.has(p.id));
```

Render pins no topo antes do feed.

### Layout `CommunityLayout` (sidebar direita)

Substituir lógica de `topPosts`:

```ts
const sidebarPins = pinnedByScope('sidebar');
const autoTopPosts = getTopPosts(communityIds, 3);

const pinnedIds = new Set(sidebarPins.map(p => p.postId));
const fillCount = Math.max(0, 3 - sidebarPins.length);
const autoFill = autoTopPosts
  .filter(p => !pinnedIds.has(p.id))
  .slice(0, fillCount);

const finalList = [
  ...sidebarPins.map(p => ({ post: findPost(p.postId), pinned: true })),
  ...autoFill.map(p => ({ post: p, pinned: false }))
];
```

Render:
- Pins primeiro, com ícone `Pin` substituindo o número de ranking
- Auto-top abaixo, com ranking numérico começando do primeiro auto-fill
- Título da seção mantém "Mais curtidos do mês"
- Se ambas as listas vazias, esconde seção

## Edge cases

- **Post deletado** → `ON DELETE CASCADE` remove pins automaticamente
- **Comunidade deletada** → cascade remove pins de scope='community'; pins de feed/sidebar de posts dessa comunidade também caem via cascade no `post_id`
- **Pin de post `pending`/`rejected`** → admin pode fixar, mas RLS de `community_posts` esconde para usuários não-admin → pin "some" naturalmente
- **Tentar fixar 4º post no mesmo escopo** → trigger rejeita, frontend mostra toast
- **Aluno sem acesso à comunidade origem de pin no feed** → vê o post (RLS de `community_posts` permite SELECT em `published`); click "ver na comunidade" leva ao locked state já tratado pelo `CommunityLayout`

## Não-objetivos

- Anúncios dedicados (texto/banner separado dos posts)
- Pin temporário com expiração automática
- Drag-and-drop para reordenar pins
- Painel admin separado para gerenciar pins em massa
- Notificação aos alunos quando algo é fixado

## Arquivos afetados

**Novos:**
- `src/hooks/usePinnedPosts.ts`
- `src/components/community/PinPostDialog.tsx`
- Migration SQL (aplicada via Supabase SQL Editor)

**Modificados:**
- `src/types/student.ts` (adicionar `PinnedPost`, `PinScope`; remover `pinnedPostId` de `Community`)
- `src/hooks/useCommunities.ts` (remover pin methods/fields)
- `src/hooks/usePosts.ts` (se necessário, ajustar `getTopPosts` para compatibilidade)
- `src/components/community/PostCard.tsx` (menu admin + badge)
- `src/pages/student/CommunityPage.tsx` (multi-pin render)
- `src/pages/student/CommunityFeedPage.tsx` (feed pins render)
- `src/components/layout/CommunityLayout.tsx` (sidebar pins + auto-fill)
- `src/lib/database.types.ts` (regenerar após migration)
- `supabase/migrations/001_initial_schema.sql` (sincronizar)
- `CLAUDE.md` (documentar tabela nova + hook)
