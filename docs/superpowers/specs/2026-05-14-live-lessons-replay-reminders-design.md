# Live Lessons — Replay Persistence & Email Reminders

**Status:** Design approved
**Date:** 2026-05-14
**Author:** brainstorm session
**Scope:** `/ao-vivo` (student), `/admin/aulas-ao-vivo` (admin), `email-scheduler` Edge Function, `live_lessons` schema

---

## Goal

Improve the existing live lessons module so that:

1. After a live ends, the same cover and link automatically persist as a saved replay — admin decides at creation whether to keep the replay available or hide the lesson from `/ao-vivo`.
2. Replays default to enabled. Admin can override by toggling off, or by supplying a separate `recording_url` later that overrides the original `meeting_url`.
3. The student page surfaces the *next* live first via a hero block, with chip filters (Todas / Ao vivo / Próximas / Replays) and a grid below.
4. Admin can opt-in per-live email reminders sent 24h, 12h, and/or 1h before start via Resend. Recipients are eligible enrolled students who haven't disabled live-reminder emails.
5. Email dispatch is idempotent (no double-sends), respects existing 4-tier preference checks, and reuses the existing `email-scheduler` Edge Function.

## Non-goals

- New tables. Everything lives in `live_lessons`, `email_automations`, `notification_preferences`, `email_notification_log`.
- Notifications via channels other than email (no in-app push for reminders in this iteration).
- Customizable reminder times beyond the three preset slots (24h / 12h / 1h).
- Calendar invite (.ics) attachments.
- SMS / WhatsApp delivery.
- Auto-archival of recordings to R2 / Mux ingestion.

## Architecture

Three mechanical surfaces change:

1. **Schema** — `live_lessons` gains 8 columns (1 replay flag + 1 master notify + 3 slot toggles + 3 sent_at timestamps). Plus a partial index and a new row in `email_automations` for `live_reminder`. Plus one column in `notification_preferences`.
2. **Backend** — `email-scheduler` Edge Function gains `processLiveReminders()` invoked alongside the existing `access_reminder_7d` and `community_inactive_30d` blocks. Same cron, same logging, same 4-tier preference checks via the existing `notify-email` helper pattern.
3. **Frontend** — `LiveLessonsPage` rewritten Combo D (hero + chips + grid). `AdminLiveLessonsPage` dialog gains "Replay" and "Notificações por email" blocks. `useLiveLessons` extended with the new fields and a `getReplayUrl()` helper.

No RLS changes. No routing changes. No auth changes.

## Data Model

### Migration (`supabase/migrations/20260514000001_live_lessons_replay_reminders.sql`)

