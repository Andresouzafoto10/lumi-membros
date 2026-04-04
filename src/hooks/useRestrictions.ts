import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { notifyStudentRestricted } from "@/lib/notificationTriggers";
import type { StudentRestriction } from "@/types/student";

const QK = ["restrictions"] as const;

function mapRow(r: Record<string, unknown>): StudentRestriction {
  return {
    id: r.id as string,
    studentId: r.student_id as string,
    reason: r.reason as string,
    appliedBy: r.applied_by as string,
    startsAt: r.starts_at as string,
    endsAt: (r.ends_at as string | null) ?? null,
    active: r.active as boolean,
  };
}

async function fetchRestrictions(): Promise<StudentRestriction[]> {
  const { data, error } = await supabase
    .from("restrictions")
    .select("*")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export function useRestrictions() {
  const queryClient = useQueryClient();

  const { data: restrictions = [], isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchRestrictions,
    staleTime: 1000 * 60 * 2,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  const activeRestrictions = useMemo(
    () =>
      restrictions.filter((r) => {
        if (!r.active) return false;
        if (r.endsAt && new Date(r.endsAt) < new Date()) return false;
        return true;
      }),
    [restrictions]
  );

  const isRestricted = useCallback(
    (studentId: string) =>
      activeRestrictions.some((r) => r.studentId === studentId),
    [activeRestrictions]
  );

  const getRestriction = useCallback(
    (studentId: string) =>
      activeRestrictions.find((r) => r.studentId === studentId) ?? null,
    [activeRestrictions]
  );

  const getRestrictionsForStudent = useCallback(
    (studentId: string) =>
      restrictions
        .filter((r) => r.studentId === studentId)
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    [restrictions]
  );

  const addRestriction = useCallback(
    async (data: {
      studentId: string;
      reason: string;
      appliedBy: string;
      durationDays: number | null;
    }) => {
      const now = new Date();
      const endsAt = data.durationDays
        ? new Date(now.getTime() + data.durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;
      const { data: row, error } = await supabase
        .from("restrictions")
        .insert({
          student_id: data.studentId,
          reason: data.reason,
          applied_by: data.appliedBy,
          starts_at: now.toISOString(),
          ends_at: endsAt,
          active: true,
        })
        .select()
        .single();
      if (error) throw error;
      invalidate();
      // Notify the restricted student
      notifyStudentRestricted(data.studentId, data.reason).catch(() => {});
      return row.id as string;
    },
    [invalidate]
  );

  const removeRestriction = useCallback(
    async (restrictionId: string) => {
      const { error } = await supabase
        .from("restrictions")
        .update({ active: false })
        .eq("id", restrictionId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  return {
    restrictions,
    activeRestrictions,
    loading: isLoading,
    isRestricted,
    getRestriction,
    getRestrictionsForStudent,
    addRestriction,
    removeRestriction,
  };
}
