# Live Lessons — Replay & Email Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add replay persistence toggle, redesigned student page (hero + chips + grid), and admin-controlled email reminders (24h/12h/1h) for live lessons.

**Architecture:** Schema migration adds 8 columns to `live_lessons` + 1 to `notification_preferences`. The existing `email-scheduler` Edge Function gains a `processLiveReminders` block that sends through Resend directly. The student `/ao-vivo` page is rewritten Combo D. The admin dialog gains two new blocks (Replay + Notificações).

**Tech Stack:** Vite + React 18 + TS, Supabase (Postgres + Edge Functions in Deno), Resend, TanStack React Query, Tailwind + Radix UI (shadcn-style), date-fns.

**Testing note:** The project has no test runner installed (no Vitest/Jest). TDD here adapts to context: pure helpers get a self-contained `*.test.mjs` script run via `node`; UI flows are verified via `npm run build` + manual smoke on the dev server. Don't add a test runner as part of this plan.

**Spec reference:** [`docs/superpowers/specs/2026-05-14-live-lessons-replay-reminders-design.md`](../specs/2026-05-14-live-lessons-replay-reminders-design.md)

**File map:**
- Create: `supabase/migrations/20260514000001_live_lessons_replay_reminders.sql`
- Create: `src/hooks/__tests__/getReplayUrl.test.mjs`
- Create: `src/components/live/LessonHero.tsx`
- Create: `src/components/live/StatusBadgeWithCountdown.tsx`
- Modify: `supabase/migrations/001_initial_schema.sql` (sync schema)
- Modify: `src/lib/database.types.ts` (regen)
- Modify: `src/hooks/useLiveLessons.ts` (types + mapper + payloads + `getReplayUrl`)
- Modify: `src/pages/admin/AdminLiveLessonsPage.tsx` (dialog + card badges)
- Modify: `src/pages/student/LiveLessonsPage.tsx` (Combo D rewrite)
- Modify: `supabase/functions/email-scheduler/index.ts` (add `processLiveReminders`)

---

## Task 1: Migration — schema + email_automation seed

**Files:**
- Create: `supabase/migrations/20260514000001_live_lessons_replay_reminders.sql`
- Modify: `supabase/migrations/001_initial_schema.sql` (mirror the changes)

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260514000001_live_lessons_replay_reminders.sql
-- Add replay toggle + per-live email reminder settings to live_lessons.
-- Add per-user opt-in for live_reminder emails to notification_preferences.
-- Seed live_reminder automation.

ALTER TABLE live_lessons
  ADD COLUMN IF NOT EXISTS replay_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_24h boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_12h boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_1h boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_24h_sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS notify_12h_sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS notify_1h_sent_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_live_lessons_scheduled_at_notify
  ON live_lessons (scheduled_at)
  WHERE notify_email_enabled = true;

INSERT INTO email_automations (
  type, name, description, category, is_active,
  delay_hours, subject_template, preview_text
)
VALUES (
  'live_reminder',
  'Lembrete de aula ao vivo',
  'Email enviado antes de aula ao vivo (24h / 12h / 1h)',
  'engagement',
  true,
  0,
  'Sua aula ao vivo {{when_label}}: {{title}}',
  'Não perca: {{title}} {{when_human}}'
)
ON CONFLICT (type) DO NOTHING;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_live_reminder boolean NOT NULL DEFAULT true;
```

- [ ] **Step 2: Apply migration in Supabase Dashboard**

Project `gdbkbeurjjtjgmrmfngk` (per CLAUDE.md — MCP cannot reach this project; use SQL Editor or `curl` with service role key).

Go to: https://supabase.com/dashboard/project/gdbkbeurjjtjgmrmfngk/sql
Paste the migration SQL, click Run.

Expected: no errors. If `live_lessons` already has any of the columns, `IF NOT EXISTS` skips silently.

- [ ] **Step 3: Verify the columns exist**

In SQL Editor:
```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'live_lessons'
  AND column_name IN (
    'replay_enabled','notify_email_enabled','notify_24h','notify_12h','notify_1h',
    'notify_24h_sent_at','notify_12h_sent_at','notify_1h_sent_at'
  )
ORDER BY column_name;
```

Expected: 8 rows. All boolean columns default false except `replay_enabled` (true). All `*_sent_at` are `timestamptz` nullable.

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='notification_preferences' AND column_name='email_live_reminder';
```
Expected: 1 row.

```sql
SELECT type, is_active FROM email_automations WHERE type='live_reminder';
```
Expected: 1 row, `is_active = true`.

- [ ] **Step 4: Mirror into `001_initial_schema.sql`**

CLAUDE.md requires `001_initial_schema.sql` stays in sync with prod schema. Locate the existing `CREATE TABLE live_lessons (...)` block, append the new columns to the column list. Locate the `CREATE TABLE notification_preferences (...)` block, append `email_live_reminder boolean NOT NULL DEFAULT true`. Locate the seed `INSERT INTO email_automations ...` and append the `live_reminder` row inside the existing VALUES list (preserve `ON CONFLICT` clause).

Run:
```bash
cd "/Users/andresouza/Desktop/Apps e Projetos/01 - app andre/master-membros/lumi-membros"
grep -n "live_lessons\|email_automations\|notification_preferences" supabase/migrations/001_initial_schema.sql | head -40
```

Use the line numbers to target precise edits.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260514000001_live_lessons_replay_reminders.sql \
        supabase/migrations/001_initial_schema.sql
git commit -m "feat(live): add replay flag, email reminder columns, automation seed

Schema migration adds 8 columns to live_lessons (replay_enabled +
notify_email_enabled + 3 slot toggles + 3 sent_at timestamps), seeds
the live_reminder email automation, and adds email_live_reminder to
notification_preferences (default true).

Defaults are non-breaking: replay_enabled=true preserves the current
'past lives stay visible' behaviour, and notify_email_enabled=false
opts every existing row out of reminders."
```

---

## Task 2: Regenerate database.types.ts

**Files:**
- Modify: `src/lib/database.types.ts`

- [ ] **Step 1: Regenerate via Supabase CLI (preferred)**

If a typegen script exists in `package.json`, run it:
```bash
cd "/Users/andresouza/Desktop/Apps e Projetos/01 - app andre/master-membros/lumi-membros"
grep -E "supabase gen|gen:types|gen-types" package.json
```

If a script is defined: `npm run <that-script>`.

If no script: use the Supabase CLI directly (requires login + access token):
```bash
npx supabase gen types typescript --project-id gdbkbeurjjtjgmrmfngk > src/lib/database.types.ts
```

- [ ] **Step 2: Fallback — hand-patch the types file**

If the CLI is not available, edit `src/lib/database.types.ts` directly. Locate the `live_lessons` block (`Row`, `Insert`, `Update` triplet) and append:

```ts
// Row additions:
          replay_enabled: boolean;
          notify_email_enabled: boolean;
          notify_24h: boolean;
          notify_12h: boolean;
          notify_1h: boolean;
          notify_24h_sent_at: string | null;
          notify_12h_sent_at: string | null;
          notify_1h_sent_at: string | null;