```sql
ALTER TABLE live_lessons
  ADD COLUMN replay_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_email_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN notify_24h boolean NOT NULL DEFAULT false,
  ADD COLUMN notify_12h boolean NOT NULL DEFAULT false,
  ADD COLUMN notify_1h boolean NOT NULL DEFAULT false,
  ADD COLUMN notify_24h_sent_at timestamptz NULL,
  ADD COLUMN notify_12h_sent_at timestamptz NULL,
  ADD COLUMN notify_1h_sent_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_live_lessons_scheduled_at_notify
  ON live_lessons(scheduled_at)
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

Migration is non-breaking. Defaults preserve current behaviour: existing lives keep `replay_enabled=true` (continue showing as replay) and `notify_email_enabled=false` (no surprise emails).

`lib/database.types.ts` regenerated post-migration via Supabase CLI or `npm run gen:types` (existing script).

### Type updates (`src/hooks/useLiveLessons.ts`)

```ts
export type LiveLesson = {
  // ...existing fields...
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
  // ...existing fields...
  replayEnabled?: boolean;
  notifyEmailEnabled?: boolean;
  notify24h?: boolean;
  notify12h?: boolean;
  notify1h?: boolean;
};
```

`mapRow()` extended to read the new snake_case columns. `createLesson` / `updateLesson` payloads extended with new fields when present.

### Replay URL helper

```ts
export function getReplayUrl(lesson: LiveLesson): string | null {
  if (!lesson.replayEnabled) return null;
  return lesson.recordingUrl ?? lesson.meetingUrl ?? null;
}
```

Exported from `useLiveLessons.ts` alongside `getComputedStatus`. Pure function — no React deps.

## Replay & Visibility Logic

`getComputedStatus()` is unchanged. It continues returning `live` / `scheduled` / `ended` / `recorded` / `cancelled` based on `scheduled_at + duration_minutes` window vs `Date.now()` with manual status overrides winning.

Student page filters past lessons:

```ts
const visibleReplays = past.filter(
  (l) => l.replayEnabled && getReplayUrl(l) !== null
);
```

When `replayEnabled === false` OR no link present, the live disappears from `/ao-vivo` after end. Admin page (`/admin/aulas-ao-vivo`) always shows everything regardless.

Sort order in student page:
- Hero: first non-cancelled lesson in `[...live, ...scheduled]` ordered by `scheduledAt` ascending. Live now wins over scheduled.
- Grid (filter = "Todas"): live first, then scheduled ascending, then replays descending, excluding the hero.
- Grid (filter = "Próximas"): scheduled ascending, excluding the hero if it is scheduled.
- Grid (filter = "Ao vivo"): live only.
- Grid (filter = "Replays"): visible replays descending by `scheduledAt`.

## Email Reminder Pipeline

### Cron entry point

`email-scheduler` Edge Function already runs on a Supabase cron schedule (frequency must be ≤ 30 minutes for the 1h window to land reliably — verified during implementation; if currently slower, update the cron expression as part of rollout). The function adds:

```ts
await processLiveReminders(supabase);
```

right after the existing `processAccessReminders()` and `processCommunityInactive()` calls.

### Window check

```ts
const now = Date.now();
const WINDOW_MIN = 15; // ±15 minutes tolerance

const lessons = await supabase
  .from('live_lessons')
  .select('*')
  .eq('notify_email_enabled', true)
  .not('status', 'in', '(cancelled,ended,recorded)')
  .gte('scheduled_at', new Date(now - 60 * 60 * 1000).toISOString())
  .lte('scheduled_at', new Date(now + 25 * 60 * 60 * 1000).toISOString());

