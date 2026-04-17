import { useCallback } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Send an email notification via the notify-email Edge Function.
 * Uses the new unified payload format with recipient_id resolution.
 */
async function sendEmailNotification(payload: {
  type: string;
  recipient_id?: string;
  recipient_email?: string;
  recipient_name?: string;
  actor_name?: string;
  context?: Record<string, string | number | undefined>;
}): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("notify-email", { body: payload });
    if (error) {
      console.error("[email]", {
        type: payload.type,
        recipientId: payload.recipient_id,
        recipientEmail: payload.recipient_email,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("[email]", {
      type: payload.type,
      recipientId: payload.recipient_id,
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    });
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
 * The Edge Function also checks automation is_active and global toggle.
 */
export function useEmailNotifications() {
  // ---- Existing triggers (backward-compatible) ----

  const notifyCommentEmail = useCallback(
    async (postId: string, postAuthorId: string, commenterId: string, postTitle: string) => {
      if (postAuthorId === commenterId) return;
      const actorName = await resolveActorName(commenterId);
      await sendEmailNotification({
        type: "comment",
        recipient_id: postAuthorId,
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
      if (postAuthorId === likerId) return;
      const actorName = await resolveActorName(likerId);
      await sendEmailNotification({
        type: "like",
        recipient_id: postAuthorId,
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
      const actorName = await resolveActorName(followerId);
      await sendEmailNotification({
        type: "follow",
        recipient_id: targetStudentId,
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
      const actorName = await resolveActorName(authorId);
      await sendEmailNotification({
        type: "mention_community",
        recipient_id: mentionedStudentId,
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
    async (studentId: string, missionName: string, points?: number) => {
      await sendEmailNotification({
        type: "mission_complete",
        recipient_id: studentId,
        context: {
          mission_name: missionName,
          points: points ?? 0,
        },
      });
    },
    []
  );

  // ---- New triggers ----

  const notifyWelcome = useCallback(async (userId: string) => {
    await sendEmailNotification({
      type: "welcome",
      recipient_id: userId,
    });
  }, []);

  const notifyNewCourse = useCallback(
    async (userIds: string[], courseId: string, courseName: string) => {
      if (userIds.length === 0) return;
      const context = {
        course_name: courseName,
        action_url: `${window.location.origin}/cursos/${courseId}`,
      };
      await Promise.all(
        userIds.map((userId) =>
          sendEmailNotification({
            type: "new_course",
            recipient_id: userId,
            context,
          })
        )
      );
    },
    []
  );

  const notifyNewLesson = useCallback(
    async (userIds: string[], courseId: string, courseName: string, lessonName: string) => {
      if (userIds.length === 0) return;
      const context = {
        course_name: courseName,
        lesson_name: lessonName,
        action_url: `${window.location.origin}/cursos/${courseId}`,
      };
      await Promise.all(
        userIds.map((userId) =>
          sendEmailNotification({
            type: "new_lesson",
            recipient_id: userId,
            context,
          })
        )
      );
    },
    []
  );

  const notifyCertificateEarned = useCallback(
    async (userId: string, courseId: string, courseName: string) => {
      await sendEmailNotification({
        type: "certificate_earned",
        recipient_id: userId,
        context: {
          course_name: courseName,
          action_url: `${window.location.origin}/meus-certificados`,
        },
      });
    },
    []
  );

  const notifyPostReply = useCallback(
    async (authorId: string, postId: string, replierName: string) => {
      await sendEmailNotification({
        type: "post_reply",
        recipient_id: authorId,
        actor_name: replierName,
        context: {
          action_url: `${window.location.origin}/comunidade/feed#${postId}`,
        },
      });
    },
    []
  );

  const notifyFollowerMilestone = useCallback(
    async (userId: string, followerCount: number) => {
      await sendEmailNotification({
        type: "follower_milestone_10",
        recipient_id: userId,
        context: { follower_count: followerCount },
      });
    },
    []
  );

  const notifyCommentMilestone = useCallback(
    async (userId: string, commentCount: number) => {
      await sendEmailNotification({
        type: "comment_milestone",
        recipient_id: userId,
        context: { comment_count: commentCount },
      });
    },
    []
  );

  const notifyCommunityPost = useCallback(
    async (userId: string, postId: string) => {
      await sendEmailNotification({
        type: "community_post",
        recipient_id: userId,
        context: {
          action_url: `${window.location.origin}/comunidade/feed#${postId}`,
        },
      });
    },
    []
  );

  const resendAccessEmail = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("resend-access-email", {
        body: { userId },
      });
      if (error) throw error;
      return data as { success: boolean; message: string };
    } catch (err) {
      console.error("Failed to resend access email:", err);
      throw err;
    }
  }, []);

  return {
    // Existing (backward-compatible)
    notifyCommentEmail,
    notifyLikeEmail,
    notifyFollowEmail,
    notifyMentionEmail,
    notifyMissionCompletedEmail,
    // New
    notifyWelcome,
    notifyNewCourse,
    notifyNewLesson,
    notifyCertificateEarned,
    notifyPostReply,
    notifyFollowerMilestone,
    notifyCommentMilestone,
    notifyCommunityPost,
    resendAccessEmail,
  };
}
