# Session Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `visibility_mode` to course sessions ('all' | 'enrolled_courses') so admin can hide a session from students who aren't enrolled in any of its courses.

**Architecture:** New column on `course_sessions` (default 'all' = current behavior). Frontend filters sessions client-side using existing `isStudentEnrolled` helper. UI added on `AdminSessionPage`.

**Tech Stack:** Supabase (Postgres), React 18 + TS, TanStack Query, Tailwind, shadcn/ui (Radio).

**Spec:** `docs/superpowers/specs/2026-05-09-session-visibility-design.md`

---

## File map

- Create: `supabase/migrations/20260509000001_add_session_visibility.sql`
- Modify: `supabase/migrations/001_initial_schema.sql` (sync canonical schema)
- Modify: `src/lib/database.types.ts` (add `visibility_mode` to Row/Insert/Update)
- Modify: `src/types/course.ts` (add `SessionVisibilityMode`, field on `CourseSession`)
- Modify: `src/hooks/useCourses.ts` (read field on fetch, accept on create/update)
- Modify: `src/lib/accessControl.ts` (export `isSessionVisibleToStudent`)
- Modify: `src/pages/admin/AdminSessionPage.tsx` (visibility radio card + save)
- Modify: `src/pages/student/CoursesPage.tsx` (filter sessions list + dropdown)

No test framework exists in repo — verification is manual (admin toggles + student view) plus `npm run lint` and `npm run build`.

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260509000001_add_session_visibility.sql`
- Modify: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Write the migration file**

Content for `supabase/migrations/20260509000001_add_session_visibility.sql`:

```sql
-- Adds visibility_mode to course_sessions
-- 'all'              = visible to every logged-in student (default, backward compat)
-- 'enrolled_courses' = visible only to students enrolled in at least one course of the session
ALTER TABLE course_sessions
  ADD COLUMN IF NOT EXISTS visibility_mode text NOT NULL DEFAULT 'all'
  CHECK (visibility_mode IN ('all', 'enrolled_courses'));
```

- [ ] **Step 2: Apply migration on remote project**

Project ID: `gdbkbeurjjtjgmrmfngk`. The MCP tools cannot reach this project (per CLAUDE.md). Use the Supabase Dashboard SQL Editor:

https://supabase.com/dashboard/project/gdbkbeurjjtjgmrmfngk/sql

Paste the migration content. Run. Confirm success message "Success. No rows returned".

- [ ] **Step 3: Verify the column exists**

Run in SQL editor:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'course_sessions' AND column_name = 'visibility_mode';
```

Expected output: one row with `visibility_mode | text | 'all'::text`.

- [ ] **Step 4: Sync canonical schema file**

Open `supabase/migrations/001_initial_schema.sql`. Find the `CREATE TABLE course_sessions` statement. Add inside the column list (before the trailing `)`):

```sql
  visibility_mode text NOT NULL DEFAULT 'all' CHECK (visibility_mode IN ('all', 'enrolled_courses')),
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260509000001_add_session_visibility.sql supabase/migrations/001_initial_schema.sql
git commit -m "feat(db): add visibility_mode to course_sessions"
```

---

## Task 2: Update database TypeScript types

**Files:**
- Modify: `src/lib/database.types.ts:107-134`

- [ ] **Step 1: Add the field to Row, Insert, Update**

Replace the existing `course_sessions: { … }` block (lines 107–134) with:

```ts
      course_sessions: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          is_active: boolean;
          order: number;
          visibility_mode: "all" | "enrolled_courses";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          is_active?: boolean;
          order?: number;
          visibility_mode?: "all" | "enrolled_courses";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          is_active?: boolean;
          order?: number;
          visibility_mode?: "all" | "enrolled_courses";
          updated_at?: string;
        };
      };
```

- [ ] **Step 2: Run typecheck**

```bash
npm run build
```

Expected: build succeeds. The added field is optional in Insert/Update so existing call sites that don't pass it still compile.

