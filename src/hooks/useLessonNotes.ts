import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { onLessonNotes } from "@/lib/gamificationEngine";

export function useLessonNotes(
  courseId: string | undefined,
  lessonId: string | null
) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const pointsAwardedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!courseId || !lessonId || !user) {
      setContent("");
      return;
    }
    let cancelled = false;
    supabase
      .from("lesson_notes")
      .select("content")
      .eq("lesson_id", lessonId)
      .eq("student_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setContent((data?.content as string) ?? "");
      });
    return () => { cancelled = true; };
  }, [courseId, lessonId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveNote = useCallback(
    async (text: string) => {
      setContent(text);
      if (!courseId || !lessonId || !user) return;
      if (text.trim()) {
        await supabase.from("lesson_notes").upsert(
          {
            lesson_id: lessonId,
            student_id: user.id,
            course_id: courseId,
            content: text,
          },
          { onConflict: "lesson_id,student_id" }
        );
        // Award points once per lesson note (per session)
        if (pointsAwardedRef.current !== lessonId) {
          pointsAwardedRef.current = lessonId;
          onLessonNotes(user.id, lessonId).catch(() => {});
        }
      } else {
        await supabase
          .from("lesson_notes")
          .delete()
          .eq("lesson_id", lessonId)
          .eq("student_id", user.id);
      }
    },
    [courseId, lessonId, user]
  );

  return { content, saveNote };
}
