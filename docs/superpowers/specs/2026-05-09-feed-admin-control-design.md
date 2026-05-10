# Controle Admin do Feed da Comunidade — Design

**Date:** 2026-05-09
**Status:** Approved
**Owner:** Lumi Membros

## Problem

Hoje o feed global da comunidade (`/comunidade/feed`) não tem controle administrativo. Admin não consegue:

1. Adicionar uma capa visual no topo do feed (como já existe em comunidades individuais).
2. Desativar visibilidade do feed para alunos comuns (sem desativar todas as comunidades).

## Goals

- Admin gerencia capa do feed via upload de imagem (R2).
- Admin liga/desliga visibilidade do feed para alunos.
- Admin/owner sempre vê o feed (bypass), mesmo desativado, para gerenciar conteúdo.
- Mudança reflete imediatamente na sidebar e na página do feed.

## Non-Goals

- Não há feeds múltiplos por turma — escopo é o feed global.
- Não há agendamento (ativar em data específica) — toggle imediato.
- Não há posicionamento custom da capa (`object-position`) — `object-cover` fixo, igual `CommunityPage`.
- Não substitui a config por comunidade individual; só atua sobre o feed agregado.

## Architecture

Estende a tabela única `platform_settings` com 2 colunas. Hook `usePlatformSettings` ganha 2 campos. Admin UI = nova aba "Feed" em `/admin/comunidade`. Aluno UI = banner condicional no topo de `CommunityFeedPage` + gating de visibilidade na sidebar e na rota.

### Database

Tabela: `platform_settings` (linha existente `id='default'`).

Colunas novas:

| Coluna | Tipo | Default | Notes |
|--------|------|---------|-------|
| `feed_cover_url` | TEXT | NULL | URL pública R2; NULL/vazio = sem banner |
| `feed_enabled` | BOOLEAN NOT NULL | TRUE | Visibilidade do feed para alunos |

Migração precisa aplicar default no row existente (`UPDATE platform_settings SET feed_enabled = TRUE WHERE id = 'default'` é redundante por causa do NOT NULL DEFAULT, mas explicit).

Aplicar via SQL Editor (MCP não acessa o projeto). Atualizar `supabase/migrations/001_initial_schema.sql` para manter sincronizado.

### Types + Hook (`src/hooks/usePlatformSettings.ts`)

`PlatformSettings` ganha:

```ts
feedCoverUrl: string;   // "" quando não setado
feedEnabled: boolean;
```

Defaults:

```ts
feedCoverUrl: "",
feedEnabled: true,
```

Mapeamento DB → camelCase em load. Mapeamento camelCase → DB em update (mesmo padrão de `logoUrl`/`ratingsEnabled`).

`src/lib/database.types.ts` recebe os 2 campos no Row/Insert/Update de `platform_settings`.

### Admin UI (`src/pages/admin/AdminCommunitiesPage.tsx`)

Adiciona nova aba `feed`:

```tsx
<TabsList>
  <TabsTrigger value="communities">Comunidades</TabsTrigger>
  <TabsTrigger value="sidebar">Organizar Sidebar</TabsTrigger>
  <TabsTrigger value="feed">Feed</TabsTrigger>
</TabsList>
```

Componente `FeedSettingsTab` dentro do mesmo arquivo:

- **Card "Visibilidade do feed"**
  - Switch ligado a `feedEnabled`
  - Helper: "Quando desativado, alunos não veem o feed na sidebar nem podem acessar a página. Administradores continuam vendo."
  - Label de status: `Ativo` / `Desativado`

- **Card "Capa do feed"**
  - `FileUpload` (`folder="communities/covers"`, `imagePreset="cover"`, `aspectRatio={16/6}`, `allowUrl`, `accept="image/*"`, `maxSizeMB={5}`)
  - Label: "Imagem de capa do feed (opcional)"
  - Helper: "Aparece no topo da página /comunidade/feed. Recomendado 1920×720."
  - Persistência: `value={feedCoverUrl}`, `onChange={url => updateSettings({ feedCoverUrl: url })}`. Auto-save por campo (mesmo padrão dos outros settings da página).

Não usa botão Save explícito; cada controle salva via mutation do hook (consistente com `AdminSettingsPage`).

### Student UI (`src/pages/student/CommunityFeedPage.tsx`)

Inicio do componente:

```ts
const { settings } = usePlatformSettings();
const { isAdmin } = useAuth();
```

**Bloqueio de acesso:**

Se `!settings.feedEnabled && !isAdmin`:

