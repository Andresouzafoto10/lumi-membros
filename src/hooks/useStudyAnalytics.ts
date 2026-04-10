import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StudyAnalytics = {
  totalWatchSeconds: number;
  monthWatchSeconds: number;
  weekWatchSeconds: number;
  lessonsCompleted: number;
  lessonsInProgress: number;
  coursesInProgress: number;
  avgSecondsPerDay: number; // based on active days in last 30
  currentStreakDays: number;
  topCourseByTime: { courseId: string; seconds: number } | null;
};

// ---------------------------------------------------------------------------
// Fetcher — computes analytics from lesson_progress rows client-side
// ---------------------------------------------------------------------------

async function fetchStudyAnalytics(studentId: string): Promise<StudyAnalytics> {
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_id, course_id, watch_time_seconds, completed, updated_at")
    .eq("student_id", studentId);
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    lesson_id: string;
    course_id: string;
    watch_time_seconds: number | null;
    completed: boolean | null;
    updated_at: string | null;
  }>;

  const now = Date.now();
  const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;

  let total = 0;
  let month = 0;
  let week = 0;
  let completed = 0;
  let inProgress = 0;
  const coursesInProgressSet = new Set<string>();
  const timeByCourse = new Map<string, number>();
  const activeDays = new Set<string>();

  for (const r of rows) {
    const sec = r.watch_time_seconds ?? 0;
    total += sec;

    if (r.updated_at) {
      const updated = new Date(r.updated_at).getTime();
      if (now - updated < MONTH_MS) {
        month += sec;
        activeDays.add(new Date(r.updated_at).toISOString().slice(0, 10));
      }
      if (now - updated < WEEK_MS) week += sec;
    }

    if (r.completed) {
      completed += 1;
    } else if (sec > 0) {
      inProgress += 1;
      coursesInProgressSet.add(r.course_id);
    }

    timeByCourse.set(r.course_id, (timeByCourse.get(r.course_id) ?? 0) + sec);
  }

  // Top course by time
  let topCourseByTime: StudyAnalytics["topCourseByTime"] = null;
  for (const [courseId, seconds] of timeByCourse.entries()) {
    if (!topCourseByTime || seconds > topCourseByTime.seconds) {
      topCourseByTime = { courseId, seconds };
    }
  }

  // Compute current streak (consecutive days with activity, starting today)
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const dateKey = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
    if (activeDays.has(dateKey)) {
      streak += 1;
    } else if (i === 0) {
      // today not yet active — check yesterday onwards
      continue;
    } else {
      break;
    }
  }

  const avgSecondsPerDay = activeDays.size > 0 ? Math.round(month / activeDays.size) : 0;

  return {
    totalWatchSeconds: total,
    monthWatchSeconds: month,
    weekWatchSeconds: week,
    lessonsCompleted: completed,
    lessonsInProgress: inProgress,
    coursesInProgress: coursesInProgressSet.size,
    avgSecondsPerDay,
    currentStreakDays: streak,
    topCourseByTime,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStudyAnalytics(studentId?: string) {
  const { user } = useAuth();
  const targetId = studentId ?? user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["study-analytics", targetId],
    queryFn: () => fetchStudyAnalytics(targetId!),
    enabled: !!targetId,
    staleTime: 1000 * 60 * 2,
  });

  return { analytics: data, loading: isLoading };
}

// ---------------------------------------------------------------------------
// Format helper
// ---------------------------------------------------------------------------

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const hrs = hours % 24;
  return hrs > 0 ? `${days}d ${hrs}h` : `${days}d`;
}
