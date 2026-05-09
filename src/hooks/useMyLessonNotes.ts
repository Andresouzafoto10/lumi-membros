import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface MyLessonNote {
  id: string;
  lessonId: string;
  courseId: string;
  content: string;
  updatedAt: string;
  lessonTitle: string;
  moduleTitle: string | null;
  courseTitle: string;
}

/**
 * Returns every lesson note the current user has written, enriched with
 * the lesson, module, and course titles for navigation.
 */
export function useMyLessonNotes() {
  const { currentUserId } = useCurrentUser();

  return useQuery<MyLessonNote[]>({
    queryKey: ["lesson-notes", "self", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];

      const { data: notes, error } = await supabase
        .from("lesson_notes")
        .select("id, lesson_id, course_id, content, updated_at")
        .eq("student_id", currentUserId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (notes ?? []) as Array<Record<string, unknown>>;
      if (rows.length === 0) return [];

      const lessonIds = [...new Set(rows.map((r) => r.lesson_id as string))];
      const courseIds = [...new Set(rows.map((r) => r.course_id as string))];

      const [{ data: lessons }, { data: courses }] = await Promise.all([
        supabase
          .from("course_lessons")
          .select("id, title, module_id")
          .in("id", lessonIds),
        supabase
          .from("courses")
          .select("id, title")
          .in("id", courseIds),
      ]);

      const moduleIds = [
        ...new Set(
          (lessons ?? []).map((l) => l.module_id as string).filter(Boolean)
        ),
      ];
      const { data: modules } = moduleIds.length
        ? await supabase
            .from("course_modules")
            .select("id, title")
            .in("id", moduleIds)
        : { data: [] as Array<Record<string, unknown>> };

      const lessonMap = new Map(
        (lessons ?? []).map((l) => [l.id as string, l])
      );
      const courseMap = new Map(
        (courses ?? []).map((c) => [c.id as string, c])
      );
      const moduleMap = new Map(
        (modules ?? []).map((m) => [m.id as string, m])
      );

      const out: MyLessonNote[] = [];
      for (const r of rows) {
        const lessonId = r.lesson_id as string;
        const courseId = r.course_id as string;
        const lesson = lessonMap.get(lessonId);
        const course = courseMap.get(courseId);
        if (!lesson || !course) continue;
        const moduleRow = moduleMap.get(lesson.module_id as string);
        out.push({
          id: r.id as string,
          lessonId,
          courseId,
          content: (r.content as string) ?? "",
          updatedAt: (r.updated_at as string) ?? "",
          lessonTitle: (lesson.title as string) ?? "Aula",
          moduleTitle: (moduleRow?.title as string) ?? null,
          courseTitle: (course.title as string) ?? "Curso",
        });
      }
      return out;
    },
    enabled: !!currentUserId,
    staleTime: 1000 * 30,
  });
}
