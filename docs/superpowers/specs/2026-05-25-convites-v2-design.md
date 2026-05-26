# Convites v2 — design

Date: 2026-05-25

## Problem

Invite-link acceptance (`/convite/:slug` → `InviteRegisterPage.tsx`) runs entirely
client-side using the freshly-registered student's session. The privileged writes
are blocked by RLS (all admin-only), so:

- `invite_links.use_count++` → blocked → "Usos" stays 0.
- `invite_link_uses` insert → blocked → nobody appears in any list.
- `enrollments` upsert → blocked (no student INSERT policy) → enrollment unreliable.
- Existing-email users hit `signUp()` "User already registered" → early return →
  never enrolled (the "trava" the user reported).

Confirmed via `pg_policies`: `invite_links` / `invite_link_uses` ALL require
`is_admin_user()`; `enrollments` only admin ALL + student SELECT.

## Decisions (approved)

1. Existing account via invite → **require login** on the invite page (proof of ownership).
2. Student origin (invite/webhook/direct/admin) → **best-effort backfill** of history.
3. Invite → **send access email via Resend** (server-side), logged to `email_notification_log`.

## Architecture

Move all privileged invite-acceptance work to a server-side Edge Function, mirroring
`webhook-intake` (which sends email via Resend directly because the `notify-email`
gateway rejects service-role calls).

### 1. Edge Function `accept-invite` (verify_jwt = true)

- Input: `{ slug, isNew }`, `Authorization: Bearer <user JWT>`.
- `auth.getUser(jwt)` → identify the student (must be authenticated).
- Validate invite: exists, `is_active`, not expired, `use_count < max_uses` (NULL = unlimited).
- Resolve `class_ids` (fallback to legacy `class_id`); upsert `enrollments`
  (service role) with `expires_at` from `classes.access_duration_days` + `access_grace_days`.
- Insert `invite_link_uses (invite_link_id, student_id)` — idempotent via unique constraint
  (re-submit does not double count). `use_count` maintained by trigger.
- If `profiles.signup_source` is null: set `signup_source='invite'` + `invite_link_id`.
  Determines email variant (new → welcome, existing → course_unlocked).
- Send email via Resend (helper inlined, same pattern as webhook-intake) + log.
- Return `{ status, classNames, isNew }`.

### 2. `/convite/:slug` rewrite (`InviteRegisterPage.tsx`)

Two modes:
- **Criar conta** (default): name/email/password/cpf → `signUp()` → on success call
  `accept-invite({ slug, isNew: true })`. If `signUp` returns "User already registered",
  auto-switch to login mode with a notice.
- **Já tenho conta**: email+password → `signIn()` → call `accept-invite({ slug, isNew: false })`.

Remove all client-side enrollment / use_count / invite_link_uses / source writes.

### 3. DB migration

- `ALTER TABLE invite_link_uses ADD CONSTRAINT uniq_invite_use UNIQUE (invite_link_id, student_id)`
  (dedupe existing rows first).
- Trigger `sync_invite_use_count` on `invite_link_uses` AFTER INSERT/DELETE →
  `UPDATE invite_links SET use_count = (count of uses)`.
- Backfill `invite_link_uses` from `profiles.invite_link_id` (where not already present).
- Recompute `invite_links.use_count` from `invite_link_uses`.
- Backfill `profiles.signup_source`: `invite_link_id` not null → 'invite';
  else email in `webhook_logs.student_email` → 'webhook'; else 'direct'.
- RLS: `accept-invite` uses service role (bypass). Add a student SELECT policy on
  `invite_link_uses`? No — only admin reads the modal; keep admin-only.

### 4. signup_source in other flows

- `webhook-intake`: set `signup_source='webhook'` when creating a new auth user.
- `RegisterPage` (/cadastro): set `signup_source='direct'` after signup (self-update allowed).
- `admin-create-student`: set `signup_source='admin'`.

### 5. Admin `/admin/convites`

Icon/button on the "Usos" cell → modal listing who joined via the link
(`invite_link_uses` ⨝ `profiles`: name, email, used_at). New hook query (admin session, RLS ok).

### 6. Admin `/admin/alunos`

Add "Origem" column (badge: Convite / Webhook / Direto / Admin / —) + filter select.
`useStudents` already returns `signupSource`; map values to PT-BR labels.

## Out of scope (YAGNI)

- Per-enrollment source (origin lives on the profile).
- New invite fields.
- Changing Supabase auth email-confirmation (stays disabled).

## Acceptance criteria

- New user via invite: account created, enrolled in invite classes, `use_count` +1,
  appears in the uses modal, `signup_source='invite'`, receives welcome email.
- Existing user via invite: logs in, enrolled in invite classes (not blocked),
  `use_count` +1, appears in the modal, receives "novo acesso" email.
- `/admin/convites` "Usos" reflects real count; modal lists real people.
- `/admin/alunos` shows + filters by Origem.
- Backfill populates past invite uses + signup_source.
