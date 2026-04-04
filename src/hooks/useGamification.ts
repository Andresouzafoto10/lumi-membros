import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Mission, StudentMission, GamificationData } from "@/types/student";

// ---------------------------------------------------------------------------
// Fetch missions from DB (replaces old static BADGES array)
// ---------------------------------------------------------------------------

const QK = ["gamification"] as const;
const QK_MISSIONS = ["missions"] as const;
const QK_STUDENT_MISSIONS = ["student-missions"] as const;

async function fetchGamification(): Promise<GamificationData[]> {
  const { data, error } = await supabase.from("gamification").select("*");
  if (error) throw error;
  return (data ?? []).map((g) => ({
    studentId: g.student_id,
    points: g.points,
    badges: (g.badges as string[]) ?? [],
  }));
}

async function fetchMissions(): Promise<Mission[]> {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .eq("enabled", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id as string,
    name: m.name as string,
    description: m.description as string,
    icon: m.icon as string,
    conditionType: m.condition_type as Mission["conditionType"],
    conditionAction: m.condition_action as string | null,
    conditionThreshold: m.condition_threshold as number,
    pointsReward: m.points_reward as number,
    enabled: m.enabled as boolean,
    isSecret: m.is_secret as boolean,
    isDefault: m.is_default as boolean,
    sortOrder: m.sort_order as number,
    createdAt: m.created_at as string,
  }));
}

async function fetchStudentMissions(): Promise<StudentMission[]> {
  const { data, error } = await supabase
    .from("student_missions")
    .select("*");
  if (error) throw error;
  return (data ?? []).map((sm) => ({
    id: sm.id as string,
    missionId: sm.mission_id as string,
    studentId: sm.student_id as string,
    progress: sm.progress as number,
    completed: sm.completed as boolean,
    completedAt: sm.completed_at as string | null,
    grantedBy: sm.granted_by as string,
    createdAt: sm.created_at as string,
  }));
}

// ---------------------------------------------------------------------------
// Legacy BADGES export for backwards compatibility during migration
// ---------------------------------------------------------------------------

