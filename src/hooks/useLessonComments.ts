import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/contexts/AuthContext";
import { awardPoints } from "@/lib/gamificationEngine";
import type { LessonComment } from "@/types/course";

// ---------------------------------------------------------------------------
// Extended type for admin view (includes lesson/course titles)
// ---------------------------------------------------------------------------
export interface AdminLessonComment extends LessonComment {
  lesson_title?: string;
  course_title?: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
const QK_LESSON_COMMENTS = (lessonId: string) =>
  ["lesson-comments", lessonId] as const;
const QK_ALL_LESSON_COMMENTS_ADMIN = ["lesson-comments-admin"] as const;

// ---------------------------------------------------------------------------
// Fetcher — comments with author profile join
// ---------------------------------------------------------------------------
async function fetchLessonComments(
  lessonId: string
): Promise<LessonComment[]> {
  const { data, error } = await supabase
    .from("lesson_comments")
    .select(
      `
      id,
      lesson_id,
      course_id,
      author_id,
      parent_comment_id,
      body,
      likes_count,
      liked_by,
      created_at,
      updated_at,
      profiles!author_id (
        id,
        name,
        display_name,
        avatar_url,
        role
      )
    `
    )
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => mapCommentRow(row));
}

type CommentProfile = {
  id: string;
  name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
};

function mapCommentRow(row: Record<string, unknown>): LessonComment {
  const profiles = row.profiles as CommentProfile | null | undefined;
  return {
    id: row.id as string,
    lesson_id: row.lesson_id as string,
    course_id: row.course_id as string,
    author_id: row.author_id as string,
    parent_comment_id: row.parent_comment_id as string | null,
    body: row.body as string,
    likes_count: row.likes_count as number,
    liked_by: (row.liked_by as string[] | null) ?? [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    author: profiles
      ? {
          id: profiles.id,
          name: profiles.name ?? "",
          display_name: profiles.display_name ?? "",
          avatar_url: profiles.avatar_url ?? "",
          role: profiles.role,
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Build reply tree (1 level nesting)
// ---------------------------------------------------------------------------
function buildCommentTree(comments: LessonComment[]): LessonComment[] {
  const rootComments = comments.filter((c) => !c.parent_comment_id);
  const replyMap = new Map<string, LessonComment[]>();

  for (const c of comments) {
    if (c.parent_comment_id) {
      const arr = replyMap.get(c.parent_comment_id) ?? [];
      arr.push(c);
      replyMap.set(c.parent_comment_id, arr);
    }
  }

  return rootComments.map((root) => ({
    ...root,
    replies: replyMap.get(root.id) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useLessonComments(lessonId: string | undefined) {
  const queryClient = useQueryClient();
  const { currentUserId } = useCurrentUser();
  const { isAdmin } = useAuth();

  const query = useQuery({
    queryKey: QK_LESSON_COMMENTS(lessonId ?? ""),
    queryFn: () => fetchLessonComments(lessonId!),
    enabled: !!lessonId,
    staleTime: 1000 * 30, // 30s
  });

  const flatComments = useMemo(() => query.data ?? [], [query.data]);
  const comments = useMemo(() => buildCommentTree(flatComments), [flatComments]);
  const commentCount = flatComments.length;

  const invalidate = useCallback(() => {
    if (lessonId) {
      queryClient.invalidateQueries({ queryKey: QK_LESSON_COMMENTS(lessonId) });
    }
  }, [queryClient, lessonId]);

  // Add comment
  const addComment = useCallback(
    async (body: string, parentCommentId?: string, courseId?: string) => {
      if (!lessonId || !currentUserId || !courseId) return;

      const { error } = await supabase.from("lesson_comments").insert({
        lesson_id: lessonId,
        course_id: courseId,
        author_id: currentUserId,
        body: body.trim(),
        parent_comment_id: parentCommentId ?? null,
      });
      if (error) throw error;

      invalidate();

      // Gamification
      awardPoints(currentUserId, "lesson_comment", lessonId).catch(() => {});
    },
    [lessonId, currentUserId, invalidate]
  );

  // Delete comment
  const deleteComment = useCallback(
    async (commentId: string) => {
      const { error } = await supabase
        .from("lesson_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  // Toggle like
  const toggleLike = useCallback(
    async (commentId: string) => {
      if (!currentUserId) return;

      const comment = flatComments.find((c) => c.id === commentId);
      if (!comment) return;

      const alreadyLiked = comment.liked_by.includes(currentUserId);
      const newLikedBy = alreadyLiked
        ? comment.liked_by.filter((id) => id !== currentUserId)
        : [...comment.liked_by, currentUserId];

      const { error } = await supabase
        .from("lesson_comments")
        .update({
          liked_by: newLikedBy,
          likes_count: newLikedBy.length,
        })
        .eq("id", commentId);
      if (error) throw error;
      invalidate();
    },
    [currentUserId, flatComments, invalidate]
  );

  return {
    comments,
    commentCount,
    loading: query.isLoading,
    addComment,
    deleteComment,
    toggleLike,
    isAdmin,
    currentUserId,
  };
}

// ---------------------------------------------------------------------------
// Admin hook — all lesson comments across all lessons
// ---------------------------------------------------------------------------

async function fetchAllLessonCommentsAdmin(): Promise<AdminLessonComment[]> {
  const { data, error } = await supabase
    .from("lesson_comments")
    .select(
      `
      id,
      lesson_id,
      course_id,
      author_id,
      parent_comment_id,
      body,
      likes_count,
      liked_by,
      created_at,
      updated_at,
      profiles!author_id (
        id,
        name,
        display_name,
        avatar_url,
        role
      ),
      course_lessons!lesson_id (
        title
      ),
      courses!course_id (
        title
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => {
    const base = mapCommentRow(row);
    const lesson = row.course_lessons as { title?: string } | null | undefined;
    const course = row.courses as { title?: string } | null | undefined;
    return {
      ...base,
      lesson_title: lesson?.title ?? undefined,
      course_title: course?.title ?? undefined,
    };
  });
}

export function useAllLessonCommentsAdmin() {
  const queryClient = useQueryClient();
  const { currentUserId } = useCurrentUser();

  const query = useQuery({
    queryKey: QK_ALL_LESSON_COMMENTS_ADMIN,
    queryFn: fetchAllLessonCommentsAdmin,
    staleTime: 1000 * 30,
  });

  const comments = useMemo(() => query.data ?? [], [query.data]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK_ALL_LESSON_COMMENTS_ADMIN });
  }, [queryClient]);

  const adminDeleteComment = useCallback(
    async (commentId: string) => {
      const { error } = await supabase
        .from("lesson_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const adminAddComment = useCallback(
    async (
      lessonId: string,
      courseId: string,
      body: string,
      parentCommentId?: string
    ) => {
      if (!currentUserId) return;
      const { error } = await supabase.from("lesson_comments").insert({
        lesson_id: lessonId,
        course_id: courseId,
        author_id: currentUserId,
        body: body.trim(),
        parent_comment_id: parentCommentId ?? null,
      });
      if (error) throw error;
      invalidate();
    },
    [currentUserId, invalidate]
  );

  return {
    comments,
    totalCount: comments.length,
    loading: query.isLoading,
    adminDeleteComment,
    adminAddComment,
    invalidate,
  };
}