- [ ] **Step 3: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "feat(types): add visibility_mode to course_sessions row"
```

---

## Task 3: Domain type + accessControl helper

**Files:**
- Modify: `src/types/course.ts:139-146`
- Modify: `src/lib/accessControl.ts` (append new export)

- [ ] **Step 1: Add `SessionVisibilityMode` and field to `CourseSession`**

In `src/types/course.ts`, replace the `CourseSession` block:

```ts
export type SessionVisibilityMode = "all" | "enrolled_courses";

export type CourseSession = {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  order: number;
  visibilityMode: SessionVisibilityMode;
  courses: Course[];
};
```

- [ ] **Step 2: Add `isSessionVisibleToStudent` helper**

At the top of `src/lib/accessControl.ts`, add a new import line below the existing `@/types/student` import:

```ts
import type { CourseSession } from "@/types/course";
```

Append to the bottom of `src/lib/accessControl.ts` (after existing exports):

```ts
/**
 * Returns true if the given session is visible to the student.
 * - admin → always visible
 * - mode 'all' → always visible
 * - mode 'enrolled_courses' → visible iff student is enrolled in at least one of the session's courses
 */
export function isSessionVisibleToStudent(
  session: Pick<CourseSession, "visibilityMode" | "courses">,
  studentId: string,
  enrollments: Enrollment[],
  classes: Class[],
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (session.visibilityMode === "all") return true;
  return session.courses.some((c) =>
    isStudentEnrolled(studentId, c.id, enrollments, classes)
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run build
```

Expected: build fails with errors in `useCourses.ts` because the `CourseSession` mapping doesn't yet include `visibilityMode`. That's expected — fix in Task 4.

- [ ] **Step 4: Commit**

```bash
git add src/types/course.ts src/lib/accessControl.ts
git commit -m "feat(types): add SessionVisibilityMode + isSessionVisibleToStudent helper"
```

---

## Task 4: Wire `useCourses` hook

**Files:**
- Modify: `src/hooks/useCourses.ts:104-117` (fetch mapping)
- Modify: `src/hooks/useCourses.ts:225-256` (createSession + updateSession)

- [ ] **Step 1: Map `visibility_mode` from row to domain**

In `fetchCourseTree`, replace the trailing `return (sessionsRes.data ?? []).map(...)` block with:

```ts
  return (sessionsRes.data ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description ?? undefined,
    isActive: s.is_active,
    order: s.order,
    visibilityMode: (s.visibility_mode ?? "all") as CourseSession["visibilityMode"],
    courses: courses
      .filter((c) => {
        return (coursesRes.data ?? []).find(
          (r) => r.id === c.id && r.session_id === s.id
        );
      })
      .sort((a, b) => a.order - b.order),
  }));
```

- [ ] **Step 2: Accept `visibilityMode` on `createSession`**

Replace the `createSession` callback:

```ts
  const createSession = useCallback(
    async (data: {
      title: string;
      description?: string;
      isActive: boolean;
      visibilityMode?: CourseSession["visibilityMode"];
    }) => {
      const maxOrder = sessions.reduce((m, s) => Math.max(m, s.order), 0);
      const { error } = await supabase.from("course_sessions").insert({
        title: data.title,
        description: data.description ?? null,
        is_active: data.isActive,
        visibility_mode: data.visibilityMode ?? "all",
        order: maxOrder + 1,
      });
      if (error) throw error;
      invalidate();
    },
    [sessions, invalidate]
  );
