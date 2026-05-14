# Posts Fixados Multi-Escopo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir admins (owner/admin/support/moderator) fixar até 3 posts por escopo em 3 destinos independentes (comunidade, feed global, sidebar direita) com badge visual discreto.

**Architecture:** Nova tabela `pinned_posts` com enum `pin_scope`, trigger BD enforça limite de 3, RLS restringe write a admins. Frontend adiciona hook React Query `usePinnedPosts`, dialog `PinPostDialog` no menu do PostCard, render de pins nas 3 superfícies.

**Tech Stack:** Supabase PostgreSQL + RLS, React + TypeScript, TanStack React Query, Tailwind, shadcn/ui (Dialog, DropdownMenu).

**Sem framework de testes** — verificação via `npm run build` (type-check + build), `npm run lint`, e smoke test no dev server. Commits frequentes após cada task.

---

## File Structure

**Novos:**
- `supabase/migrations/003_pinned_posts.sql` — schema, trigger, RLS, migration de dados
- `src/hooks/usePinnedPosts.ts` — hook React Query para CRUD de pins
- `src/components/community/PinPostDialog.tsx` — modal admin com 3 checkboxes de destino

**Modificados:**
- `src/types/student.ts` — adicionar `PinnedPost`, `PinScope`; remover `pinnedPostId` de `Community`
- `src/lib/database.types.ts` — regenerar tipos após migration (ou editar manual)
- `src/hooks/useCommunities.ts` — remover field/methods `pinnedPostId`/`pinPost`/`unpinPost`
- `src/components/community/PostCard.tsx` — adicionar menu item "Fixar" para admin
- `src/pages/student/CommunityPage.tsx` — substituir lookup single-pin por array
- `src/pages/student/CommunityFeedPage.tsx` — render pins do feed acima do feed normal
- `src/components/layout/CommunityLayout.tsx` — sidebar: pins admin + auto-top fill
- `CLAUDE.md` — documentar tabela + hook novos

---

### Task 1: Criar migration SQL e aplicar no Supabase

**Files:**
- Create: `supabase/migrations/003_pinned_posts.sql`

- [ ] **Step 1: Criar arquivo de migration**

Conteúdo completo de `supabase/migrations/003_pinned_posts.sql`:

```sql
-- Migration 003: pinned_posts multi-scope

-- 1. Enum
CREATE TYPE pin_scope AS ENUM ('community', 'feed', 'sidebar');

-- 2. Tabela
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

-- 3. Índices
CREATE UNIQUE INDEX pinned_posts_unique
  ON pinned_posts (post_id, scope, COALESCE(community_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX pinned_posts_scope_idx ON pinned_posts (scope, pinned_at DESC);
CREATE INDEX pinned_posts_community_idx ON pinned_posts (community_id, pinned_at DESC)
  WHERE community_id IS NOT NULL;

-- 4. Trigger limite de 3
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

-- 5. RLS
ALTER TABLE pinned_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pinned_posts_select_authenticated" ON pinned_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pinned_posts_admin_write" ON pinned_posts
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "pinned_posts_moderator_write" ON pinned_posts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'moderator'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'moderator'));

-- 6. Migrar pins existentes do campo communities.pinned_post_id
INSERT INTO pinned_posts (post_id, scope, community_id, pinned_at, pinned_by)
SELECT
  c.pinned_post_id,
  'community'::pin_scope,
  c.id,
  COALESCE(c.created_at, now()),
  (SELECT id FROM profiles WHERE role = 'owner' LIMIT 1)
FROM communities c
WHERE c.pinned_post_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM community_posts WHERE id = c.pinned_post_id);

-- 7. Dropar campo legacy
ALTER TABLE communities DROP COLUMN pinned_post_id;
```

- [ ] **Step 2: Aplicar migration no Supabase**

Abrir SQL Editor em https://supabase.com/dashboard/project/gdbkbeurjjtjgmrmfngk/sql, colar conteúdo do arquivo, executar.

