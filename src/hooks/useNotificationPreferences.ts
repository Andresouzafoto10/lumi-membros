import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  // Email
  email_comments: boolean;
  email_comment_replies: boolean;
  email_mentions: boolean;
  email_likes: boolean;
  email_follows: boolean;
  email_new_course: boolean;
  email_new_lesson: boolean;
  email_certificate: boolean;
  email_mission_complete: boolean;
  email_badge_earned: boolean;
  email_post_reply: boolean;
  email_follower_milestone: boolean;
  email_weekly_digest: boolean;
  email_marketing: boolean;
  // In-app
  notif_comments: boolean;
  notif_comment_replies: boolean;
  notif_mentions: boolean;
  notif_likes: boolean;
  notif_follows: boolean;
  notif_new_course: boolean;
  notif_new_lesson: boolean;
  notif_certificate: boolean;
  notif_mission_complete: boolean;
  notif_badge_earned: boolean;
  notif_post_reply: boolean;
}

const EMAIL_FIELDS = [
  "email_comments",
  "email_comment_replies",
  "email_mentions",
  "email_likes",
  "email_follows",
  "email_new_course",
  "email_new_lesson",
  "email_certificate",
  "email_mission_complete",
  "email_badge_earned",
  "email_post_reply",
  "email_follower_milestone",
  "email_weekly_digest",
] as const;

const NOTIF_FIELDS = [
  "notif_comments",
  "notif_comment_replies",
  "notif_mentions",
  "notif_likes",
  "notif_follows",
  "notif_new_course",
  "notif_new_lesson",
  "notif_certificate",
  "notif_mission_complete",
  "notif_badge_earned",
  "notif_post_reply",
] as const;

/**
 * Hook for managing notification preferences.
 * If userId is not provided, uses the current authenticated user.
 */
export function useNotificationPreferences(userId?: string) {
  const { user } = useAuth();
  const targetId = userId ?? user?.id;
  const queryClient = useQueryClient();

  const queryKey = ["notification-preferences", targetId] as const;

  const { data: preferences, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!targetId) return null;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", targetId)
        .single();

      if (error && error.code === "PGRST116") {
        // Row not found — upsert with defaults
        const { data: created, error: insertError } = await supabase
          .from("notification_preferences")
          .upsert({ user_id: targetId }, { onConflict: "user_id" })
          .select("*")
          .single();
        if (insertError) throw insertError;
        return created as NotificationPreferences;
      }

      if (error) throw error;
      return data as NotificationPreferences;
    },
    enabled: !!targetId,
    staleTime: 5 * 60 * 1000,
  });

  const updatePreference = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: boolean }) => {
      if (!targetId) throw new Error("No user ID");
      const { error } = await supabase
        .from("notification_preferences")
        .update({ [field]: value })
        .eq("user_id", targetId);
      if (error) throw error;
    },
    onMutate: async ({ field, value }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: NotificationPreferences | null | undefined) =>
        old ? { ...old, [field]: value } : old
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const disableAllEmail = useMutation({
    mutationFn: async () => {
      if (!targetId) throw new Error("No user ID");
      const patch: Record<string, boolean> = {};
      for (const f of EMAIL_FIELDS) patch[f] = false;
      const { error } = await supabase
        .from("notification_preferences")
        .update(patch)
        .eq("user_id", targetId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const enableAllEmail = useMutation({
    mutationFn: async () => {
      if (!targetId) throw new Error("No user ID");
      const patch: Record<string, boolean> = {};
      for (const f of EMAIL_FIELDS) patch[f] = true;
      const { error } = await supabase
        .from("notification_preferences")
        .update(patch)
        .eq("user_id", targetId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const disableAllNotif = useMutation({
    mutationFn: async () => {
      if (!targetId) throw new Error("No user ID");
      const patch: Record<string, boolean> = {};
      for (const f of NOTIF_FIELDS) patch[f] = false;
      const { error } = await supabase
        .from("notification_preferences")
        .update(patch)
        .eq("user_id", targetId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Counts for summary badges
  const emailActiveCount = preferences
    ? EMAIL_FIELDS.filter((f) => preferences[f]).length
    : 0;
  const notifActiveCount = preferences
    ? NOTIF_FIELDS.filter((f) => preferences[f]).length
    : 0;

  return {
    preferences,
    isLoading,
    updatePreference,
    disableAllEmail,
    enableAllEmail,
    disableAllNotif,
    emailActiveCount,
    emailTotalCount: EMAIL_FIELDS.length,
    notifActiveCount,
    notifTotalCount: NOTIF_FIELDS.length,
  };
}
