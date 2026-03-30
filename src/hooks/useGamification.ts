import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { GamificationData, Badge } from "@/types/student";

// Pre-defined badges (static — not stored in DB)
export const BADGES: Badge[] = [
  {
    id: "primeiro-passo",
    name: "Primeiro Passo",
    description: "Completou a primeira aula",
    icon: "🎯",
    condition: "complete_first_lesson",
  },
  {
    id: "engajado",
    name: "Engajado",
    description: "Curtiu 10 posts na comunidade",
    icon: "❤️",
    condition: "like_10_posts",
  },
  {
    id: "popular",
    name: "Popular",
    description: "Recebeu 20 curtidas nos seus posts",
    icon: "⭐",
    condition: "receive_20_likes",
  },
  {
    id: "maratonista",
    name: "Maratonista",
    description: "Completou 5 cursos",
    icon: "🏃",
    condition: "complete_5_courses",
  },
  {
    id: "veterano",
    name: "Veterano",
    description: "Na plataforma há mais de 6 meses",
    icon: "🏆",
    condition: "6_months_member",
  },
];

const QK = ["gamification"] as const;

async function fetchGamification(): Promise<GamificationData[]> {
  const { data, error } = await supabase.from("gamification").select("*");
  if (error) throw error;
  return (data ?? []).map((g) => ({
    studentId: g.student_id,
    points: g.points,
    badges: (g.badges as string[]) ?? [],
  }));
}

export function useGamification() {
  const queryClient = useQueryClient();

  const { data: gamificationData = [], isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchGamification,
    staleTime: 1000 * 60 * 5,
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

  const getBadgeDetails = useCallback(
    (badgeId: string): Badge | null =>
      BADGES.find((b) => b.id === badgeId) ?? null,
    []
  );

  const getPlayerBadges = useCallback(
    (studentId: string): Badge[] => {
      const data = gamificationData.find((g) => g.studentId === studentId);
      if (!data) return [];
      return data.badges
        .map((id) => BADGES.find((b) => b.id === id))
        .filter(Boolean) as Badge[];
    },
    [gamificationData]
  );

  const getPrimaryBadge = useCallback(
    (studentId: string): Badge | null => {
      const badges = getPlayerBadges(studentId);
      return badges.length > 0 ? badges[badges.length - 1] : null;
    },
    [getPlayerBadges]
  );

  return {
    gamificationData,
    badges: BADGES,
    loading: isLoading,
    getPlayerData,
    getBadgeDetails,
    getPlayerBadges,
    getPrimaryBadge,
  };
}
