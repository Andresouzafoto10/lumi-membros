import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MissionConditionType } from "@/types/student";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PointsCategory = "learning" | "community" | "engagement";

export type PointsConfigRow = {
  id: string;
  actionType: string;
  actionLabel: string;
  points: number;
  maxTimes: number | null;
  isSystem: boolean;
  enabled: boolean;
  category: PointsCategory;
  description: string;
  icon: string;
};

export type LevelRow = {
  id: string;
  levelNumber: number;
  name: string;
  pointsRequired: number;
  iconType: "emoji" | "lucide";
  iconName: string;
  iconColor: string;
};

export type MissionRow = {
  id: string;
  name: string;
  description: string;
  icon: string;
  conditionType: MissionConditionType;
  conditionAction: string | null;
  conditionThreshold: number;
  pointsReward: number;
  enabled: boolean;
  isSecret: boolean;
  isDefault: boolean;
  sortOrder: number;
};

/** @deprecated Use MissionRow instead */
export type AchievementRow = {
  id: string;
  title: string;
  description: string;
  iconEmoji: string;
  badgeColor: string;
  pointsRequired: number;
  triggerType: "points" | "lessons" | "courses" | "manual";
  triggerValue: number;
  isActive: boolean;
};

export type RankingUser = {
  rank: number;
  studentId: string;
  name: string;
  avatarUrl: string;
  totalPoints: number;
  currentLevel: number;
  levelName: string;
  levelIconName: string;
  levelIconColor: string;
  badges: string[];
};

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const QK_POINTS = ["points-config"] as const;
const QK_LEVELS = ["levels"] as const;
const QK_MISSIONS = ["missions-config"] as const;
const QK_RANKING = ["ranking"] as const;
const QK_MONTHLY_RANKING = ["ranking-monthly"] as const;
const QK_HALL_OF_FAME = ["ranking-hall-of-fame"] as const;

export type HallOfFameEntry = {
  period: string;
  position: number;
  points: number;
  studentId: string;
  name: string;
  avatarUrl: string;
};

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchPointsConfig(): Promise<PointsConfigRow[]> {
  const { data, error } = await supabase
    .from("points_config")
    .select("*")
    .order("category")
    .order("action_label");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    actionType: r.action_type as string,
    actionLabel: r.action_label as string,
    points: r.points as number,
    maxTimes: r.max_times as number | null,
    isSystem: r.is_system as boolean,
    enabled: (r.enabled as boolean) ?? true,
    category: (r.category as PointsCategory) ?? "learning",
    description: (r.description as string) ?? "",
    icon: (r.icon as string) ?? "⭐",
  }));
}

async function fetchLevels(): Promise<LevelRow[]> {
  const { data, error } = await supabase
    .from("levels")
    .select("*")
    .order("points_required");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    levelNumber: r.level_number as number,
    name: r.name as string,
    pointsRequired: r.points_required as number,
    iconType: r.icon_type as "emoji" | "lucide",
    iconName: r.icon_name as string,
    iconColor: r.icon_color as string,
  }));
}

async function fetchMissions(): Promise<MissionRow[]> {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: r.description as string,
    icon: r.icon as string,
    conditionType: r.condition_type as MissionConditionType,
    conditionAction: r.condition_action as string | null,
    conditionThreshold: r.condition_threshold as number,
    pointsReward: r.points_reward as number,
    enabled: (r.enabled as boolean) ?? true,
    isSecret: (r.is_secret as boolean) ?? false,
    isDefault: (r.is_default as boolean) ?? false,
    sortOrder: r.sort_order as number,
  }));
}

