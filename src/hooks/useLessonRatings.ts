import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { onLessonRated } from "@/lib/gamificationEngine";

type RatingValue = "like" | "dislike";
type RatingsMap = Record<string, RatingValue>;

const QK = ["lesson-ratings"] as const;

async function fetchRatings(userId: string): Promise<RatingsMap> {
  const { data, error } = await supabase
    .from("lesson_ratings")
    .select("lesson_id, rating")
    .eq("student_id", userId);
  if (error) throw error;
  const map: RatingsMap = {};
  for (const r of data ?? []) {
    map[r.lesson_id as string] = r.rating as RatingValue;
  }
  return map;
}

export function useLessonRatings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ratings = {} } = useQuery({
    queryKey: [...QK, user?.id],
    queryFn: () => fetchRatings(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const setRating = useCallback(
    async (lessonId: string, rating: RatingValue | null) => {
      if (!user) return;
      if (rating === null) {
        await supabase
          .from("lesson_ratings")
          .delete()
          .eq("lesson_id", lessonId)
          .eq("student_id", user.id);
      } else {
        await supabase.from("lesson_ratings").upsert(
          { lesson_id: lessonId, student_id: user.id, rating },
          { onConflict: "lesson_id,student_id" }
        );
      }
      queryClient.invalidateQueries({ queryKey: QK });
      // Award points when rating (like only, not removing or disliking)
      if (rating === "like") {
        onLessonRated(user.id, lessonId).catch(() => {});
      }
    },
    [user, queryClient]
  );

  const getRating = useCallback(
    (lessonId: string): RatingValue | null => ratings[lessonId] ?? null,
    [ratings]
  );

  return { ratings, getRating, setRating };
}

// ---------------------------------------------------------------------------
// Admin aggregation hook — fetches rating counts for all lessons
// ---------------------------------------------------------------------------

type LessonRatingCounts = Record<string, { likes: number; dislikes: number }>;

const QK_ADMIN = ["lesson-ratings-admin"] as const;

async function fetchAllRatingCounts(): Promise<LessonRatingCounts> {
  const { data, error } = await supabase
    .from("lesson_ratings")
    .select("lesson_id, rating");
  if (error) throw error;
  const counts: LessonRatingCounts = {};
  for (const row of data ?? []) {
    const lid = row.lesson_id as string;
    if (!counts[lid]) counts[lid] = { likes: 0, dislikes: 0 };
    if (row.rating === "like") counts[lid].likes++;
    else counts[lid].dislikes++;
  }
  return counts;
}

/**
 * Hook for admin pages to get aggregated like/dislike counts per lesson.
 * Returns a map of lessonId → { likes, dislikes }.
 */
export function useAdminLessonRatings() {
  const { data: ratingCounts = {} } = useQuery({
    queryKey: QK_ADMIN,
    queryFn: fetchAllRatingCounts,
    staleTime: 1000 * 60 * 5,
  });

  const getCounts = useCallback(
    (lessonId: string): { likes: number; dislikes: number } =>
      ratingCounts[lessonId] ?? { likes: 0, dislikes: 0 },
    [ratingCounts]
  );

  return { ratingCounts, getCounts };
}