Expected: success. Verificar com:
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'pinned_posts';
SELECT enum_range(NULL::pin_scope);
SELECT COUNT(*) FROM pinned_posts;
```

- [ ] **Step 3: Atualizar `supabase/migrations/001_initial_schema.sql`**

Localizar bloco que cria tabela `communities`. Remover linha `pinned_post_id uuid REFERENCES community_posts(id),` da definição de `communities`.

Adicionar no final do arquivo (ou após bloco de community_posts) o conteúdo idêntico de `003_pinned_posts.sql` exceto os blocos 6 (INSERT) e 7 (DROP COLUMN) — eles são one-shot.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/003_pinned_posts.sql supabase/migrations/001_initial_schema.sql
git commit -m "feat(db): add pinned_posts table with multi-scope support

Multi-scope pins (community/feed/sidebar), limit 3 per scope via trigger,
RLS write restricted to admins (owner/admin/support/moderator).
Migrates legacy communities.pinned_post_id then drops the column."
```

---

### Task 2: Atualizar tipos TypeScript

**Files:**
- Modify: `src/types/student.ts`
- Modify: `src/lib/database.types.ts`

- [ ] **Step 1: Adicionar tipos novos em `src/types/student.ts`**

Localizar interface `Community` (linha ~155-165). Remover linha:
```ts
pinnedPostId: string | null;
```

No final do arquivo, antes do `export` final, adicionar:
```ts
export type PinScope = 'community' | 'feed' | 'sidebar';

export interface PinnedPost {
  id: string;
  postId: string;
  scope: PinScope;
  communityId: string | null;
  pinnedAt: string;
  pinnedBy: string | null;
}
```

- [ ] **Step 2: Atualizar `src/lib/database.types.ts`**

Localizar bloco `communities:` (~linha 400). Remover as 3 ocorrências de `pinned_post_id` (em Row, Insert, Update).

Adicionar novo bloco para `pinned_posts` dentro de `Tables:`:
```ts
pinned_posts: {
  Row: {
    id: string;
    post_id: string;
    scope: 'community' | 'feed' | 'sidebar';
    community_id: string | null;
    pinned_at: string;
    pinned_by: string | null;
  };
  Insert: {
    id?: string;
    post_id: string;
    scope: 'community' | 'feed' | 'sidebar';
    community_id?: string | null;
    pinned_at?: string;
    pinned_by?: string | null;
  };
  Update: {
    id?: string;
    post_id?: string;
    scope?: 'community' | 'feed' | 'sidebar';
    community_id?: string | null;
    pinned_at?: string;
    pinned_by?: string | null;
  };
  Relationships: [];
};
```

- [ ] **Step 3: Verificar type-check**

Run: `npm run build`
Expected: build vai falhar em arquivos que ainda referenciam `pinnedPostId` (`useCommunities.ts`, `CommunityPage.tsx`, `mock-communities.ts`). Anotar erros — serão corrigidos nas próximas tasks.

- [ ] **Step 4: Commit**

```bash
git add src/types/student.ts src/lib/database.types.ts
git commit -m "feat(types): add PinnedPost/PinScope, remove Community.pinnedPostId"
```

---

### Task 3: Criar hook `usePinnedPosts`

**Files:**
- Create: `src/hooks/usePinnedPosts.ts`

- [ ] **Step 1: Criar arquivo**

