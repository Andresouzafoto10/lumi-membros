import { useMemo } from "react";
import { useCourses } from "@/hooks/useCourses";
import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isStudentEnrolled } from "@/lib/accessControl";
import type { Course } from "@/types/course";

export interface EnrolledCourse extends Course {
  progressPercent: number;
  sessionTitle?: string;
}

/**
 * Returns the list of courses the current student is enrolled in (via an
 * active, non-expired enrollment), each with its completion percentage.
 */
export function useEnrolledCourses(): EnrolledCourse[] {
  const { sessions } = useCourses();
  const { enrollments } = useStudents();
  const { classes } = useClasses();
  const { getCourseProgress } = useLessonProgress();
  const { currentUserId } = useCurrentUser();

  return useMemo(() => {
    if (!currentUserId) return [];

    const enrolled: EnrolledCourse[] = [];
    for (const session of sessions) {
      for (const course of session.courses) {
        if (!course.isActive) continue;
        if (!isStudentEnrolled(currentUserId, course.id, enrollments, classes)) continue;

        const activeLessonIds = course.modules
          .filter((m) => m.isActive)
          .flatMap((m) => m.lessons.filter((l) => l.isActive))
          .map((l) => l.id);

        const { percentage } = getCourseProgress(course.id, activeLessonIds);

        enrolled.push({
          ...course,
          progressPercent: percentage,
          sessionTitle: session.title,
        });
      }
    }

    return enrolled;
  }, [sessions, enrollments, classes, currentUserId, getCourseProgress]);
}
