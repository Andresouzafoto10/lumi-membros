-- Grace period (days) added to expires_at on every webhook activation.
-- Useful for subscriptions where Cakto can take 1-3 days to retry charge before
-- emitting subscription_renewed. Default 0 = no grace.
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS access_grace_days integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN classes.access_grace_days IS
  'Extra days added on top of access_duration_days when an enrollment is created or renewed via webhook. Use 2-3 for monthly subscriptions to absorb retry delays.';