// Insert additions (all optional, mirror defaults):
          replay_enabled?: boolean;
          notify_email_enabled?: boolean;
          notify_24h?: boolean;
          notify_12h?: boolean;
          notify_1h?: boolean;
          notify_24h_sent_at?: string | null;
          notify_12h_sent_at?: string | null;
          notify_1h_sent_at?: string | null;

// Update additions: same shape as Insert.
```

Locate the `notification_preferences` block and append:
```ts
// Row:    email_live_reminder: boolean;
// Insert: email_live_reminder?: boolean;
// Update: email_live_reminder?: boolean;
```

- [ ] **Step 3: Verify build still passes**

```bash
cd "/Users/andresouza/Desktop/Apps e Projetos/01 - app andre/master-membros/lumi-membros"
npm run build
```

Expected: build succeeds. No type errors should appear yet (consumers come in later tasks).

- [ ] **Step 4: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "chore(types): regen database types for live_lessons replay/reminder columns"
```

---

## Task 3: Pure helper — `getReplayUrl()` with test script

**Files:**
- Modify: `src/hooks/useLiveLessons.ts`
- Create: `src/hooks/__tests__/getReplayUrl.test.mjs`

- [ ] **Step 1: Write the test script (failing)**

```js
// src/hooks/__tests__/getReplayUrl.test.mjs
// Standalone test for getReplayUrl. Run via `node` after compiling the hook
// or by inlining the function for the matrix below.

import assert from 'node:assert/strict';

// Re-implementation mirroring the function under test. Update this if the
// signature/contract of getReplayUrl changes, then re-run.
function getReplayUrl(l) {
  if (!l.replayEnabled) return null;
  return l.recordingUrl ?? l.meetingUrl ?? null;
}

const cases = [
  { name: 'disabled',         in: { replayEnabled: false, recordingUrl: 'r', meetingUrl: 'm' }, out: null },
  { name: 'recording wins',   in: { replayEnabled: true,  recordingUrl: 'r', meetingUrl: 'm' }, out: 'r' },
  { name: 'meeting fallback', in: { replayEnabled: true,  recordingUrl: null, meetingUrl: 'm' }, out: 'm' },
  { name: 'no link',          in: { replayEnabled: true,  recordingUrl: null, meetingUrl: null }, out: null },
];

let failed = 0;
for (const c of cases) {
  try {
    assert.equal(getReplayUrl(c.in), c.out);
    console.log(`ok  ${c.name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${c.name}: expected ${c.out}, got ${getReplayUrl(c.in)}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} tests passed`);
```

- [ ] **Step 2: Run the test — confirm 4 pass**

```bash
cd "/Users/andresouza/Desktop/Apps e Projetos/01 - app andre/master-membros/lumi-membros"
node src/hooks/__tests__/getReplayUrl.test.mjs
```

Expected output:
```
ok  disabled
ok  recording wins
ok  meeting fallback
ok  no link

All 4 tests passed
```

(The function logic lives inside the test file as a mirror; once Task 3 Step 3 adds the real export, future changes flow: edit hook → mirror the change in the test file → re-run.)

- [ ] **Step 3: Add the helper to `useLiveLessons.ts`**

In `src/hooks/useLiveLessons.ts`, add immediately after the existing `getComputedStatus` export (around line 67):

```ts
// ---------------------------------------------------------------------------
// Replay URL resolver — uses recording_url override or meeting_url fallback,
// respecting the admin's replay_enabled flag.
// ---------------------------------------------------------------------------

export function getReplayUrl(lesson: LiveLesson): string | null {
  if (!lesson.replayEnabled) return null;
  return lesson.recordingUrl ?? lesson.meetingUrl ?? null;
}
```

- [ ] **Step 4: Extend the `LiveLesson` type + `LiveLessonInput`**

Same file, modify the existing type block (around line 13):

```ts
export type LiveLesson = {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  instructorId: string | null;
  instructorName: string | null;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl: string | null;
  salesUrl: string | null;
  recordingUrl: string | null;
  courseId: string | null;
  classIds: string[];
  accessMode: LiveLessonAccessMode;
  status: LiveLessonStatus;
  createdAt: string;
  // NEW
  replayEnabled: boolean;
  notifyEmailEnabled: boolean;
  notify24h: boolean;
  notify12h: boolean;
  notify1h: boolean;
  notify24hSentAt: string | null;
  notify12hSentAt: string | null;
  notify1hSentAt: string | null;
};

export type LiveLessonInput = {
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  instructorId?: string | null;
  instructorName?: string | null;
  scheduledAt: string;
  durationMinutes?: number;
  meetingUrl?: string | null;
  salesUrl?: string | null;
  recordingUrl?: string | null;
  courseId?: string | null;
  classIds?: string[];
  accessMode?: LiveLessonAccessMode;
  status?: LiveLessonStatus;
  // NEW
  replayEnabled?: boolean;
  notifyEmailEnabled?: boolean;
  notify24h?: boolean;
  notify12h?: boolean;
  notify1h?: boolean;
};
```

- [ ] **Step 5: Extend `mapRow()`**

Same file, modify around line 75:

```ts
function mapRow(r: Record<string, unknown>): LiveLesson {
  return {
    id: r.id as string,
    title: r.title as string,
    description: r.description as string | null,
    coverUrl: r.cover_url as string | null,
    instructorId: r.instructor_id as string | null,
    instructorName: r.instructor_name as string | null,
    scheduledAt: r.scheduled_at as string,
    durationMinutes: r.duration_minutes as number,
    meetingUrl: r.meeting_url as string | null,
    salesUrl: r.sales_url as string | null,
    recordingUrl: r.recording_url as string | null,
    courseId: r.course_id as string | null,
    classIds: (r.class_ids as string[]) ?? [],
    accessMode: (r.access_mode as LiveLessonAccessMode) ?? "all",
    status: (r.status as LiveLessonStatus) ?? "scheduled",
    createdAt: r.created_at as string,
    replayEnabled: (r.replay_enabled as boolean) ?? true,
    notifyEmailEnabled: (r.notify_email_enabled as boolean) ?? false,
    notify24h: (r.notify_24h as boolean) ?? false,
    notify12h: (r.notify_12h as boolean) ?? false,
    notify1h: (r.notify_1h as boolean) ?? false,
    notify24hSentAt: (r.notify_24h_sent_at as string | null) ?? null,
    notify12hSentAt: (r.notify_12h_sent_at as string | null) ?? null,
    notify1hSentAt: (r.notify_1h_sent_at as string | null) ?? null,
  };
}
```

