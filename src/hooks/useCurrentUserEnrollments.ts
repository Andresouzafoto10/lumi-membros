import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Enrollment } from "@/types/student";

/**
 * Self-scoped enrollments fetcher.
 *
 * useStudents() is gated on `isAdmin` because it pulls every profile +
 * enrollment row in the platform. Non-admin pages that only need the
 * current user's enrollments (e.g. CoursesPage, MyProfilePage,
 * useEnrolledCourses) must use this hook instead — otherwise the
 * student sees an empty enrollments array and every course is locked.
 */
export function useCurrentUserEnrollments() {
  const { currentUserId } = useCurrentUser();

  const { data: enrollments = [], isLoading } = useQuery<Enrollment[]>({
    queryKey: ["enrollments", "self", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .eq("student_id", currentUserId);
      if (error) throw error;
      return (data ?? []).map((e) => ({
        id: e.id as string,
        studentId: e.student_id as string,
        classId: e.class_id as string,
        type: e.type as Enrollment["type"],
        expiresAt: (e.expires_at as string | null) ?? null,
        status: e.status as Enrollment["status"],
        enrolledAt: e.enrolled_at as string,
      }));
    },
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 2,
  });

  return { enrollments, isLoading };
}