```tsx
return (
  <div className="max-w-2xl mx-auto px-4 py-12">
    <EmptyState
      icon={Lock}
      title="Feed indisponível"
      description="O feed da comunidade está temporariamente desativado."
    />
  </div>
);
```

**Banner de capa (admin + aluno quando ativo):**

Renderizar antes do header (h1 "Feed") quando `settings.feedCoverUrl` não é vazio:

```tsx
{settings.feedCoverUrl && (
  <div className="-mx-4 sm:mx-0 mb-4">
    <img
      src={getProxiedImageUrl(settings.feedCoverUrl)}
      alt=""
      className="w-full h-[120px] sm:h-[200px] object-cover sm:rounded-xl"
    />
  </div>
)}
```

**Indicador para admin quando feed off:**

Quando `isAdmin && !settings.feedEnabled`:

```tsx
<Badge variant="outline" className="border-amber-500/30 text-amber-600">
  Desativado para alunos
</Badge>
```

(posicionada ao lado do `<h1>Feed</h1>`)

### Sidebar (`src/components/layout/CommunityLayout.tsx`)

```ts
const { settings } = usePlatformSettings();
const { isAdmin } = useAuth();
const showFeedNav = settings.feedEnabled || isAdmin;
```

Esconde o link "Feed" quando `!showFeedNav`. Quando admin com feed off, opcionalmente acrescenta um pequeno indicador (ex: ponto âmbar ao lado do label) — escopo final: só `EyeOff` ícone à direita do label, classe `text-amber-500/70 h-3.5 w-3.5`.

A redireção em `/comunidade` para `/comunidade/feed` (existente em `App.tsx`) continua funcionando para admin. Alunos atingindo a rota direta caem no EmptyState do componente.

## Data Flow

```
Admin altera Switch / Upload
   ↓
usePlatformSettings.updateSettings({ feedEnabled?, feedCoverUrl? })
   ↓
Supabase UPDATE platform_settings SET ... WHERE id='default'
   ↓
React Query invalidate ['platform-settings']
   ↓
CommunityLayout + CommunityFeedPage re-render
   ↓
Sidebar oculta/exibe link, página exibe banner ou EmptyState
```

## Edge Cases

- **Linha `platform_settings` ainda sem o campo após migração:** mapper retorna defaults (`feedEnabled: true`, `feedCoverUrl: ""`).
- **Cover trocada:** `FileUpload` já chama `deleteFromR2` no `previousUrl`. URL vazia limpa o banner.
- **Aluno em `/comunidade/feed` quando admin desativa:** próximo invalidate da query renderiza EmptyState. Sem refresh manual necessário (React Query invalida via mutation).
- **R2 indisponível durante upload:** `FileUpload` já trata erro com toast.
- **Admin desativa feed e item da sidebar some pra ele também:** não acontece — admin sempre vê.

## Files Touched

- `supabase/migrations/001_initial_schema.sql` — adicionar colunas no schema canônico
- `src/lib/database.types.ts` — Row/Insert/Update de `platform_settings`
- `src/hooks/usePlatformSettings.ts` — campos novos + mapeamento
- `src/pages/admin/AdminCommunitiesPage.tsx` — nova aba `feed` + componente `FeedSettingsTab`
- `src/pages/student/CommunityFeedPage.tsx` — banner condicional + gate
- `src/components/layout/CommunityLayout.tsx` — esconder/mostrar link Feed

## Testing

Manual (não há suíte de testes automatizada no projeto):

1. **Migração:** rodar SQL no dashboard, conferir colunas `feed_cover_url` e `feed_enabled` em `platform_settings`.
2. **Admin upload capa:** `/admin/comunidade` → aba "Feed" → upload imagem → verificar `feed_cover_url` setado e banner aparece em `/comunidade/feed`.
3. **Admin troca capa:** confirmar arquivo antigo deletado do R2.
4. **Admin remove capa:** banner some no feed.
5. **Admin desativa feed:** abrir `/comunidade/feed` em outra aba como aluno → confirma EmptyState; sidebar não mostra link Feed.
6. **Admin com feed off:** ainda vê o feed e o banner "Desativado para alunos".
7. **Aluno tenta acessar `/comunidade/feed` direto com URL:** EmptyState renderiza, sem 404.
8. **Reativar feed:** aluno vê novamente sem precisar relogar (apenas refresh).

## Out of Scope

- Permissão granular por role (moderator vs admin) — usa `isAdmin` existente que cobre owner/admin/support/moderator.
- Customização de mensagem do EmptyState quando feed off.
- Histórico de quem alterou config (audit log).
