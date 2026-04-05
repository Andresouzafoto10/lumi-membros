-- =============================================================================
-- NOTIFICATIONS: Add DELETE policy + cleanup function
-- =============================================================================

-- Allow users to delete their own notifications
DROP POLICY IF EXISTS "notifications: aluno deleta as proprias" ON public.notifications;
CREATE POLICY "notifications: aluno deleta as proprias" ON public.notifications
  FOR DELETE USING (recipient_id = auth.uid());

-- Allow admins to delete any notification
DROP POLICY IF EXISTS "notifications: admin deleta qualquer" ON public.notifications;
CREATE POLICY "notifications: admin deleta qualquer" ON public.notifications
  FOR DELETE USING (public.is_admin_user());

-- =============================================================================
-- Function: enforce 50 notification limit per user
-- Deletes oldest notifications when count exceeds 50
-- =============================================================================
CREATE OR REPLACE FUNCTION public.enforce_notification_limit()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE id IN (
    SELECT id FROM public.notifications
    WHERE recipient_id = NEW.recipient_id
    ORDER BY created_at DESC
    OFFSET 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_notification_limit_trigger ON public.notifications;
CREATE TRIGGER enforce_notification_limit_trigger
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_notification_limit();

-- =============================================================================
-- Function: cleanup old read notifications (30+ days)
-- Called by email-scheduler or manually
-- =============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.notifications
  WHERE read = true
    AND created_at < now() - interval '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
