import { useCallback, useSyncExternalStore } from "react";
import type { PostComment } from "@/types/student";
import { mockComments } from "@/data/mock-comments";

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
      return newComment.id;
    },
    []
  );

  const deleteComment = useCallback((commentId: string) => {
    // Also remove replies to this comment
    setState(
      state.filter(
        (c) => c.id !== commentId && c.parentCommentId !== commentId
      )
    );
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
