# Locked Course Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third "Sem redirecionamento" option for the locked-course action that lets a card behave as a normal Link, navigating to the existing `CourseDetailPage` access-restricted screen.

**Architecture:** Extend the `no_access_action` enum with a new `"default"` value. `CourseCard` renders a `<Link>` instead of the click-trapping `<button>` when the action is `"default"` (or when `redirect` mode has an empty URL — silent fallback). Admin radio gets a third option and changes its initial state for new courses to `"default"`.

**Tech Stack:** React 18 + TS, React Router v6, Tailwind, shadcn/ui Radio, JSONB Postgres column (no DDL).

**Spec:** `docs/superpowers/specs/2026-05-09-locked-course-action-design.md`

---

## File map

- Modify: `src/types/course.ts` — extend `no_access_action` literal union with `"default"`
- Modify: `src/components/courses/CourseCard.tsx` — branch on action: `default` → render Link, others keep current behavior
- Modify: `src/pages/admin/AdminCourseEditPage.tsx` — add third radio option, change initial state default

No DB migration. `courses.access` is JSONB; adding a new string value does not require schema change. No tests in repo — verify via `npm run build`, lint, and manual tests.

---

## Task 1: Extend `no_access_action` type

**Files:**
- Modify: `src/types/course.ts:77-86`

- [ ] **Step 1: Update the type union**

In `src/types/course.ts`, locate the `CourseAccessBase` block at lines 77-81. Replace:

```ts
export type CourseAccessBase = {
  no_access_action?: "nothing" | "redirect";
  no_access_redirect_url?: string;
  no_access_support_url?: string;
};
```

with:

```ts
export type NoAccessAction = "default" | "nothing" | "redirect";

export type CourseAccessBase = {
  no_access_action?: NoAccessAction;
  no_access_redirect_url?: string;
  no_access_support_url?: string;
};
```

- [ ] **Step 2: Run typecheck**

```bash
cd "/Users/andresouza/Desktop/Apps e Projetos/01 - app andre/master-membros/lumi-membros"
npm run build
```

Expected: build fails with errors in `AdminCourseEditPage.tsx` (the `useState<"nothing" | "redirect">` literal is now too narrow). That's the signal Task 3 must follow. If you see other errors, report them.

- [ ] **Step 3: Stage ONLY the one file and commit**

```bash
git add src/types/course.ts
git diff --cached --stat
```

Confirm only `src/types/course.ts` is staged. Then:

```bash
git commit -m "feat(types): add 'default' value to NoAccessAction"
```

The system will append a `Co-Authored-By:` footer — that is expected.

---

## Task 2: Update `CourseCard` to render Link on `default` action

**Files:**
- Modify: `src/components/courses/CourseCard.tsx:84-97` (logic)
- Modify: `src/components/courses/CourseCard.tsx:182-229` (locked render branch)

- [ ] **Step 1: Replace the action variables and click handler**

In `src/components/courses/CourseCard.tsx`, locate lines 84-97:

```ts
  const noAccessAction = access?.no_access_action ?? "nothing";
  const supportUrl = access?.no_access_support_url ?? "";
  const redirectUrl = access?.no_access_redirect_url ?? "";

  function handleLockedClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (noAccessAction === "redirect" && redirectUrl) {
      window.open(redirectUrl, "_blank");
    } else {
      setModalOpen(true);
    }
  }
```

Replace with:

```ts
  const noAccessAction = access?.no_access_action ?? "default";
  const supportUrl = access?.no_access_support_url ?? "";
  const redirectUrl = (access?.no_access_redirect_url ?? "").trim();

  // Effective behavior:
  // - "redirect" + empty URL → silent fallback to "default" (Link to course page)
  // - "default" → Link to course page
  // - "nothing" → button + modal
  // - "redirect" + URL → button + open URL
  const lockedBehavior: "link" | "modal" | "redirect" =
    noAccessAction === "redirect" && redirectUrl
      ? "redirect"
      : noAccessAction === "nothing"
      ? "modal"
      : "link";

  function handleLockedClick(e: React.MouseEvent) {
    // Only used when lockedBehavior is "modal" or "redirect"
    e.preventDefault();
    e.stopPropagation();
    if (lockedBehavior === "redirect") {
      window.open(redirectUrl, "_blank");
    } else {
      setModalOpen(true);
    }
  }
```

- [ ] **Step 2: Update the `locked` render branch to switch between Link and button**

Locate lines 182-229 (the `if (locked) { return ( ... ) }` block). Replace the entire block with:

```tsx
  // Locked card — render varies by configured behavior
  if (locked) {
    // "link" → render as Link, navigate to /cursos/:id (CourseDetailPage shows lock screen)
    if (lockedBehavior === "link") {
      return (
        <Link
          to={to}
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group active:scale-[0.98] transition-transform"
        >
          {cardContent}
        </Link>
      );
    }

    // "modal" or "redirect" → button with onClick
    return (
      <>
        <button
          type="button"
          onClick={handleLockedClick}
          className="block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group cursor-pointer active:scale-[0.98] transition-transform"
        >
          {cardContent}
        </button>

        {/* Restricted access modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <div className="flex justify-center py-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <DialogTitle className="text-center">Acesso restrito</DialogTitle>
            </DialogHeader>
            <p className="text-center text-sm text-muted-foreground">
              Entre em contato com o suporte para saber como ter acesso.
            </p>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              {supportUrl && (
                <Button
                  onClick={() => window.open(supportUrl, "_blank")}
                  className="w-full"
                >
                  Falar com suporte
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setModalOpen(false)}
                className="w-full"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
```

- [ ] **Step 3: Run typecheck**

