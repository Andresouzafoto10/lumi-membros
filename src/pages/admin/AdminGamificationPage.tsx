import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Trophy,
  Plus,
  Trash2,
  Pencil,
  Star,
  Save,
  Users,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { useGamificationConfig } from "@/hooks/useGamificationConfig";
import type { MissionRow, LevelRow, PointsConfigRow } from "@/hooks/useGamificationConfig";
import type { MissionConditionType } from "@/types/student";
import { Switch } from "@/components/ui/switch";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Emoji picker options
const EMOJI_OPTIONS = ["🌱", "⚡", "🔥", "💎", "👑", "🏆", "⭐", "🎯", "❤️", "🏃", "🎓", "💬", "📚", "🌟", "🦁", "🚀", "💪", "🎖️", "🏅", "✨"];
const COLOR_OPTIONS = ["#94a3b8", "#3b82f6", "#f97316", "#8b5cf6", "#eab308", "#ef4444", "#10b981", "#00C2CB"];

export default function AdminGamificationPage() {
  const {
    pointsConfig,
    levels,
    missions,
    ranking,
    updatePointsAction,
    togglePointsAction,
    createPointsAction,
    deletePointsAction,
    updateLevel,
    createLevel,
    deleteLevel,
    createMission,
    updateMission,
    deleteMission,
    addPointsToStudent,
  } = useGamificationConfig();

  const [activeTab, setActiveTab] = useState("ranking");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Admin", to: "/admin" }, { label: "Gamificação" }]} />

      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gamificação & Ranking</h1>
          <p className="text-sm text-muted-foreground">
            Configure pontos, níveis, missões e veja o ranking dos alunos
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="pontos">Pontos</TabsTrigger>
          <TabsTrigger value="niveis">Níveis</TabsTrigger>
          <TabsTrigger value="missoes">Missões</TabsTrigger>
        </TabsList>

        {/* ============================================================= */}
        {/* RANKING TAB */}
        {/* ============================================================= */}
        <TabsContent value="ranking" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Ranking dos alunos ({ranking.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ranking.length === 0 ? (
                <p className="px-6 pb-4 text-sm text-muted-foreground">
                  Nenhum aluno no ranking ainda. Pontos são ganhos automaticamente.
                </p>
              ) : (
                <div className="divide-y">
                  {ranking.map((user) => (
                    <AdminRankRow
                      key={user.studentId}
                      user={user}
                      onAddPoints={async (pts, reason) => {
                        await addPointsToStudent(user.studentId, pts, reason);
                        toast.success(`${pts > 0 ? "+" : ""}${pts} pontos para ${user.name}`);
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* PONTOS TAB */}
        {/* ============================================================= */}
        <TabsContent value="pontos" className="space-y-4">
          <PointsConfigPanel
            config={pointsConfig}
            onUpdate={updatePointsAction}
            onToggle={togglePointsAction}
            onCreate={createPointsAction}
            onDelete={deletePointsAction}
          />
        </TabsContent>

        {/* ============================================================= */}
        {/* NÍVEIS TAB */}
        {/* ============================================================= */}
        <TabsContent value="niveis" className="space-y-4">
          <LevelsPanel
            levels={levels}
            onUpdate={updateLevel}
            onCreate={createLevel}
            onDelete={deleteLevel}
          />
        </TabsContent>

        {/* ============================================================= */}
        {/* MISSÕES TAB */}
        {/* ============================================================= */}
        <TabsContent value="missoes" className="space-y-4">
          <MissionsPanel
            missions={missions}
            onCreate={createMission}
            onUpdate={updateMission}
            onDelete={deleteMission}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Rank Row — with add/remove points
// ---------------------------------------------------------------------------

function AdminRankRow({
  user,
  onAddPoints,
}: {
  user: { rank: number; studentId: string; name: string; avatarUrl: string; totalPoints: number; levelIconName: string; levelIconColor: string; levelName: string };
  onAddPoints: (pts: number, reason: string) => Promise<void>;
}) {
  const [showAddPts, setShowAddPts] = useState(false);
  const [pts, setPts] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
      <span className="w-8 text-center text-sm font-bold text-muted-foreground">
        #{user.rank}
      </span>
      <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-muted">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-primary/20 text-primary text-xs font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.name}</p>
        <LevelBadge iconName={user.levelIconName} iconColor={user.levelIconColor} levelName={user.levelName} />
      </div>
      <span className="text-sm font-bold text-primary">{user.totalPoints.toLocaleString()} pts</span>

      {showAddPts ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={pts}
            onChange={(e) => setPts(e.target.value)}
            placeholder="±pts"
            className="w-20 h-8 text-sm"
          />
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo"
            className="w-32 h-8 text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={async () => {
              const n = parseInt(pts);
              if (isNaN(n) || n === 0) return;
              await onAddPoints(n, reason || "Ajuste manual");
              setShowAddPts(false);
              setPts("");
              setReason("");
            }}
          >
            <Save className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowAddPts(false)}>
            ✕
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="h-8" onClick={() => setShowAddPts(true)}>
          <Pencil className="h-3 w-3 mr-1" />
          Pontos
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Points Config Panel
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  learning: { label: "Aprendizado", icon: "📚" },
  community: { label: "Comunidade", icon: "💬" },
  engagement: { label: "Engajamento", icon: "🎯" },
};

function PointsConfigPanel({
  config,
  onUpdate,
  onToggle,
  onCreate,
  onDelete,
}: {
  config: PointsConfigRow[];
  onUpdate: (id: string, patch: Partial<Pick<PointsConfigRow, "points" | "enabled" | "maxTimes" | "actionLabel" | "description" | "icon">>) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onCreate: (data: { actionType: string; actionLabel: string; points: number; category?: "learning" | "community" | "engagement"; description?: string; icon?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [newOpen, setNewOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("");
  const [newPts, setNewPts] = useState("10");
  const [newCategory, setNewCategory] = useState<"learning" | "community" | "engagement">("engagement");
  const [newDescription, setNewDescription] = useState("");

  const grouped = useMemo(() => {
    const groups: Record<string, PointsConfigRow[]> = { learning: [], community: [], engagement: [] };
    for (const item of config) {
      const cat = item.category || "engagement";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [config]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div>
            <p className="text-sm font-medium">Configurar pontos por ação</p>
            <p className="text-xs text-muted-foreground">
              Edite os pontos diretamente nos campos. Use o toggle para ativar/desativar ações.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setNewOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova ação
          </Button>
        </div>

        {/* Grouped actions */}
        {Object.entries(grouped).map(([cat, items]) => {
          if (items.length === 0) return null;
          const catInfo = CATEGORY_LABELS[cat] ?? { label: cat, icon: "⭐" };
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 px-5 py-2.5 bg-muted/30 border-y border-border/20">
                <span className="text-base">{catInfo.icon}</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {catInfo.label}
                </span>
                <span className="text-[10px] text-muted-foreground/60 ml-1">
                  ({items.length})
                </span>
              </div>
              <div className="divide-y divide-border/10">
                {items.map((item) => (
                  <PointsRow
                    key={item.id}
                    item={item}
                    onUpdate={onUpdate}
                    onToggle={onToggle}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {config.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma ação configurada. Clique em "Nova ação" para começar.
          </div>
        )}
      </Card>

      {/* New action dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova ação de pontos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome da ação</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ex: Responder enquete" />
            </div>
            <div>
              <Label>Identificador (único)</Label>
              <Input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="Ex: answer_poll" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as typeof newCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="learning">📚 Aprendizado</SelectItem>
                  <SelectItem value="community">💬 Comunidade</SelectItem>
                  <SelectItem value="engagement">🎯 Engajamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Ex: Ao responder uma enquete" />
            </div>
            <div>
              <Label>Pontos</Label>
              <Input type="number" value={newPts} onChange={(e) => setNewPts(e.target.value)} />
            </div>
            <Button
              className="w-full"
              onClick={async () => {
                if (!newLabel.trim() || !newType.trim()) return;
                await onCreate({
                  actionType: newType.trim(),
                  actionLabel: newLabel.trim(),
                  points: parseInt(newPts) || 10,
                  category: newCategory,
                  description: newDescription.trim(),
                });
                toast.success("Ação criada!");
                setNewOpen(false);
                setNewLabel("");
                setNewType("");
                setNewPts("10");
                setNewDescription("");
              }}
            >
              Criar ação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PointsRow({
  item,
  onUpdate,
  onToggle,
  onDelete,
}: {
  item: PointsConfigRow;
  onUpdate: (id: string, patch: Partial<Pick<PointsConfigRow, "points">>) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [localPts, setLocalPts] = useState(String(item.points));
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync local state when item.points changes from outside
  useEffect(() => {
    setLocalPts(String(item.points));
  }, [item.points]);

  const handlePointsChange = useCallback(
    (value: string) => {
      setLocalPts(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const pts = parseInt(value);
        if (!isNaN(pts) && pts !== item.points) {
          onUpdate(item.id, { points: pts });
          toast.success("Pontos atualizados");
        }
      }, 800);
    },
    [item.id, item.points, onUpdate]
  );

  return (
    <div className={cn(
      "flex items-center gap-4 px-5 py-3.5 transition-colors group",
      item.enabled ? "hover:bg-muted/20" : "opacity-50"
    )}>
      <span className="text-xl w-8 text-center shrink-0">{item.icon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{item.actionLabel}</span>
          {item.isSystem && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
              Padrão
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {item.description || item.actionType}
          {item.maxTimes ? ` · máx ${item.maxTimes}x/dia` : " · sem limite/dia"}
        </p>
      </div>

      {/* Inline points editor */}
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="number"
          value={localPts}
          onChange={(e) => handlePointsChange(e.target.value)}
          className="w-16 text-center text-sm font-bold bg-muted border border-border/40 rounded-md px-2 py-1.5 focus:border-primary/60 outline-none transition-colors"
          min={0}
          max={9999}
        />
        <span className="text-xs text-muted-foreground">pts</span>
      </div>

      {/* Toggle */}
      <Switch
        checked={item.enabled}
        onCheckedChange={() => {
          onToggle(item.id);
          toast.success(item.enabled ? "Ação desativada" : "Ação ativada");
        }}
      />

      {/* Delete (custom only) */}
      {!item.isSystem && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
          onClick={() => {
            onDelete(item.id);
            toast.success("Ação removida.");
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Levels Panel
// ---------------------------------------------------------------------------

function LevelsPanel({
  levels,
  onUpdate,
  onCreate,
  onDelete,
}: {
  levels: LevelRow[];
  onUpdate: (id: string, patch: Partial<Omit<LevelRow, "id">>) => Promise<void>;
  onCreate: (data: { name: string; pointsRequired: number; iconName: string; iconColor: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPts, setNewPts] = useState("100");
  const [newIcon, setNewIcon] = useState("⭐");
  const [newColor, setNewColor] = useState("#00C2CB");

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Níveis ({levels.length}/10)</CardTitle>
        {levels.length < 10 && (
          <Button size="sm" variant="outline" onClick={() => setNewOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Novo nível
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {levels.map((level) => (
            <LevelEditRow key={level.id} level={level} onUpdate={onUpdate} onDelete={onDelete} isFirst={level.levelNumber === 1} />
          ))}
        </div>
      </CardContent>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo nível</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Mestre" />
            </div>
            <div>
              <Label>Pontos necessários</Label>
              <Input type="number" value={newPts} onChange={(e) => setNewPts(e.target.value)} />
            </div>
            <div>
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {EMOJI_OPTIONS.map((e) => (
                  <button key={e} onClick={() => setNewIcon(e)} className={cn("text-xl p-1.5 rounded-lg border transition-all", newIcon === e ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted")}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {COLOR_OPTIONS.map((c) => (
                  <button key={c} onClick={() => setNewColor(c)} className={cn("h-8 w-8 rounded-full border-2 transition-all", newColor === c ? "border-foreground scale-110" : "border-transparent")} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={async () => {
                if (!newName.trim()) return;
                await onCreate({ name: newName.trim(), pointsRequired: parseInt(newPts) || 100, iconName: newIcon, iconColor: newColor });
                toast.success("Nível criado!");
                setNewOpen(false);
                setNewName("");
              }}
            >
              Criar nível
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function LevelEditRow({
  level,
  onUpdate,
  onDelete,
  isFirst,
}: {
  level: LevelRow;
  onUpdate: (id: string, patch: Partial<Omit<LevelRow, "id">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isFirst: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(level.name);
  const [pts, setPts] = useState(String(level.pointsRequired));
  const [icon, setIcon] = useState(level.iconName);
  const [color, setColor] = useState(level.iconColor);

  return (
    <div className="px-6 py-3 hover:bg-muted/30 transition-colors group">
      <div className="flex items-center gap-3">
        <span className="w-6 text-center text-xs font-bold text-muted-foreground">
          {level.levelNumber}
        </span>
        <LevelBadge iconName={level.iconName} iconColor={level.iconColor} levelName={level.name} size="md" />
        <span className="text-sm text-muted-foreground flex-1">
          {level.pointsRequired} pts
        </span>
        <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing(!editing)}>
          <Pencil className="h-3 w-3" />
        </Button>
        {!isFirst && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={() => {
              onDelete(level.id);
              toast.success("Nível removido.");
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>
      {editing && (
        <div className="mt-3 space-y-3 pl-9">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Pontos</Label>
              <Input type="number" value={pts} onChange={(e) => setPts(e.target.value)} className="h-8 text-sm" disabled={isFirst} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Ícone</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {EMOJI_OPTIONS.map((e) => (
                <button key={e} onClick={() => setIcon(e)} className={cn("text-lg p-1 rounded border transition-all", icon === e ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted")}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Cor</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={cn("h-6 w-6 rounded-full border-2 transition-all", color === c ? "border-foreground scale-110" : "border-transparent")} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <Button
            size="sm"
            onClick={async () => {
              await onUpdate(level.id, { name, pointsRequired: parseInt(pts) || 0, iconName: icon, iconColor: color });
              toast.success("Nível atualizado!");
              setEditing(false);
            }}
          >
            <Save className="h-3 w-3 mr-1" />
            Salvar
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Missions Panel (replaces old Badges/Achievements panel)
// ---------------------------------------------------------------------------

const CONDITION_LABELS: Record<MissionConditionType, string> = {
  action_count: "Realizar uma ação X vezes",
  points_total: "Acumular X pontos",
  streak_days: "Acessar X dias seguidos",
  course_complete: "Completar X cursos",
  lesson_complete: "Completar X aulas",
  manual: "Conceder manualmente",
};

const CONDITION_VALUE_LABEL: Record<MissionConditionType, string> = {
  action_count: "vezes",
  points_total: "pontos",
  streak_days: "dias",
  course_complete: "cursos",
  lesson_complete: "aulas",
  manual: "",
};

const ACTION_OPTIONS = [
  { value: "create_post", label: "Criar post" },
  { value: "comment", label: "Criar comentário" },
  { value: "like_post", label: "Curtir post" },
  { value: "post_liked", label: "Receber curtida em post" },
  { value: "like_comment", label: "Curtir comentário" },
  { value: "complete_lesson", label: "Completar aula" },
  { value: "complete_course", label: "Completar curso" },
  { value: "earn_certificate", label: "Ganhar certificado" },
  { value: "rate_lesson", label: "Avaliar aula" },
  { value: "lesson_notes", label: "Escrever nota de aula" },
  { value: "poll_answered", label: "Responder enquete" },
  { value: "daily_login", label: "Login diário" },
  { value: "profile_complete", label: "Completar perfil" },
];

function MissionFormFields({
  form,
  setForm,
  isEdit,
}: {
  form: {
    name: string;
    description: string;
    icon: string;
    conditionType: MissionConditionType;
    conditionAction: string | null;
    conditionThreshold: number;
    pointsReward: number;
    enabled: boolean;
    isSecret: boolean;
  };
  setForm: (f: typeof form) => void;
  isEdit?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Nome da missão</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Comentarista Pro" />
      </div>
      <div>
        <Label>Descrição</Label>
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Fez 50 comentários na comunidade" />
      </div>
      <div>
        <Label>Ícone</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {EMOJI_OPTIONS.map((e) => (
            <button key={e} onClick={() => setForm({ ...form, icon: e })} className={cn("text-xl p-1.5 rounded-lg border transition-all", form.icon === e ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted")}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Tipo de condição</Label>
        <Select value={form.conditionType} onValueChange={(v) => setForm({ ...form, conditionType: v as MissionConditionType })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(CONDITION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {form.conditionType === "action_count" && (
        <div>
          <Label>Ação</Label>
          <Select value={form.conditionAction ?? ""} onValueChange={(v) => setForm({ ...form, conditionAction: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {form.conditionType !== "manual" && (
        <div>
          <Label>Quantidade ({CONDITION_VALUE_LABEL[form.conditionType]})</Label>
          <Input type="number" value={String(form.conditionThreshold)} onChange={(e) => setForm({ ...form, conditionThreshold: parseInt(e.target.value) || 1 })} min={1} />
        </div>
      )}
      <div>
        <Label>Pontos de recompensa</Label>
        <Input type="number" value={String(form.pointsReward)} onChange={(e) => setForm({ ...form, pointsReward: parseInt(e.target.value) || 0 })} min={0} />
        <p className="text-[10px] text-muted-foreground mt-1">Pontos extras ao completar a missão (0 = sem recompensa)</p>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={form.isSecret}
            onCheckedChange={(v) => setForm({ ...form, isSecret: v })}
          />
          <Label className="text-sm">Missão secreta</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={form.enabled}
            onCheckedChange={(v) => setForm({ ...form, enabled: v })}
          />
          <Label className="text-sm">Ativa</Label>
        </div>
      </div>
    </div>
  );
}

function MissionsPanel({
  missions,
  onCreate,
  onUpdate,
  onDelete,
}: {
  missions: MissionRow[];
  onCreate: (data: Omit<MissionRow, "id">) => Promise<void>;
  onUpdate: (id: string, patch: Partial<MissionRow>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const emptyForm = {
    name: "",
    description: "",
    icon: "🎯",
    conditionType: "action_count" as MissionConditionType,
    conditionAction: "create_post" as string | null,
    conditionThreshold: 10,
    pointsReward: 0,
    enabled: true,
    isSecret: false,
  };

  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  function openEdit(m: MissionRow) {
    setEditId(m.id);
    setEditForm({
      name: m.name,
      description: m.description,
      icon: m.icon,
      conditionType: m.conditionType,
      conditionAction: m.conditionAction,
      conditionThreshold: m.conditionThreshold,
      pointsReward: m.pointsReward,
      enabled: m.enabled,
      isSecret: m.isSecret,
    });
    setEditOpen(true);
  }

  const deleteTarget = missions.find((m) => m.id === deleteConfirmId);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Missões ({missions.length})</CardTitle>
        <Button size="sm" variant="outline" onClick={() => { setForm(emptyForm); setNewOpen(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nova missão
        </Button>
      </CardHeader>
      <CardContent>
        {missions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma missão criada. Clique em "Nova missão" para começar.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {missions.map((m) => (
              <div key={m.id} className={cn(
                "rounded-xl border p-4 text-center relative group transition-colors cursor-pointer",
                m.enabled ? "border-border/50 hover:border-primary/30" : "border-border/30 opacity-50"
              )} onClick={() => openEdit(m)}>
                <div className="text-3xl mb-2">{m.icon}</div>
                <p className="text-sm font-semibold">{m.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                <Badge variant="outline" className="mt-2 text-[10px]">
                  {m.conditionType === "action_count" && `${m.conditionThreshold}x ${ACTION_OPTIONS.find(a => a.value === m.conditionAction)?.label ?? m.conditionAction}`}
                  {m.conditionType === "points_total" && `${m.conditionThreshold} pts`}
                  {m.conditionType === "streak_days" && `${m.conditionThreshold} dias`}
                  {m.conditionType === "lesson_complete" && `${m.conditionThreshold} aulas`}
                  {m.conditionType === "course_complete" && `${m.conditionThreshold} cursos`}
                  {m.conditionType === "manual" && "Manual"}
                </Badge>
                {m.pointsReward > 0 && (
                  <p className="text-[10px] text-primary mt-1">+{m.pointsReward} pts de recompensa</p>
                )}
                {m.isSecret && (
                  <p className="text-[10px] text-amber-500 mt-0.5">🔒 Missão secreta</p>
                )}
                {!m.enabled && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Desativada</p>
                )}
                {/* Hover action buttons */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title="Editar missão"
                    onClick={() => openEdit(m)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title={m.enabled ? "Desativar" : "Ativar"}
                    onClick={() => {
                      onUpdate(m.id, { enabled: !m.enabled });
                      toast.success(m.enabled ? "Missão desativada" : "Missão ativada");
                    }}
                  >
                    <Star className={cn("h-3 w-3", m.enabled ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title="Excluir missão"
                    onClick={() => setDeleteConfirmId(m.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* ---- CREATE DIALOG ---- */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Missão</DialogTitle>
          </DialogHeader>
          <MissionFormFields form={form} setForm={setForm} />
          <Button
            className="w-full"
            onClick={async () => {
              if (!form.name.trim()) return;
              try {
                await onCreate({
                  ...form,
                  conditionAction: form.conditionType === "action_count" ? form.conditionAction : null,
                  conditionThreshold: form.conditionType === "manual" ? 1 : form.conditionThreshold,
                  isDefault: false,
                  sortOrder: 0,
                });
                toast.success("Missão criada!");
                setNewOpen(false);
                setForm(emptyForm);
              } catch (err) {
                toast.error("Erro ao criar missão. Verifique as permissões.");
                console.error("createMission error:", err);
              }
            }}
          >
            Criar missão
          </Button>
        </DialogContent>
      </Dialog>

      {/* ---- EDIT DIALOG ---- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Missão</DialogTitle>
          </DialogHeader>
          <MissionFormFields form={editForm} setForm={setEditForm} isEdit />
          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1"
              onClick={async () => {
                if (!editId || !editForm.name.trim()) return;
                try {
                  await onUpdate(editId, {
                    name: editForm.name,
                    description: editForm.description,
                    icon: editForm.icon,
                    conditionType: editForm.conditionType,
                    conditionAction: editForm.conditionType === "action_count" ? editForm.conditionAction : null,
                    conditionThreshold: editForm.conditionType === "manual" ? 1 : editForm.conditionThreshold,
                    pointsReward: editForm.pointsReward,
                    enabled: editForm.enabled,
                    isSecret: editForm.isSecret,
                  });
                  toast.success("Missão atualizada!");
                  setEditOpen(false);
                } catch (err) {
                  toast.error("Erro ao atualizar missão.");
                  console.error("updateMission error:", err);
                }
              }}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Salvar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setEditOpen(false);
                if (editId) setDeleteConfirmId(editId);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- DELETE CONFIRM DIALOG ---- */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir missão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir a missão <strong>"{deleteTarget?.name}"</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={async () => {
                if (!deleteConfirmId) return;
                try {
                  await onDelete(deleteConfirmId);
                  toast.success("Missão excluída.");
                  setDeleteConfirmId(null);
                } catch (err) {
                  toast.error("Erro ao excluir missão.");
                  console.error("deleteMission error:", err);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
