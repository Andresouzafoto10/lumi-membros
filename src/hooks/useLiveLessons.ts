import { useCallback } from "react";
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
  recordingUrl: string | null;
  courseId: string | null;
  classIds: string[];
  accessMode: LiveLessonAccessMode;
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
  recordingUrl?: string | null;
  courseId?: string | null;
  classIds?: string[];
  accessMode?: LiveLessonAccessMode;
  status?: LiveLessonStatus;
};

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

  const { data: lessons = [], isLoading } = useQuery({
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
