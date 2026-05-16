-- WhatsApp floating CTA on /cursos. All optional; defaults disabled.
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_message text,
  ADD COLUMN IF NOT EXISTS whatsapp_style text NOT NULL DEFAULT 'icon';

ALTER TABLE public.platform_settings
  DROP CONSTRAINT IF EXISTS platform_settings_whatsapp_style_check;
ALTER TABLE public.platform_settings
  ADD CONSTRAINT platform_settings_whatsapp_style_check
  CHECK (whatsapp_style IN ('icon', 'transparent', 'text'));
