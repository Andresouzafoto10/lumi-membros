import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LiveLessonStatus = "scheduled" | "live" | "ended" | "recorded" | "cancelled";
export type LiveLessonAccessMode = "all" | "classes" | "open";

export type LiveLesson = {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  instructorId: string | null;
  instructorName: string | null;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl: string | null;
  salesUrl: string | null;
  recordingUrl: string | null;
  courseId: string | null;
  classIds: string[];
  accessMode: LiveLessonAccessMode;
  /** Raw DB status — use getComputedStatus() for display */
  status: LiveLessonStatus;
  createdAt: string;
};

export type LiveLessonInput = {
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  instructorId?: string | null;
  instructorName?: string | null;
  scheduledAt: string;
  durationMinutes?: number;
  meetingUrl?: string | null;
  salesUrl?: string | null;
  recordingUrl?: string | null;
  courseId?: string | null;
  classIds?: string[];
  accessMode?: LiveLessonAccessMode;
  status?: LiveLessonStatus;
};

// ---------------------------------------------------------------------------
// Computed status — real-time based on current time vs scheduled_at
// ---------------------------------------------------------------------------

export function getComputedStatus(lesson: LiveLesson): LiveLessonStatus {
  // Manual overrides always win
  if (lesson.status === "cancelled") return "cancelled";
  if (lesson.status === "recorded") return "recorded";
  if (lesson.status === "ended") return "ended";

  const now = Date.now();
  const start = new Date(lesson.scheduledAt).getTime();
  const end = start + lesson.durationMinutes * 60 * 1000;

  if (now >= start && now <= end) return "live";
  if (now > end) return "ended";
  return "scheduled";
}

// ---------------------------------------------------------------------------
// Query keys & mappers
// ---------------------------------------------------------------------------

const QK = ["live-lessons"] as const;

function mapRow(r: Record<string, unknown>): LiveLesson {
  return {
    id: r.id as string,
    title: r.title as string,
    description: r.description as string | null,
    coverUrl: r.cover_url as string | null,
    instructorId: r.instructor_id as string | null,
    instructorName: r.instructor_name as string | null,
    scheduledAt: r.scheduled_at as string,
    durationMinutes: r.duration_minutes as number,
    meetingUrl: r.meeting_url as string | null,
    salesUrl: r.sales_url as string | null,
    recordingUrl: r.recording_url as string | null,
    courseId: r.course_id as string | null,
    classIds: (r.class_ids as string[]) ?? [],
    accessMode: (r.access_mode as LiveLessonAccessMode) ?? "all",
    status: (r.status as LiveLessonStatus) ?? "scheduled",
    createdAt: r.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLiveLessons() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: lessons = [], isLoading, refetch } = useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_lessons")
        .select("*")
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    staleTime: 1000 * 60 * 2,
  });

  // Auto-refresh every 60s when there are upcoming lessons within 24h
  useEffect(() => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const hasUpcomingSoon = lessons.some((l) => {
      const cs = getComputedStatus(l);
      if (cs === "live") return true;
      if (cs !== "scheduled") return false;
      return new Date(l.scheduledAt).getTime() - Date.now() < DAY_MS;
    });

    if (hasUpcomingSoon) {
      intervalRef.current = setInterval(() => refetch(), 60_000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lessons, refetch]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  const createLesson = useCallback(
    async (input: LiveLessonInput) => {
      if (!isAdmin) throw new Error("Sem permissão");
      const { error } = await supabase.from("live_lessons").insert({
        title: input.title,
        description: input.description ?? null,
        cover_url: input.coverUrl ?? null,
        instructor_id: input.instructorId ?? user?.id ?? null,
        instructor_name: input.instructorName ?? null,
        scheduled_at: input.scheduledAt,
        duration_minutes: input.durationMinutes ?? 60,
        meeting_url: input.meetingUrl ?? null,
        sales_url: input.salesUrl ?? null,
        recording_url: input.recordingUrl ?? null,
        course_id: input.courseId ?? null,
        class_ids: input.classIds ?? [],
        access_mode: input.accessMode ?? "all",
        status: input.status ?? "scheduled",
      });
      if (error) throw error;
      invalidate();
    },
    [isAdmin, user, invalidate]
  );

  const updateLesson = useCallback(
    async (id: string, input: Partial<LiveLessonInput>) => {
      if (!isAdmin) throw new Error("Sem permissão");
      const payload: Record<string, unknown> = {};
      if (input.title !== undefined) payload.title = input.title;
      if (input.description !== undefined) payload.description = input.description;
      if (input.coverUrl !== undefined) payload.cover_url = input.coverUrl;
      if (input.instructorName !== undefined) payload.instructor_name = input.instructorName;
      if (input.scheduledAt !== undefined) payload.scheduled_at = input.scheduledAt;
      if (input.durationMinutes !== undefined) payload.duration_minutes = input.durationMinutes;
      if (input.meetingUrl !== undefined) payload.meeting_url = input.meetingUrl;
      if (input.salesUrl !== undefined) payload.sales_url = input.salesUrl;
      if (input.recordingUrl !== undefined) payload.recording_url = input.recordingUrl;
      if (input.courseId !== undefined) payload.course_id = input.courseId;
      if (input.classIds !== undefined) payload.class_ids = input.classIds;
      if (input.accessMode !== undefined) payload.access_mode = input.accessMode;
      if (input.status !== undefined) payload.status = input.status;

      const { error } = await supabase.from("live_lessons").update(payload).eq("id", id);
      if (error) throw error;
      invalidate();
    },
    [isAdmin, invalidate]
  );

  const deleteLesson = useCallback(
    async (id: string) => {
      if (!isAdmin) throw new Error("Sem permissão");
      const { error } = await supabase.from("live_lessons").delete().eq("id", id);
      if (error) throw error;
      invalidate();
    },
    [isAdmin, invalidate]
  );

  const joinLesson = useCallback(
    async (lessonId: string) => {
      if (!user) return;
      await supabase.from("live_lesson_participants").upsert(
        { live_lesson_id: lessonId, student_id: user.id },
        { onConflict: "live_lesson_id,student_id" }
      );
    },
    [user]
  );

  return {
    lessons,
    loading: isLoading,
    createLesson,
    updateLesson,
    deleteLesson,
    joinLesson,
  };
}

// ---------------------------------------------------------------------------
// Derived hook — upcoming lessons for homepage banner (next 72h + live now)
// ---------------------------------------------------------------------------

export function useUpcomingLiveLessons() {
  const { lessons, loading } = useLiveLessons();

  const upcoming = useMemo(() => {
    const now = Date.now();
    const H72 = 72 * 60 * 60 * 1000;

    return lessons
      .filter((l) => {
        const cs = getComputedStatus(l);
        if (cs === "live") return true;
        if (cs === "scheduled") {
          return new Date(l.scheduledAt).getTime() - now < H72;
        }
        return false;
      })
      .sort((a, b) => {
        // Live first, then by scheduledAt ascending
        const csA = getComputedStatus(a);
        const csB = getComputedStatus(b);
        if (csA === "live" && csB !== "live") return -1;
        if (csB === "live" && csA !== "live") return 1;
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      })
      .slice(0, 3);
  }, [lessons]);

  const hasLiveNow = upcoming.some((l) => getComputedStatus(l) === "live");

  return { upcoming, hasLiveNow, loading };
}