```bash
cd "/Users/andresouza/Desktop/Apps e Projetos/01 - app andre/master-membros/lumi-membros"
npm run build
```

Expected: build still fails (Task 3 fixes admin page). The `CourseCard.tsx` itself should compile cleanly. Report any errors located in `CourseCard.tsx`.

- [ ] **Step 4: Stage ONLY the one file and commit**

```bash
git add src/components/courses/CourseCard.tsx
git diff --cached --stat
```

Confirm only `src/components/courses/CourseCard.tsx` is staged. Then:

```bash
git commit -m "feat(courses): render locked card as Link when action is 'default'"
```

---

## Task 3: Add "Sem redirecionamento" radio option in admin

**Files:**
- Modify: `src/pages/admin/AdminCourseEditPage.tsx:126-127` (state + initial)
- Modify: `src/pages/admin/AdminCourseEditPage.tsx:679-729` (radio group)

- [ ] **Step 1: Update imports**

At the top of `src/pages/admin/AdminCourseEditPage.tsx`, find the icon import line containing `MessageCircle, ExternalLink` from `lucide-react`. Add `Inbox` to that import:

If the existing import is e.g.:

```ts
import { Lock, MessageCircle, ExternalLink, ... } from "lucide-react";
```

Add `Inbox`:

```ts
import { Lock, MessageCircle, ExternalLink, Inbox, ... } from "lucide-react";
```

If `Inbox` is already imported, leave it. If you prefer a different available lucide-react icon for the "no redirect / default page" entry (e.g. `BookOpen`), keep it consistent across the change. For this plan use `Inbox`.

Also locate the `CourseAccess` type import and add `NoAccessAction` next to it. If the existing line is:

```ts
import type { CourseAccess, ... } from "@/types/course";
```

change to:

```ts
import type { CourseAccess, NoAccessAction, ... } from "@/types/course";
```

- [ ] **Step 2: Widen the state type and change initial value**

Locate lines 126-127 (the `noAccessAction` state). Replace:

```ts
  const [noAccessAction, setNoAccessAction] = useState<"nothing" | "redirect">(
    course?.access.no_access_action ?? "nothing"
  );
```

with:

```ts
  const [noAccessAction, setNoAccessAction] = useState<NoAccessAction>(
    course?.access.no_access_action ?? "default"
  );
```

- [ ] **Step 3: Update the `onValueChange` handler type cast**

Find the `onValueChange` callback inside the `<RadioGroup>` (around line 681):

```tsx
                  onValueChange={(v) => setNoAccessAction(v as "nothing" | "redirect")}
```

Replace with:

```tsx
                  onValueChange={(v) => setNoAccessAction(v as NoAccessAction)}
```

- [ ] **Step 4: Add the new "Sem redirecionamento" radio option**

Inside the `<RadioGroup>` block, immediately AFTER the opening `<RadioGroup ...>` tag and BEFORE the existing `<label>` for `value="nothing"` (around line 684), insert this new `<label>`:

```tsx
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem value="default" id="noacc-default" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">Sem redirecionamento</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Mostra a pagina padrao de acesso restrito (com botao "Voltar para cursos")
                      </p>
                    </div>
                  </label>
```

The result, in order, is: "Sem redirecionamento" → "Mensagem de suporte" → "Redirecionar".

- [ ] **Step 5: Run typecheck and lint**

```bash
cd "/Users/andresouza/Desktop/Apps e Projetos/01 - app andre/master-membros/lumi-membros"
npm run build
npm run lint 2>&1 | grep -A 1 "AdminCourseEditPage\|CourseCard\|course\.ts" | head -20
```

Expected: build succeeds. Lint shows no NEW errors in the touched files (existing project warnings outside of these files are acceptable).

- [ ] **Step 6: Stage ONLY the one file and commit**

```bash
git add src/pages/admin/AdminCourseEditPage.tsx
git diff --cached --stat
```

Confirm only `src/pages/admin/AdminCourseEditPage.tsx` is staged. Then:

```bash
git commit -m "feat(admin): add 'Sem redirecionamento' option to course no-access config"
```

---

## Task 4: Smoke test

- [ ] **Step 1: Start dev server**

```bash
cd "/Users/andresouza/Desktop/Apps e Projetos/01 - app andre/master-membros/lumi-membros"
npm run dev
```

Open `http://localhost:5174` (login as admin).

- [ ] **Step 2: Verify acceptance criteria**

Use one course where you can edit access. Pick a non-admin student account that does NOT have access to it.

For each scenario, save the admin config, refresh the student `/cursos` page, and click the locked card:

- [ ] `default` (Sem redirecionamento) → click navigates to `/cursos/:id` which shows the "Acesso restrito" full page with "Voltar para cursos" button.
- [ ] `nothing` (Mensagem de suporte) + empty support URL → click opens modal "Acesso restrito" with only "Fechar" button.
- [ ] `nothing` (Mensagem de suporte) + filled support URL (e.g. `https://wa.me/5511...`) → click opens modal with "Falar com suporte" button that opens the URL in a new tab.
- [ ] `redirect` + filled URL → click opens that URL in a new tab.
- [ ] `redirect` + empty URL → click navigates to `/cursos/:id` (silent fallback to `default`).
- [ ] Admin user logged in → all locked cards behave normally (admin override in CoursesPage.tsx still grants `hasAccess`, so cards are NOT locked for admin).

- [ ] **Step 3: Final log check**

```bash
git log --oneline -4
```

Expected: 3 new commits from this plan plus the previous head:
1. `feat(types): add 'default' value to NoAccessAction`
2. `feat(courses): render locked card as Link when action is 'default'`
3. `feat(admin): add 'Sem redirecionamento' option to course no-access config`