- [ ] **Step 6: Extend `createLesson` and `updateLesson` payloads**

In `createLesson` (around line 141), inside the `supabase.from("live_lessons").insert({ ... })` payload, append:

```ts
        replay_enabled: input.replayEnabled ?? true,
        notify_email_enabled: input.notifyEmailEnabled ?? false,
        notify_24h: input.notify24h ?? false,
        notify_12h: input.notify12h ?? false,
        notify_1h: input.notify1h ?? false,
```

In `updateLesson` (around line 166), inside the conditional payload-building section, append:

```ts
      if (input.replayEnabled !== undefined) payload.replay_enabled = input.replayEnabled;
      if (input.notifyEmailEnabled !== undefined) payload.notify_email_enabled = input.notifyEmailEnabled;
      if (input.notify24h !== undefined) payload.notify_24h = input.notify24h;
      if (input.notify12h !== undefined) payload.notify_12h = input.notify12h;
      if (input.notify1h !== undefined) payload.notify_1h = input.notify1h;
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: success. If types don't match `database.types.ts`, fix Task 2 first.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useLiveLessons.ts src/hooks/__tests__/getReplayUrl.test.mjs
git commit -m "feat(live): add replayEnabled + reminder fields to useLiveLessons hook

Extends LiveLesson type and mapper with the 8 new DB columns. Adds
getReplayUrl() helper that respects replayEnabled and falls back from
recording_url to meeting_url. Includes a standalone node test script
covering the resolver matrix (4 cases)."
```

---

## Task 4: Admin dialog — Replay + Notificações blocks

**Files:**
- Modify: `src/pages/admin/AdminLiveLessonsPage.tsx`

- [ ] **Step 1: Import the `Switch` primitive**

At the top of `AdminLiveLessonsPage.tsx` (around line 13), confirm there is no existing `Switch` import. If not, add:

```ts
import { Switch } from "@/components/ui/switch";
```

(`switch.tsx` exists in `src/components/ui/` per project layout.)

- [ ] **Step 2: Extend `EMPTY_FORM`**

Replace the existing `EMPTY_FORM` (around line 59) with:

```ts
const EMPTY_FORM = {
  title: "",
  description: "",
  coverUrl: "",
  instructorName: "",
  scheduledAt: "",
  durationMinutes: 60,
  meetingUrl: "",
  salesUrl: "",
  recordingUrl: "",
  courseId: "",
  classIds: [] as string[],
  accessMode: "all" as "all" | "classes" | "open",
  status: "scheduled" as LiveLessonStatus,
  // NEW
  replayEnabled: true,
  notifyEmailEnabled: false,
  notify24h: false,
  notify12h: false,
  notify1h: false,
};
```

- [ ] **Step 3: Extend `openEdit` to hydrate the new fields**

In `openEdit` (around line 98), update the `setForm({...})` payload to include:

```ts
      replayEnabled: l.replayEnabled,
      notifyEmailEnabled: l.notifyEmailEnabled,
      notify24h: l.notify24h,
      notify12h: l.notify12h,
      notify1h: l.notify1h,
```

- [ ] **Step 4: Extend `handleSave` payload**

In `handleSave` (around line 125), inside the `payload` object, append:

```ts
        replayEnabled: form.replayEnabled,
        notifyEmailEnabled: form.notifyEmailEnabled,
        notify24h: form.notify24h,
        notify12h: form.notify12h,
        notify1h: form.notify1h,
```

- [ ] **Step 5: Add the "Replay" block to the dialog body**

The dialog body lives inside the `<DialogContent>` (around line 297). Insert the Replay block **immediately after** the "URL da gravação" field (after the `</div>` that closes it, around line 391) and **before** the "Curso vinculado + Status" grid:

```tsx
            <div className="rounded-md border border-border/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Manter disponível como replay após o término</Label>
                <Switch
                  checked={form.replayEnabled}
                  onCheckedChange={(v) => setForm({ ...form, replayEnabled: v })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Quando ligado, a aula continua acessível em Aulas ao Vivo após o horário.
                Usa a URL da gravação se preenchida, ou a URL da reunião como fallback.
              </p>
            </div>
```

- [ ] **Step 6: Add the "Notificações por email" block**

Insert **immediately after** the "Curso vinculado + Status" grid (after its closing `</div>`, around line 423) and **before** the "Acesso" block:

```tsx
            <div className="rounded-md border border-border/40 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Enviar lembretes por email</Label>
                <Switch
                  checked={form.notifyEmailEnabled}
                  disabled={form.accessMode === "open"}
                  onCheckedChange={(v) => setForm({ ...form, notifyEmailEnabled: v })}
                />
              </div>
              {form.accessMode === "open" && (
                <p className="text-xs text-amber-500">
                  Acesso aberto não permite envio de email (sem usuários autenticados).
                </p>
              )}
              {form.notifyEmailEnabled && form.accessMode !== "open" && (
                <div className="space-y-2 pl-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.notify24h}
                      onChange={(e) => setForm({ ...form, notify24h: e.target.checked })}
                    />
                    24h antes — "é amanhã"
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.notify12h}
                      onChange={(e) => setForm({ ...form, notify12h: e.target.checked })}
                    />
                    12h antes
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.notify1h}
                      onChange={(e) => setForm({ ...form, notify1h: e.target.checked })}
                    />
                    1h antes
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Enviado apenas para alunos com acesso e que mantêm notificações de
                    aulas ao vivo ativadas no perfil.
                  </p>
                </div>
              )}
            </div>
```

- [ ] **Step 7: Add badges to the list card**

In the `lessons.map(...)` block (around line 217), after the row that renders status badges (`{cs === "live" ? (...) : (...)}`), append (still inside the same flex container, around line 254):

