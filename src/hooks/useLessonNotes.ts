import { useState, useCallback, useEffect } from "react";

const STORAGE_PREFIX = "lumi-membros:notes:";

export function useLessonNotes(courseId: string | undefined, lessonId: string | null) {
  const key = courseId && lessonId ? `${STORAGE_PREFIX}${courseId}:${lessonId}` : null;

  const [content, setContent] = useState(() => {
    if (!key) return "";
    try {
      return localStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  });

  // Reload when lesson changes
  useEffect(() => {
    if (!key) {
      setContent("");
      return;
    }
    try {
      setContent(localStorage.getItem(key) ?? "");
    } catch {
      setContent("");
    }
  }, [key]);

  const saveNote = useCallback(
    (text: string) => {
      setContent(text);
      if (key) {
        try {
          if (text.trim()) {
            localStorage.setItem(key, text);
          } else {
            localStorage.removeItem(key);
          }
        } catch {
          // ignore
        }
      }
    },
    [key]
  );

  return { content, saveNote };
}