```ts
import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { PinnedPost, PinScope } from "@/types/student";

const QK = ["pinned-posts"] as const;

async function fetchPinnedPosts(): Promise<PinnedPost[]> {
  const { data, error } = await supabase
    .from("pinned_posts")
    .select("*")
    .order("pinned_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    postId: r.post_id,
    scope: r.scope as PinScope,
    communityId: r.community_id,
    pinnedAt: r.pinned_at,
    pinnedBy: r.pinned_by,
  }));
}

export function usePinnedPosts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: pins = [], isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchPinnedPosts,
    staleTime: 1000 * 60 * 2,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  const pinnedByScope = useCallback(
    (scope: PinScope, communityId?: string | null): PinnedPost[] => {
      return pins.filter((p) => {
        if (p.scope !== scope) return false;
        if (scope === "community") return p.communityId === communityId;
        return true;
      });
    },
    [pins]
  );

  const isPinned = useCallback(
    (postId: string, scope: PinScope, communityId?: string | null): boolean => {
      return pins.some(
        (p) =>
          p.postId === postId &&
          p.scope === scope &&
          (scope !== "community" || p.communityId === communityId)
      );
    },
    [pins]
  );

  const getPinDestinations = useCallback(
    (postId: string, communityId: string | null) => {
      return {
        community: communityId
          ? pins.some(
              (p) =>
                p.postId === postId &&
                p.scope === "community" &&
                p.communityId === communityId
            )
          : false,
        feed: pins.some((p) => p.postId === postId && p.scope === "feed"),
        sidebar: pins.some((p) => p.postId === postId && p.scope === "sidebar"),
      };
    },
    [pins]
  );

  const pinPost = useCallback(
    async (args: { postId: string; scope: PinScope; communityId?: string | null }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase.from("pinned_posts").insert({
        post_id: args.postId,
        scope: args.scope,
        community_id: args.scope === "community" ? args.communityId ?? null : null,
        pinned_by: user.id,
      });
      if (error) {
        if (error.message?.includes("Limite de 3")) {
          throw new Error("Limite de 3 fixados atingido neste destino. Desafixe um antes.");
        }
        throw error;
      }
      invalidate();
    },
    [user?.id, invalidate]
  );

  const unpinPost = useCallback(
    async (args: { postId: string; scope: PinScope; communityId?: string | null }) => {
      let query = supabase
        .from("pinned_posts")
        .delete()
        .eq("post_id", args.postId)
        .eq("scope", args.scope);
      if (args.scope === "community") {
        query = query.eq("community_id", args.communityId ?? "");
      } else {
        query = query.is("community_id", null);
      }
      const { error } = await query;
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const allPinnedPostIds = useMemo(
    () => new Set(pins.map((p) => p.postId)),
    [pins]
  );

  return {
    pins,
    loading: isLoading,
    pinnedByScope,
    isPinned,
    getPinDestinations,
    pinPost,
    unpinPost,
    allPinnedPostIds,
  };
}
```

- [ ] **Step 2: Verificar type-check do novo arquivo**

Run: `npx tsc --noEmit src/hooks/usePinnedPosts.ts` (ou `npm run build` e ignorar erros de outros arquivos)
Expected: arquivo novo sem erros TS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePinnedPosts.ts
git commit -m "feat(hooks): add usePinnedPosts for multi-scope pin CRUD"
```

---

### Task 4: Limpar `useCommunities` (remover pin legacy)

**Files:**
- Modify: `src/hooks/useCommunities.ts`

- [ ] **Step 1: Remover mapeamento `pinnedPostId`**

Em `fetchCommunities()` (linha ~34), remover:
```ts
pinnedPostId: c.pinned_post_id,
```

- [ ] **Step 2: Remover passagem em `createCommunity`**

Linha ~138, remover:
```ts
pinned_post_id: null,
```

- [ ] **Step 3: Remover patch em `updateCommunity`**

Linhas ~168-170, remover bloco:
```ts
...(patch.pinnedPostId !== undefined && {
  pinned_post_id: patch.pinnedPostId,
}),
```

- [ ] **Step 4: Remover métodos `pinPost`/`unpinPost`**

Linhas ~195-207, deletar completos:
```ts
const pinPost = useCallback(...)
const unpinPost = useCallback(...)
```

- [ ] **Step 5: Remover do return**

Linhas ~222-223, remover `pinPost,` e `unpinPost,` do objeto retornado.

- [ ] **Step 6: Atualizar mock data**

Editar `src/data/mock-communities.ts`. Remover linhas `pinnedPostId: "..."` e `pinnedPostId: null,` de cada objeto (3 ocorrências).

- [ ] **Step 7: Verificar type-check**

Run: `npm run build`
Expected: erros restantes só em `CommunityPage.tsx` (que ainda usa `community.pinnedPostId`) — será corrigido na Task 6.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useCommunities.ts src/data/mock-communities.ts
git commit -m "refactor(useCommunities): remove legacy pinnedPostId field and pin methods"
```

---

### Task 5: Criar `PinPostDialog`

**Files:**
- Create: `src/components/community/PinPostDialog.tsx`

- [ ] **Step 1: Criar componente**