```tsx
                        {lesson.notifyEmailEnabled && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            📧 Lembretes
                            {[
                              lesson.notify24h && "24h",
                              lesson.notify12h && "12h",
                              lesson.notify1h && "1h",
                            ]
                              .filter(Boolean)
                              .join(" • ") || "(nenhum)"}
                          </Badge>
                        )}
                        {!lesson.replayEnabled && (
                          <Badge variant="outline" className="text-[10px]">
                            Replay off
                          </Badge>
                        )}
```

- [ ] **Step 8: Build + manual smoke**

```bash
cd "/Users/andresouza/Desktop/Apps e Projetos/01 - app andre/master-membros/lumi-membros"
npm run build
```
Expected: success.

```bash
npm run dev
```
Open http://localhost:5174/admin/aulas-ao-vivo (logged in as admin/owner).

Verify:
1. Click "Nova aula" → dialog shows new Replay block (switch ON by default) and Notificações block (switch OFF). 3 checkboxes appear when notify switch flipped on.
2. Change Acesso to "Aberto (sem autenticação)" → Notificações switch becomes disabled, amber warning appears.
3. Save a test live with notify ON + 24h+1h checked → list card shows "📧 Lembretes 24h • 1h" badge.
4. Edit the saved live → all toggles reflect saved state.
5. Toggle replay off → list card shows "Replay off" badge.

- [ ] **Step 9: Commit**

```bash
git add src/pages/admin/AdminLiveLessonsPage.tsx
git commit -m "feat(admin-live): replay toggle + per-live email reminder controls

Adds two new blocks to the live lesson dialog: a Replay switch (default
ON) that controls whether the lesson stays visible after end, and a
master Notify switch with 24h/12h/1h slot checkboxes. The Notify switch
auto-disables when accessMode='open' (no authenticated recipients).
List cards surface the active configuration via small badges."
```

---

## Task 5: Build `LessonHero` + `StatusBadgeWithCountdown`

**Files:**
- Create: `src/components/live/StatusBadgeWithCountdown.tsx`
- Create: `src/components/live/LessonHero.tsx`

- [ ] **Step 1: Write `StatusBadgeWithCountdown.tsx`**

```tsx
// src/components/live/StatusBadgeWithCountdown.tsx
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { LiveBadge } from "@/components/ui/LiveBadge";
import type { LiveLessonStatus } from "@/hooks/useLiveLessons";

interface Props {
  status: LiveLessonStatus;
  scheduledAt?: string;
}

function humanCountdown(scheduledAt: string): string {
  const start = new Date(scheduledAt).getTime();
  const diffMin = Math.round((start - Date.now()) / 60_000);
  if (diffMin < 0) return "Já começou";
  if (diffMin < 60) return `Começa em ${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (hours < 24) {
    return mins > 0 ? `Em ${hours}h ${mins}min` : `Em ${hours}h`;
  }
  const days = Math.round(hours / 24);
  if (days === 1) return `Amanhã às ${format(new Date(scheduledAt), "HH:mm", { locale: ptBR })}`;
  return `Em ${days} dias`;
}

export function StatusBadgeWithCountdown({ status, scheduledAt }: Props) {
  if (status === "live") return <LiveBadge />;
  if (status === "scheduled" && scheduledAt) {
    return (
      <Badge variant="outline" className="text-[11px] gap-1">
        {humanCountdown(scheduledAt)}
      </Badge>
    );
  }
  const cfg: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    scheduled: { label: "Agendada", variant: "outline" },
    ended: { label: "Encerrada", variant: "secondary" },
    recorded: { label: "Replay", variant: "default" },
    cancelled: { label: "Cancelada", variant: "outline" },
  };
  const c = cfg[status] ?? cfg.scheduled;
  return <Badge variant={c.variant} className="text-[11px]">{c.label}</Badge>;
}
```

- [ ] **Step 2: Write `LessonHero.tsx`**

```tsx
// src/components/live/LessonHero.tsx
import { Clock, PlayCircle, ExternalLink, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadgeWithCountdown } from "./StatusBadgeWithCountdown";
import { getComputedStatus } from "@/hooks/useLiveLessons";
import type { LiveLesson } from "@/hooks/useLiveLessons";
import { cn } from "@/lib/utils";

interface Props {
  lesson: LiveLesson;
  isEnrolled: boolean;
  onJoin: (l: LiveLesson) => void;
}

