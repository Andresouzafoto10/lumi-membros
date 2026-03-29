import { useCallback, useSyncExternalStore } from "react";
import type { PostComment } from "@/types/student";
import { mockComments } from "@/data/mock-comments";
import { updatePostCommentCount, findPostDirect } from "@/hooks/usePosts";
import { addNotification } from "@/hooks/useNotifications";
import { findProfileDirect } from "@/hooks/useProfiles";

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:comments";

let state: PostComment[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): PostComment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PostComment[];
  } catch {
    // ignore
  }
  return [...mockComments];
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: PostComment[]) {
  state = next;
  persist();
  listeners.forEach((fn) => fn());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function uuid(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useComments() {
  const comments = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const getCommentsByPost = useCallback(
    (postId: string) =>
      comments
        .filter((c) => c.postId === postId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [comments]
  );

  const getRootComments = useCallback(
    (postId: string) =>
      comments
        .filter((c) => c.postId === postId && c.parentCommentId === null)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [comments]
  );

  const getReplies = useCallback(
    (commentId: string) =>
      comments
        .filter((c) => c.parentCommentId === commentId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [comments]
  );

  const getCommentCount = useCallback(
    (postId: string) => comments.filter((c) => c.postId === postId).length,
    [comments]
  );

  const addComment = useCallback(
    (data: {
      postId: string;
      authorId: string;
      body: string;
      parentCommentId?: string | null;
    }) => {
      const newComment: PostComment = {
        id: uuid(),
        postId: data.postId,
        authorId: data.authorId,
        body: data.body,
        likesCount: 0,
        likedBy: [],
        parentCommentId: data.parentCommentId ?? null,
        createdAt: new Date().toISOString(),
      };
      setState([...state, newComment]);
      updatePostCommentCount(data.postId, 1);

      // Build notification
      const actorProfile = findProfileDirect(data.authorId);
      const actorName = actorProfile?.displayName ?? "Alguém";

      // Notify post author about the comment (if not self)
      const post = findPostDirect(data.postId);
      if (post && post.authorId !== data.authorId) {
        addNotification({
          type: "comment",
          recipientId: post.authorId,
          actorId: data.authorId,
          targetId: data.postId,
          targetType: "post",
          message: `${actorName} comentou na sua publicação`,
        });
      }

      // If replying, also notify the parent comment author (if different from commenter and post author)
      if (data.parentCommentId) {
        const parentComment = state.find((c) => c.id === data.parentCommentId);
        if (
          parentComment &&
          parentComment.authorId !== data.authorId &&
          parentComment.authorId !== post?.authorId
        ) {
          addNotification({
            type: "comment",
            recipientId: parentComment.authorId,
            actorId: data.authorId,
            targetId: data.postId,
            targetType: "comment",
            message: `${actorName} respondeu ao seu comentário`,
          });
        }
      }

      return newComment.id;
    },
    []
  );

  const deleteComment = useCallback((commentId: string) => {
    const target = state.find((c) => c.id === commentId);
    if (target) {
      // Count the comment itself plus any direct replies that will be cascade-deleted
      const repliesCount = state.filter(
        (c) => c.parentCommentId === commentId
      ).length;
      const totalRemoved = 1 + repliesCount;
      setState(
        state.filter(
          (c) => c.id !== commentId && c.parentCommentId !== commentId
        )
      );
      updatePostCommentCount(target.postId, -totalRemoved);
    }
  }, []);

  const toggleLikeComment = useCallback(
    (commentId: string, studentId: string) => {
      setState(
        state.map((c) => {
          if (c.id !== commentId) return c;
          const liked = c.likedBy.includes(studentId);
          return {
            ...c,
            likedBy: liked
              ? c.likedBy.filter((id) => id !== studentId)
              : [...c.likedBy, studentId],
            likesCount: liked ? c.likesCount - 1 : c.likesCount + 1,
          };
        })
      );
    },
    []
  );

  return {
    comments,
    getCommentsByPost,
    getRootComments,
    getReplies,
    getCommentCount,
    addComment,
    deleteComment,
    toggleLikeComment,
  };
}