```tsx
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pin } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { usePinnedPosts } from "@/hooks/usePinnedPosts";
import { useCommunities } from "@/hooks/useCommunities";

interface PinPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  communityId: string | null;
}

export function PinPostDialog({
  open,
  onOpenChange,
  postId,
  communityId,
}: PinPostDialogProps) {
  const { getPinDestinations, pinPost, unpinPost } = usePinnedPosts();
  const { findCommunity } = useCommunities();
  const community = findCommunity(communityId);

  const [inCommunity, setInCommunity] = useState(false);
  const [inFeed, setInFeed] = useState(false);
  const [inSidebar, setInSidebar] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const current = getPinDestinations(postId, communityId);
    setInCommunity(current.community);
    setInFeed(current.feed);
    setInSidebar(current.sidebar);
  }, [open, postId, communityId, getPinDestinations]);

  async function handleSave() {
    setSaving(true);
    const current = getPinDestinations(postId, communityId);
    const ops: Promise<void>[] = [];

    const diff = (
      desired: boolean,
      currentVal: boolean,
      scope: "community" | "feed" | "sidebar",
      cid: string | null
    ) => {
      if (desired === currentVal) return;
      if (desired) {
        ops.push(pinPost({ postId, scope, communityId: cid }));
      } else {
        ops.push(unpinPost({ postId, scope, communityId: cid }));
      }
    };

    diff(inCommunity, current.community, "community", communityId);
    diff(inFeed, current.feed, "feed", null);
    diff(inSidebar, current.sidebar, "sidebar", null);

    try {
      await Promise.all(ops);
      toast.success("Fixação atualizada");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao fixar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-primary" />
            Fixar publicação
          </DialogTitle>
          <DialogDescription>
            Escolha onde esta publicação deve aparecer fixada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3">
            <Checkbox
              id="pin-community"
              checked={inCommunity}
              disabled={!communityId}
              onCheckedChange={(v) => setInCommunity(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label htmlFor="pin-community" className="cursor-pointer font-medium">
                Fixar nesta comunidade
              </Label>
              {community ? (
                <p className="text-xs text-muted-foreground">{community.name}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Post sem comunidade — opção indisponível
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="pin-feed"
              checked={inFeed}
              onCheckedChange={(v) => setInFeed(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label htmlFor="pin-feed" className="cursor-pointer font-medium">
                Fixar no feed global
              </Label>
              <p className="text-xs text-muted-foreground">
                Aparece no topo de /comunidade/feed
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="pin-sidebar"
              checked={inSidebar}
              onCheckedChange={(v) => setInSidebar(v === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label htmlFor="pin-sidebar" className="cursor-pointer font-medium">
                Destacar na sidebar
              </Label>
              <p className="text-xs text-muted-foreground">
                Aparece em "Mais curtidos do mês"
              </p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/80 border-t border-border/30 pt-3">
            Máximo 3 fixados por destino. Os mais recentes aparecem primeiro.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar que `Checkbox` e `Label` existem**

Run: `ls src/components/ui/ | grep -E "checkbox|label"`
Expected: ambos existem. Se não, parar e instalar via shadcn.

- [ ] **Step 3: Type-check**

Run: `npm run build` — corrigir erros TS apenas neste arquivo se houver.

- [ ] **Step 4: Commit**

```bash
git add src/components/community/PinPostDialog.tsx
git commit -m "feat(community): add PinPostDialog with 3 destination checkboxes"
```

---

### Task 6: Integrar menu "Fixar" no PostCard

**Files:**
- Modify: `src/components/community/PostCard.tsx`

- [ ] **Step 1: Importar dependências novas**

No topo do arquivo, adicionar imports (junto com os existentes):
```ts
import { useAuth } from "@/contexts/AuthContext";
import { usePinnedPosts } from "@/hooks/usePinnedPosts";
import { PinPostDialog } from "./PinPostDialog";
```

Verificar que `Pin` está em `import { ... } from "lucide-react"`. Já está (já é usado pelo badge `isPinned`).

- [ ] **Step 2: Adicionar state e hooks dentro de `PostCard`**

Após linha `const [editOpen, setEditOpen] = useState(false);` (~linha 323), adicionar:
```ts
const [pinDialogOpen, setPinDialogOpen] = useState(false);
const { isAdmin } = useAuth();
const { getPinDestinations } = usePinnedPosts();
const pinDest = getPinDestinations(post.id, post.communityId);
const anyPinned = pinDest.community || pinDest.feed || pinDest.sidebar;
```

- [ ] **Step 3: Adicionar item "Fixar" no menu**

Localizar bloco `<div className="absolute right-0 top-9 z-50 ...">` (~linha 551). Antes do `{isOwn && (...)}` ou após (não importa), adicionar item admin:

```tsx
{isAdmin && (
  <button
    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-accent transition-colors"
    onClick={() => {
      setMenuOpen(false);
      setPinDialogOpen(true);
    }}
  >
    <Pin className="h-3.5 w-3.5" />
    {anyPinned ? "Editar fixação..." : "Fixar..."}
  </button>
)}
```

- [ ] **Step 4: Renderizar `PinPostDialog`**

No final do JSX (antes do último `</div>` que fecha o card), adicionar:
```tsx
<PinPostDialog
  open={pinDialogOpen}
  onOpenChange={setPinDialogOpen}
  postId={post.id}
  communityId={post.communityId}
