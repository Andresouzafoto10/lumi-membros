ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS whatsapp_position text NOT NULL DEFAULT 'left';

ALTER TABLE public.platform_settings
  DROP CONSTRAINT IF EXISTS platform_settings_whatsapp_position_check;
ALTER TABLE public.platform_settings
  ADD CONSTRAINT platform_settings_whatsapp_position_check
  CHECK (whatsapp_position IN ('left', 'right'));
