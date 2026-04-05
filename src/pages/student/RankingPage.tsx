import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Trophy, Crown, Medal, Star } from "lucide-react";
import { useGamificationConfig } from "@/hooks/useGamificationConfig";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { GamificationGuide } from "@/components/gamification/GamificationGuide";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "global", label: "Global" },
  { key: "month", label: "Este mês" },
] as const;

export default function RankingPage() {
  const { ranking, rankingLoading, levels } = useGamificationConfig();
  const { currentUserId } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<"global" | "month">("global");

  // For now both tabs show the same ranking (monthly filtering would need points_log aggregation)
  const displayRanking = useMemo(() => ranking, [ranking]);

  const top3 = displayRanking.slice(0, 3);
  const rest = displayRanking.slice(3);

  // Find current user's rank
  const myRank = displayRanking.findIndex((r) => r.studentId === currentUserId) + 1;
  const myData = displayRanking.find((r) => r.studentId === currentUserId);

  return (
    <div className="mx-auto max-w-6xl pb-20 sm:pb-12 px-4">
      <Helmet>
        <title>Ranking</title>
      </Helmet>

      {/* Header */}
      <div className="flex items-center gap-3 pt-6 pb-4">
        <Trophy className="h-7 w-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ranking</h1>
          <p className="text-sm text-muted-foreground">
            Os alunos mais engajados da plataforma
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ranking — 2/3 */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-muted/50 rounded-lg p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all",
                  activeTab === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {rankingLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : displayRanking.length === 0 ? (
            <div className="text-center py-16">
              <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-lg font-medium text-muted-foreground">
                Nenhum aluno no ranking ainda
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Complete aulas e interaja na comunidade para aparecer aqui!
              </p>
            </div>
          ) : (
            <>
              {/* Podium - Top 3 */}
              {top3.length >= 3 && (
                <div className="flex items-end justify-center gap-3 mb-8 px-2">
                  <PodiumCard user={top3[1]} rank={2} height="h-28" />
                  <PodiumCard user={top3[0]} rank={1} height="h-36" highlight />
                  <PodiumCard user={top3[2]} rank={3} height="h-24" />
                </div>
              )}

              {/* If less than 3, show inline */}
              {top3.length < 3 && top3.length > 0 && (
                <div className="space-y-2 mb-4">
                  {top3.map((user) => (
                    <RankRow key={user.studentId} user={user} isMe={user.studentId === currentUserId} levels={levels} />
                  ))}
                </div>
              )}

              {/* Rest of ranking */}
              {rest.length > 0 && (
                <div className="space-y-1.5">
                  {rest.map((user) => (
                    <RankRow key={user.studentId} user={user} isMe={user.studentId === currentUserId} levels={levels} />
                  ))}
                </div>
              )}

              {/* My position if not in top 50 */}
              {myRank === 0 && myData && (
                <div className="mt-6 border-t border-border/40 pt-4">
                  <p className="text-xs text-muted-foreground mb-2">Sua posicao</p>
                  <RankRow user={{ ...myData, rank: 0 }} isMe levels={levels} />
                </div>
              )}

              {/* My position highlight */}
              {myRank > 0 && myData && (
                <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Sua posicao</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-primary">#{myRank}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{myData.name}</p>
                      <LevelBadge
                        iconName={myData.levelIconName}
                        iconColor={myData.levelIconColor}
                        levelName={myData.levelName}
                      />
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {myData.totalPoints.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Guide sidebar — 1/3 */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border/50 bg-card/50 p-4 sticky top-20">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Guia de Gamificacao
            </h3>
            <GamificationGuide studentId={currentUserId} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Podium card (top 3)
// ---------------------------------------------------------------------------

function PodiumCard({
  user,
  rank,
  height,
  highlight,
}: {
  user: { studentId: string; name: string; avatarUrl: string; totalPoints: number; levelIconName: string; levelIconColor: string; levelName: string };
  rank: number;
  height: string;
  highlight?: boolean;
}) {
  const icons = [Crown, Medal, Medal];
  const colors = ["text-amber-400", "text-gray-400", "text-amber-700"];
  const bgColors = ["bg-amber-400/10", "bg-gray-400/10", "bg-amber-700/10"];
  const Icon = icons[rank - 1] ?? Star;

  return (
    <Link
      to={`/perfil/${user.studentId}`}
      className={cn(
        "flex flex-col items-center gap-2 flex-1 rounded-2xl p-3 transition-all hover:scale-105",
        highlight
          ? "bg-gradient-to-t from-amber-500/10 to-amber-500/5 border border-amber-500/20"
          : "bg-muted/30 border border-border/30"
      )}
    >
      <div className={cn("flex items-center justify-center rounded-full p-1.5", bgColors[rank - 1])}>
        <Icon className={cn("h-4 w-4", colors[rank - 1])} />
      </div>
      <div className={cn("rounded-full overflow-hidden border-2 bg-muted", highlight ? "h-16 w-16 border-amber-400/40" : "h-12 w-12 border-border/50")}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-primary/20 text-primary font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <p className={cn("text-xs font-semibold text-center truncate w-full", highlight && "text-amber-400")}>
        {user.name}
      </p>
      <LevelBadge iconName={user.levelIconName} iconColor={user.levelIconColor} levelName={user.levelName} />
      <p className={cn("text-sm font-bold", highlight ? "text-amber-400" : "text-primary")}>
        {user.totalPoints.toLocaleString()}
      </p>
      <p className="text-[10px] text-muted-foreground -mt-1">pontos</p>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Rank row (4th and below)
// ---------------------------------------------------------------------------

function RankRow({
  user,
  isMe,
  levels: allLevels = [],
}: {
  user: { rank: number; studentId: string; name: string; avatarUrl: string; totalPoints: number; levelIconName: string; levelIconColor: string; levelName: string };
  isMe?: boolean;
  levels?: { levelNumber: number; pointsRequired: number; iconName: string; name: string }[];
}) {
  const nextLevel = useMemo(() => {
    const sorted = [...allLevels].sort((a, b) => a.pointsRequired - b.pointsRequired);
    return sorted.find((l) => l.pointsRequired > user.totalPoints) ?? null;
  }, [allLevels, user.totalPoints]);

  return (
    <Link
      to={`/perfil/${user.studentId}`}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:bg-muted/50",
        isMe && "bg-primary/5 border border-primary/15"
      )}
    >
      <span className={cn("w-8 text-center text-sm font-bold", isMe ? "text-primary" : "text-muted-foreground")}>
        #{user.rank}
      </span>
      <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-muted ring-1 ring-border/30">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-primary/20 text-primary text-sm font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", isMe && "text-primary")}>{user.name}</p>
        <div className="flex items-center gap-2">
          <LevelBadge iconName={user.levelIconName} iconColor={user.levelIconColor} levelName={user.levelName} />
          {nextLevel && (
            <div className="h-1 rounded-full bg-muted/50 overflow-hidden w-16">
              <div
                className="h-full rounded-full bg-primary/60"
                style={{ width: `${Math.min(100, (user.totalPoints / nextLevel.pointsRequired) * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={cn("text-sm font-bold", isMe ? "text-primary" : "text-foreground")}>
          {user.totalPoints.toLocaleString()}
        </p>
        <p className="text-[10px] text-muted-foreground">pts</p>
      </div>
    </Link>
  );
}
