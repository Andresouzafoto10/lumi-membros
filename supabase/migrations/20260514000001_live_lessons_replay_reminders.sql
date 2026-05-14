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