for (const lesson of lessons.data ?? []) {
  const start = new Date(lesson.scheduled_at).getTime();
  const minsToStart = (start - now) / 60_000;

  const slots = [
    { key: '24h', target: 24 * 60, enabled: lesson.notify_24h, sent: lesson.notify_24h_sent_at },
    { key: '12h', target: 12 * 60, enabled: lesson.notify_12h, sent: lesson.notify_12h_sent_at },
    { key: '1h',  target: 1 * 60,  enabled: lesson.notify_1h,  sent: lesson.notify_1h_sent_at  },
  ];

  for (const slot of slots) {
    if (!slot.enabled || slot.sent) continue;
    if (Math.abs(minsToStart - slot.target) > WINDOW_MIN) continue;

    const ok = await sendReminder(supabase, lesson, slot.key);
    if (ok) {
      await supabase
        .from('live_lessons')
        .update({ [`notify_${slot.key}_sent_at`]: new Date().toISOString() })
        .eq('id', lesson.id);
    }
  }
}
```

Idempotency: `sent_at` column gate prevents resend even if scheduler runs overlapping. If `sendReminder` fails (Resend error, log row inserted as failed), `sent_at` is NOT updated, so the next tick retries.

### Recipient resolution

```ts
async function resolveRecipients(supabase, lesson) {
  if (lesson.access_mode === 'open') return []; // no auth, no email
  let query = supabase
    .from('enrollments')
    .select('student_id, status, expires_at, class_id, profiles!inner(id, email, name, email_notifications)')
    .eq('status', 'active');

  if (lesson.access_mode === 'classes') {
    query = query.in('class_id', lesson.class_ids ?? []);
  }
  // access_mode === 'all' → any active enrollment qualifies

  const { data } = await query;
  // Dedup by student_id (a student can have multiple enrollments)
  const seen = new Set<string>();
  return (data ?? []).filter((row) => {
    if (seen.has(row.student_id)) return false;
    seen.add(row.student_id);
    if (row.expires_at && new Date(row.expires_at) < new Date()) return false;
    return true;
  });
}
```

### 4-tier preference check (existing pattern, reused per recipient)

Before sending to each recipient:

1. `profiles.email_notifications === true` (global user opt-in)
2. `platform_settings.email_notifications_enabled === true` (global platform toggle)
3. `email_automations.live_reminder.is_active === true` (per-type automation toggle)
4. `notification_preferences.email_live_reminder === true` (per-user per-type)

Tier 2 and 3 are fetched once per scheduler run. Tier 1 is on the joined `profiles` row. Tier 4 requires a `notification_preferences` lookup (batch fetch by user_id list).

Every attempt — including skips — is logged to `email_notification_log` with `automation_type='live_reminder'`, `status='sent'|'skipped'|'failed'`, `metadata={lesson_id, slot}`. Skip reason goes in metadata for debugging.

### Dispatch strategy

`processLiveReminders` does NOT call the existing `notify-email` Edge Function. It performs the 4-tier check inline and calls Resend directly using the shared HTML template builder from `_shared/email-template.ts` and the Resend client already set up in `_shared/resend.ts` (or equivalent in current codebase). Reason: live reminders are batch (many recipients per event) and adding an iteration mode to `notify-email` (which is event-driven, 1 recipient per call) is unnecessary plumbing. All log writes use `automation_type='live_reminder'` and `type='live_reminder'` so the `/admin/emails` Histórico tab surfaces them automatically.

### Template

Reuses `_shared/email-template.ts` (Master brand: `#ff7b00` orange, transparent body bg). Subject and preview from `email_automations.live_reminder` row, rendered with:

- `{{title}}` — lesson title
- `{{when_label}}` — "em 1 hora" / "em 12 horas" / "amanhã"
- `{{when_human}}` — "hoje às 16:35" / "amanhã às 09:00" (Portuguese date-fns)

Body (HTML block injected via shared template):
- Cover image (lesson.cover_url) — fallback to platform logo if missing
- Title H1
- Countdown sentence ("Sua aula ao vivo começa em 1 hora")
- Single CTA button "Salvar link" → `meeting_url` (target `_blank`)
- Footer with "gerencie suas preferências" link → `/meu-perfil#notificacoes`

`from`: `enviar@membrosmaster.com.br` (existing Resend sender).

## UI: Admin (`AdminLiveLessonsPage`)

Dialog gains two new blocks. Order in the form:

1. Title (existing)
2. Description (existing)
3. Cover (existing)
4. Data e hora + Duração (existing)
5. Instrutor (existing)
6. URL da reunião (existing)
7. URL para não matriculados (existing)
8. URL da gravação (existing)
9. **NEW — Replay**
10. Curso vinculado + Status (existing)
11. **NEW — Notificações por email**
12. Acesso + Turmas (existing)

### Replay block

```tsx
<div className="rounded-md border border-border/40 p-3 space-y-2">
  <div className="flex items-center justify-between">
    <Label className="cursor-pointer">Manter disponível como replay após o término</Label>
    <Switch checked={form.replayEnabled} onCheckedChange={(v) => setForm({ ...form, replayEnabled: v })} />
  </div>
  <p className="text-xs text-muted-foreground">
    Quando ligado, a aula continua acessível em Aulas ao Vivo após o horário.
    Usa a URL da gravação se preenchida, ou a URL da reunião como fallback.
  </p>
</div>
```

Default `replayEnabled = true` in `EMPTY_FORM`.

### Notificações block

