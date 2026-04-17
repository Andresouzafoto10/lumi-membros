import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { onLessonCompleted } from "@/lib/gamificationEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LessonProgressRow = {
  id: string;
  studentId: string;
  lessonId: string;
  courseId: string;
  moduleId: string;
  completed: boolean;
  watchTimeSeconds: number;
  lastPositionSeconds: number;
  completedAt: string | null;
};

// ---------------------------------------------------------------------------
// Query key & mapper
// ---------------------------------------------------------------------------

const QK = ["lesson-progress"] as const;

function mapRow(r: Record<string, unknown>): LessonProgressRow {
  return {
    id: r.id as string,
    studentId: r.student_id as string,
    lessonId: r.lesson_id as string,
    courseId: r.course_id as string,
    moduleId: r.module_id as string,
    completed: r.completed as boolean,
    watchTimeSeconds: r.watch_time_seconds as number,
    lastPositionSeconds: r.last_position_seconds as number,
    completedAt: (r.completed_at as string | null) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchProgress(studentId: string): Promise<LessonProgressRow[]> {
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("student_id", studentId);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLessonProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const { data: progress = [], isLoading } = useQuery({
    queryKey: [...QK, user?.id],
    queryFn: () => fetchProgress(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  // ---- Computed data ----

  /** Map of lessonId → boolean for quick lookups */
  const completedLessonsMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const p of progress) {
      if (p.completed) map[p.lessonId] = true;
    }
    return map;
  }, [progress]);

  /** Completed lessons for a specific course */
  const getCompletedForCourse = useCallback(
    (courseId: string): Record<string, boolean> => {
      const map: Record<string, boolean> = {};
      for (const p of progress) {
        if (p.courseId === courseId && p.completed) {
          map[p.lessonId] = true;
        }
      }
      return map;
    },
    [progress]
  );

  /** Course progress: { completedLessons, totalLessons, percentage } */
  const getCourseProgress = useCallback(
    (
      courseId: string,
      totalActiveLessonIds: string[]
    ): { completed: number; total: number; percentage: number } => {
      if (totalActiveLessonIds.length === 0)
        return { completed: 0, total: 0, percentage: 0 };
      const courseCompleted = getCompletedForCourse(courseId);
      const completed = totalActiveLessonIds.filter(
        (id) => courseCompleted[id]
      ).length;
      return {
        completed,
        total: totalActiveLessonIds.length,
        percentage: Math.round((completed / totalActiveLessonIds.length) * 100),
      };
    },
    [getCompletedForCourse]
  );

  /** Module progress */
  const getModuleProgress = useCallback(
    (
      moduleId: string,
      lessonIds: string[]
    ): { completed: number; total: number } => {
      const completed = lessonIds.filter(
        (id) => completedLessonsMap[id]
      ).length;
      return { completed, total: lessonIds.length };
    },
    [completedLessonsMap]
  );

  /** Get saved position for a lesson */
  const getLastPosition = useCallback(
    (lessonId: string): number => {
      const row = progress.find((p) => p.lessonId === lessonId);
      return row?.lastPositionSeconds ?? 0;
    },
    [progress]
  );

  // ---- Mutations ----

  /** Mark a lesson as complete */
  const markLessonComplete = useCallback(
    async (lessonId: string, courseId: string, moduleId: string) => {
      if (!user) return;
      const { error } = await supabase.from("lesson_progress").upsert(
        {
          student_id: user.id,
          lesson_id: lessonId,
          course_id: courseId,
          module_id: moduleId,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "student_id,lesson_id" }
      );
      if (error) throw error;
      invalidate();
      // Trigger gamification (fire-and-forget)
      onLessonCompleted(user.id).catch(() => {});
    },
    [user, invalidate]
  );

  /** Unmark a lesson completion */
  const unmarkLessonComplete = useCallback(
    async (lessonId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("lesson_progress")
        .update({ completed: false, completed_at: null })
        .eq("student_id", user.id)
        .eq("lesson_id", lessonId);
      if (error) throw error;
      invalidate();
    },
    [user, invalidate]
  );

  /** Save watch position (debounced — call freely, writes every 10s max per lesson) */
  const updateWatchPosition = useCallback(
    (lessonId: string, courseId: string, moduleId: string, positionSeconds: number) => {
      if (!user) return;

      // Clear existing timer for this lesson
      if (debounceTimers.current[lessonId]) {
        clearTimeout(debounceTimers.current[lessonId]);
      }

      const userId = user.id;
      debounceTimers.current[lessonId] = setTimeout(async () => {
        try {
          const { error } = await supabase.from("lesson_progress").upsert(
            {
              student_id: userId,
              lesson_id: lessonId,
              course_id: courseId,
              module_id: moduleId,
              last_position_seconds: Math.floor(positionSeconds),
            },
            { onConflict: "student_id,lesson_id" }
          );
          if (error) console.error("[lesson_progress] upsert:", error.message);
        } catch (err) {
          console.error("[lesson_progress] upsert failed:", err);
        }
        // Don't invalidate for position updates — too frequent
      }, 10000); // 10 second debounce
    },
    [user]
  );

  // Cancel all pending timers when user changes (login/logout) or on unmount.
  // Prevents debounced upserts from firing after logout (RLS would reject).
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
      debounceTimers.current = {};
    };
  }, [user]);

  return {
    progress,
    loading: isLoading,
    completedLessonsMap,
    getCompletedForCourse,
    getCourseProgress,
    getModuleProgress,
    getLastPosition,
    markLessonComplete,
    unmarkLessonComplete,
    updateWatchPosition,
  };
}

// ---------------------------------------------------------------------------
// Admin hook — fetch progress for any student
// ---------------------------------------------------------------------------

export function useStudentProgress(studentId: string | undefined) {
  const { data: progress = [] } = useQuery({
    queryKey: ["lesson-progress", "admin", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("student_id", studentId);
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 2,
  });

  const getProgressForCourse = useCallback(
    (
      courseId: string,
      totalActiveLessonIds: string[]
    ): { completed: number; total: number; percentage: number } => {
      if (totalActiveLessonIds.length === 0)
        return { completed: 0, total: 0, percentage: 0 };
      const courseRows = progress.filter(
        (p) => p.courseId === courseId && p.completed
      );
      const completedSet = new Set(courseRows.map((r) => r.lessonId));
      const completed = totalActiveLessonIds.filter((id) =>
        completedSet.has(id)
      ).length;
      return {
        completed,
        total: totalActiveLessonIds.length,
        percentage: Math.round((completed / totalActiveLessonIds.length) * 100),
      };
    },
    [progress]
  );

  return { progress, getProgressForCourse };
}
