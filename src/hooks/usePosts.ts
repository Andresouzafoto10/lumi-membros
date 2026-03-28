import { useCallback, useSyncExternalStore } from "react";
import type { CommunityPost } from "@/types/student";
import { mockPosts } from "@/data/mock-posts";

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:posts";

let state: CommunityPost[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): CommunityPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CommunityPost[];
  } catch {
    // ignore
  }
  return [...mockPosts];
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: CommunityPost[]) {
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
// Helpers — extract hashtags and mentions from body text
// ---------------------------------------------------------------------------

function extractHashtags(body: string): string[] {
  const matches = body.match(/#([\w-]+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

function extractMentions(body: string): string[] {
  const matches = body.match(/@([\w.]+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePosts() {
  const posts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // --- Queries ---

  const getPostsByCommunity = useCallback(
    (communityId: string) =>
      posts
        .filter((p) => p.communityId === communityId && p.status === "published")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [posts]
  );

  const getPostsByAuthor = useCallback(
    (studentId: string) =>
      posts
        .filter((p) => p.authorId === studentId && p.status === "published")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [posts]
  );

  const getSavedPosts = useCallback(
    (studentId: string) =>
      posts
        .filter((p) => p.savedBy.includes(studentId) && p.status === "published")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [posts]
  );

  const getFeedPosts = useCallback(
    (
      communityIds: string[],
      filter: "recent" | "popular" | "following",
      followingIds?: string[]
    ) => {
      let filtered = posts.filter(
        (p) =>
          communityIds.includes(p.communityId) && p.status === "published"
      );

      if (filter === "following" && followingIds) {
        filtered = filtered.filter((p) => followingIds.includes(p.authorId));
      }

      if (filter === "popular") {
        return filtered.sort((a, b) => b.likesCount - a.likesCount);
      }

      // "recent" or "following" — chronological
      return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    [posts]
  );

  const getPostsByHashtag = useCallback(
    (tag: string, communityIds?: string[]) => {
      const lower = tag.toLowerCase();
      return posts
        .filter(
          (p) =>
            p.status === "published" &&
            p.hashtags.includes(lower) &&
            (!communityIds || communityIds.includes(p.communityId))
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    [posts]
  );

  const findPost = useCallback(
    (postId: string | undefined) =>
      postId ? posts.find((p) => p.id === postId) ?? null : null,
    [posts]
  );

  const getPendingPosts = useCallback(
    (communityId?: string) =>
      posts
        .filter(
          (p) =>
            p.status === "pending" &&
            (!communityId || p.communityId === communityId)
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [posts]
  );

  const getAllPostsForModeration = useCallback(
    (communityId?: string) =>
      posts
        .filter((p) => !communityId || p.communityId === communityId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [posts]
  );

  // --- Trending & Top ---

  const getTrendingHashtags = useCallback(
    (communityIds: string[], limit = 5) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoff = sevenDaysAgo.toISOString();

      const counts: Record<string, number> = {};
      for (const p of posts) {
        if (
          p.status !== "published" ||
          !communityIds.includes(p.communityId) ||
          p.createdAt < cutoff
        )
          continue;
        for (const tag of p.hashtags) {
          counts[tag] = (counts[tag] ?? 0) + 1;
        }
      }

      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));
    },
    [posts]
  );

  const getTopPosts = useCallback(
    (communityIds: string[], limit = 3) => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      return posts
        .filter(
          (p) =>
            p.status === "published" &&
            communityIds.includes(p.communityId) &&
            p.createdAt >= monthStart
        )
        .sort((a, b) => b.likesCount - a.likesCount)
        .slice(0, limit);
    },
    [posts]
  );

  // --- Mutations ---

  const createPost = useCallback(
    (data: {
      communityId: string;
      authorId: string;
      title: string;
      body: string;
      images: string[];
      status?: "published" | "pending";
    }) => {
      const now = new Date().toISOString();
      const newPost: CommunityPost = {
        id: uuid(),
        communityId: data.communityId,
        authorId: data.authorId,
        type: "user",
        title: data.title,
        body: data.body,
        images: data.images,
        hashtags: extractHashtags(data.body),
        mentions: extractMentions(data.body),
        likesCount: 0,
        commentsCount: 0,
        likedBy: [],
        savedBy: [],
        status: data.status ?? "published",
        createdAt: now,
        updatedAt: now,
      };
      setState([newPost, ...state]);
      return newPost.id;
    },
    []
  );

  const updatePost = useCallback(
    (postId: string, patch: { title?: string; body?: string; images?: string[] }) => {
      setState(
        state.map((p) => {
          if (p.id !== postId) return p;
          const updated = { ...p, ...patch, updatedAt: new Date().toISOString() };
          if (patch.body !== undefined) {
            updated.hashtags = extractHashtags(patch.body);
            updated.mentions = extractMentions(patch.body);
          }
          return updated;
        })
      );
    },
    []
  );

  const deletePost = useCallback((postId: string) => {
    setState(state.filter((p) => p.id !== postId));
  }, []);

  const approvePost = useCallback((postId: string) => {
    setState(
      state.map((p) =>
        p.id === postId ? { ...p, status: "published" as const } : p
      )
    );
  }, []);

  const rejectPost = useCallback((postId: string) => {
    setState(
      state.map((p) =>
        p.id === postId ? { ...p, status: "rejected" as const } : p
      )
    );
  }, []);

  const toggleLike = useCallback(
    (postId: string, studentId: string) => {
      setState(
        state.map((p) => {
          if (p.id !== postId) return p;
          const liked = p.likedBy.includes(studentId);
          return {
            ...p,
            likedBy: liked
              ? p.likedBy.filter((id) => id !== studentId)
              : [...p.likedBy, studentId],
            likesCount: liked ? p.likesCount - 1 : p.likesCount + 1,
          };
        })
      );
    },
    []
  );

  const toggleSave = useCallback(
    (postId: string, studentId: string) => {
      setState(
        state.map((p) => {
          if (p.id !== postId) return p;
          const saved = p.savedBy.includes(studentId);
          return {
            ...p,
            savedBy: saved
              ? p.savedBy.filter((id) => id !== studentId)
              : [...p.savedBy, studentId],
          };
        })
      );
    },
    []
  );

  return {
    posts,
    findPost,
    getPostsByCommunity,
    getPostsByAuthor,
    getSavedPosts,
    getFeedPosts,
    getPostsByHashtag,
    getPendingPosts,
    getAllPostsForModeration,
    getTrendingHashtags,
    getTopPosts,
    createPost,
    updatePost,
    deletePost,
    approvePost,
    rejectPost,
    toggleLike,
    toggleSave,
  };
}
