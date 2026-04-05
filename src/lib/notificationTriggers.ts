import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Notification type → preference column mapping (in-app)
// ---------------------------------------------------------------------------

const NOTIF_PREF_MAP: Record<string, string | null> = {
  like: "notif_likes",
  comment: "notif_comments",
  follow: "notif_follows",
  mention: "notif_mentions",
  system: null, // system notifications always go through
};

/**
 * Check if a user has in-app notifications enabled for a given type.
 * Returns true if no preferences row exists (defaults to enabled).
 */
async function shouldNotify(userId: string, type: string): Promise<boolean> {
  const column = NOTIF_PREF_MAP[type];
  if (!column) return true; // system notifications always send

  const { data } = await supabase
    .from("notification_preferences")
    .select(column)
    .eq("user_id", userId)
    .single();

  if (!data) return true; // no prefs row = default enabled
  return (data as unknown as Record<string, unknown>)[column] !== false;
}

// ---------------------------------------------------------------------------
// Notification creation helper
// ---------------------------------------------------------------------------

async function createNotification(data: {
  recipientId: string;
  type: "like" | "comment" | "follow" | "mention" | "system";
  actorId: string | null;
  targetId: string;
  targetType: "post" | "comment" | "profile";
  message: string;
}): Promise<void> {
  // Don't notify yourself
  if (data.actorId && data.actorId === data.recipientId) return;

  // Check user preference
  const allowed = await shouldNotify(data.recipientId, data.type);
  if (!allowed) return;

  await supabase.from("notifications").insert({
    recipient_id: data.recipientId,
    type: data.type,
    actor_id: data.actorId,
    target_id: data.targetId,
    target_type: data.targetType,
    message: data.message,
    read: false,
  });
}

// ---------------------------------------------------------------------------
// Helper: get display name
// ---------------------------------------------------------------------------

async function getDisplayName(userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, name")
    .eq("id", userId)
    .single();
  return (data?.display_name as string) || (data?.name as string) || "Alguém";
}

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

/** Notify post author when someone likes their post */
export async function notifyPostLiked(
  postId: string,
  postAuthorId: string,
  likerId: string
): Promise<void> {
  const name = await getDisplayName(likerId);
  await createNotification({
    recipientId: postAuthorId,
    type: "like",
    actorId: likerId,
    targetId: postId,
    targetType: "post",
    message: `❤️ ${name} curtiu sua publicação`,
  });
}

/** Notify post author when someone comments on their post */
export async function notifyPostCommented(
  postId: string,
  postAuthorId: string,
  commenterId: string
): Promise<void> {
  const name = await getDisplayName(commenterId);
  await createNotification({
    recipientId: postAuthorId,
    type: "comment",
    actorId: commenterId,
    targetId: postId,
    targetType: "post",
    message: `💬 ${name} comentou na sua publicação`,
  });
}

/** Notify parent comment author when someone replies */
export async function notifyCommentReply(
  postId: string,
  parentCommentAuthorId: string,
  replierId: string
): Promise<void> {
  const name = await getDisplayName(replierId);
  await createNotification({
    recipientId: parentCommentAuthorId,
    type: "comment",
    actorId: replierId,
    targetId: postId,
    targetType: "comment",
    message: `↩️ ${name} respondeu seu comentário`,
  });
}

/** Notify post author when their post is approved */
export async function notifyPostApproved(
  postId: string,
  authorId: string
): Promise<void> {
  await createNotification({
    recipientId: authorId,
    type: "system",
    actorId: null,
    targetId: postId,
    targetType: "post",
    message: "✅ Sua publicação foi aprovada",
  });
}

/** Notify post author when their post is rejected */
export async function notifyPostRejected(
  postId: string,
  authorId: string
): Promise<void> {
  await createNotification({
    recipientId: authorId,
    type: "system",
    actorId: null,
    targetId: postId,
    targetType: "post",
    message: "❌ Sua publicação não foi aprovada",
  });
}

/** Notify student when restricted */
export async function notifyStudentRestricted(
  studentId: string,
  reason: string
): Promise<void> {
  await createNotification({
    recipientId: studentId,
    type: "system",
    actorId: null,
    targetId: studentId,
    targetType: "profile",
    message: `🚫 Você recebeu uma restrição: ${reason}`,
  });
}

/** Notify mentioned users in a post */
export async function notifyMentions(
  postId: string,
  authorId: string,
  mentionedUsernames: string[]
): Promise<void> {
  if (mentionedUsernames.length === 0) return;

  const authorName = await getDisplayName(authorId);

  // Resolve usernames to user IDs
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", mentionedUsernames);

  for (const profile of profiles ?? []) {
    await createNotification({
      recipientId: profile.id as string,
      type: "mention",
      actorId: authorId,
      targetId: postId,
      targetType: "post",
      message: `📢 ${authorName} te mencionou em uma publicação`,
    });
  }
}

/** Notify student when they earn a certificate */
export async function notifyCertificateEarned(
  studentId: string,
  courseName: string
): Promise<void> {
  await createNotification({
    recipientId: studentId,
    type: "system",
    actorId: null,
    targetId: studentId,
    targetType: "profile",
    message: `🎓 Seu certificado de "${courseName}" está pronto!`,
  });
}
