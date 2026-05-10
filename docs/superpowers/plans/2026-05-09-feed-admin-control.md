# Controle Admin do Feed da Comunidade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que admin controle visibilidade do feed global (`/comunidade/feed`) e adicione uma capa visual no topo, persistindo configs em `platform_settings`.

**Architecture:** Estende a tabela `platform_settings` (linha única `id='default'`) com 2 colunas (`feed_cover_url`, `feed_enabled`). Hook `usePlatformSettings` mapeia campos novos. Admin UI ganha aba "Feed" em `/admin/comunidade`. Aluno UI condiciona banner de capa e gating de acesso por `isAdmin`.

**Tech Stack:** Vite + React 18 + TS, Supabase Postgres, React Query, Tailwind, Radix/shadcn UI, Cloudflare R2 (FileUpload existente), `usePlatformSettings` hook, `useAuth` (AuthContext).

**Repo notes:**
- Working dir: `lumi-membros/`
- Não há suíte de testes automatizada — verificação é via `npm run build` + `npm run lint` + smoke manual no browser.
- Supabase project ID: `gdbkbeurjjtjgmrmfngk`. MCP não acessa esse project. SQL precisa rodar no SQL Editor do dashboard ou via curl com `SUPABASE_SERVICE_ROLE_KEY`.

---

## File Structure

| Arquivo | Mudança | Responsabilidade |
|---------|---------|------------------|
| `lumi-membros/supabase/migrations/001_initial_schema.sql` | Modificar | Adicionar colunas `feed_cover_url`, `feed_enabled` no `CREATE TABLE platform_settings` |
| `lumi-membros/src/lib/database.types.ts` | Modificar | Adicionar campos no Row/Insert/Update de `platform_settings` |
| `lumi-membros/src/types/student.ts` | Modificar | Adicionar `feedCoverUrl` e `feedEnabled` em `PlatformSettings` |
| `lumi-membros/src/hooks/usePlatformSettings.ts` | Modificar | Defaults, fetch mapping, updateSettings mapping |
| `lumi-membros/src/pages/admin/AdminCommunitiesPage.tsx` | Modificar | Nova aba `feed` + componente `FeedSettingsTab` |
| `lumi-membros/src/pages/student/CommunityFeedPage.tsx` | Modificar | Banner condicional + gate acesso + badge admin |
| `lumi-membros/src/components/layout/CommunityLayout.tsx` | Modificar | Esconder/mostrar link Feed conforme `feedEnabled`/`isAdmin` |

---

## Task 1: Aplicar migração no Supabase + sincronizar SQL canônico

**Files:**
- Modify: `lumi-membros/supabase/migrations/001_initial_schema.sql:805-815`
- Run: SQL no Supabase SQL Editor (project `gdbkbeurjjtjgmrmfngk`)

- [ ] **Step 1: Rodar SQL de migração no dashboard**

Acesse https://supabase.com/dashboard/project/gdbkbeurjjtjgmrmfngk/sql e execute:

```sql
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS feed_cover_url text,
  ADD COLUMN IF NOT EXISTS feed_enabled boolean NOT NULL DEFAULT true;
```

Expected: `Success. No rows returned`. Confirma colunas via:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'platform_settings'
  AND column_name IN ('feed_cover_url','feed_enabled');
