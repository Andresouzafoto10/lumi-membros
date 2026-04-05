-- =============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- E-mail preferences
  email_comments boolean DEFAULT true,
  email_comment_replies boolean DEFAULT true,
  email_mentions boolean DEFAULT true,
  email_likes boolean DEFAULT false,
  email_follows boolean DEFAULT true,
  email_new_course boolean DEFAULT true,
  email_new_lesson boolean DEFAULT true,
  email_certificate boolean DEFAULT true,
  email_mission_complete boolean DEFAULT true,
  email_badge_earned boolean DEFAULT true,
  email_post_reply boolean DEFAULT true,
  email_follower_milestone boolean DEFAULT true,
  email_weekly_digest boolean DEFAULT true,
  email_marketing boolean DEFAULT false,

  -- In-app (sininho) preferences
  notif_comments boolean DEFAULT true,
  notif_comment_replies boolean DEFAULT true,
  notif_mentions boolean DEFAULT true,
  notif_likes boolean DEFAULT true,
  notif_follows boolean DEFAULT true,
  notif_new_course boolean DEFAULT true,
  notif_new_lesson boolean DEFAULT true,
  notif_certificate boolean DEFAULT true,
  notif_mission_complete boolean DEFAULT true,
  notif_badge_earned boolean DEFAULT true,
  notif_post_reply boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

DROP TRIGGER IF EXISTS handle_updated_at_notification_preferences ON public.notification_preferences;
CREATE TRIGGER handle_updated_at_notification_preferences
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all notification preferences" ON public.notification_preferences;
CREATE POLICY "Admins manage all notification preferences" ON public.notification_preferences
  FOR ALL USING (public.is_admin_user());

-- =============================================================================
-- AUTO-CREATE PREFERENCES FOR NEW USERS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_create_preferences ON public.profiles;
CREATE TRIGGER on_profile_created_create_preferences
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_preferences();

-- =============================================================================
-- SEED PREFERENCES FOR EXISTING USERS
-- =============================================================================
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.notification_preferences)
ON CONFLICT DO NOTHING;
