import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Class, ContentScheduleRule, EnrollmentType } from "@/types/student";

const QK = ["classes"] as const;

async function fetchClasses(): Promise<Class[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    courseIds: c.course_ids ?? [],
    enrollmentType: c.enrollment_type as EnrollmentType,
    accessDurationDays: c.access_duration_days,
    status: c.status as "active" | "inactive",
    contentSchedule: (c.content_schedule as ContentScheduleRule[]) ?? [],
  }));
}

export function useClasses() {
  const queryClient = useQueryClient();
  const { data: classes = [], isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchClasses,
    staleTime: 1000 * 60 * 5,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  const activeClasses = useMemo(
    () => classes.filter((c) => c.status === "active"),
    [classes]
  );

  const findClass = useCallback(
    (id: string | undefined) =>
      id ? classes.find((c) => c.id === id) ?? null : null,
    [classes]
  );

  const getClassesByCourse = useCallback(
    (courseId: string) => classes.filter((c) => c.courseIds.includes(courseId)),
    [classes]
  );

  const createClass = useCallback(
    async (data: {
      name: string;
      courseIds: string[];
      enrollmentType: EnrollmentType;
      accessDurationDays: number | null;
    }) => {
      const { data: row, error } = await supabase
        .from("classes")
        .insert({
          name: data.name,
          course_ids: data.courseIds,
          enrollment_type: data.enrollmentType,
          access_duration_days: data.accessDurationDays,
          status: "active",
          content_schedule: [],
        })
        .select()
        .single();
      if (error) throw error;
      invalidate();
      return row.id as string;
    },
    [invalidate]
  );

  const updateClass = useCallback(
    async (
      classId: string,
      patch: Partial<
        Pick<
          Class,
          | "name"
          | "courseIds"
          | "enrollmentType"
          | "accessDurationDays"
          | "status"
          | "contentSchedule"
        >
      >
    ) => {
      const { error } = await supabase
        .from("classes")
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.courseIds !== undefined && { course_ids: patch.courseIds }),
          ...(patch.enrollmentType !== undefined && {
            enrollment_type: patch.enrollmentType,
          }),
          ...(patch.accessDurationDays !== undefined && {
            access_duration_days: patch.accessDurationDays,
          }),
          ...(patch.status !== undefined && { status: patch.status }),
          ...(patch.contentSchedule !== undefined && {
            content_schedule: patch.contentSchedule,
          }),
        })
        .eq("id", classId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const deleteClass = useCallback(
    async (classId: string) => {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const updateScheduleRule = useCallback(
    async (classId: string, rule: ContentScheduleRule) => {
      const cls = findClass(classId);
      if (!cls) return;
      const existing = cls.contentSchedule.findIndex(
        (r) => r.targetId === rule.targetId && r.targetType === rule.targetType
      );
      let updated: ContentScheduleRule[];
      if (existing >= 0) {
        updated = [...cls.contentSchedule];
        updated[existing] = rule;
      } else {
        updated = [...cls.contentSchedule, rule];
      }
      await updateClass(classId, { contentSchedule: updated });
    },
    [findClass, updateClass]
  );

  const removeScheduleRule = useCallback(
    async (
      classId: string,
      targetId: string,
      targetType: "module" | "lesson"
    ) => {
      const cls = findClass(classId);
      if (!cls) return;
      const updated = cls.contentSchedule.filter(
        (r) => !(r.targetId === targetId && r.targetType === targetType)
      );
      await updateClass(classId, { contentSchedule: updated });
    },
    [findClass, updateClass]
  );

  return {
    classes,
    activeClasses,
    loading: isLoading,
    findClass,
    getClassesByCourse,
    createClass,
    updateClass,
    deleteClass,
    updateScheduleRule,
    removeScheduleRule,
  };
}
