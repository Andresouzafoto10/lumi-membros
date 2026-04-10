import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Hook — track which upcoming courses the current user has flagged interest in
// ---------------------------------------------------------------------------

const QK = ["course-launch-interests"] as const;

async function fetchInterests(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("course_launch_interests")
    .select("course_id")
    .eq("student_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.course_id as string));
}

export function useCourseLaunchInterest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: interests = new Set<string>() } = useQuery({
    queryKey: [...QK, user?.id],
    queryFn: () => fetchInterests(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const isInterested = useCallback(
    (courseId: string) => interests.has(courseId),
    [interests]
  );

  const toggleInterest = useCallback(
    async (courseId: string) => {
      if (!user) return;
      const already = interests.has(courseId);
      const next = new Set(interests);
      if (already) next.delete(courseId);
      else next.add(courseId);

      // Optimistic update
      queryClient.setQueryData([...QK, user.id], next);

      if (already) {
        await supabase
          .from("course_launch_interests")
          .delete()
          .eq("course_id", courseId)
          .eq("student_id", user.id);
      } else {
        await supabase.from("course_launch_interests").insert({
          course_id: courseId,
          student_id: user.id,
        });
      }
    },
    [user, interests, queryClient]
  );

  return { isInterested, toggleInterest };
}