async function fetchRanking(): Promise<RankingUser[]> {
  const { data: gamData, error: gErr } = await supabase
    .from("gamification")
    .select("student_id, points, badges, current_level")
    .order("points", { ascending: false })
    .limit(50);
  if (gErr) throw gErr;

  const { data: levelsData } = await supabase
    .from("levels")
    .select("*")
    .order("points_required");
  const levels = (levelsData ?? []) as Record<string, unknown>[];

  const studentIds = (gamData ?? []).map((g) => g.student_id as string);
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, name, display_name, avatar_url")
    .in("id", studentIds.length > 0 ? studentIds : ["__none__"]);

  const profileMap = new Map(
    (profilesData ?? []).map((p) => [p.id as string, p])
  );

  return (gamData ?? [])
    .filter((g) => (g.points as number) > 0)
    .map((g, idx) => {
      const profile = profileMap.get(g.student_id as string);
      const lvl = levels.find(
        (l) => (l.level_number as number) === (g.current_level as number)
      );
      return {
        rank: idx + 1,
        studentId: g.student_id as string,
        name:
          (profile?.display_name as string) ||
          (profile?.name as string) ||
          "Aluno",
        avatarUrl: (profile?.avatar_url as string) ?? "",
        totalPoints: g.points as number,
        currentLevel: g.current_level as number,
        levelName: (lvl?.name as string) ?? "Iniciante",
        levelIconName: (lvl?.icon_name as string) ?? "🌱",
        levelIconColor: (lvl?.icon_color as string) ?? "#94a3b8",
        badges: (g.badges as string[]) ?? [],
      };
    });
}

// ---------------------------------------------------------------------------
// Monthly ranking (aggregated from points_log for current month)
// ---------------------------------------------------------------------------