```

Expected: 2 linhas — `feed_cover_url text YES NULL` e `feed_enabled boolean NO true`.

- [ ] **Step 2: Sincronizar `001_initial_schema.sql`**

Edite o bloco `create table if not exists public.platform_settings` para adicionar as 2 colunas antes de `updated_at`:

```sql
create table if not exists public.platform_settings (
  id                          text primary key default 'default',
  name                        text not null default 'Lumi Membros',
  logo_url                    text not null default '',
  default_theme               text not null default 'dark',
  ratings_enabled             boolean not null default true,
  certificate_background_url  text not null default '',
  certificate_default_text    text not null default '',
  theme                       jsonb not null default '{}'::jsonb,
  feed_cover_url              text,
  feed_enabled                boolean not null default true,
  updated_at                  timestamptz not null default now()
);
```

- [ ] **Step 3: Commit**

```bash
git add lumi-membros/supabase/migrations/001_initial_schema.sql
git commit -m "feat(db): add feed_cover_url and feed_enabled to platform_settings"
```

---

## Task 2: Adicionar campos no `database.types.ts`

**Files:**
- Modify: `lumi-membros/src/lib/database.types.ts:715-773`

- [ ] **Step 1: Adicionar 2 campos no `Row`, `Insert` e `Update` de `platform_settings`**

Localizar o bloco `platform_settings: { Row: { ... } }` e inserir após `pwa_background_color`:

```ts
platform_settings: {
  Row: {
    id: string;
    name: string;
    logo_url: string;
    default_theme: string;
    ratings_enabled: boolean;
    certificate_background_url: string;
    certificate_default_text: string;
    theme: Json;
    updated_at: string;
    favicon_url: string | null;
    logo_upload_url: string | null;
    pwa_enabled: boolean;
    pwa_name: string | null;
    pwa_short_name: string | null;
    pwa_icon_url: string | null;
    pwa_theme_color: string | null;
    pwa_background_color: string | null;
    feed_cover_url: string | null;
    feed_enabled: boolean;
  };
  Insert: {
    id?: string;
    name?: string;
    logo_url?: string;
    default_theme?: string;
    ratings_enabled?: boolean;
    certificate_background_url?: string;
    certificate_default_text?: string;
    theme?: Json;
    updated_at?: string;
    favicon_url?: string | null;
    logo_upload_url?: string | null;
    pwa_enabled?: boolean;
    pwa_name?: string | null;
    pwa_short_name?: string | null;
    pwa_icon_url?: string | null;
    pwa_theme_color?: string | null;
    pwa_background_color?: string | null;
    feed_cover_url?: string | null;
    feed_enabled?: boolean;
  };
  Update: {
    id?: string;
    name?: string;
    logo_url?: string;
    default_theme?: string;
    ratings_enabled?: boolean;
    certificate_background_url?: string;
    certificate_default_text?: string;
    theme?: Json;
    updated_at?: string;
    favicon_url?: string | null;
    logo_upload_url?: string | null;
    pwa_enabled?: boolean;
    pwa_name?: string | null;
    pwa_short_name?: string | null;
    pwa_icon_url?: string | null;
    pwa_theme_color?: string | null;
    pwa_background_color?: string | null;
    feed_cover_url?: string | null;
    feed_enabled?: boolean;
  };
};
```

(O `login_cover_url` e `show_my_courses` que aparecem no hook mas faltam no `database.types.ts` ficam fora deste escopo; não criar refactor extra.)

- [ ] **Step 2: Build pra confirmar tipos**

Run: `cd lumi-membros && npm run build`
Expected: build OK, sem erros TS.

- [ ] **Step 3: Commit**

```bash
git add lumi-membros/src/lib/database.types.ts
git commit -m "feat(types): add feed fields to platform_settings db types"
```

---

## Task 3: Estender `PlatformSettings` type

**Files:**
- Modify: `lumi-membros/src/types/student.ts:85-107`

- [ ] **Step 1: Adicionar 2 campos no type**

Localizar `export type PlatformSettings = { ... }` e inserir após `loginCoverUrl` (antes de `showMyCourses`):

```ts
export type PlatformSettings = {
  name: string;
  logoUrl: string;
  defaultTheme: "dark" | "light";
  ratingsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  certificateBackgroundUrl: string;
  certificateDefaultText: string;
  theme: {
    dark: ThemeColors;
    light: ThemeColors;
  };
  faviconUrl?: string | null;
  logoUploadUrl?: string | null;
  pwaEnabled?: boolean;
  pwaName?: string | null;
  pwaShortName?: string | null;
  pwaIconUrl?: string | null;
  pwaThemeColor?: string | null;
  pwaBackgroundColor?: string | null;
  loginCoverUrl?: string | null;
  feedCoverUrl: string;
  feedEnabled: boolean;
  showMyCourses?: boolean;
};
```

`feedCoverUrl` é `string` (não opcional, default `""`) e `feedEnabled` é `boolean` não opcional, pra simplificar consumo no UI sem checks de undefined.

- [ ] **Step 2: Commit**

```bash
git add lumi-membros/src/types/student.ts
git commit -m "feat(types): add feedCoverUrl and feedEnabled to PlatformSettings"
```

---

## Task 4: Estender `usePlatformSettings` hook

**Files:**
- Modify: `lumi-membros/src/hooks/usePlatformSettings.ts:6-30, 87-108, 130-158`

- [ ] **Step 1: Adicionar campos no `DEFAULT_SETTINGS`**

Localizar `const DEFAULT_SETTINGS: PlatformSettings = { ... };` e adicionar antes de `theme`:

```ts
const DEFAULT_SETTINGS: PlatformSettings = {
  name: "Master Membros",
  logoUrl: "",
  defaultTheme: "dark",
  ratingsEnabled: true,
  emailNotificationsEnabled: true,
  showMyCourses: true,
  certificateBackgroundUrl: "",
  certificateDefaultText:
    "Certificamos que {{nome}} concluiu com êxito o curso {{curso}}, com carga horária de {{horas}} horas.",
  feedCoverUrl: "",
  feedEnabled: true,
  theme: {
    dark: {
      primary: "#ff7b00",
      background: "#09090b",
      card: "#18181b",
      foreground: "#fafafa",
    },
    light: {
      primary: "#ff7b00",
      background: "#ffffff",
      card: "#f4f4f5",
      foreground: "#09090b",
    },
  },
};
```

- [ ] **Step 2: Adicionar mapping no `fetchSettings`**

Localizar o `return { name: ..., showMyCourses: ... };` no final de `fetchSettings` e inserir antes de `showMyCourses`:

```ts
return {
  name: (data.name as string) ?? DEFAULT_SETTINGS.name,
  logoUrl: (data.logo_url as string) ?? "",
  defaultTheme: (data.default_theme as "dark" | "light") ?? "dark",
  ratingsEnabled: (data.ratings_enabled as boolean) ?? true,
  emailNotificationsEnabled: (data.email_notifications_enabled as boolean) ?? true,
  certificateBackgroundUrl: (data.certificate_background_url as string) ?? "",
  certificateDefaultText:
    (data.certificate_default_text as string) ??
    DEFAULT_SETTINGS.certificateDefaultText,
  theme: mergeTheme(data.theme),
  faviconUrl: (data.favicon_url as string) ?? null,
  logoUploadUrl: (data.logo_upload_url as string) ?? null,
  pwaEnabled: (data.pwa_enabled as boolean) ?? false,
  pwaName: (data.pwa_name as string) ?? null,
  pwaShortName: (data.pwa_short_name as string) ?? null,
  pwaIconUrl: (data.pwa_icon_url as string) ?? null,
  pwaThemeColor: (data.pwa_theme_color as string) ?? null,
  pwaBackgroundColor: (data.pwa_background_color as string) ?? null,
  loginCoverUrl: (data.login_cover_url as string) ?? null,
  feedCoverUrl: (data.feed_cover_url as string | null) ?? "",
  feedEnabled: (data.feed_enabled as boolean | null) ?? true,
  showMyCourses: (data.show_my_courses as boolean | null) ?? true,
};
```

- [ ] **Step 3: Adicionar mapping no `updateSettings`**

Localizar o bloco de `if (patch.X !== undefined) dbPatch.x = patch.X;` em `updateSettings` e adicionar antes de `showMyCourses`:

```ts
if (patch.loginCoverUrl !== undefined) dbPatch.login_cover_url = patch.loginCoverUrl;
if (patch.feedCoverUrl !== undefined) dbPatch.feed_cover_url = patch.feedCoverUrl;
if (patch.feedEnabled !== undefined) dbPatch.feed_enabled = patch.feedEnabled;
if (patch.showMyCourses !== undefined) dbPatch.show_my_courses = patch.showMyCourses;
```

- [ ] **Step 4: Build pra validar**

Run: `cd lumi-membros && npm run build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add lumi-membros/src/hooks/usePlatformSettings.ts
git commit -m "feat(settings): map feed_cover_url and feed_enabled in usePlatformSettings"
```

---

## Task 5: Adicionar aba "Feed" + `FeedSettingsTab` em `AdminCommunitiesPage`

**Files:**
- Modify: `lumi-membros/src/pages/admin/AdminCommunitiesPage.tsx`

- [ ] **Step 1: Adicionar imports**

No topo do arquivo (após imports existentes), adicionar:

```tsx
import { Switch } from "@/components/ui/switch";
import { FileUpload } from "@/components/ui/FileUpload";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
```

(Conferir caminho real de `FileUpload`; se export for default, ajustar import. Se não existir `Switch` em `src/components/ui/switch.tsx`, conferir e usar shadcn padrão `import { Switch } from "@/components/ui/switch"`.)

- [ ] **Step 2: Criar componente `FeedSettingsTab`**

Adicionar antes da função `AdminCommunitiesPage` (após `SidebarOrganizerTab`):

```tsx
// ---------------------------------------------------------------------------
// Feed settings tab (new)
// ---------------------------------------------------------------------------
function FeedSettingsTab() {
  const { settings, updateSettings, loading } = usePlatformSettings();

  async function handleToggle(next: boolean) {
    try {
      await updateSettings({ feedEnabled: next });
      toast.success(next ? "Feed ativado." : "Feed desativado.");
    } catch (err) {
      toast.error("Falha ao atualizar visibilidade do feed.");
      console.error(err);
    }
  }

  async function handleCoverChange(url: string) {
    try {
      await updateSettings({ feedCoverUrl: url });
      toast.success(url ? "Capa atualizada." : "Capa removida.");
    } catch (err) {
      toast.error("Falha ao atualizar capa.");
      console.error(err);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Visibilidade */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Visibilidade do feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                {settings.feedEnabled ? "Ativo" : "Desativado"}
              </Label>
              <p className="text-xs text-muted-foreground">
                Quando desativado, alunos não veem o feed na sidebar nem podem acessar a página. Administradores continuam vendo.
              </p>
            </div>
            <Switch
              checked={settings.feedEnabled}
              onCheckedChange={handleToggle}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Capa */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Capa do feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm">Imagem de capa (opcional)</Label>
            <p className="text-xs text-muted-foreground">
              Aparece no topo de /comunidade/feed. Recomendado 1920×720.
            </p>
          </div>
          <FileUpload
            value={settings.feedCoverUrl}
            onChange={handleCoverChange}
            folder="communities/covers"
            imagePreset="cover"
            accept="image/*"
            allowUrl
            maxSizeMB={5}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Registrar a aba no `<Tabs>`**

Localizar `<TabsList>` no `AdminCommunitiesPage` e atualizar:

```tsx
<Tabs defaultValue="communities">
  <TabsList>
    <TabsTrigger value="communities">Comunidades</TabsTrigger>
    <TabsTrigger value="sidebar">Organizar Sidebar</TabsTrigger>
    <TabsTrigger value="feed">Feed</TabsTrigger>
  </TabsList>

  <TabsContent value="communities" className="mt-4">
    <CommunityListTab />
  </TabsContent>

  <TabsContent value="sidebar" className="mt-4">
    <SidebarOrganizerTab />
  </TabsContent>

  <TabsContent value="feed" className="mt-4">
    <FeedSettingsTab />
  </TabsContent>
</Tabs>
```

- [ ] **Step 4: Validar imports e props do `FileUpload`**

Run: `grep -n "export" lumi-membros/src/components/ui/FileUpload.tsx | head -5`
Confirmar exports e props (`value`, `onChange`, `folder`, `imagePreset`, `allowUrl`, `accept`, `maxSizeMB`). Se diferentes, ajustar uso pra bater com a API real do componente.

Run: `grep -n "export" lumi-membros/src/components/ui/switch.tsx | head -3`
Confirmar `Switch` existe. Se não, criar via shadcn ou usar `<input type="checkbox">` com Radix Switch.

- [ ] **Step 5: Build + lint**

```bash
cd lumi-membros
npm run build
npm run lint
```

Expected: build OK, lint OK.

- [ ] **Step 6: Smoke test browser**

```bash
npm run dev
```

Acessar `http://localhost:5174/admin/comunidade` (logado como owner/admin) → clicar aba "Feed" → confirmar aparecem cards "Visibilidade" e "Capa". Toggle e upload devem persistir (recarregar a página e confirmar valores).

- [ ] **Step 7: Commit**

```bash
git add lumi-membros/src/pages/admin/AdminCommunitiesPage.tsx
git commit -m "feat(admin): add Feed tab with visibility toggle and cover upload"
```

---

## Task 6: Banner de capa + gate de acesso em `CommunityFeedPage`

**Files:**
- Modify: `lumi-membros/src/pages/student/CommunityFeedPage.tsx`

- [ ] **Step 1: Adicionar imports**

No topo do arquivo, adicionar:

```tsx
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
```

(Conferir o nome real do hook de auth: pode ser `useAuth` ou `useAuthContext`. `grep -rn "useAuth\b" lumi-membros/src/contexts/` pra confirmar.)

- [ ] **Step 2: Consumir settings + isAdmin no componente**

Logo abaixo das linhas existentes de `useState`/`useMemo` no início de `CommunityFeedPage`, adicionar:

```tsx
const { settings } = usePlatformSettings();
const { isAdmin } = useAuth();
```

(Posicionar antes de qualquer `if`/`return`.)

- [ ] **Step 3: Gate quando feed off + não-admin**

Logo após declaração das variáveis (e antes do `useEffect` de scroll), adicionar:

```tsx
if (!settings.feedEnabled && !isAdmin) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <EmptyState
        icon={Lock}
        title="Feed indisponível"
        description="O feed da comunidade está temporariamente desativado."
      />
    </div>
  );
}
```

- [ ] **Step 4: Banner de capa + badge admin no header**

Localizar o `return ( <div className="max-w-2xl mx-auto px-4 py-6 space-y-4"> ... );` e:

(a) Inserir banner como primeiro filho dentro do `div`:

```tsx
{settings.feedCoverUrl && (
  <div className="-mx-4 sm:mx-0">
    <img
      src={getProxiedImageUrl(settings.feedCoverUrl)}
      alt=""
      className="w-full h-[120px] sm:h-[200px] object-cover sm:rounded-xl"
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  </div>
)}
```

(b) No bloco `<div className="flex items-center gap-3">` ao lado do `<h1>`, acrescentar (após o `tagFilter && <Badge ...>`):

```tsx
{!settings.feedEnabled && isAdmin && !tagFilter && (
  <Badge variant="outline" className="border-amber-500/30 text-amber-600 text-[10px]">
    Desativado para alunos
  </Badge>
)}
```

- [ ] **Step 5: Build + lint**

```bash
cd lumi-membros
npm run build
npm run lint
```

- [ ] **Step 6: Smoke test browser**

`npm run dev` → como admin, acessar `/comunidade/feed`. Sem capa: banner não aparece. Com capa setada via Task 5: banner aparece no topo. Desativar feed via admin → recarregar como aluno (em outra sessão/navegador anônimo) → confirmar EmptyState. Como admin, confirmar badge "Desativado para alunos".

- [ ] **Step 7: Commit**

```bash
git add lumi-membros/src/pages/student/CommunityFeedPage.tsx
git commit -m "feat(community): show feed cover banner and gate access by feedEnabled"
```

---

## Task 7: Esconder link "Feed" na sidebar quando desativado

**Files:**
- Modify: `lumi-membros/src/components/layout/CommunityLayout.tsx`

- [ ] **Step 1: Adicionar imports**

No topo do arquivo, adicionar:

```tsx
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { EyeOff } from "lucide-react";
```

(Confirma path real do useAuth — mesmo do Task 6.)

- [ ] **Step 2: Consumir hooks**

Dentro de `CommunityLayout`, após os hooks existentes (após `useCommunityLastSeen`):

```tsx
const { settings } = usePlatformSettings();
const { isAdmin } = useAuth();
const showFeedNav = settings.feedEnabled || isAdmin;
```

- [ ] **Step 3: Esconder link condicionalmente + indicador para admin**

Localizar bloco `{/* Feed nav */}` (linha ~150) e envolver/ajustar:

```tsx
{/* Feed nav */}
{showFeedNav && (
  <div className="p-3 pb-0">
    <Link
      to="/comunidade/feed"
      onClick={() => setMobileOpen(false)}
      className={cn(
        "relative flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-transparent before:transition-colors",
        isFeed
          ? "border-border/60 bg-muted/70 text-foreground shadow-sm before:bg-primary"
          : "text-muted-foreground hover:border-border/40 hover:bg-muted/55 hover:text-foreground hover:before:bg-primary/35"
      )}
    >
      <LayoutGrid className="h-4 w-4" />
      Feed
      {!settings.feedEnabled && isAdmin && (
        <EyeOff className="h-3.5 w-3.5 ml-auto text-amber-500/80" />
      )}
    </Link>
  </div>
)}
```

- [ ] **Step 4: Build + lint**

```bash
cd lumi-membros
npm run build
npm run lint
```

- [ ] **Step 5: Smoke test browser**

`npm run dev`:
- Como admin, ativar feed → link "Feed" na sidebar visível, sem ícone.
- Como admin, desativar feed → link continua visível, com `EyeOff` âmbar.
- Em sessão de aluno (sem privilégio admin): com feed ativo, link aparece. Com feed desativado: link some.

- [ ] **Step 6: Commit**

```bash
git add lumi-membros/src/components/layout/CommunityLayout.tsx
git commit -m "feat(community): hide Feed nav from non-admins when feed disabled"
```

---

## Task 8: QA end-to-end + verificação final

**Files:** nenhum.

- [ ] **Step 1: Build limpo**

```bash
cd lumi-membros
npm run build
npm run lint
```

Expected: zero erros.

- [ ] **Step 2: Roteiro QA manual**

Logado como owner (`fotografoandresouza@gmail.com`):

1. Ir em `/admin/comunidade` → aba "Feed" carrega.
2. Toggle ON: confirma toast "Feed ativado".
3. Toggle OFF: confirma toast "Feed desativado".
4. Upload imagem cover: aguarda upload, toast "Capa atualizada", preview aparece.
5. Remover cover (clicar no botão remover do FileUpload): toast "Capa removida".
6. Trocar cover por outra imagem: arquivo antigo sumiu do R2 (verificar dashboard R2 ou logs).

Como aluno comum (criar/usar usuário sem role admin):

7. Feed ON, sem capa: `/comunidade/feed` renderiza normal.
8. Feed ON, com capa: banner aparece no topo (responsivo: 200px desktop, 120px mobile).
9. Feed OFF: `/comunidade/feed` mostra EmptyState com cadeado "Feed indisponível".
10. Feed OFF: sidebar não mostra link Feed.

Como owner com Feed OFF:

11. Sidebar continua mostrando "Feed" com ícone EyeOff âmbar.
12. `/comunidade/feed` renderiza normal + badge "Desativado para alunos" no header.

- [ ] **Step 3: Verificar persistência cross-session**

Abrir 2 abas: admin e aluno. Admin desativa → aluno (após hard refresh) confirma sumiço.
Reativar → confirma volta.

- [ ] **Step 4: Atualizar `lumi-membros/CLAUDE.md` se necessário**

Se a documentação `usePlatformSettings` listar campos, adicionar `feedCoverUrl, feedEnabled` no resumo. Skip se não há lista enumerada de campos.

- [ ] **Step 5: Commit final**

Se houver doc updates:

```bash
git add lumi-membros/CLAUDE.md
git commit -m "docs: note feed admin control fields"
```

Caso contrário, pular este step.

---

## Self-Review Notes

**Spec coverage:**
- ✓ DB extension (Task 1)
- ✓ database.types update (Task 2)
- ✓ PlatformSettings type (Task 3)
- ✓ Hook mapping (Task 4)
- ✓ Admin tab/UI (Task 5)
- ✓ Banner + gate aluno (Task 6)
- ✓ Sidebar gating + admin indicator (Task 7)
- ✓ Manual testing (Task 8)

**Type consistency:**
- `feedCoverUrl: string` (não opcional) — usado igual em Task 3, 4, 5, 6.
- `feedEnabled: boolean` (não opcional) — usado igual em Task 3, 4, 5, 6, 7.
- DB: `feed_cover_url text` (NULL ok) ↔ TS: mapper transforma `null → ""`.

**Out-of-scope (reaffirmed):**
- Não há suíte de testes automatizada — verificação por build/lint/smoke.
- Não cria nova permissão; usa `isAdmin` existente do `AuthContext`.
- Não toca em outras configs do feed (filtros, ordenação, posts).
