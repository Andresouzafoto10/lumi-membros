import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CommunityPost, SystemEvent } from "@/types/student";

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

  const allPostsQuery = useQuery({
    queryKey: QK,
    queryFn: fetchAllPostsAdmin,
    staleTime: 1000 * 60 * 2,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
    queryClient.invalidateQueries({ queryKey: qkFeed() });
  }, [queryClient]);

  const allPosts = allPostsQuery.data ?? [];

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
      requireApproval?: boolean;
      systemEvent?: SystemEvent;
      type?: CommunityPost["type"];
    }) => {
      const hashtags = extractHashtags(data.body);
      const status = data.requireApproval ? "pending" : "published";
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
      return row.id as string;
    },
    [invalidate]
  );

  const updatePost = useCallback(
    async (
      postId: string,
      patch: Partial<Pick<CommunityPost, "title" | "body" | "images" | "status">>
    ) => {
      const { error } = await supabase
        .from("community_posts")
        .update({
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.body !== undefined && {
            body: patch.body,
            hashtags: extractHashtags(patch.body),
          }),
          ...(patch.images !== undefined && { images: patch.images }),
          ...(patch.status !== undefined && { status: patch.status }),
        })
        .eq("id", postId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", postId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
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

  const approvePost = useCallback(
    async (postId: string) => updatePost(postId, { status: "published" }),
    [updatePost]
  );

  const rejectPost = useCallback(
    async (postId: string) => updatePost(postId, { status: "rejected" }),
    [updatePost]
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
    approvePost,
    rejectPost,
    incrementCommentsCount,
  };
}
