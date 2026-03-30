import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PostComment } from "@/types/student";

const QK_ALL = ["comments"] as const;

function mapRow(c: Record<string, unknown>): PostComment {
  return {
    id: c.id as string,
    postId: c.post_id as string,
    authorId: c.author_id as string,
    body: c.body as string,
    likesCount: c.likes_count as number,
    likedBy: (c.liked_by as string[]) ?? [],
    parentCommentId: (c.parent_comment_id as string | null) ?? null,
    createdAt: c.created_at as string,
  };
}

async function fetchAllComments(): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from("post_comments")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export function useComments() {
  const queryClient = useQueryClient();

  const { data: allComments = [], isLoading } = useQuery({
    queryKey: QK_ALL,
    queryFn: fetchAllComments,
    staleTime: 1000 * 30,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK_ALL });
  }, [queryClient]);

  const getCommentsForPost = useCallback(
    (postId: string) => allComments.filter((c) => c.postId === postId),
    [allComments]
  );

  const createComment = useCallback(
    async (data: {
      postId: string;
      authorId: string;
      body: string;
      parentCommentId?: string | null;
    }) => {
      const { data: row, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: data.postId,
          author_id: data.authorId,
          body: data.body,
          likes_count: 0,
          liked_by: [],
          parent_comment_id: data.parentCommentId ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      // Increment comments_count on post
      const { data: post } = await supabase
        .from("community_posts")
        .select("comments_count")
        .eq("id", data.postId)
        .single();
      if (post) {
        await supabase
          .from("community_posts")
          .update({ comments_count: (post.comments_count as number) + 1 })
          .eq("id", data.postId);
      }
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      return row.id as string;
    },
    [invalidate, queryClient]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const comment = allComments.find((c) => c.id === commentId);
      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
      if (comment) {
        const { data: post } = await supabase
          .from("community_posts")
          .select("comments_count")
          .eq("id", comment.postId)
          .single();
        if (post) {
          await supabase
            .from("community_posts")
            .update({
              comments_count: Math.max(0, (post.comments_count as number) - 1),
            })
            .eq("id", comment.postId);
        }
      }
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    [allComments, invalidate, queryClient]
  );

  const toggleLikeComment = useCallback(
    async (commentId: string, userId: string) => {
      const comment = allComments.find((c) => c.id === commentId);
      if (!comment) return;
      const liked = comment.likedBy.includes(userId);
      const newLikedBy = liked
        ? comment.likedBy.filter((id) => id !== userId)
        : [...comment.likedBy, userId];
      const { error } = await supabase
        .from("post_comments")
        .update({ liked_by: newLikedBy, likes_count: newLikedBy.length })
        .eq("id", commentId);
      if (error) throw error;
      invalidate();
    },
    [allComments, invalidate]
  );

  return {
    allComments,
    loading: isLoading,
    getCommentsForPost,
    createComment,
    deleteComment,
    toggleLikeComment,
  };
}
