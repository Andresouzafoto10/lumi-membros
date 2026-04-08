import { Link } from "react-router-dom";
import { Trophy, Medal, Crown } from "lucide-react";
import { useGamificationConfig } from "@/hooks/useGamificationConfig";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { cn } from "@/lib/utils";

type GamificationRankingProps = {
  limit?: number;
  compact?: boolean;
};

export function GamificationRanking({
  limit = 10,
  compact = false,
}: GamificationRankingProps) {
  const { ranking } = useGamificationConfig();
  const top = ranking.slice(0, limit);

  if (top.length === 0) {
    return (
      <div className="text-center py-6">
        <Trophy className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhum aluno no ranking ainda.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Complete aulas e interaja para ganhar pontos!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {top.map((player) => {
        const isTop3 = player.rank <= 3;
        const RankIcon =
          player.rank === 1 ? Crown : player.rank <= 3 ? Medal : Trophy;
        const rankColor =
          player.rank === 1
            ? "text-amber-400"
            : player.rank === 2
            ? "text-gray-400"
            : player.rank === 3
            ? "text-amber-700"
            : "text-muted-foreground";

        return (
          <Link
            key={player.studentId}
            to={`/perfil/${player.studentId}`}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/50",
              isTop3 && "hover:bg-primary/5"
            )}
          >
            {/* Rank */}
            <div className={cn("w-6 flex items-center justify-center shrink-0", rankColor)}>
              {isTop3 ? (
                <RankIcon className="h-4 w-4" />
              ) : (
                <span className="text-xs font-bold">{player.rank}</span>
              )}
            </div>

            {/* Avatar */}
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/50">
              {player.avatarUrl ? (
                <img src={player.avatarUrl} alt={player.name} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-primary/20 text-primary text-xs font-bold">
                  {player.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className={cn("text-xs font-medium truncate", player.rank === 1 && "text-amber-400")}>
                {player.name}
              </p>
              {!compact && (
                <LevelBadge
                  iconName={player.levelIconName}
                  iconColor={player.levelIconColor}
                  levelName={player.levelName}
                />
              )}
            </div>

            {/* Points */}
            <div className="shrink-0 text-right">
              <p className={cn("text-xs font-bold tabular-nums", player.rank === 1 ? "text-amber-400" : "text-primary")}>
                {player.totalPoints.toLocaleString()}
              </p>
            </div>
          </Link>
        );
      })}

      {/* Link para ver ranking completo */}
      <Link
        to="/ranking"
        className="block text-center text-xs text-primary hover:underline pt-2"
      >
        Ver ranking completo →
      </Link>
    </div>
  );
}
