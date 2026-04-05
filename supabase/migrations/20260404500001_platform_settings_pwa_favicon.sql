ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS logo_upload_url TEXT;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS pwa_enabled BOOLEAN DEFAULT false;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS pwa_name TEXT;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS pwa_short_name TEXT;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS pwa_icon_url TEXT;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS pwa_theme_color TEXT;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS pwa_background_color TEXT;
