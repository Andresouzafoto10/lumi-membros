import { useCallback } from "react";
import { supabase } from "@/lib/supabase";

type EmailNotificationType =
  | "comment"
  | "like"
  | "follow"
  | "mention"
  | "new_post"
  | "badge_earned";

interface EmailNotificationPayload {
  type: EmailNotificationType;
  recipient_email: string;
  recipient_name: string;
  actor_name: string;
  context: {
    post_title?: string;
    community_name?: string;
    badge_name?: string;
    action_url: string;
  };
}

/**
 * Send an email notification via the notify-email Edge Function.
 * Silently fails if the function is not deployed or returns an error.
 */
async function sendEmailNotification(
  payload: EmailNotificationPayload
): Promise<void> {
  try {
    await supabase.functions.invoke("notify-email", {
      body: payload,
    });
  } catch {
    // Silently fail — email notifications are best-effort
    console.warn("Failed to send email notification:", payload.type);
  }
}

/**
 * Resolve a student's email and display name from the profiles table.
 */
async function resolveRecipient(
  studentId: string
): Promise<{ email: string; name: string; emailEnabled: boolean } | null> {
  const { data } = await supabase
    .from("profiles")
    .select("email, display_name, name, email_notifications")
    .eq("id", studentId)
    .single();

  if (!data || !data.email) return null;

  return {
    email: data.email as string,
    name: (data.display_name as string) || (data.name as string) || "Membro",
    emailEnabled: data.email_notifications !== false,
  };
}

async function resolveActorName(actorId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, name")
    .eq("id", actorId)
    .single();

  return (data?.display_name as string) || (data?.name as string) || "Alguem";
}

/**
 * Hook providing email notification trigger functions.
 * Each function checks if the recipient has email notifications enabled.
 */
export function useEmailNotifications() {
  const notifyCommentEmail = useCallback(
    async (postId: string, postAuthorId: string, commenterId: string, postTitle: string) => {
      const [recipient, actorName] = await Promise.all([
        resolveRecipient(postAuthorId),
        resolveActorName(commenterId),
      ]);
      if (!recipient || !recipient.emailEnabled) return;
      if (postAuthorId === commenterId) return;

      await sendEmailNotification({
        type: "comment",
        recipient_email: recipient.email,
        recipient_name: recipient.name,
        actor_name: actorName,
        context: {
          post_title: postTitle,
          action_url: `${window.location.origin}/comunidade/feed#${postId}`,
        },
      });
    },
    []
  );

  const notifyLikeEmail = useCallback(
    async (postId: string, postAuthorId: string, likerId: string, postTitle: string) => {
      const [recipient, actorName] = await Promise.all([
        resolveRecipient(postAuthorId),
        resolveActorName(likerId),
      ]);
      if (!recipient || !recipient.emailEnabled) return;
      if (postAuthorId === likerId) return;

      await sendEmailNotification({
        type: "like",
        recipient_email: recipient.email,
        recipient_name: recipient.name,
        actor_name: actorName,
        context: {
          post_title: postTitle,
          action_url: `${window.location.origin}/comunidade/feed#${postId}`,
        },
      });
    },
    []
  );

  const notifyFollowEmail = useCallback(
    async (targetStudentId: string, followerId: string) => {
      const [recipient, actorName] = await Promise.all([
        resolveRecipient(targetStudentId),
        resolveActorName(followerId),
      ]);
      if (!recipient || !recipient.emailEnabled) return;

      await sendEmailNotification({
        type: "follow",
        recipient_email: recipient.email,
        recipient_name: recipient.name,
        actor_name: actorName,
        context: {
          action_url: `${window.location.origin}/perfil/${followerId}`,
        },
      });
    },
    []
  );

  const notifyMentionEmail = useCallback(
    async (
      postId: string,
      mentionedStudentId: string,
      authorId: string,
      communityName: string
    ) => {
      const [recipient, actorName] = await Promise.all([
        resolveRecipient(mentionedStudentId),
        resolveActorName(authorId),
      ]);
      if (!recipient || !recipient.emailEnabled) return;

      await sendEmailNotification({
        type: "mention",
        recipient_email: recipient.email,
        recipient_name: recipient.name,
        actor_name: actorName,
        context: {
          community_name: communityName,
          action_url: `${window.location.origin}/comunidade/feed#${postId}`,
        },
      });
    },
    []
  );

  const notifyMissionCompletedEmail = useCallback(
    async (studentId: string, missionName: string) => {
      const recipient = await resolveRecipient(studentId);
      if (!recipient || !recipient.emailEnabled) return;

      await sendEmailNotification({
        type: "badge_earned",
        recipient_email: recipient.email,
        recipient_name: recipient.name,
        actor_name: "Lumi Membros",
        context: {
          badge_name: missionName,
          action_url: `${window.location.origin}/meu-perfil`,
        },
      });
    },
    []
  );

  return {
    notifyCommentEmail,
    notifyLikeEmail,
    notifyFollowEmail,
    notifyMentionEmail,
    notifyMissionCompletedEmail,
  };
}