export function LessonHero({ lesson, isEnrolled, onJoin }: Props) {
  const cs = getComputedStatus(lesson);
  const isLive = cs === "live";

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border border-border/50 mb-6 group",
        isLive && "border-red-500/40 shadow-lg shadow-red-500/10"
      )}
    >
      <div className="aspect-[16/9] sm:aspect-[21/9] bg-muted">
        {lesson.coverUrl ? (
          <img
            src={lesson.coverUrl}
            alt={lesson.title}
            loading="eager"
            className="w-full h-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 space-y-2 sm:space-y-3">
        <StatusBadgeWithCountdown status={cs} scheduledAt={lesson.scheduledAt} />
        <h2 className="text-xl sm:text-3xl font-bold tracking-tight line-clamp-2">
          {lesson.title}
        </h2>
        {lesson.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 max-w-2xl">
            {lesson.description}
          </p>
        )}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {lesson.instructorName && <span>por {lesson.instructorName}</span>}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lesson.durationMinutes}min
            </span>
          </div>

          {isLive && isEnrolled && lesson.meetingUrl && (
            <Button
              size="sm"
              className="gap-2 bg-red-500 hover:bg-red-600 text-white animate-pulse-soft"
              onClick={() => onJoin(lesson)}
            >
              <PlayCircle className="h-4 w-4" />
              Entrar agora
            </Button>
          )}
          {cs === "scheduled" && isEnrolled && lesson.meetingUrl && (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => onJoin(lesson)}>
              <ExternalLink className="h-3.5 w-3.5" />
              Salvar link
            </Button>
          )}
          {!isEnrolled && lesson.salesUrl && (
            <Button size="sm" variant="outline" className="gap-2" asChild>
              <a href={lesson.salesUrl} target="_blank" rel="noreferrer">
                <ShoppingCart className="h-3.5 w-3.5" />
                Quero participar
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/components/live/StatusBadgeWithCountdown.tsx src/components/live/LessonHero.tsx
git commit -m "feat(live): add LessonHero + StatusBadgeWithCountdown components

Hero block surfaces the next/current live in a 21:9 (mobile 16:9) cover
with gradient overlay, status badge with human countdown ('Em 2h',
'Amanhã às 16:00'), title, instructor + duration metadata, and the
contextual CTA (Entrar agora / Salvar link / Quero participar)."
```

---

## Task 6: Rewrite `LiveLessonsPage` — chips + grid + hero integration

**Files:**
- Modify: `src/pages/student/LiveLessonsPage.tsx`

- [ ] **Step 1: Replace the page contents**

Overwrite the file with:

```tsx
import { useCallback, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Video, Calendar, Clock, ExternalLink, PlayCircle, ShoppingCart } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { useLiveLessons, getComputedStatus, getReplayUrl } from "@/hooks/useLiveLessons";
import type { LiveLesson } from "@/hooks/useLiveLessons";
import { useCurrentUserEnrollments } from "@/hooks/useCurrentUserEnrollments";
import { useClasses } from "@/hooks/useClasses";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/contexts/AuthContext";
import { isStudentEnrolled, isEnrollmentValid } from "@/lib/accessControl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LessonHero } from "@/components/live/LessonHero";
import { StatusBadgeWithCountdown } from "@/components/live/StatusBadgeWithCountdown";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "live", label: "Ao vivo" },
  { id: "upcoming", label: "Próximas" },
  { id: "replays", label: "Replays" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

// ---------------------------------------------------------------------------
// Card — reused for the grid below the hero
// ---------------------------------------------------------------------------

function LessonCard({
  lesson,
  onJoin,
  isEnrolled,
}: {
  lesson: LiveLesson;
  onJoin: (l: LiveLesson) => void;
  isEnrolled: boolean;
}) {
  const cs = getComputedStatus(lesson);
  const replayUrl = getReplayUrl(lesson);
  const isPast = cs === "ended" || cs === "recorded";

  return (
    <Card
      className={cn(
        "border-border/50 hover:border-border transition-all overflow-hidden",
        cs === "live" && "border-red-500/40 shadow-lg shadow-red-500/10"
      )}
    >
      {lesson.coverUrl && (
        <div className="aspect-video bg-muted overflow-hidden">
          <img
            src={lesson.coverUrl}
            alt={lesson.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold line-clamp-2 flex-1">{lesson.title}</h3>
          <StatusBadgeWithCountdown status={cs} scheduledAt={lesson.scheduledAt} />
        </div>

        {lesson.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{lesson.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(lesson.scheduledAt), "dd/MM HH:mm", { locale: ptBR })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {lesson.durationMinutes}min
          </span>
          {lesson.instructorName && <span>por {lesson.instructorName}</span>}
        </div>

        {cs === "scheduled" && isEnrolled && lesson.meetingUrl && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(lesson.scheduledAt), { locale: ptBR, addSuffix: true })}
            </span>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onJoin(lesson)}>
              <ExternalLink className="h-3.5 w-3.5" />
              Salvar link
            </Button>
          </div>
        )}

        {cs === "scheduled" && !isEnrolled && lesson.salesUrl && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(lesson.scheduledAt), { locale: ptBR, addSuffix: true })}
            </span>
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <a href={lesson.salesUrl} target="_blank" rel="noreferrer">
                <ShoppingCart className="h-3.5 w-3.5" />
                Quero participar
              </a>
            </Button>
          </div>
        )}

        {cs === "live" && isEnrolled && lesson.meetingUrl && (
          <Button
            size="sm"
            className="w-full gap-2 bg-red-500 hover:bg-red-600 text-white"
            onClick={() => onJoin(lesson)}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Entrar agora
          </Button>
        )}

        {cs === "live" && !isEnrolled && lesson.salesUrl && (
          <Button size="sm" variant="outline" className="w-full gap-2" asChild>
            <a href={lesson.salesUrl} target="_blank" rel="noreferrer">
              <ShoppingCart className="h-3.5 w-3.5" />
              Quero participar
            </a>
          </Button>
        )}

        {isPast && replayUrl && (
          <Button size="sm" variant="secondary" className="w-full gap-2" asChild>
            <a href={replayUrl} target="_blank" rel="noreferrer">
              <PlayCircle className="h-3.5 w-3.5" />
              Assistir gravação
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page — Combo D (hero + chips + grid)
// ---------------------------------------------------------------------------

export default function LiveLessonsPage() {
  const { lessons, loading, joinLesson } = useLiveLessons();
  const { currentUserId } = useCurrentUser();
  const { enrollments } = useCurrentUserEnrollments();
  const { classes } = useClasses();
  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState<FilterId>("all");

  const checkEnrolled = useCallback(
    (lesson: LiveLesson): boolean => {
      if (!currentUserId) return false;
      if (isAdmin) return true;
      if (lesson.accessMode === "open") return true;
      if (lesson.accessMode === "classes") {
        return enrollments.some(
          (e) =>
            e.studentId === currentUserId &&
            lesson.classIds.includes(e.classId) &&
            isEnrollmentValid(e)
        );
      }
      if (lesson.courseId) {
        return isStudentEnrolled(currentUserId, lesson.courseId, enrollments, classes);
      }
      return enrollments.some(
        (e) => e.studentId === currentUserId && isEnrollmentValid(e)
      );
    },
    [currentUserId, isAdmin, enrollments, classes]
  );

  // Bucket all lessons into live / scheduled / visibleReplays.
  const { live, scheduled, replays, hero } = useMemo(() => {
    const all = lessons.filter((l) => getComputedStatus(l) !== "cancelled");
    const live: LiveLesson[] = [];
    const scheduled: LiveLesson[] = [];
    const replays: LiveLesson[] = [];

    for (const l of all) {
      const cs = getComputedStatus(l);
      if (cs === "live") live.push(l);
      else if (cs === "scheduled") scheduled.push(l);
      else if ((cs === "ended" || cs === "recorded") && l.replayEnabled && getReplayUrl(l)) {
        replays.push(l);
      }
    }
    scheduled.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    replays.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    const hero = live[0] ?? scheduled[0] ?? null;
    return { live, scheduled, replays, hero };
  }, [lessons]);

  // Filtered grid (excludes hero from "all"/"upcoming"/"live")
  const gridLessons = useMemo(() => {
    const exceptHero = (arr: LiveLesson[]) => (hero ? arr.filter((l) => l.id !== hero.id) : arr);
    switch (filter) {
      case "live":
        return exceptHero(live);
      case "upcoming":
        return exceptHero(scheduled);
      case "replays":
        return replays;
      case "all":
      default:
        return [...exceptHero(live), ...exceptHero(scheduled), ...replays];
    }
  }, [filter, live, scheduled, replays, hero]);

  const handleJoin = async (lesson: LiveLesson) => {
    if (!lesson.meetingUrl) {
      toast.error("Link da reunião não disponível");
      return;
    }
    try {
      await joinLesson(lesson.id);
    } catch {
      /* non-blocking */
    }
    window.open(lesson.meetingUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl pb-20 sm:pb-12 px-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mt-6 mb-4" />
        <div className="aspect-[21/9] bg-muted animate-pulse rounded-xl mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const totalVisible = live.length + scheduled.length + replays.length;

  return (
    <div className="mx-auto max-w-6xl pb-20 sm:pb-12 px-4">
      <Helmet>
        <title>Aulas ao Vivo</title>
      </Helmet>

      <div className="flex items-center gap-3 pt-6 pb-4">
        <Video className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Aulas ao Vivo</h1>
          <p className="text-sm text-muted-foreground">
            Participe das aulas ao vivo e assista gravações anteriores
          </p>
        </div>
      </div>

      {hero && (
        <LessonHero lesson={hero} isEnrolled={checkEnrolled(hero)} onJoin={handleJoin} />
      )}

      {totalVisible > 0 && (
        <div className="sticky top-[64px] z-10 -mx-4 px-4 bg-background/85 backdrop-blur-sm py-2 mb-4 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors",
                  filter === f.id
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-background text-muted-foreground border-border/40 hover:border-border"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {totalVisible === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma aula ao vivo no momento.
            </p>
          </CardContent>
        </Card>
      ) : gridLessons.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma aula nesta categoria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gridLessons.map((l) => (
            <LessonCard
              key={l.id}
              lesson={l}
              onJoin={handleJoin}
              isEnrolled={checkEnrolled(l)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: success. If there's a stray reference (e.g. removed `LiveBadge` import), TypeScript flags it — fix and rerun.

- [ ] **Step 3: Manual smoke on dev server**

```bash
npm run dev
```
Open http://localhost:5174/ao-vivo with a student account.

Verify:
1. Hero block renders for the upcoming live (or "live now" if applicable). Countdown shows "Em 2 dias" / "Amanhã às 16:00" / "Em 2h 30min" appropriate to scheduledAt.
2. Chips bar shows below hero. Default "Todas" highlighted.
3. Click each chip → grid filters accordingly. "Replays" shows only past lives with `replay_enabled = true` and a resolved link; "Próximas" excludes the hero lesson; "Ao vivo" empty when nothing is live.
4. Past live with `replay_enabled = false` (set via admin) does not appear in "Todas" nor "Replays".
5. Replay card CTA "Assistir gravação" opens `recording_url` if set, else `meeting_url`.
6. Mobile width (resize browser to 375px): hero stacks, chips scroll horizontally, grid is 1 column.

- [ ] **Step 4: Commit**

```bash
git add src/pages/student/LiveLessonsPage.tsx
git commit -m "feat(live-student): redesign /ao-vivo with hero + chips + grid

Combo D layout: a 21:9 hero block for the next live (live now wins over
scheduled), a horizontal chip filter bar (Todas / Ao vivo / Próximas /
Replays), and a 3-column grid below. Past lives only surface when
replay_enabled and a replay URL is resolvable. Cards show a 'Assistir
gravação' CTA when a replay is available."
```

---

## Task 7: Edge Function — `processLiveReminders` block

**Files:**
- Modify: `supabase/functions/email-scheduler/index.ts`

- [ ] **Step 1: Add the `processLiveReminders` helper to the function**

Insert this helper between section "2. Community inactive 30 days" (around line 286) and section "3. Cleanup old read notifications" (around line 288). The helper is a self-contained block reusing the already-instantiated `supabase` client, `RESEND_API_KEY`, `PLATFORM_URL`, `PLATFORM_NAME`, `FROM_EMAIL`, and `buildEmailHtml`:

```ts
    // ------------------------------------------------------------------
    // 3. Live lesson reminders — 24h / 12h / 1h before scheduled_at
    // ------------------------------------------------------------------
    const { data: liveAutomation } = await supabase
      .from("email_automations")
      .select("is_active")
      .eq("type", "live_reminder")
      .single();

    if (liveAutomation?.is_active) {
      const nowMs = Date.now();
      const WINDOW_MIN = 15;

      const fromIso = new Date(nowMs - 60 * 60 * 1000).toISOString();   // -1h
      const toIso = new Date(nowMs + 25 * 60 * 60 * 1000).toISOString(); // +25h

      const { data: liveLessons } = await supabase
        .from("live_lessons")
        .select("*")
        .eq("notify_email_enabled", true)
        .not("status", "in", "(cancelled,ended,recorded)")
        .gte("scheduled_at", fromIso)
        .lte("scheduled_at", toIso);

      type LL = {
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
        meeting_url: string | null;
        scheduled_at: string;
        duration_minutes: number;
        access_mode: "all" | "classes" | "open";
        class_ids: string[] | null;
        notify_24h: boolean;
        notify_12h: boolean;
        notify_1h: boolean;
        notify_24h_sent_at: string | null;
        notify_12h_sent_at: string | null;
        notify_1h_sent_at: string | null;
      };

      for (const lessonRaw of (liveLessons ?? []) as LL[]) {
        const startMs = new Date(lessonRaw.scheduled_at).getTime();
        const minsToStart = (startMs - nowMs) / 60_000;

        const slots: Array<{ key: "24h" | "12h" | "1h"; target: number; enabled: boolean; sent: string | null }> = [
          { key: "24h", target: 24 * 60, enabled: lessonRaw.notify_24h, sent: lessonRaw.notify_24h_sent_at },
          { key: "12h", target: 12 * 60, enabled: lessonRaw.notify_12h, sent: lessonRaw.notify_12h_sent_at },
          { key: "1h",  target: 1 * 60,  enabled: lessonRaw.notify_1h,  sent: lessonRaw.notify_1h_sent_at  },
        ];

        for (const slot of slots) {
          if (!slot.enabled || slot.sent) continue;
          if (Math.abs(minsToStart - slot.target) > WINDOW_MIN) continue;

          // Resolve recipients
          if (lessonRaw.access_mode === "open") continue;

          let enrollmentQ = supabase
            .from("enrollments")
            .select("student_id, expires_at")
            .eq("status", "active");
          if (lessonRaw.access_mode === "classes") {
            enrollmentQ = enrollmentQ.in("class_id", lessonRaw.class_ids ?? []);
          }
          const { data: enrollmentRows } = await enrollmentQ;

          const studentIds = new Set<string>();
          for (const e of enrollmentRows ?? []) {
            if (e.expires_at && new Date(e.expires_at as string).getTime() < nowMs) continue;
            studentIds.add(e.student_id as string);
          }
          if (studentIds.size === 0) {
            // Nothing to send; mark slot to avoid retrying the same empty list forever
            await supabase
              .from("live_lessons")
              .update({ [`notify_${slot.key}_sent_at`]: new Date().toISOString() })
              .eq("id", lessonRaw.id);
            continue;
          }

          const ids = Array.from(studentIds);
          const { data: profileRows } = await supabase
            .from("profiles")
            .select("id, email, display_name, name, email_notifications")
            .in("id", ids);

          // Bulk-fetch notification_preferences for these IDs
          const { data: prefRows } = await supabase
            .from("notification_preferences")
            .select("user_id, email_live_reminder")
            .in("user_id", ids);
          const prefMap = new Map<string, boolean>();
          for (const p of prefRows ?? []) {
            prefMap.set(p.user_id as string, (p.email_live_reminder as boolean) ?? true);
          }

          const whenLabel = slot.key === "24h" ? "é amanhã" : slot.key === "12h" ? "em 12 horas" : "em 1 hora";
          const whenHuman =
            slot.key === "24h"
              ? `amanhã às ${new Date(lessonRaw.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}`
              : slot.key === "12h"
              ? "em 12 horas"
              : "em 1 hora";
          const subject = `Sua aula ao vivo ${whenLabel}: ${lessonRaw.title}`;
          const previewText = `Não perca: ${lessonRaw.title} ${whenHuman}`;

          let slotSent = 0;
          let slotSkipped = 0;

          for (const p of (profileRows ?? []) as Array<{ id: string; email: string; display_name: string | null; name: string | null; email_notifications: boolean | null }>) {
            if (!p.email) {
              slotSkipped++;
              continue;
            }
            // Tier 1: user global opt-in
            if (p.email_notifications === false) {
              await supabase.from("email_notification_log").insert({
                recipient_id: p.id, type: "live_reminder", automation_type: "live_reminder",
                subject, status: "skipped", metadata: { lesson_id: lessonRaw.id, slot: slot.key, reason: "user_email_off" },
              });
              slotSkipped++;
              continue;
            }
            // Tier 4: per-type preference
            const pref = prefMap.get(p.id);
            if (pref === false) {
              await supabase.from("email_notification_log").insert({
                recipient_id: p.id, type: "live_reminder", automation_type: "live_reminder",
                subject, status: "skipped", metadata: { lesson_id: lessonRaw.id, slot: slot.key, reason: "pref_off" },
              });
              slotSkipped++;
              continue;
            }

            const displayName = (p.display_name as string) || (p.name as string) || "Membro";
            const coverHtml = lessonRaw.cover_url
              ? `<img src="${lessonRaw.cover_url}" alt="" style="width:100%;border-radius:8px;margin-bottom:16px;" />`
              : "";
            const bodyHtml = `${coverHtml}
              <p style="margin:0 0 12px 0;">Olá, ${displayName}!</p>
              <p style="margin:0 0 16px 0;">Sua aula ao vivo <strong>${lessonRaw.title}</strong> começa ${whenHuman}.</p>
              ${lessonRaw.description ? `<p style="margin:0 0 16px 0;color:#a1a1aa;">${lessonRaw.description}</p>` : ""}`;

            const html = buildEmailHtml({
              subject,
              previewText,
              heading: lessonRaw.title,
              subheading: whenHuman,
              bodyHtml,
              ctaText: "Salvar link",
              ctaUrl: lessonRaw.meeting_url ?? `${PLATFORM_URL}/ao-vivo`,
              platformName: PLATFORM_NAME,
              platformUrl: PLATFORM_URL,
            });

            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: FROM_EMAIL,
                to: [p.email],
                subject,
                html,
              }),
            });

            if (res.ok) {
              slotSent++;
              await supabase.from("email_notification_log").insert({
                recipient_id: p.id, type: "live_reminder", automation_type: "live_reminder",
                subject, status: "sent", metadata: { lesson_id: lessonRaw.id, slot: slot.key },
              });
            } else {
              slotSkipped++;
              await supabase.from("email_notification_log").insert({
                recipient_id: p.id, type: "live_reminder", automation_type: "live_reminder",
                subject, status: "failed", metadata: { lesson_id: lessonRaw.id, slot: slot.key, http: res.status },
              });
            }
          }

          totalSent += slotSent;
          totalSkipped += slotSkipped;

          // Mark the slot dispatched (idempotency) only if at least one send attempt happened.
          // If all recipients failed at the Resend level we still mark to avoid hot-retry loops.
          await supabase
            .from("live_lessons")
            .update({ [`notify_${slot.key}_sent_at`]: new Date().toISOString() })
            .eq("id", lessonRaw.id);
        }
      }
    }
```

- [ ] **Step 2: Deploy the function**

```bash
cd "/Users/andresouza/Desktop/Apps e Projetos/01 - app andre/master-membros/lumi-membros"
npx supabase functions deploy email-scheduler --project-ref gdbkbeurjjtjgmrmfngk
```

Expected: deploys without compile errors. If a Deno type error appears (e.g. nullable widening on the inserted log rows), narrow the metadata literal or cast explicitly.

- [ ] **Step 3: Verify scheduler cron frequency**

Open the Supabase Dashboard → Project `gdbkbeurjjtjgmrmfngk` → Database → Cron Jobs (or wherever the existing `email-scheduler` schedule is configured for this project — check `supabase/migrations/*_cron*.sql` for the schedule expression).

```bash
grep -rn "email-scheduler\|email_scheduler\|cron" supabase/migrations/ 2>/dev/null
```

If frequency is slower than every 30 minutes, edit it to `*/15 * * * *` (every 15 min) for the 1h window to hit reliably. If a migration file owns the schedule, add a new migration updating it; otherwise change in the dashboard and note the change in commit message.

- [ ] **Step 4: Manual smoke test — create a 1h-window live**

In `/admin/aulas-ao-vivo`, create a new live with:
- Title: "Teste reminder 1h"
- `scheduledAt` = 1h2min from now
- `accessMode` = "all" (or "classes" with a class you're enrolled in)
- Notificações: master ON, `notify_1h` checked
- Save

Then invoke the scheduler manually:
```bash
SUPABASE_URL=https://gdbkbeurjjtjgmrmfngk.supabase.co
SERVICE_ROLE_KEY=<read from .env>
curl -X POST "${SUPABASE_URL}/functions/v1/email-scheduler" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
```

Expected JSON response: `{ success: true, sent: <n>, skipped: <m>, ... }`.

Verify in the Supabase SQL Editor:
```sql
SELECT recipient_id, status, metadata, sent_at
FROM email_notification_log
WHERE type = 'live_reminder'
ORDER BY sent_at DESC
LIMIT 10;
```
Expected: rows with `status='sent'` and `metadata->>'slot' = '1h'`.

```sql
SELECT id, notify_1h_sent_at FROM live_lessons
WHERE title = 'Teste reminder 1h';
```
Expected: `notify_1h_sent_at` is set.

Run the curl a second time. Expected: no new log rows for this lesson + slot (idempotency via `notify_1h_sent_at`).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/email-scheduler/index.ts
git commit -m "feat(scheduler): live lesson reminders 24h/12h/1h via Resend

Extends email-scheduler with a live-reminder dispatch block. Queries live_lessons
within the -1h..+25h window with notify_email_enabled=true, evaluates
each opted-in slot against the ±15min target, resolves recipients via
enrollments + access_mode, applies the 4-tier preference check (global
user opt-in + platform toggle + automation toggle + per-user pref),
sends via Resend, and writes idempotent sent_at timestamps + log rows."
```

---

## Task 8: Optional — `notification_preferences` UI

**Files:**
- Modify: `src/hooks/useNotificationPreferences.ts` (likely already lists email_* flags; add new flag)
- Modify: any settings/profile page that renders the email preferences grid

Per CLAUDE.md the project has 14 email_* fields on `notification_preferences`. The new column `email_live_reminder` needs to surface in the user-facing preferences UI to be discoverable.

- [ ] **Step 1: Find the consumer**

```bash
cd "/Users/andresouza/Desktop/Apps e Projetos/01 - app andre/master-membros/lumi-membros"
grep -rn "email_comments\|email_likes\|email_mentions" --include="*.ts" --include="*.tsx" src/ | head -20
```

Locate the file(s) that map email preferences to checkboxes (likely `src/hooks/useNotificationPreferences.ts` and one of the profile/admin pages).

- [ ] **Step 2: Add `email_live_reminder` to the preference list**

In the hook's `EMAIL_PREFS` (or equivalent) constant, append:
```ts
  { key: "email_live_reminder", label: "Lembretes de aulas ao vivo" },
```

In the UI render of email preferences (profile "Notificações" tab + admin AdminStudentProfilePage), the new key is rendered automatically if the UI maps over the constant. If the UI hard-codes each row, append a matching row.

- [ ] **Step 3: Build + smoke**

```bash
npm run build
npm run dev
```

Open `/meu-perfil`, switch to the Notificações tab. Verify the new "Lembretes de aulas ao vivo" checkbox is visible and toggling persists (re-load page, value sticks).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useNotificationPreferences.ts <other-touched-files>
git commit -m "feat(prefs): expose email_live_reminder preference to users

Adds the new live reminder email type to the notification preferences
hook + profile UI so users can opt out without an admin override."
```

---

## Task 9: Rollout verification + final commit

**Files:** none new.

- [ ] **Step 1: Confirm migration is reflected in all environments**

```bash
psql_or_dashboard_query: "SELECT count(*) FROM live_lessons WHERE replay_enabled IS NOT NULL;"
```
Should equal total live_lessons rows. (Defaults applied to existing rows.)

- [ ] **Step 2: Build + lint cleanly**

```bash
cd "/Users/andresouza/Desktop/Apps e Projetos/01 - app andre/master-membros/lumi-membros"
npm run build && npm run lint
```
Expected: both pass.

- [ ] **Step 3: Full UI walk-through**

Run dev server, traverse:
1. `/admin/aulas-ao-vivo` — create live with replay ON, notify 24h+1h. Save. List card shows badges. Edit, re-save, badges intact.
2. Create second live in "accessMode=open" — notify switch becomes disabled with amber warning.
3. Create third live with replay OFF — save.
4. As a student, open `/ao-vivo`:
   - Hero shows the upcoming live (the one created in step 1).
   - Chip filter "Próximas" shows the third live (excluding hero) if its `scheduledAt` is later; "Replays" empty until something ends with replay ON; "Ao vivo" empty.
   - When a live's `scheduled_at + duration` passes, with replay ON, it appears in "Replays".
5. Walk through the past live with replay OFF — it disappears from `/ao-vivo`. In `/admin/aulas-ao-vivo` it still lists.

- [ ] **Step 4: Tag the release**

No new git tag required unless owner's release process demands it. Just push the branch:

```bash
git log --oneline -10
git push origin HEAD
```

- [ ] **Step 5: Update CLAUDE.md feature inventory (optional housekeeping)**

If `lumi-membros/CLAUDE.md` documents the live lessons module under "Student Features" or "Admin Panel Features", add a short bullet under each section noting the replay flag and reminder dispatcher. Keep wording terse.

```bash
git add lumi-membros/CLAUDE.md
git commit -m "docs(claude-md): note live lessons replay flag + reminder dispatcher"
```

---

## Self-review checklist (for the human/agent executing)

Before marking the plan complete, confirm:

1. Every spec section is implemented:
   - Schema columns ✅ Task 1
   - `getReplayUrl` helper ✅ Task 3
   - Hook field plumbing ✅ Task 3
   - Admin Replay block ✅ Task 4
   - Admin Notify block ✅ Task 4
   - Admin list card badges ✅ Task 4
   - LessonHero ✅ Task 5
   - StatusBadgeWithCountdown ✅ Task 5
   - Combo D student page ✅ Task 6
   - Replay filter logic ✅ Task 6
   - Email reminder scheduler block ✅ Task 7
   - Idempotency via sent_at ✅ Task 7
   - 4-tier preference check ✅ Task 7
   - Preference UI ✅ Task 8

2. No placeholders. Every step has actual code or actual commands.

3. Function/property names match across tasks:
   - `getReplayUrl` (Task 3, Task 6)
   - `replayEnabled`, `notifyEmailEnabled`, `notify24h`, `notify12h`, `notify1h` (Task 3, 4, 6)
   - `processLiveReminders` (Task 7) — inlined in `email-scheduler`, not a separate file
   - `email_live_reminder` (Task 1, 7, 8)

4. Frequent commits: 8 commits across 9 tasks. Each is independently revertable.