```

- [ ] **Step 3: Accept `visibilityMode` on `updateSession`**

Replace the `updateSession` callback:

```ts
  const updateSession = useCallback(
    async (
      sessionId: string,
      patch: Partial<
        Pick<CourseSession, "title" | "description" | "isActive" | "visibilityMode">
      >
    ) => {
      const { error } = await supabase
        .from("course_sessions")
        .update({
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.description !== undefined && { description: patch.description }),
          ...(patch.isActive !== undefined && { is_active: patch.isActive }),
          ...(patch.visibilityMode !== undefined && {
            visibility_mode: patch.visibilityMode,
          }),
        })
        .eq("id", sessionId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );
```

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCourses.ts
git commit -m "feat(courses): persist + read session visibility_mode"
```

---

## Task 5: Admin UI — visibility card on AdminSessionPage

**Files:**
- Modify: `src/pages/admin/AdminSessionPage.tsx:106-156` (state + save handler)
- Modify: `src/pages/admin/AdminSessionPage.tsx:249-277` (form card)

- [ ] **Step 1: Import `SessionVisibilityMode`**

At the top of the file, replace:

```ts
import type { CourseAccess } from "@/types/course";
```

with:

```ts
import type { CourseAccess, SessionVisibilityMode } from "@/types/course";
```

- [ ] **Step 2: Add visibility state**

After line 108 (`const [isActive, setIsActive] = useState(session?.isActive ?? true);`), add:

```ts
  const [visibilityMode, setVisibilityMode] = useState<SessionVisibilityMode>(
    session?.visibilityMode ?? "all"
  );
```

- [ ] **Step 3: Persist visibility on save**

Inside `handleSave`, update the `updateSession` call to include `visibilityMode`:

```ts
    updateSession(sessionId!, {
      title: title.trim(),
      description: description.trim() || undefined,
      isActive,
      visibilityMode,
    });
```

- [ ] **Step 4: Add visibility card after the existing Card**

Find the `</Card>` that closes the Session fields card (around line 277) and insert immediately after it:

```tsx
      {/* ====== Visibility ====== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visibilidade da sessao</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <RadioGroup
            value={visibilityMode}
            onValueChange={(v) => setVisibilityMode(v as SessionVisibilityMode)}
            className="space-y-3"
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem id="vis-all" value="all" className="mt-0.5" />
              <Label htmlFor="vis-all" className="font-normal cursor-pointer">
                <span className="block font-medium">Todos os alunos logados</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  A sessao aparece para qualquer aluno autenticado.
                </span>
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <RadioGroupItem id="vis-enrolled" value="enrolled_courses" className="mt-0.5" />
              <Label htmlFor="vis-enrolled" className="font-normal cursor-pointer">
                <span className="block font-medium">
                  Apenas alunos matriculados em cursos da sessao
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  A sessao aparece somente para alunos com matricula ativa em pelo menos um curso desta sessao.
                </span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
```

`Card`, `CardHeader`, `CardTitle`, `CardContent`, `RadioGroup`, `RadioGroupItem`, `Label` are all already imported at the top of the file — no new imports needed.

- [ ] **Step 5: Manual verify (dev server)**

```bash
npm run dev
```

Open `http://localhost:5174/admin/cursos/sessoes/<any-session-id>`. Confirm:
- New "Visibilidade da sessao" card renders below the title/description card
- Default selected radio is "Todos os alunos logados" (existing data)
- Click "Apenas alunos matriculados em cursos da sessao", click Salvar
- Toast shows "Sessao salva."
- Refresh the page — radio remains on "enrolled_courses"

Verify in DB via SQL Editor:
```sql
SELECT id, title, visibility_mode FROM course_sessions WHERE id = '<id-from-url>';
```
Expected: `visibility_mode = 'enrolled_courses'`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/AdminSessionPage.tsx
git commit -m "feat(admin): visibility radio on session edit page"
```

---

## Task 6: Student UI — filter sessions

**Files:**
- Modify: `src/pages/student/CoursesPage.tsx:26` (import)
- Modify: `src/pages/student/CoursesPage.tsx:73-106` (activeSessions filter)
- Modify: `src/pages/student/CoursesPage.tsx:142-148` (dropdown options)

- [ ] **Step 1: Import the helper**

Replace the existing import line:

```ts
import { isStudentEnrolled } from "@/lib/accessControl";
```

with:

```ts
import { isStudentEnrolled, isSessionVisibleToStudent } from "@/lib/accessControl";
```

- [ ] **Step 2: Filter visibility before existing filters**

Replace the `activeSessions` `useMemo` block:

```ts
  const activeSessions = useMemo(() => {
    let filtered = sessions.filter(
      (s) =>
        s.isActive &&
        s.courses.some((c) => c.isActive) &&
        isSessionVisibleToStudent(s, currentUserId, enrollments, classes, isAdmin)
    );

    if (selectedSessionId !== "all") {
      filtered = filtered.filter((s) => s.id === selectedSessionId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered
        .map((session) => ({
          ...session,
          courses: session.courses.filter((c) => {
            if (!c.isActive) return false;
            if (c.title.toLowerCase().includes(query)) return true;
            if (c.description.toLowerCase().includes(query)) return true;
            return c.modules.some((m) =>
              m.lessons.some(
                (l) =>
                  l.title.toLowerCase().includes(query) ||
                  l.description.toLowerCase().includes(query)
              )
            );
          }),
        }))
        .filter((s) => s.courses.length > 0);
    }

    return filtered;
  }, [
    sessions,
    selectedSessionId,
    searchQuery,
    currentUserId,
    enrollments,
    classes,
    isAdmin,
  ]);
```

- [ ] **Step 3: Filter session dropdown options**

Replace the `<SelectContent>` block under the session filter `<Select>` (around line 140-149):

```tsx
          <SelectContent>
            <SelectItem value="all">Todas as sessoes</SelectItem>
            {sessions
              .filter(
                (s) =>
                  s.isActive &&
                  isSessionVisibleToStudent(
                    s,
                    currentUserId,
                    enrollments,
                    classes,
                    isAdmin
                  )
              )
              .map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.title}
                </SelectItem>
              ))}
          </SelectContent>
