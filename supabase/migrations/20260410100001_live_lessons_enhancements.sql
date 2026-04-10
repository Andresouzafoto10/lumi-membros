-- ============================================================
-- Live Lessons Enhancements — sales_url + show_live_banner setting
-- ============================================================

-- Add sales_url for non-enrolled users
ALTER TABLE live_lessons ADD COLUMN IF NOT EXISTS sales_url text;

-- Add show_live_banner to platform_settings theme jsonb
-- (If the key doesn't exist yet, set it to true)
UPDATE platform_settings
SET theme = jsonb_set(COALESCE(theme, '{}'), '{show_live_banner}', 'true')
WHERE id = 'default'
  AND NOT (COALESCE(theme, '{}') ? 'show_live_banner');
