import type { StudentRole } from "@/types/student";

export type RoleBadge = {
  label: string;
  emoji: string;
  colorClass: string; // Tailwind classes for the pill
};

/**
 * Get role-based and gamification-based badges for a community member.
 * Returns up to all earned badges — the UI caps display at 2 + "+N".
 */
export function getMemberBadges(
  role: StudentRole | undefined,
  customProfileName: string | undefined,
  points: number,
  missionCount: number
): RoleBadge[] {
  const badges: RoleBadge[] = [];

  // Role-based badges
  if (role === "admin" || role === "owner") {
    badges.push({
      label: "Admin",
      emoji: "👑",
      colorClass:
        "border-violet-500/40 bg-violet-500/10 text-violet-400",
    });
  } else if (role === "moderator") {
    badges.push({
      label: "Moderador",
      emoji: "🛡️",
      colorClass:
        "border-blue-500/40 bg-blue-500/10 text-blue-400",
    });
  } else if (role === "support") {
    badges.push({
      label: "Suporte",
      emoji: "🎧",
      colorClass:
        "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
    });
  } else if (
    role &&
    role !== "student" &&
    customProfileName
  ) {
    // Custom access profile
    badges.push({
      label: customProfileName,
      emoji: "🏷️",
      colorClass:
        "border-primary/40 bg-primary/10 text-primary",
    });
  }

  // Gamification-based badges
  if (points >= 500) {
    badges.push({
      label: "Destaque",
      emoji: "⭐",
      colorClass:
        "border-amber-500/40 bg-amber-500/10 text-amber-400",
    });
  }

  if (missionCount >= 5) {
    badges.push({
      label: "Veterano",
      emoji: "🏆",
      colorClass:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    });
  }

  return badges;
}
