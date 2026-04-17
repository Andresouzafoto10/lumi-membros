import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { onCommentCreated, onCommentLiked } from "@/lib/gamificationEngine";
import { notifyPostCommented, notifyCommentReply } from "@/lib/notificationTriggers";
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
      // comments_count is maintained atomically by trg_sync_post_comments_count.
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      // Gamification: award points for comment
      onCommentCreated(data.authorId).catch(() => {});
      // Notification: notify post author
      const { data: postData } = await supabase
        .from("community_posts")
        .select("author_id")
        .eq("id", data.postId)
        .single();
      if (postData) {
        notifyPostCommented(data.postId, postData.author_id as string, data.authorId).catch(() => {});
      }
      // Notification: notify parent comment author if this is a reply
      if (data.parentCommentId) {
        const parent = allComments.find((c) => c.id === data.parentCommentId);
        if (parent) {
          notifyCommentReply(data.postId, parent.authorId, data.authorId).catch(() => {});
        }
      }
      return row.id as string;
    },
    [allComments, invalidate, queryClient]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
      // comments_count is maintained atomically by trg_sync_post_comments_count.
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    [invalidate, queryClient]
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
      // Gamification: award points to comment author when liked (not unliked, not self-like)
      if (!liked && comment.authorId !== userId) {
        onCommentLiked(comment.authorId, commentId).catch(() => {});
      }
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
