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
} from "lucide-react";
import { toast } from "sonner";

import { useCommunities } from "@/hooks/useCommunities";
import { useClasses } from "@/hooks/useClasses";
import { usePosts } from "@/hooks/usePosts";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function AdminCommunitiesPage() {
  const { communities, updateCommunity, deleteCommunity } = useCommunities();
  const { classes } = useClasses();
  const { posts } = usePosts();

  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterClass, setFilterClass] = useState("all");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Post count per community
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
    <div className="space-y-6">
      <Breadcrumb
        items={[{ label: "Admin", to: "/admin" }, { label: "Comunidades" }]}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Comunidades</h1>
            <p className="text-sm text-muted-foreground">
              {communities.length} comunidade{communities.length !== 1 ? "s" : ""} cadastrada{communities.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
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
              <Card key={comm.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {comm.name}
                    </CardTitle>
                    <Badge
                      variant={comm.status === "active" ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {comm.status === "active" ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground line-clamp-2">
                    {comm.description}
                  </p>

                  {/* Linked classes */}
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