```tsx
<div className="rounded-md border border-border/40 p-3 space-y-3">
  <div className="flex items-center justify-between">
    <Label>Enviar lembretes por email</Label>
    <Switch
      checked={form.notifyEmailEnabled}
      disabled={form.accessMode === 'open'}
      onCheckedChange={(v) => setForm({ ...form, notifyEmailEnabled: v })}
    />
  </div>
  {form.accessMode === 'open' && (
    <p className="text-xs text-amber-500">
      Acesso aberto não permite envio de email (sem usuários autenticados).
    </p>
  )}
  {form.notifyEmailEnabled && (
    <div className="space-y-2 pl-1">
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input type="checkbox" checked={form.notify24h} onChange={(e) => setForm({ ...form, notify24h: e.target.checked })} />
        24h antes — "é amanhã"
      </label>
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input type="checkbox" checked={form.notify12h} onChange={(e) => setForm({ ...form, notify12h: e.target.checked })} />
        12h antes
      </label>
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input type="checkbox" checked={form.notify1h} onChange={(e) => setForm({ ...form, notify1h: e.target.checked })} />
        1h antes
      </label>
      <p className="text-xs text-muted-foreground">
        Enviado apenas para alunos com acesso e que mantêm notificações de aulas ao vivo ativadas no perfil.
      </p>
    </div>
  )}
</div>
```

### List card badges

Below the existing status badges, add:

- Badge "📧 Lembretes (24h • 12h • 1h)" when `notify_email_enabled` (only show enabled slots, joined with `•`).
- Badge "Replay off" (muted) when `replay_enabled === false`.

## UI: Student (`LiveLessonsPage` — Combo D)

### Layout structure

```
┌──────────────────────────────────────────────────────┐
│  HERO (próxima live ou live em andamento)            │
│  - Capa 16:9 com gradient overlay                    │
│  - Badge status + countdown                          │
│  - Título XL + instrutor + duração                   │
│  - Descrição 2 linhas                                │
│  - CTA principal direita                             │
└──────────────────────────────────────────────────────┘
[Todas] [Ao vivo] [Próximas] [Replays]           ← chips sticky
┌────────┬────────┬────────┐
│ Card   │ Card   │ Card   │   ← grid filtrado
├────────┼────────┼────────┤
│ Card   │ Card   │ Card   │
└────────┴────────┴────────┘
```

### Hero component

```tsx
function LessonHero({ lesson, isEnrolled, onJoin }) {
  const cs = getComputedStatus(lesson);
  const isLive = cs === 'live';
  const minsToStart = (new Date(lesson.scheduledAt).getTime() - Date.now()) / 60_000;
  const showCountdown = !isLive && minsToStart < 24 * 60 && minsToStart > 0;

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/50 mb-6">
      <div className="aspect-[16/9] sm:aspect-[21/9] bg-muted">
        {lesson.coverUrl && <img src={lesson.coverUrl} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6 space-y-3">
        <StatusBadge status={cs} countdown={showCountdown ? minsToStart : null} />
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{lesson.title}</h2>
        {lesson.description && <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">{lesson.description}</p>}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {lesson.instructorName && <span>por {lesson.instructorName}</span>}
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{lesson.durationMinutes}min</span>
          </div>
          <HeroCta lesson={lesson} cs={cs} isEnrolled={isEnrolled} onJoin={onJoin} />
        </div>
      </div>
    </div>
  );
}
```

`StatusBadge` extends current to show countdown inline when present ("Começa em 1h 32min", "Em 2 dias", "Amanhã às 09:00", or `LiveBadge` for live).

`HeroCta` returns the right button per state:
- live + enrolled + meetingUrl → "Entrar agora" (red, pulsing)
- scheduled + enrolled + meetingUrl → "Salvar link"
- !enrolled + salesUrl → "Quero participar"
- otherwise → nothing

### Chips

```tsx
const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'live', label: 'Ao vivo' },
  { id: 'upcoming', label: 'Próximas' },
  { id: 'replays', label: 'Replays' },
] as const;
type FilterId = typeof FILTERS[number]['id'];

const [filter, setFilter] = useState<FilterId>('all');
```

Rendered as horizontal-scroll on mobile (`overflow-x-auto`), wrap on desktop. Active = `bg-primary/10 text-primary border-primary/30`.

