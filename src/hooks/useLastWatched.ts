import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type LastWatched = {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  timestamp: number;
} | null;

export function useLastWatched() {
  const { user } = useAuth();
  const [lastWatched, setLastWatchedState] = useState<LastWatched>(null);

  useEffect(() => {
    if (!user) {
      setLastWatchedState(null);
      return;
    }
    supabase
      .from("last_watched")
      .select("*")
      .eq("student_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setLastWatchedState({
            courseId: data.course_id as string,
            courseTitle: data.course_title as string,
            lessonId: data.lesson_id as string,
            lessonTitle: data.lesson_title as string,
            timestamp: new Date(data.updated_at as string).getTime(),
          });
        }
      });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLastWatched = useCallback(
    async (data: {
      courseId: string;
      courseTitle: string;
      lessonId: string;
      lessonTitle: string;
    }) => {
      if (!user) return;
      setLastWatchedState({ ...data, timestamp: Date.now() });
      const { error } = await supabase.from("last_watched").upsert(
        {
          student_id: user.id,
          course_id: data.courseId,
          course_title: data.courseTitle,
          lesson_id: data.lessonId,
          lesson_title: data.lessonTitle,
        },
        { onConflict: "student_id" }
      );
      if (error) console.error("[last_watched] upsert:", error.message);
    },
    [user]
  );

  return { lastWatched, setLastWatched };
}
