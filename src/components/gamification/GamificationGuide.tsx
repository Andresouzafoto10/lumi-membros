import { useMemo, useState } from "react";
import { useGamification } from "@/hooks/useGamification";
import { useGamificationConfig } from "@/hooks/useGamificationConfig";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "levels", label: "Niveis" },
  { key: "points", label: "Como Pontuar" },
  { key: "missions", label: "Missões" },
] as const;

type Tab = (typeof TABS)[number]["key"];

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  learning: { label: "Aprendizado", icon: "\u{1F4DA}" },
  community: { label: "Comunidade", icon: "\u{1F4AC}" },
  engagement: { label: "Engajamento", icon: "\u{1F525}" },
};

export function GamificationGuide({ studentId }: { studentId: string }) {
  const [tab, setTab] = useState<Tab>("levels");

  const { getPlayerData, getPlayerMissions, getPlayerMissionsInProgress } = useGamification();
  const { levels, pointsConfig, missions, getLevelForPoints } =
    useGamificationConfig();

  const playerData = getPlayerData(studentId);
  const studentPoints = playerData.points;
  const currentLevel = getLevelForPoints(studentPoints);
  const studentLevelNumber = currentLevel.levelNumber;

  const completedMissions = getPlayerMissions(studentId);
  const inProgressMissions = getPlayerMissionsInProgress(studentId);
  const completedIds = useMemo(
    () => new Set(completedMissions.map((m) => m.id)),
    [completedMissions]
  );

  // Only enabled actions
  const enabledActions = useMemo(
    () => pointsConfig.filter((a) => a.enabled),
    [pointsConfig]
  );

  // Group actions by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof enabledActions>();
    for (const a of enabledActions) {
      const list = map.get(a.category) ?? [];
      list.push(a);
      map.set(a.category, list);
    }
    return map;
  }, [enabledActions]);

  // Only enabled, non-secret missions (or completed secret ones)
  const visibleMissions = useMemo(
    () => missions.filter((m) => m.enabled && (!m.isSecret || completedIds.has(m.id))),
    [missions, completedIds]
  );

  // Sorted levels
  const sortedLevels = useMemo(
    () => [...levels].sort((a, b) => a.pointsRequired - b.pointsRequired),
    [levels]
  );

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              tab === t.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Levels tab */}
      {tab === "levels" && (
        <div className="space-y-2">
          {sortedLevels.map((level) => {
            const isCurrentLevel = studentLevelNumber === level.levelNumber;
            const isUnlocked = studentPoints >= level.pointsRequired;
            const isNext = level.levelNumber === studentLevelNumber + 1;

            return (
              <div
                key={level.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  isCurrentLevel &&
                    "border-primary/50 bg-primary/5 ring-1 ring-primary/20",
                  isUnlocked &&
                    !isCurrentLevel &&
                    "border-border/30 opacity-80",
                  !isUnlocked && !isNext && "border-border/20 opacity-40",
                  isNext && "border-amber-500/30 bg-amber-500/5"
                )}
              >
                <span className="text-2xl shrink-0">{level.iconName}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{level.name}</span>
                    {isCurrentLevel && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold whitespace-nowrap">
                        Voce esta aqui
                      </span>
                    )}
                    {isNext && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                        Proximo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {level.pointsRequired} pts necessarios
                  </p>
                  {isNext && (
                    <div className="mt-1.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                        <span>{studentPoints} pts</span>
                        <span>{level.pointsRequired} pts</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              (studentPoints / level.pointsRequired) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {isUnlocked && (
                  <span className="text-green-500 text-lg shrink-0">
                    {"\u2705"}
                  </span>
                )}
                {!isUnlocked && (
                  <span className="text-muted-foreground/30 text-sm shrink-0">
                    {"\u{1F512}"}
                  </span>
                )}
              </div>
            );
          })}
          {sortedLevels.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum nivel configurado ainda.
            </p>
          )}
        </div>
      )}

      {/* Points tab */}
      {tab === "points" && (
        <div className="space-y-5">
          {(["learning", "community", "engagement"] as const).map((cat) => {
            const actions = grouped.get(cat);
            if (!actions || actions.length === 0) return null;
            const meta = CATEGORY_META[cat] ?? {
              label: cat,
              icon: "\u2B50",
            };
            return (
              <div key={cat}>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>{meta.icon}</span>
                  {meta.label}
                </h4>
                <div className="divide-y divide-border/10">
                  {actions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0">
                          {action.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {action.actionLabel}
                          </p>
                          {action.maxTimes && (
                            <p className="text-[11px] text-muted-foreground">
                              max {action.maxTimes}x por dia
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary shrink-0 ml-2">
                        +{action.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {enabledActions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma acao de pontuacao configurada.
            </p>
          )}
        </div>
      )}

      {/* Missions tab */}
      {tab === "missions" && (
        <div className="space-y-4">
          {/* Completed */}
          {completedMissions.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {completedMissions.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-center"
                >
                  <div className="text-3xl mb-2">{m.icon}</div>
                  <p className="text-xs font-bold">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {m.description}
                  </p>
                  <span className="text-[10px] text-primary mt-1 block">
                    {"\u2705"} Concluída
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* In progress */}
          {inProgressMissions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Em progresso</p>
              <div className="space-y-0">
                {inProgressMissions.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/10">
                    <span className="text-xl grayscale opacity-50">{m.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs font-medium">{m.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (m.progress / m.conditionThreshold) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {m.progress}/{m.conditionThreshold}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not started */}
          {visibleMissions.filter((m) => !completedIds.has(m.id) && !inProgressMissions.some((ip) => ip.id === m.id)).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Não iniciadas</p>
              <div className="grid grid-cols-2 gap-3">
                {visibleMissions
                  .filter((m) => !completedIds.has(m.id) && !inProgressMissions.some((ip) => ip.id === m.id))
                  .map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border border-border/20 opacity-50 grayscale text-center"
                    >
                      <div className="text-3xl mb-2">{m.icon}</div>
                      <p className="text-xs font-bold">{m.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {m.description}
                      </p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {"\u{1F512}"} Bloqueada
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {visibleMissions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma missão configurada ainda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
