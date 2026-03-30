import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

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
    },
    [user, queryClient]
  );

  const getRating = useCallback(
    (lessonId: string): RatingValue | null => ratings[lessonId] ?? null,
    [ratings]
  );

  return { ratings, getRating, setRating };
}

// Stub for admin view — real aggregation would require a separate admin query
export function getLessonRatingCounts(
  _lessonId: string
): { likes: number; dislikes: number } {
  return { likes: 0, dislikes: 0 };
}

export function getAllLessonRatings(): RatingsMap {
  return {};
}