### Grid filter

```ts
const gridLessons = useMemo(() => {
  const all = lessons.filter((l) => getComputedStatus(l) !== 'cancelled');
  const visibleReplays = all.filter((l) => {
    const cs = getComputedStatus(l);
    return (cs === 'ended' || cs === 'recorded') && l.replayEnabled && getReplayUrl(l);
  });
  const live = all.filter((l) => getComputedStatus(l) === 'live');
  const scheduled = all
    .filter((l) => getComputedStatus(l) === 'scheduled')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const replays = visibleReplays.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const heroId = heroLesson?.id;
  const exceptHero = (arr: LiveLesson[]) => arr.filter((l) => l.id !== heroId);

  switch (filter) {
    case 'live':     return live;
    case 'upcoming': return exceptHero(scheduled);
    case 'replays':  return replays;
    case 'all':
    default:         return [...exceptHero(live), ...exceptHero(scheduled), ...replays];
  }
}, [lessons, filter, heroLesson]);
```

`heroLesson` = first of `[...live, ...scheduled]` (already sorted live-first then ascending). Null when both lists empty (hero hidden, empty state shown if grid also empty).

### Card refinements

Existing `LessonCard` keeps current actions but:
- Replay card (ended/recorded with `getReplayUrl`) shows new badge "Replay disponível" and CTA "Assistir gravação" → opens `getReplayUrl(l)`.
- Scheduled card with `minsToStart < 24h` shows inline countdown next to status badge.

### Mobile

- Hero stacks: full-width image on top, content card below
- Chips horizontal-scroll, `snap-x snap-mandatory`
- Grid 1 col

## Edge Cases