```

- [ ] **Step 4: Manual verify**

Pre-conditions for the test:
- Pick a non-admin student account A
- A has zero enrollments in courses of session S
- Set `S.visibility_mode = 'enrolled_courses'` via Admin UI

Verify:
1. Login as A → open `/cursos`. Session S section is NOT rendered. Dropdown "Todas as sessoes" does NOT list S.
2. Logout. Login as admin → open `/cursos`. Session S IS rendered (admin override). Dropdown lists S.
3. Switch S to `'all'` via admin → as A, refresh `/cursos`. S now appears.
4. Verify "Meus Cursos" section is unchanged in all states (still shows enrolled courses for student A based on enrollments).

- [ ] **Step 5: Run lint + build**

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add src/pages/student/CoursesPage.tsx
git commit -m "feat(student): hide sessions whose visibility excludes the student"
```

---

## Task 7: Final smoke check

- [ ] **Step 1: Verify acceptance criteria from spec**

Run `npm run dev`. Test each item:

- [ ] Admin toggles visibility on `/admin/cursos/sessoes/:id` and saves — value persists after page refresh
- [ ] Session in `'all'` mode: visible for both an enrolled and a non-enrolled student
- [ ] Session in `'enrolled_courses'` mode: visible only for an enrolled student
- [ ] Session in `'enrolled_courses'` mode: hidden from the dropdown filter for a non-enrolled student
- [ ] Admin sees all sessions regardless of mode (logged in as `fotografoandresouza@gmail.com` or any owner/admin/support/moderator role)
- [ ] "Meus Cursos" section still shows the student's enrolled courses regardless of session visibility settings

- [ ] **Step 2: Mark plan complete**

```bash
git log --oneline -10
```

Expected: 6 new commits since the start of the plan, in this order:
1. `feat(db): add visibility_mode to course_sessions`
2. `feat(types): add visibility_mode to course_sessions row`
3. `feat(types): add SessionVisibilityMode + isSessionVisibleToStudent helper`
4. `feat(courses): persist + read session visibility_mode`
5. `feat(admin): visibility radio on session edit page`
6. `feat(student): hide sessions whose visibility excludes the student`