/>
```

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: PostCard compila.

- [ ] **Step 6: Commit**

```bash
git add src/components/community/PostCard.tsx
git commit -m "feat(community): add admin Pin menu item to PostCard"
```

---

### Task 7: Substituir pinned single → array em `CommunityPage`

**Files:**
- Modify: `src/pages/student/CommunityPage.tsx`

- [ ] **Step 1: Adicionar import**

Adicionar:
```ts
import { usePinnedPosts } from "@/hooks/usePinnedPosts";
```

- [ ] **Step 2: Adicionar hook e substituir lookup**

Após `const { findProfile } = useProfiles();` (~linha 29), adicionar:
```ts
const { pinnedByScope } = usePinnedPosts();
```

Substituir bloco `const pinnedPost: CommunityPost | null = ...` (linhas 52-54) por:
```ts
const pinnedRows = useMemo(
  () => (community ? pinnedByScope("community", community.id) : []),
  [community, pinnedByScope]
);
const pinnedPosts = useMemo(
  () =>
    pinnedRows
      .map((r) => findPost(r.postId))
      .filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined),
  [pinnedRows, findPost]
);
const pinnedIdSet = useMemo(
  () => new Set(pinnedPosts.map((p) => p.id)),
  [pinnedPosts]
);
```

- [ ] **Step 3: Atualizar `regularPosts`**

Substituir bloco linhas ~56-62 por:
```ts
const regularPosts = useMemo(
  () => communityPosts.filter((p) => !pinnedIdSet.has(p.id)),
  [communityPosts, pinnedIdSet]
);
```

- [ ] **Step 4: Atualizar `useEffect` de scroll**

Linha ~103, substituir dependência `pinnedPost?.id` por `pinnedPosts.length`:
```ts
}, [location.hash, regularPosts.length, pinnedPosts.length]);
```

- [ ] **Step 5: Substituir render do pinned post**

Linhas ~225-237, substituir bloco `{pinnedPost && (...)}` por:
```tsx
{pinnedPosts.length > 0 && (
  <div className="space-y-6">
    {pinnedPosts.map((post) => (
      <div key={post.id}>
        <PostCard
          post={post}
          showCommunity={false}
          isPinned
          onToggleComments={toggleComments}
        />
        {expandedComments.has(post.id) && (
          <PostComments postId={post.id} />
        )}
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 6: Atualizar empty state condicional**

Linha ~240, substituir `regularPosts.length === 0 && !pinnedPost` por:
```tsx
regularPosts.length === 0 && pinnedPosts.length === 0
```

- [ ] **Step 7: Remover import não usado**

Se `CommunityPost` foi importado só para `pinnedPost: CommunityPost | null` e não é mais usado, remover do import.

- [ ] **Step 8: Type-check**

Run: `npm run build`
Expected: CommunityPage compila.

- [ ] **Step 9: Commit**

```bash
git add src/pages/student/CommunityPage.tsx
git commit -m "feat(community-page): render array of pinned posts per community"
```

---

### Task 8: Render pins no feed global

**Files:**
- Modify: `src/pages/student/CommunityFeedPage.tsx`

- [ ] **Step 1: Adicionar import**

```ts
import { usePinnedPosts } from "@/hooks/usePinnedPosts";
import { usePosts } from "@/hooks/usePosts";
```

Verificar se `usePosts` já está importado (sim, linha 8). `findPost` deve ser desestruturado dele.

- [ ] **Step 2: Adicionar hooks**

Substituir linha 28:
```ts
const { getFeedPosts, getPostsByHashtag } = usePosts();
```
por:
```ts
const { getFeedPosts, getPostsByHashtag, findPost } = usePosts();
const { pinnedByScope } = usePinnedPosts();
```

- [ ] **Step 3: Computar pins do feed**

Após `const feedPosts = useMemo(...)` (linha ~60), adicionar:
```ts
const feedPinRows = useMemo(() => pinnedByScope("feed"), [pinnedByScope]);
const feedPinnedPosts = useMemo(
  () =>
    feedPinRows
      .map((r) => findPost(r.postId))
      .filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined)
      .filter((p) => p.status === "published"),
  [feedPinRows, findPost]
);
const pinnedIdSet = useMemo(
  () => new Set(feedPinnedPosts.map((p) => p.id)),
  [feedPinnedPosts]
);
const regularFeedPosts = useMemo(
  () => feedPosts.filter((p) => !pinnedIdSet.has(p.id)),
  [feedPosts, pinnedIdSet]
);
```

Quando há `tagFilter`, pins não devem aparecer (foco em busca por hashtag). Ajustar:
```ts
const showPins = !tagFilter && feedPinnedPosts.length > 0;
```

- [ ] **Step 4: Renderizar pins**

Linha ~202-228, substituir o bloco `{feedPosts.length === 0 ? ... : (...)}` por:

```tsx
{showPins && (
  <div className="space-y-6">
    {feedPinnedPosts.map((post) => (
      <div key={`pin-${post.id}`}>
        <PostCard
          post={post}
          showCommunity
          isPinned
          onToggleComments={toggleComments}
        />
        {expandedComments.has(post.id) && (
          <PostComments postId={post.id} />
        )}
      </div>
    ))}
  </div>
)}

{regularFeedPosts.length === 0 && !showPins ? (
  <EmptyState
    icon={PenSquare}
    title={tagFilter ? "Nenhum post com essa tag" : "Feed vazio"}
    description={
      tagFilter
        ? "Não há publicações com essa hashtag."
        : "As comunidades que você participa ainda não têm publicações."
    }
  />
) : (
  <div className="space-y-6">
    {regularFeedPosts.map((post, idx) => (
      <div key={post.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
        <PostCard
          post={post}
          showCommunity
          onToggleComments={toggleComments}
        />
        {expandedComments.has(post.id) && (
          <PostComments postId={post.id} />
        )}
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: compila.

- [ ] **Step 6: Commit**

```bash
git add src/pages/student/CommunityFeedPage.tsx
git commit -m "feat(feed): render admin-pinned posts above global feed"
```

---

### Task 9: Sidebar direita — admin pins + auto-top fill

**Files:**
- Modify: `src/components/layout/CommunityLayout.tsx`

- [ ] **Step 1: Adicionar imports**

Adicionar:
```ts
import { Pin } from "lucide-react";
import { usePinnedPosts } from "@/hooks/usePinnedPosts";
```

Verificar `findPost` em `usePosts`. Linha 36: `const { getTrendingHashtags, getTopPosts, getPostsByCommunity } = usePosts();` — adicionar `findPost`:
```ts
const { getTrendingHashtags, getTopPosts, getPostsByCommunity, findPost } = usePosts();
```

- [ ] **Step 2: Adicionar hook**

Após `const { findProfile } = useProfiles();` (~linha 37), adicionar:
```ts
const { pinnedByScope } = usePinnedPosts();
```

- [ ] **Step 3: Computar lista final**

Substituir bloco `const topPosts = useMemo(...)` (linhas 63-66) por:

```ts
const sidebarPinRows = useMemo(() => pinnedByScope("sidebar"), [pinnedByScope]);

const sidebarPinnedPosts = useMemo(
  () =>
    sidebarPinRows
      .map((r) => findPost(r.postId))
      .filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined)
      .filter((p) => p.status === "published"),
  [sidebarPinRows, findPost]
);

const autoTopPosts = useMemo(
  () => getTopPosts(communityIds, 3),
  [getTopPosts, communityIds]
);

const sidebarFinalList = useMemo(() => {
  const pinnedIds = new Set(sidebarPinnedPosts.map((p) => p.id));
  const fillCount = Math.max(0, 3 - sidebarPinnedPosts.length);
  const autoFill = autoTopPosts
    .filter((p) => !pinnedIds.has(p.id))
    .slice(0, fillCount);
  return [
    ...sidebarPinnedPosts.map((post) => ({ post, pinned: true })),
    ...autoFill.map((post) => ({ post, pinned: false })),
  ];
}, [sidebarPinnedPosts, autoTopPosts]);
```

- [ ] **Step 4: Atualizar render do bloco "Top posts"**

Substituir linhas ~240-301 (`{topPosts.length > 0 && (...)}`) por:

```tsx
{sidebarFinalList.length > 0 && (
  <div>
    <div className="mb-3">
      <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] flex items-center gap-1.5">
        <Flame className="h-3 w-3" />
        Mais curtidos do mês
      </p>
    </div>
    <div className="space-y-2.5">
      {sidebarFinalList.map((item, index) => {
        const post = item.post;
        const author = findProfile(post.authorId);
        const community = activeCommunities.find((c) => c.id === post.communityId);
        const href = community
          ? `/comunidade/${community.slug}#${post.id}`
          : `/comunidade/feed#${post.id}`;

        // Auto-fill numbering starts after pinned items
        const autoIndex = index - sidebarPinnedPosts.length + 1;

        return (
          <Link
            key={post.id}
            to={href}
            onClick={() => setMobileOpen(false)}
            className="group/top flex items-start gap-2.5 rounded-xl border border-border/30 bg-card/35 px-3 py-2.5 text-sm transition-all duration-200 hover:border-primary/30 hover:bg-muted/40"
          >
            <span className={cn(
              "mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
              item.pinned
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              {item.pinned ? <Pin className="h-3 w-3" /> : autoIndex}
            </span>

            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[12px] font-semibold leading-5 text-foreground/90 transition-colors group-hover/top:text-foreground">
                {post.title || post.body.slice(0, 72)}
              </p>

              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground/75">
                <div className="h-5 w-5 rounded-full overflow-hidden bg-muted shrink-0 ring-1 ring-border/20">
                  {author?.avatarUrl ? (
                    <img src={getProxiedImageUrl(author.avatarUrl)} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-[8px] font-bold">
                      {(author?.displayName ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="truncate">{author?.displayName ?? "Anônimo"}</span>
              </div>

              {community && (
                <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/55">
                  {community.name}
                </p>
              )}
            </div>

            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">
              <Heart className="h-3 w-3 fill-current" />
              <span className="tabular-nums">{post.likesCount}</span>
            </span>
          </Link>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: layout compila.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/CommunityLayout.tsx
git commit -m "feat(community-layout): sidebar shows admin pins above auto-top posts"
```

---

### Task 10: Build, lint e smoke test

**Files:** (nenhum modificado nesta task, só verificação)

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: build success sem erros TS.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sem novos erros nos arquivos modificados. Warnings preexistentes em outros arquivos OK.

- [ ] **Step 3: Dev server smoke test — fluxo admin**

Run: `npm run dev` (background ou em outro terminal)

Manualmente no browser (logar como owner/admin):
1. Ir a `/comunidade/<slug-de-alguma>` — verificar pins existentes migrados aparecem com badge "Fixado".
2. Abrir menu `...` em um post não fixado — item "Fixar..." deve aparecer.
3. Click "Fixar..." → marcar "Fixar no feed global" + "Destacar na sidebar" → Salvar.
4. Ir a `/comunidade/feed` — post deve aparecer no topo com badge "Fixado".
5. Sidebar direita "Mais curtidos do mês" — post deve aparecer no topo com ícone Pin (substituindo número 1).
6. Tentar fixar 4 posts no feed global — 4º deve mostrar toast "Limite de 3 fixados atingido neste destino. Desafixe um antes."
7. Desafixar todos — pins somem, auto-top da sidebar volta com numeração 1/2/3.

- [ ] **Step 4: Smoke test — fluxo aluno (não admin)**

Logout, login como aluno comum:
1. Ir a `/comunidade/feed` — ver pins fixados pelo admin.
2. Abrir menu `...` em qualquer post — NÃO deve aparecer "Fixar...".
3. Aluno sem acesso à comunidade origem de um pin no feed — pin deve aparecer normalmente.

- [ ] **Step 5: Commit (apenas se houve fix de bugs durante smoke test)**

Se nada quebrou, pular. Se houve correção:
```bash
git add <arquivos>
git commit -m "fix: <descrição do fix do smoke test>"
```

---

### Task 11: Atualizar CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Adicionar entrada do hook**

Localizar bloco `### State Management` (~linha 83). Após `usePosts`, adicionar:
```
- **`usePinnedPosts`** — Posts fixados multi-escopo (community/feed/sidebar) com limite de 3 por destino. React Query. Supabase table: `pinned_posts`. Mutations `pinPost`/`unpinPost`. Helpers `pinnedByScope`, `isPinned`, `getPinDestinations`.
```

- [ ] **Step 2: Atualizar `Community` na seção Data Model**

Linha ~134, substituir descrição de `Community` para remover `pinnedPostId`:
```
Community (slug, classIds[], settings: allowStudentPosts/requireApproval/allowImages)
```

Adicionar nova entidade:
```
PinnedPost (postId, scope: community|feed|sidebar, communityId?, pinnedAt, pinnedBy)
```

- [ ] **Step 3: Documentar tabela em Database Schema**

Localizar seção `**Community:**` (~linha 321). Substituir linha de `communities`:
```
- `communities` — id, slug (unique), name, description, cover_url, icon_url, class_ids[], settings (jsonb), status
```

Após `sidebar_config`, adicionar:
```
- `pinned_posts` — id, post_id (FK community_posts CASCADE), scope (enum: community/feed/sidebar), community_id (FK communities CASCADE, null exceto p/ scope=community), pinned_at, pinned_by (FK profiles SET NULL). UNIQUE(post_id, scope, community_id). Limit 3 per scope via `enforce_pinned_posts_limit` trigger.
```

- [ ] **Step 4: Documentar trigger novo**

Na seção `### Key Database Functions`, adicionar:
```
- `enforce_pinned_posts_limit()` — BEFORE INSERT trigger em `pinned_posts`. Rejeita insert se já existem 3 pins no mesmo `(scope, community_id)`. Mensagem em PT-BR.
```

- [ ] **Step 5: Documentar RLS**

Seção `### RLS Policies`, adicionar bullet:
```
- **`pinned_posts`:** SELECT autenticado; INSERT/UPDATE/DELETE só admin (`is_admin_user()` cobre owner/admin/support; policy adicional p/ moderator)
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude.md): document pinned_posts table, hook and trigger"
```

---

## Self-Review

**Spec coverage:**
- ✅ Schema `pinned_posts` + trigger + RLS → Task 1
- ✅ Migration de dados existentes → Task 1 step 1 (bloco INSERT)
- ✅ Tipos `PinnedPost`/`PinScope` + remoção de `Community.pinnedPostId` → Task 2
- ✅ Hook `usePinnedPosts` → Task 3
- ✅ `useCommunities` limpo → Task 4
- ✅ `PinPostDialog` → Task 5
- ✅ Menu "Fixar" no PostCard → Task 6 (PostCard já tem badge isPinned implementado)
- ✅ `CommunityPage` multi-pin → Task 7
- ✅ Feed global pins → Task 8
- ✅ Sidebar admin pins + auto-fill → Task 9
- ✅ Documentação → Task 11

**Placeholder scan:** Sem "TBD"/"TODO"/instruções vagas. Todos blocos de código completos.

**Type consistency:**
- `pinnedByScope(scope, communityId?)` retorna `PinnedPost[]` — consistente entre Tasks 3, 7, 8, 9.
- `getPinDestinations(postId, communityId)` retorna `{ community, feed, sidebar }` — usado em Tasks 5 e 6 com mesma assinatura.
- `pinPost`/`unpinPost` aceitam `{ postId, scope, communityId? }` — consistente.
- `isPinned` definido em hook mas não usado por código posterior (PostCard usa `getPinDestinations` para mostrar texto "Editar fixação"). OK, mantido por simetria/utilidade.

**Notas observadas durante o draft:**
- PostCard já tem prop `isPinned` que renderiza badge "Fixado" + tint de fundo (linhas 305, 416-426). Spec assumia que seria nova adição — na verdade só precisamos **passar** `isPinned` corretamente das páginas (Tasks 7, 8 fazem isso). Sem mudança de visual necessária no PostCard além do menu admin.
- `is_admin_user()` cobre owner/admin/support por padrão. Policy extra de moderator garante decisão A (todos 4 roles `isAdmin`). Frontend usa `useAuth().isAdmin` que já é `true` p/ os 4.

---

## Execution Handoff

Plano salvo em `docs/superpowers/plans/2026-05-14-pinned-posts-multi-scope.md`.

**Duas opções de execução:**

1. **Subagent-Driven (recomendado)** — Dispatch subagent novo por task, review entre tasks, iteração rápida.

2. **Inline Execution** — Executa tasks nesta sessão via `executing-plans`, batch com checkpoints de review.

Qual abordagem?