- **Live edited after reminder sent** — `sent_at` stays; no resend. Even if `scheduled_at` is moved forward, the recorded send is immutable history.
- **Live cancelled** — scheduler skips via `status NOT IN (cancelled, ended, recorded)` filter. If cancelled after a reminder was sent, no recall email; admin can communicate manually.
- **accessMode changed mid-stream** — next slot resolves recipients fresh from the current `access_mode` + `class_ids`. Previous send remains for prior recipient list.
- **`notify_email_enabled = false` with slot checkboxes still true** — master switch off, scheduler ignores. UI hides the slot checkboxes when master is off.
- **`meetingUrl` empty + `replayEnabled = true`** — `getReplayUrl()` returns null, replay does not surface. Admin must fill either `meeting_url` or `recording_url` for the replay to be reachable.
- **Past live with `replay_enabled = false`** — disappears from `/ao-vivo` (no hero, no card). Still listed in `/admin/aulas-ao-vivo`.
- **Live created < 1h before start with `notify_1h = true`** — next scheduler tick captures it (assuming tick within 30min). Worst case 30min delay is acceptable; documented as expected.
- **Scheduler crash mid-loop** — partial sends marked `sent_at`, remainder retries next tick. No double-send because of `sent_at` gate.
- **Scheduler skipped an entire window** — if the cron fails to run for a full hour or longer, a slot may fall outside its `±15min` window and never fire. Mitigation: cron frequency is verified `≤ 30min` during rollout (step 5). Monitoring is via the existing `email_notification_log` count — owners can spot a drop. Out of scope for this iteration to add catch-up logic; if needed later, widen WINDOW_MIN or check `now > start - target + WINDOW_MIN AND sent_at IS NULL`.
- **Resend rate limit / 5xx** — `sendReminder` logs `status='failed'`, does NOT set `sent_at`, retries next tick. After N retries (out of scope here — Resend's own backoff applies), failure is permanent until admin investigates `email_notification_log`.
- **Student `email_notifications = false` (global opt-out)** — Tier 1 check skips. Logged with reason in metadata.
- **`notification_preferences` row missing** (legacy users created before the column existed) — column has `DEFAULT true NOT NULL`, but if a profile predates `handle_new_user_preferences()` trigger and has no row, lookup returns nothing → treat as opt-in (default behavior). Optional backfill query included in migration if needed.

## Testing

### Unit (`src/hooks/useLiveLessons.test.ts` if exists, else inline asserts during dev)

- `getReplayUrl()` matrix:
  - `replayEnabled=false` → null regardless of URLs
  - `replayEnabled=true`, `recordingUrl` set, `meetingUrl` set → returns `recordingUrl`
  - `replayEnabled=true`, `recordingUrl=null`, `meetingUrl` set → returns `meetingUrl`
  - `replayEnabled=true`, both null → returns null
- `getComputedStatus()` window boundaries:
  - now = start − 1s → `scheduled`
  - now = start → `live`
  - now = start + duration − 1s → `live`
  - now = start + duration → `ended`
  - status override `cancelled` / `recorded` / `ended` wins

### Integration (`supabase/functions/email-scheduler/processLiveReminders.test.ts`)

Mock supabase client + Resend. Fixtures:

- Live at now + 24h0min, `notify_24h=true`, never sent → expect send + sent_at update
- Live at now + 23h45min, `notify_24h=true` → expect send (within window)
- Live at now + 24h20min, `notify_24h=true` → expect skip (outside window)
- Live at now + 24h, `notify_24h=true`, sent_at already set → expect skip
- Live at now + 24h, `notify_24h=false`, `notify_12h=false`, `notify_1h=true` → expect skip (1h slot too far)
- Live with `notify_email_enabled=false` → expect entire lesson skip
- Live with `accessMode=open` → expect no recipients, no Resend call
- Recipient with `email_notifications=false` → expect log row status=skipped, no Resend call
- Recipient with `notification_preferences.email_live_reminder=false` → expect log row status=skipped

### Manual / E2E

1. Create live with `scheduledAt = now + 1h2min`, `notify_email_enabled=true`, `notify_1h=true`, `accessMode=all`, on a test class with one enrolled test student.
2. Trigger `email-scheduler` manually from `/admin/emails` → Configurações → "Trigger scheduler".
3. Verify:
   - Email received at test student inbox.
   - Row in `email_notification_log` with `automation_type='live_reminder'`, `status='sent'`, `metadata.slot='1h'`.
   - `live_lessons.notify_1h_sent_at` set to now.
   - Trigger scheduler again → no second email, no new log row, sent_at unchanged.

### UI

- Snapshot `LessonHero` in 3 states (live, scheduled < 1h, scheduled > 24h).
- Snapshot chips bar (active = "Todas", "Replays").
- Visual check mobile breakpoint (375px width).
- Admin dialog: toggle replay off → helper text visible; toggle notify on → 3 checkboxes appear; switch accessMode to `open` → notify master disabled with amber warning.

## Permissions & Security

- RLS unchanged. Admin policy via `is_admin_user()` already grants ALL on `live_lessons`, including the new columns.
- Students still read `live_lessons` via existing SELECT policy.
- `notification_preferences.email_live_reminder` falls under the existing self-managed policy.
- `email-scheduler` uses `SUPABASE_SERVICE_ROLE_KEY` (existing pattern in `_shared/supabase.ts`).
- No PII exposed beyond what existing emails already include (name + email).

## Rollout

1. Apply migration in Supabase Dashboard SQL editor (project `gdbkbeurjjtjgmrmfngk`). Update `supabase/migrations/001_initial_schema.sql` to match.
2. Regenerate `src/lib/database.types.ts`.
3. Deploy frontend (hook + admin page + student page).
4. Deploy `email-scheduler` Edge Function with new block.
5. Verify cron frequency on the Supabase Dashboard — must be ≤ 30 minutes. If currently slower, update cron expression and document.
6. Manual smoke test per "Manual / E2E" above.
7. Toggle `email_automations.live_reminder.is_active` if owner wants to disable temporarily; otherwise leave on (default seeded as true).

No backfill needed. Existing lives become `replay_enabled=true` (preserves "saved replays" behaviour) and `notify_email_enabled=false` (no surprise emails).
