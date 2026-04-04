# Supabase Edge Functions

## Functions

### `notify-email`
Sends transactional email notifications via Resend.

**Deploy:**
```bash
supabase functions deploy notify-email --project-ref gdbkbeurjjtjgmrmfngk
```

**Payload:**
```json
{
  "type": "comment" | "like" | "follow" | "mention" | "new_post" | "badge_earned",
  "recipient_email": "string",
  "recipient_name": "string",
  "actor_name": "string",
  "context": {
    "post_title": "string (optional)",
    "community_name": "string (optional)",
    "badge_name": "string (optional)",
    "action_url": "string"
  }
}
```

### `notify-digest`
Weekly digest email summarizing activity for each student.

**Deploy:**
```bash
supabase functions deploy notify-digest --project-ref gdbkbeurjjtjgmrmfngk
```

**Cron setup (Supabase Dashboard):**
1. Go to Database > Extensions > enable `pg_cron`
2. Run in SQL Editor:
```sql
SELECT cron.schedule(
  'weekly-digest',
  '0 9 * * 1', -- Every Monday at 9am UTC
  $$
  SELECT net.http_post(
    url := 'https://gdbkbeurjjtjgmrmfngk.supabase.co/functions/v1/notify-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## Environment Variables

Set these in the Supabase Dashboard > Edge Functions > Secrets:

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | API key from resend.com |
| `SUPABASE_URL` | Auto-set by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-set by Supabase |
| `PLATFORM_URL` | Base URL of the platform (e.g., `https://app.lumimembros.com`) |

## SQL Required

The `email_notification_log` table must exist. See `supabase/migrations/001_initial_schema.sql` (section 23).

```sql
CREATE TABLE email_notification_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id text NOT NULL,
  type text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent',
  metadata jsonb
);
```
