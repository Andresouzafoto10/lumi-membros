import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useLearningPaths } from "@/hooks/useLearningPaths";
import { useCourses } from "@/hooks/useCourses";
import { useLessonProgress } from "@/hooks/useLessonProgress";

export type NextCourseInTrail = {
  id: string;
  title: string;
  firstLessonId: string | null;
};

export type LearningPathContext = {
  isInTrail: boolean;
  trailId: string | null;
  trailTitle: string | null;
  nextCourse: NextCourseInTrail | null;
};

export function useLearningPathContext(currentCourseId: string | undefined): LearningPathContext {
  const [searchParams] = useSearchParams();
  const trailId = searchParams.get("trilhaId");
  const { paths } = useLearningPaths();
  const { findCourse } = useCourses();
  const { getCompletedForCourse } = useLessonProgress();

  return useMemo<LearningPathContext>(() => {
    if (!trailId || !currentCourseId) {
      return { isInTrail: false, trailId: null, trailTitle: null, nextCourse: null };
    }

    const path = paths.find((p) => p.id === trailId);
    if (!path) {
      return { isInTrail: false, trailId: null, trailTitle: null, nextCourse: null };
    }

    const currentIdx = path.courseIds.indexOf(currentCourseId);
    if (currentIdx === -1) {
      return { isInTrail: false, trailId, trailTitle: path.title, nextCourse: null };
    }

    const nextCourseId = path.courseIds[currentIdx + 1] ?? null;
    if (!nextCourseId) {
      return { isInTrail: true, trailId, trailTitle: path.title, nextCourse: null };
    }

    const nextCourse = findCourse(nextCourseId);
    if (!nextCourse) {
      return { isInTrail: true, trailId, trailTitle: path.title, nextCourse: null };
    }

    const activeLessons = [...nextCourse.modules]
      .filter((m) => m.isActive)
      .sort((a, b) => a.order - b.order)
      .flatMap((m) =>
        [...m.lessons]
          .filter((l) => l.isActive)
          .sort((a, b) => a.order - b.order)
      );

    const completed = getCompletedForCourse(nextCourseId);
    const firstUncompleted = activeLessons.find((l) => !completed[l.id]);
    const firstLessonId = firstUncompleted?.id ?? activeLessons[0]?.id ?? null;

    return {
      isInTrail: true,
      trailId,
      trailTitle: path.title,
      nextCourse: {
        id: nextCourse.id,
        title: nextCourse.title,
        firstLessonId,
      },
    };
  }, [trailId, currentCourseId, paths, findCourse, getCompletedForCourse]);
}
