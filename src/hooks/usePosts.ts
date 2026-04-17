import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { deleteFromR2, isR2Url } from "@/lib/r2Upload";
import { onPostLiked, onPostCreated, onPollAnswered, onFirstPost } from "@/lib/gamificationEngine";
import { notifyPostLiked, notifyPostApproved, notifyPostRejected, notifyMentions } from "@/lib/notificationTriggers";
import type { CommunityPost, SystemEvent, PostAttachment, PostPoll } from "@/types/student";

const QK = ["posts"] as const;
const qkByCommunity = (id: string) => ["posts", "community", id] as const;
const qkFeed = () => ["posts", "feed"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractHashtags(body: string): string[] {
  const matches = body.match(/#([\w-]+)/g);
  return matches ? [...new Set(matches.map((m) => m.slice(1).toLowerCase()))] : [];
}

function mapRow(p: Record<string, unknown>): CommunityPost {
  return {
    id: p.id as string,
    communityId: p.community_id as string,
    authorId: p.author_id as string,
    type: p.type as CommunityPost["type"],
    systemEvent: (p.system_event as SystemEvent) ?? undefined,
    title: p.title as string,
    body: p.body as string,
    images: (p.images as string[]) ?? [],
    attachments: (p.attachments as PostAttachment[]) ?? [],
    poll: p.poll ? (p.poll as PostPoll) : undefined,
    hashtags: (p.hashtags as string[]) ?? [],
    mentions: (p.mentions as string[]) ?? [],
    likesCount: p.likes_count as number,
    commentsCount: p.comments_count as number,
    likedBy: (p.liked_by as string[]) ?? [],
    savedBy: (p.saved_by as string[]) ?? [],
    status: p.status as CommunityPost["status"],
    createdAt: p.created_at as string,
    updatedAt: p.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchPostsByCommunity(communityId: string): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from("community_posts")
    .select("*")
    .eq("community_id", communityId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

async function fetchFeedPosts(): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from("community_posts")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

async function fetchAllPostsAdmin(): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from("community_posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePosts() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const allPostsQuery = useQuery({
    queryKey: QK,
    queryFn: fetchAllPostsAdmin,
    staleTime: 1000 * 60 * 2,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
    queryClient.invalidateQueries({ queryKey: qkFeed() });
  }, [queryClient]);

  // Stable reference: only changes when the underlying query data changes.
  const allPosts = useMemo(() => allPostsQuery.data ?? [], [allPostsQuery.data]);

  // Posts for a specific community
  const getPostsByCommunity = useCallback(
    (communityId: string) =>
      allPosts.filter(
        (p) => p.communityId === communityId && p.status === "published"
      ),
    [allPosts]
  );

  // Feed posts — supports optional communityIds filter and followingIds
  const getFeedPosts = useCallback(
    (
      communityIdsOrFilter?: string[] | "recent" | "popular" | "following",
      filterArg?: "recent" | "popular" | "following",
      followingIds?: string[]
    ) => {
      let communityIds: string[] | undefined;
      let filter: "recent" | "popular" | "following" = "recent";
      let following: string[] = [];

      if (Array.isArray(communityIdsOrFilter)) {
        communityIds = communityIdsOrFilter;
        filter = filterArg ?? "recent";
        following = followingIds ?? [];
      } else if (communityIdsOrFilter) {
        filter = communityIdsOrFilter;
      }

      let published = allPosts.filter(
        (p) =>
          p.status === "published" &&
          (!communityIds || communityIds.length === 0 || communityIds.includes(p.communityId))
      );

      if (filter === "following" && following.length > 0) {
        published = published.filter((p) => following.includes(p.authorId));
      }

      if (filter === "popular") {
        return [...published].sort((a, b) => b.likesCount - a.likesCount);
      }
      return [...published].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    [allPosts]
  );

  const getTopPosts = useCallback(
    (communityIdsOrLimit?: string[] | number, limitArg?: number) => {
      let communityIds: string[] | undefined;
      let limit = 5;
      if (Array.isArray(communityIdsOrLimit)) {
        communityIds = communityIdsOrLimit;
        limit = limitArg ?? 5;
      } else if (typeof communityIdsOrLimit === "number") {
        limit = communityIdsOrLimit;
      }
      return [...allPosts.filter(
        (p) =>
          p.status === "published" &&
          (!communityIds || communityIds.length === 0 || communityIds.includes(p.communityId))
      )]
        .sort((a, b) => b.likesCount - a.likesCount)
        .slice(0, limit);
    },
    [allPosts]
  );

  const getTrendingHashtags = useCallback(
    (_period?: "week" | "month", communityIds?: string[]) => {
      const freq: Record<string, number> = {};
      allPosts
        .filter(
          (p) =>
            p.status === "published" &&
            (!communityIds || communityIds.length === 0 || communityIds.includes(p.communityId))
        )
        .forEach((p) =>
          p.hashtags.forEach((h) => {
            freq[h] = (freq[h] ?? 0) + 1;
          })
        );
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));
    },
    [allPosts]
  );

  const getPostsByHashtag = useCallback(
    (tag: string, communityIds?: string[]) => {
      const lower = tag.toLowerCase();
      return allPosts.filter(
        (p) =>
          p.status === "published" &&
          p.hashtags.includes(lower) &&
          (!communityIds || communityIds.length === 0 || communityIds.includes(p.communityId))
      );
    },
    [allPosts]
  );

  const findPost = useCallback(
    (postId: string) => allPosts.find((p) => p.id === postId) ?? null,
    [allPosts]
  );

  const getPostsByAuthor = useCallback(
    (authorId: string) =>
      allPosts.filter(
        (p) => p.authorId === authorId && p.status === "published"
      ),
    [allPosts]
  );

  const getSavedPosts = useCallback(
    (userId: string) =>
      allPosts.filter(
        (p) => p.savedBy.includes(userId) && p.status === "published"
      ),
    [allPosts]
  );

  const getPendingPosts = useCallback(
    () => allPosts.filter((p) => p.status === "pending"),
    [allPosts]
  );

  // ---- Mutations ----

  const createPost = useCallback(
    async (data: {
      communityId: string;
      authorId: string;
      title?: string;
      body: string;
      images?: string[];
      attachments?: PostAttachment[];
      poll?: { question: string; options: string[]; duration: string };
      requireApproval?: boolean;
      systemEvent?: SystemEvent;
      type?: CommunityPost["type"];
    }) => {
      const hashtags = extractHashtags(data.body);
      const status = data.requireApproval ? "pending" : "published";

      // Build poll data if present
      let pollData: PostPoll | null = null;
      if (data.poll) {
        const durationDays: Record<string, number> = { "1d": 1, "3d": 3, "7d": 7, "14d": 14 };
        const days = durationDays[data.poll.duration] ?? 7;
        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + days);
        pollData = {
          question: data.poll.question,
          options: data.poll.options.map((text, i) => ({
            id: `opt-${i}`,
            text,
            votedBy: [] as string[],
          })),
          duration: (data.poll.duration as PostPoll["duration"]) ?? "7d",
          endsAt: endsAt.toISOString(),
        };
      }

      const { data: row, error } = await supabase
        .from("community_posts")
        .insert({
          community_id: data.communityId,
          author_id: data.authorId,
          type: data.type ?? "user",
          system_event: data.systemEvent ?? null,
          title: data.title ?? "",
          body: data.body,
          images: data.images ?? [],
          attachments: data.attachments ?? [],
          poll: pollData,
          hashtags,
          mentions: [],
          likes_count: 0,
          comments_count: 0,
          liked_by: [],
          saved_by: [],
          status,
        })
        .select()
        .single();
      if (error) throw error;
      invalidate();
      // Gamification + mention notifications when post is published
      if (status === "published") {
        onPostCreated(data.authorId).catch(() => {});
        // Check if this is the student's first post (bonus points).
        // Query the DB directly instead of the local `allPosts` cache —
        // the cache may be empty/stale during load and would misreport "first post".
        const { count } = await supabase
          .from("community_posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", data.authorId)
          .eq("status", "published")
          .neq("id", row.id as string);
        if ((count ?? 0) === 0) {
          onFirstPost(data.authorId, row.id as string).catch(() => {});
        }
        // Extract @mentions and notify
        const mentions = data.body.match(/@([\w-]+)/g);
        if (mentions) {
          const usernames = mentions.map((m) => m.slice(1));
          notifyMentions(row.id as string, data.authorId, usernames).catch(() => {});
        }
      }
      return row.id as string;
    },
    [invalidate]
  );

  const updatePost = useCallback(
    async (
      postId: string,
      patch: Partial<Pick<CommunityPost, "title" | "body" | "images" | "attachments" | "poll" | "status">>
    ) => {
      const payload: Record<string, unknown> = {};
      if (patch.title !== undefined) payload.title = patch.title;
      if (patch.body !== undefined) {
        payload.body = patch.body;
        payload.hashtags = extractHashtags(patch.body);
      }
      if (patch.images !== undefined) payload.images = patch.images;
      if (patch.attachments !== undefined) payload.attachments = patch.attachments;
      if (patch.poll !== undefined) payload.poll = patch.poll ?? null;
      if (patch.status !== undefined) payload.status = patch.status;

      const { error } = await supabase
        .from("community_posts")
        .update(payload)
        .eq("id", postId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      // Find post to clean up R2 files
      const post = allPosts.find((p) => p.id === postId);
      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", postId);
      if (error) throw error;
      // Clean up R2 images and attachments
      if (post) {
        for (const url of post.images ?? []) {
          if (isR2Url(url)) deleteFromR2(url).catch(() => {});
        }
        for (const att of post.attachments ?? []) {
          if (att.dataUrl && isR2Url(att.dataUrl)) deleteFromR2(att.dataUrl).catch(() => {});
        }
      }
      invalidate();
    },
    [allPosts, invalidate]
  );

  const toggleLike = useCallback(
    async (postId: string, userId: string) => {
      const post = findPost(postId);
      if (!post) return;
      const liked = post.likedBy.includes(userId);
      const newLikedBy = liked
        ? post.likedBy.filter((id) => id !== userId)
        : [...post.likedBy, userId];
      const { error } = await supabase
        .from("community_posts")
        .update({
          liked_by: newLikedBy,
          likes_count: newLikedBy.length,
        })
        .eq("id", postId);
      if (error) throw error;
      invalidate();
      // Gamification + notification when liked (not unliked)
      if (!liked && post.authorId !== userId) {
        onPostLiked(post.authorId).catch(() => {});
        notifyPostLiked(postId, post.authorId, userId).catch(() => {});
      }
    },
    [findPost, invalidate]
  );

  const toggleSave = useCallback(
    async (postId: string, userId: string) => {
      const post = findPost(postId);
      if (!post) return;
      const saved = post.savedBy.includes(userId);
      const newSavedBy = saved
        ? post.savedBy.filter((id) => id !== userId)
        : [...post.savedBy, userId];
      const { error } = await supabase
        .from("community_posts")
        .update({ saved_by: newSavedBy })
        .eq("id", postId);
      if (error) throw error;
      invalidate();
    },
    [findPost, invalidate]
  );

  const votePoll = useCallback(
    async (postId: string, optionId: string, userId: string) => {
      const post = findPost(postId);
      if (!post?.poll) return;
      // Already voted?
      const hasVoted = post.poll.options.some((o) => o.votedBy.includes(userId));
      if (hasVoted) return;
      const newPoll = {
        ...post.poll,
        options: post.poll.options.map((o) =>
          o.id === optionId ? { ...o, votedBy: [...o.votedBy, userId] } : o
        ),
      };
      const { error } = await supabase
        .from("community_posts")
        .update({ poll: newPoll })
        .eq("id", postId);
      if (error) throw error;
      invalidate();
      // Gamification: award points for answering poll
      onPollAnswered(userId, postId).catch(() => {});
    },
    [findPost, invalidate]
  );

  const approvePost = useCallback(
    async (postId: string) => {
      if (!isAdmin) throw new Error("Sem permissão para aprovar posts");
      const post = findPost(postId);
      await updatePost(postId, { status: "published" });
      if (post) {
        notifyPostApproved(postId, post.authorId).catch(() => {});
        onPostCreated(post.authorId).catch(() => {});
      }
    },
    [isAdmin, findPost, updatePost]
  );

  const rejectPost = useCallback(
    async (postId: string) => {
      if (!isAdmin) throw new Error("Sem permissão para rejeitar posts");
      const post = findPost(postId);
      await updatePost(postId, { status: "rejected" });
      if (post) {
        notifyPostRejected(postId, post.authorId).catch(() => {});
      }
    },
    [isAdmin, findPost, updatePost]
  );

  // Called by useComments to keep commentsCount in sync
  const incrementCommentsCount = useCallback(
    async (postId: string, delta: number) => {
      const post = findPost(postId);
      if (!post) return;
      await supabase
        .from("community_posts")
        .update({ comments_count: Math.max(0, post.commentsCount + delta) })
        .eq("id", postId);
      invalidate();
    },
    [findPost, invalidate]
  );

  return {
    allPosts,
    posts: allPosts, // backward-compat alias
    loading: allPostsQuery.isLoading,
    getPostsByCommunity,
    getFeedPosts,
    getTopPosts,
    getTrendingHashtags,
    getPostsByHashtag,
    findPost,
    getPostsByAuthor,
    getSavedPosts,
    getPendingPosts,
    createPost,
    updatePost,
    deletePost,
    toggleLike,
    toggleSave,
    votePoll,
    approvePost,
    rejectPost,
    incrementCommentsCount,
  };
}