/** @deprecated Use missions from useGamification().missions instead */
export const BADGES: Mission[] = [];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGamification() {
  const queryClient = useQueryClient();

  const { data: gamificationData = [], isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchGamification,
    staleTime: 1000 * 60 * 5,
  });

  const { data: missions = [] } = useQuery({
    queryKey: QK_MISSIONS,
    queryFn: fetchMissions,
    staleTime: 1000 * 60 * 5,
  });

  const { data: studentMissions = [] } = useQuery({
    queryKey: QK_STUDENT_MISSIONS,
    queryFn: fetchStudentMissions,
    staleTime: 1000 * 60 * 2,
  });

  const getPlayerData = useCallback(
    (studentId: string): GamificationData =>
      gamificationData.find((g) => g.studentId === studentId) ?? {
        studentId,
        points: 0,
        badges: [],
      },
    [gamificationData]
  );

  // Get completed missions for a student
  const getPlayerMissions = useCallback(
    (studentId: string): (Mission & { progress: number; completed: boolean; completedAt: string | null })[] => {
      const studentMissionsForUser = studentMissions.filter(
        (sm) => sm.studentId === studentId && sm.completed
      );
      return studentMissionsForUser
        .map((sm) => {
          const mission = missions.find((m) => m.id === sm.missionId);
          if (!mission) return null;
          return {
            ...mission,
            progress: sm.progress,
            completed: sm.completed,
            completedAt: sm.completedAt,
          };
        })
        .filter(Boolean) as (Mission & { progress: number; completed: boolean; completedAt: string | null })[];
    },
    [missions, studentMissions]
  );

  // Get missions in progress (not completed, progress > 0) for a student
  const getPlayerMissionsInProgress = useCallback(
    (studentId: string): (Mission & { progress: number })[] => {
      const studentMissionsForUser = studentMissions.filter(
        (sm) => sm.studentId === studentId && !sm.completed && sm.progress > 0
      );
      return studentMissionsForUser
        .map((sm) => {
          const mission = missions.find((m) => m.id === sm.missionId);
          if (!mission) return null;
          if (mission.isSecret) return null; // hide secret missions until completed
          return { ...mission, progress: sm.progress };
        })
        .filter(Boolean) as (Mission & { progress: number })[];
    },
    [missions, studentMissions]
  );

  // Get all uncompleted visible missions for a student (for profile display)
  const getPlayerMissionsNotStarted = useCallback(
    (studentId: string): Mission[] => {
      const studentMissionIds = new Set(
        studentMissions
          .filter((sm) => sm.studentId === studentId)
          .map((sm) => sm.missionId)
      );
      return missions.filter(
        (m) => !studentMissionIds.has(m.id) && !m.isSecret && m.conditionType !== "manual"
      );
    },
    [missions, studentMissions]
  );

  // Legacy: getBadgeDetails returns a mission as a Badge-like object
  const getBadgeDetails = useCallback(
    (missionId: string): Mission | null =>
      missions.find((m) => m.id === missionId) ?? null,
    [missions]
  );

  // Legacy: getPlayerBadges returns completed missions (Badge-compatible)
  const getPlayerBadges = useCallback(
    (studentId: string): Mission[] => getPlayerMissions(studentId),
    [getPlayerMissions]
  );

  // Get the primary (most recent) completed mission
  const getPrimaryBadge = useCallback(
    (studentId: string): Mission | null => {
      const completed = getPlayerMissions(studentId);
      return completed.length > 0 ? completed[completed.length - 1] : null;
    },
    [getPlayerMissions]
  );

  // ---- Mutations (admin) ----

  const awardPoints = useCallback(
    async (studentId: string, points: number, reason: string) => {
      const current = gamificationData.find((g) => g.studentId === studentId);
      const currentPoints = current?.points ?? 0;
      const newPoints = Math.max(0, currentPoints + points);

      const { error } = await supabase.from("gamification").upsert(
        {
          student_id: studentId,
          points: newPoints,
          badges: current?.badges ?? [],
        },
        { onConflict: "student_id" }
      );
      if (error) throw error;

      await supabase.from("gamification_log").insert({
        student_id: studentId,
        points_change: points,
        reason,
      }).then(() => {});

      queryClient.invalidateQueries({ queryKey: QK });
    },
    [gamificationData, queryClient]
  );

  const grantMission = useCallback(
    async (studentId: string, missionId: string) => {
      const mission = missions.find((m) => m.id === missionId);
      if (!mission) return;

      await supabase.from("student_missions").upsert(
        {
          mission_id: missionId,
          student_id: studentId,
          progress: mission.conditionThreshold,
          completed: true,
          completed_at: new Date().toISOString(),
          granted_by: "admin",
        },
        { onConflict: "mission_id,student_id" }
      );

      // Also update legacy badges array
      const { data: gam } = await supabase
        .from("gamification")
        .select("badges")
        .eq("student_id", studentId)
        .maybeSingle();
      const currentBadges: string[] = (gam?.badges as string[]) ?? [];
      if (!currentBadges.includes(missionId)) {
        await supabase.from("gamification").upsert(
          { student_id: studentId, badges: [...currentBadges, missionId] },
          { onConflict: "student_id" }
        );
      }

      queryClient.invalidateQueries({ queryKey: QK });
      queryClient.invalidateQueries({ queryKey: QK_STUDENT_MISSIONS });
    },
    [missions, queryClient]
  );

  const revokeMission = useCallback(
    async (studentId: string, missionId: string) => {
      await supabase
        .from("student_missions")
        .delete()
        .eq("student_id", studentId)
        .eq("mission_id", missionId);

      // Also remove from legacy badges array
      const { data: gam } = await supabase
        .from("gamification")
        .select("badges")
        .eq("student_id", studentId)
        .maybeSingle();
      const currentBadges: string[] = (gam?.badges as string[]) ?? [];
      await supabase.from("gamification").upsert(
        { student_id: studentId, badges: currentBadges.filter((b) => b !== missionId) },
        { onConflict: "student_id" }
      );

      queryClient.invalidateQueries({ queryKey: QK });
      queryClient.invalidateQueries({ queryKey: QK_STUDENT_MISSIONS });
    },
    [queryClient]
  );

  // Legacy aliases
  const grantBadge = grantMission;
  const removeBadge = revokeMission;

  return {
    gamificationData,
    missions,
    studentMissions,
    badges: missions, // legacy alias
    loading: isLoading,
    getPlayerData,
    getPlayerMissions,
    getPlayerMissionsInProgress,
    getPlayerMissionsNotStarted,
    getBadgeDetails,
    getPlayerBadges,
    getPrimaryBadge,
    awardPoints,
    grantMission,
    revokeMission,
    grantBadge,
    removeBadge,
  };
}
