import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useLessonNotes(
  courseId: string | undefined,
  lessonId: string | null
) {
  const { user } = useAuth();
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!courseId || !lessonId || !user) {
      setContent("");
      return;
    }
    supabase
      .from("lesson_notes")
      .select("content")
      .eq("lesson_id", lessonId)
      .eq("student_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setContent((data?.content as string) ?? "");
      });
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