async function fetchMonthlyRanking(): Promise<RankingUser[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Sum points per student for current month
  const { data: logData, error: lErr } = await supabase
    .from("points_log")
    .select("student_id, points")
    .gte("created_at", monthStart);
  if (lErr) throw lErr;

  // Aggregate per student
  const totals = new Map<string, number>();
  for (const row of logData ?? []) {
    const sid = row.student_id as string;
    totals.set(sid, (totals.get(sid) ?? 0) + (row.points as number));
  }

  // Sort and take top 50
  const sorted = [...totals.entries()]
    .filter(([, pts]) => pts > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  if (sorted.length === 0) return [];

  // Fetch profiles + levels
  const studentIds = sorted.map(([id]) => id);
  const [{ data: profilesData }, { data: levelsData }, { data: gamData }] = await Promise.all([
    supabase.from("profiles").select("id, name, display_name, avatar_url").in("id", studentIds),
    supabase.from("levels").select("*").order("points_required"),
    supabase.from("gamification").select("student_id, current_level").in("student_id", studentIds),
  ]);

  const profileMap = new Map((profilesData ?? []).map((p) => [p.id as string, p]));
  const levelMap = new Map((gamData ?? []).map((g) => [g.student_id as string, g.current_level as number]));
  const levels = (levelsData ?? []) as Record<string, unknown>[];

  return sorted.map(([studentId, pts], idx) => {
    const profile = profileMap.get(studentId);
    const currentLevel = levelMap.get(studentId) ?? 1;
    const lvl = levels.find((l) => (l.level_number as number) === currentLevel);
    return {
      rank: idx + 1,
      studentId,
      name: (profile?.display_name as string) || (profile?.name as string) || "Aluno",
      avatarUrl: (profile?.avatar_url as string) ?? "",
      totalPoints: pts,
      currentLevel,
      levelName: (lvl?.name as string) ?? "Iniciante",
      levelIconName: (lvl?.icon_name as string) ?? "🌱",
      levelIconColor: (lvl?.icon_color as string) ?? "#94a3b8",
      badges: [],
    };
  });
}

// ---------------------------------------------------------------------------
// Hall of Fame
// ---------------------------------------------------------------------------

async function fetchHallOfFame(): Promise<HallOfFameEntry[]> {
  const { data, error } = await supabase
    .from("ranking_hall_of_fame")
    .select("*")
    .order("period", { ascending: false })
    .order("position")
    .limit(30); // last 10 months × 3 positions
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const studentIds = [...new Set(data.map((r) => r.student_id as string))];
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, name, display_name, avatar_url")
    .in("id", studentIds);

  const profileMap = new Map((profilesData ?? []).map((p) => [p.id as string, p]));

  return data.map((r) => {
    const profile = profileMap.get(r.student_id as string);
    return {
      period: r.period as string,
      position: r.position as number,
      points: r.points as number,
      studentId: r.student_id as string,
      name: (profile?.display_name as string) || (profile?.name as string) || "Aluno",
      avatarUrl: (profile?.avatar_url as string) ?? "",
    };
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGamificationConfig() {
  const queryClient = useQueryClient();

  const { data: pointsConfig = [] } = useQuery({
    queryKey: QK_POINTS,
    queryFn: fetchPointsConfig,
    staleTime: 1000 * 60 * 10,
  });

  const { data: levels = [] } = useQuery({
    queryKey: QK_LEVELS,
    queryFn: fetchLevels,
    staleTime: 1000 * 60 * 10,
  });

  const { data: missions = [] } = useQuery({
    queryKey: QK_MISSIONS,
    queryFn: fetchMissions,
    staleTime: 1000 * 60 * 10,
  });

  // Legacy alias
  const achievements = missions;

  const { data: ranking = [], isLoading: rankingLoading } = useQuery({
    queryKey: QK_RANKING,
    queryFn: fetchRanking,
    staleTime: 1000 * 30,
  });

  const { data: monthlyRanking = [], isLoading: monthlyRankingLoading } = useQuery({
    queryKey: QK_MONTHLY_RANKING,
    queryFn: fetchMonthlyRanking,
    staleTime: 1000 * 60 * 2,
  });

  const { data: hallOfFame = [] } = useQuery({
    queryKey: QK_HALL_OF_FAME,
    queryFn: fetchHallOfFame,
    staleTime: 1000 * 60 * 10,
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK_POINTS });
    queryClient.invalidateQueries({ queryKey: QK_LEVELS });
    queryClient.invalidateQueries({ queryKey: QK_MISSIONS });
    queryClient.invalidateQueries({ queryKey: QK_RANKING });
    queryClient.invalidateQueries({ queryKey: QK_MONTHLY_RANKING });
    queryClient.invalidateQueries({ queryKey: QK_HALL_OF_FAME });
  }, [queryClient]);

  // ---- Points Config CRUD ----

  const updatePointsAction = useCallback(
    async (id: string, patch: Partial<Pick<PointsConfigRow, "points" | "enabled" | "maxTimes" | "actionLabel" | "description" | "icon">>) => {
      const payload: Record<string, unknown> = {};
      if (patch.points !== undefined) payload.points = patch.points;
      if (patch.enabled !== undefined) payload.enabled = patch.enabled;
      if (patch.maxTimes !== undefined) payload.max_times = patch.maxTimes;
      if (patch.actionLabel !== undefined) payload.action_label = patch.actionLabel;
      if (patch.description !== undefined) payload.description = patch.description;
      if (patch.icon !== undefined) payload.icon = patch.icon;
      await supabase.from("points_config").update(payload).eq("id", id);
      queryClient.invalidateQueries({ queryKey: QK_POINTS });
    },
    [queryClient]
  );

  const togglePointsAction = useCallback(
    async (id: string) => {
      const action = pointsConfig.find((a) => a.id === id);
      if (!action) return;
      await supabase.from("points_config").update({ enabled: !action.enabled }).eq("id", id);
      queryClient.invalidateQueries({ queryKey: QK_POINTS });
    },
    [pointsConfig, queryClient]
  );

  const createPointsAction = useCallback(
    async (data: { actionType: string; actionLabel: string; points: number; maxTimes?: number; category?: PointsCategory; description?: string; icon?: string }) => {
      await supabase.from("points_config").insert({
        action_type: data.actionType,
        action_label: data.actionLabel,
        points: data.points,
        max_times: data.maxTimes ?? null,
        is_system: false,
        enabled: true,
        category: data.category ?? "engagement",
        description: data.description ?? "",
        icon: data.icon ?? "⭐",
      });
      queryClient.invalidateQueries({ queryKey: QK_POINTS });
    },
    [queryClient]
  );

  const deletePointsAction = useCallback(
    async (id: string) => {
      await supabase.from("points_config").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: QK_POINTS });
    },
    [queryClient]
  );

  // ---- Levels CRUD ----

  const updateLevel = useCallback(
    async (id: string, patch: Partial<Omit<LevelRow, "id">>) => {
      await supabase
        .from("levels")
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.pointsRequired !== undefined && { points_required: patch.pointsRequired }),
          ...(patch.iconName !== undefined && { icon_name: patch.iconName }),
          ...(patch.iconColor !== undefined && { icon_color: patch.iconColor }),
          ...(patch.iconType !== undefined && { icon_type: patch.iconType }),
        })
        .eq("id", id);
      queryClient.invalidateQueries({ queryKey: QK_LEVELS });
    },
    [queryClient]
  );

  const createLevel = useCallback(
    async (data: { name: string; pointsRequired: number; iconName: string; iconColor: string }) => {
      const maxNum = levels.reduce((m, l) => Math.max(m, l.levelNumber), 0);
      await supabase.from("levels").insert({
        level_number: maxNum + 1,
        name: data.name,
        points_required: data.pointsRequired,
        icon_name: data.iconName,
        icon_color: data.iconColor,
      });
      queryClient.invalidateQueries({ queryKey: QK_LEVELS });
    },
    [levels, queryClient]
  );

  const deleteLevel = useCallback(
    async (id: string) => {
      await supabase.from("levels").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: QK_LEVELS });
    },
    [queryClient]
  );

  // ---- Missions CRUD ----

  const createMission = useCallback(
    async (data: Omit<MissionRow, "id">) => {
      const maxOrder = missions.reduce((m, mi) => Math.max(m, mi.sortOrder), 0);
      const { error } = await supabase.from("missions").insert({
        name: data.name,
        description: data.description,
        icon: data.icon,
        condition_type: data.conditionType,
        condition_action: data.conditionAction,
        condition_threshold: data.conditionThreshold,
        points_reward: data.pointsReward,
        enabled: data.enabled,
        is_secret: data.isSecret,
        is_default: false,
        sort_order: data.sortOrder || maxOrder + 1,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: QK_MISSIONS });
    },
    [missions, queryClient]
  );

  const updateMission = useCallback(
    async (id: string, patch: Partial<MissionRow>) => {
      const { error } = await supabase
        .from("missions")
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.description !== undefined && { description: patch.description }),
          ...(patch.icon !== undefined && { icon: patch.icon }),
          ...(patch.conditionType !== undefined && { condition_type: patch.conditionType }),
          ...(patch.conditionAction !== undefined && { condition_action: patch.conditionAction }),
          ...(patch.conditionThreshold !== undefined && { condition_threshold: patch.conditionThreshold }),
          ...(patch.pointsReward !== undefined && { points_reward: patch.pointsReward }),
          ...(patch.enabled !== undefined && { enabled: patch.enabled }),
          ...(patch.isSecret !== undefined && { is_secret: patch.isSecret }),
        })
        .eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: QK_MISSIONS });
    },
    [queryClient]
  );

  const deleteMission = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("missions").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: QK_MISSIONS });
    },
    [queryClient]
  );

  // Legacy aliases for backwards compat
  const createAchievement = useCallback(
    async (data: AchievementRow | Omit<AchievementRow, "id">) => {
      await createMission({
        name: data.title,
        description: data.description,
        icon: data.iconEmoji,
        conditionType: data.triggerType === "points" ? "points_total"
          : data.triggerType === "lessons" ? "lesson_complete"
          : data.triggerType === "courses" ? "course_complete"
          : "manual",
        conditionAction: null,
        conditionThreshold: data.triggerValue,
        pointsReward: 0,
        enabled: data.isActive,
        isSecret: false,
        isDefault: false,
        sortOrder: 0,
      });
    },
    [createMission]
  );

  const updateAchievement = useCallback(
    async (id: string, patch: Partial<AchievementRow>) => {
      const missionPatch: Partial<MissionRow> = {};
      if (patch.title !== undefined) missionPatch.name = patch.title;
      if (patch.description !== undefined) missionPatch.description = patch.description;
      if (patch.iconEmoji !== undefined) missionPatch.icon = patch.iconEmoji;
      if (patch.isActive !== undefined) missionPatch.enabled = patch.isActive;
      if (patch.triggerType !== undefined) {
        missionPatch.conditionType = patch.triggerType === "points" ? "points_total"
          : patch.triggerType === "lessons" ? "lesson_complete"
          : patch.triggerType === "courses" ? "course_complete"
          : "manual";
      }
      if (patch.triggerValue !== undefined) missionPatch.conditionThreshold = patch.triggerValue;
      await updateMission(id, missionPatch);
    },
    [updateMission]
  );

  const deleteAchievement = deleteMission;

  // ---- Admin: manual point/badge management per student ----

  const addPointsToStudent = useCallback(
    async (studentId: string, points: number, reason: string) => {
      await supabase.from("points_log").insert({
        student_id: studentId,
        action_type: "admin_manual",
        points,
        reference_id: reason,
      });
      const { data: gam } = await supabase
        .from("gamification")
        .select("points")
        .eq("student_id", studentId)
        .maybeSingle();
      const current = (gam?.points as number) ?? 0;
      const newTotal = Math.max(0, current + points);
      const lvl = [...levels].reverse().find((l) => newTotal >= l.pointsRequired);
      await supabase.from("gamification").upsert(
        { student_id: studentId, points: newTotal, current_level: lvl?.levelNumber ?? 1 },
        { onConflict: "student_id" }
      );
      invalidateAll();
    },
    [levels, invalidateAll]
  );

  const grantAchievement = useCallback(
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
      // Also add to legacy badges array
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
      invalidateAll();
    },
    [missions, invalidateAll]
  );

  const revokeAchievement = useCallback(
    async (studentId: string, missionId: string) => {
      await supabase
        .from("student_missions")
        .delete()
        .eq("student_id", studentId)
        .eq("mission_id", missionId);
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
      invalidateAll();
    },
    [invalidateAll]
  );

  // ---- Get level for a given point total ----

  const getLevelForPoints = useCallback(
    (points: number): LevelRow => {
      const lvl = [...levels].reverse().find((l) => points >= l.pointsRequired);
      return lvl ?? levels[0] ?? { id: "", levelNumber: 1, name: "Iniciante", pointsRequired: 0, iconType: "emoji" as const, iconName: "🌱", iconColor: "#94a3b8" };
    },
    [levels]
  );

  return {
    pointsConfig,
    levels,
    missions,
    achievements, // legacy alias
    ranking,
    rankingLoading,
    monthlyRanking,
    monthlyRankingLoading,
    hallOfFame,
    // Points config
    updatePointsAction,
    togglePointsAction,
    createPointsAction,
    deletePointsAction,
    // Levels
    updateLevel,
    createLevel,
    deleteLevel,
    // Missions
    createMission,
    updateMission,
    deleteMission,
    // Legacy aliases
    createAchievement,
    updateAchievement,
    deleteAchievement,
    // Admin student management
    addPointsToStudent,
    grantAchievement,
    revokeAchievement,
    // Helpers
    getLevelForPoints,
    invalidateAll,
  };
}
