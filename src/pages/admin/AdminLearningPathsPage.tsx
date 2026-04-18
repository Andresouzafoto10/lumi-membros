import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Route, Plus, Pencil, Trash2, Copy, BookOpen, Users } from "lucide-react";
import { toast } from "sonner";

import { useLearningPaths } from "@/hooks/useLearningPaths";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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

export default function AdminLearningPathsPage() {
  const { paths, accessRows, loading, createPath, updatePath, deletePath, setPathCourses } = useLearningPaths();
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const accessCountMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of accessRows) {
      m[a.pathId] = (m[a.pathId] ?? 0) + 1;
    }
    return m;
  }, [accessRows]);

  const handleCreate = async () => {
    try {
      const id = await createPath({
        title: "Nova trilha",
        sequential: true,
      });
      navigate(`/admin/trilhas/${id}/edit`);
    } catch {
      toast.error("Erro ao criar trilha");
    }
  };

  const handleDuplicate = async (pathId: string) => {
    const original = paths.find((p) => p.id === pathId);
    if (!original) return;
    try {
      const newId = await createPath({
        title: `${original.title} (cópia)`,
        description: original.description ?? undefined,
        bannerUrl: original.bannerUrl ?? undefined,
        sequential: original.sequential,
      });
      if (original.courseIds.length > 0) {
        await setPathCourses(newId, original.courseIds);
      }
      toast.success("Trilha duplicada");
    } catch {
      toast.error("Erro ao duplicar");
    }
  };

  const handleToggleActive = async (pathId: string, isActive: boolean) => {
    try {
      await updatePath(pathId, { isActive: !isActive });
      toast.success(isActive ? "Trilha desativada" : "Trilha ativada");
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePath(deleteId);
      toast.success("Trilha removida");
    } catch {
      toast.error("Erro ao remover");
    }
    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <Breadcrumb items={[{ label: "Trilhas" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            Trilhas de Aprendizado
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sequencias de cursos vendidas como pacote ou liberadas para turmas/alunos
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Nova Trilha
        </Button>
      </div>

      {paths.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Route className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma trilha criada ainda. Clique em "Nova Trilha" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paths.map((path) => (
            <Card key={path.id} className="border-border/50 hover:border-border transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {path.bannerUrl ? (
                    <img
                      src={getProxiedImageUrl(path.bannerUrl)}
                      alt={path.title}
                      loading="lazy"
                      className="h-16 w-24 rounded-md object-cover shrink-0"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="h-16 w-24 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Route className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium">{path.title}</p>
                      <Badge variant={path.isActive ? "default" : "outline"} className="text-[10px]">
                        {path.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                      {path.sequential && (
                        <Badge variant="outline" className="text-[10px]">Sequencial</Badge>
                      )}
                    </div>
                    {path.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{path.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {path.courseIds.length} cursos
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {accessCountMap[path.id] ?? 0} acessos
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={path.isActive}
                      onCheckedChange={() => handleToggleActive(path.id, path.isActive)}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                      <Link to={`/admin/trilhas/${path.id}/edit`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDuplicate(path.id)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(path.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover trilha?</AlertDialogTitle>
            <AlertDialogDescription>
              Os alunos perderão acesso a esta trilha. Os cursos individuais não são afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
