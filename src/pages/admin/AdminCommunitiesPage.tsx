import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  ExternalLink,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";

import { useCommunities } from "@/hooks/useCommunities";
import { useClasses } from "@/hooks/useClasses";
import { usePosts } from "@/hooks/usePosts";
import { useSidebarConfig } from "@/hooks/useSidebarConfig";
import { isCommunityPublic } from "@/types/student";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/courses/EmptyState";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Community list tab (existing)
// ---------------------------------------------------------------------------
function CommunityListTab() {
  const { communities, updateCommunity, deleteCommunity } = useCommunities();
  const { classes } = useClasses();
  const { posts } = usePosts();

  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterClass, setFilterClass] = useState("all");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const postCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of posts) {
      if (p.status === "published") {
        map[p.communityId] = (map[p.communityId] ?? 0) + 1;
      }
    }
    return map;
  }, [posts]);

  const filtered = useMemo(() => {
    return communities.filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterClass !== "all" && !c.classIds.includes(filterClass)) return false;
      return true;
    });
  }, [communities, filterStatus, filterClass]);

  const hasFilters = filterStatus !== "all" || filterClass !== "all";

  function handleToggleStatus(id: string, current: string) {
    const next = current === "active" ? "inactive" : "active";
    updateCommunity(id, { status: next as "active" | "inactive" });
    toast.success(next === "active" ? "Comunidade ativada." : "Comunidade desativada.");
  }

  function handleDelete() {
    if (!deleteTargetId) return;
    deleteCommunity(deleteTargetId);
    toast.success("Comunidade removida.");
    setDeleteTargetId(null);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {communities.length} comunidade{communities.length !== 1 ? "s" : ""} cadastrada{communities.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" asChild>
          <Link to="/admin/comunidade/nova/edit">
            <Plus className="mr-1.5 h-4 w-4" />
            Nova comunidade
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as "all" | "active" | "inactive")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativa</SelectItem>
            <SelectItem value="inactive">Inativa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas as turmas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterStatus("all"); setFilterClass("all"); }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={hasFilters ? "Nenhuma comunidade encontrada" : "Nenhuma comunidade"}
          description={
            hasFilters
              ? "Tente ajustar os filtros."
              : "Clique em \"+ Nova comunidade\" para criar."
          }
          action={
            !hasFilters ? (
              <Button size="sm" asChild>
                <Link to="/admin/comunidade/nova/edit">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nova comunidade
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((comm) => {
            const linkedClasses = comm.classIds
              .map((id) => classes.find((c) => c.id === id))
              .filter(Boolean);

            return (
              <Card key={comm.id} className="border-border/50 hover:border-border hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {comm.name}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant={comm.status === "active" ? "default" : "secondary"}
                      >
                        {comm.status === "active" ? "Ativa" : "Inativa"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          isCommunityPublic(comm)
                            ? "border-emerald-500/30 text-emerald-600"
                            : "border-amber-500/30 text-amber-600"
                        )}
                      >
                        {isCommunityPublic(comm) ? "Publica" : "Restrita"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground line-clamp-2">
                    {comm.description}
                  </p>
                  {linkedClasses.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {linkedClasses.map((cls) => (
                        <Badge key={cls!.id} variant="outline" className="text-xs font-normal">
                          {cls!.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{postCounts[comm.id] ?? 0} posts</span>
                    <span>·</span>
                    <span>/{comm.slug}</span>
                    {comm.settings.requireApproval && (
                      <>
                        <span>·</span>
                        <span>Aprovacao</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pt-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/admin/comunidade/${comm.id}/edit`}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(comm.id, comm.status)}
                    >
                      {comm.status === "active" ? (
                        <><UserX className="mr-1 h-3.5 w-3.5 text-yellow-500" />Desativar</>
                      ) : (
                        <><UserCheck className="mr-1 h-3.5 w-3.5 text-emerald-500" />Ativar</>
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteTargetId(comm.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete dialog */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comunidade?</AlertDialogTitle>
            <AlertDialogDescription>
              A comunidade e todos os posts serao removidos. Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar organizer tab (new)
// ---------------------------------------------------------------------------
function SidebarOrganizerTab() {
  const { activeCommunities } = useCommunities();
  const { classes } = useClasses();
  const { items, updateItem, reorder, addItem, removeItem } = useSidebarConfig();

  // Communities not yet in sidebar config
  const unconfigured = useMemo(() => {
    const configuredIds = new Set(items.map((i) => i.communityId));
    return activeCommunities.filter((c) => !configuredIds.has(c.id));
  }, [items, activeCommunities]);

  function moveUp(idx: number) {
    if (idx === 0) return;
    const ids = items.map((i) => i.id);
    [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    reorder(ids);
  }

  function moveDown(idx: number) {
    if (idx === items.length - 1) return;
    const ids = items.map((i) => i.id);
    [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    reorder(ids);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Controle a ordem, ícones e visibilidade das comunidades na sidebar do aluno.
        </p>
        {unconfigured.length > 0 && (
          <Select
            value=""
            onValueChange={(communityId) => {
              addItem(communityId);
              toast.success("Comunidade adicionada à sidebar.");
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="+ Adicionar comunidade" />
            </SelectTrigger>
            <SelectContent>
              {unconfigured.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nenhum item na sidebar"
          description="Adicione comunidades para organizar a sidebar dos alunos."
        />
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const community = activeCommunities.find((c) => c.id === item.communityId);
            if (!community) return null;

            const linkedClasses = community.classIds
              .map((id) => classes.find((c) => c.id === id))
              .filter(Boolean);

            return (
              <Card
                key={item.id}
                className={cn(
                  "border-border/50 transition-all duration-200",
                  !item.visible && "opacity-60"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Reorder buttons */}
                    <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 mb-1" />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        disabled={idx === 0}
                        onClick={() => moveUp(idx)}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        disabled={idx === items.length - 1}
                        onClick={() => moveDown(idx)}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Emoji field */}
                    <div className="shrink-0 pt-1">
                      <Input
                        value={item.emoji}
                        onChange={(e) => updateItem(item.id, { emoji: e.target.value.slice(0, 4) })}
                        className="w-12 h-10 text-center text-lg p-0"
                        maxLength={4}
                        title="Emoji ou ícone"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{community.name}</span>
                        <Badge
                          variant={community.status === "active" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {community.status === "active" ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>

                      {/* Linked classes */}
                      {linkedClasses.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {linkedClasses.map((cls) => (
                            <Badge key={cls!.id} variant="outline" className="text-[10px] font-normal">
                              {cls!.name}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Sales URL (only when visible to users without access) */}
                      {item.visible && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground shrink-0">
                            <ExternalLink className="h-3 w-3 inline mr-1" />
                            URL de vendas
                          </Label>
                          <Input
                            value={item.salesPageUrl}
                            onChange={(e) => updateItem(item.id, { salesPageUrl: e.target.value })}
                            placeholder="https://exemplo.com/curso"
                            className="h-7 text-xs flex-1"
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 pt-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          "h-8 w-8",
                          item.visible ? "text-emerald-500" : "text-muted-foreground"
                        )}
                        onClick={() => updateItem(item.id, { visible: !item.visible })}
                        title={item.visible ? "Visível para alunos sem acesso" : "Oculto para alunos sem acesso"}
                      >
                        {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive"
                        onClick={() => {
                          removeItem(item.id);
                          toast.success("Item removido da sidebar.");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminCommunitiesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[{ label: "Admin", to: "/admin" }, { label: "Comunidades" }]}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquare className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Comunidades</h1>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="communities">
        <TabsList>
          <TabsTrigger value="communities">Comunidades</TabsTrigger>
          <TabsTrigger value="sidebar">Organizar Sidebar</TabsTrigger>
        </TabsList>

        <TabsContent value="communities" className="mt-4">
          <CommunityListTab />
        </TabsContent>

        <TabsContent value="sidebar" className="mt-4">
          <SidebarOrganizerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
