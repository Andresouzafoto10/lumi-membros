import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  UsersRound,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useCourses } from "@/hooks/useCourses";

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ENROLLMENT_TYPE_LABELS: Record<string, string> = {
  individual: "Curso individual",
  subscription: "Assinatura",
  unlimited: "Acesso ilimitado",
};

// ---------------------------------------------------------------------------
// Skeleton cards
// ---------------------------------------------------------------------------
function SkeletonCards() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
            <div className="flex gap-1 pt-2">
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminClassesPage() {
  const { classes, updateClass, deleteClass } = useClasses();
  const { enrollments } = useStudents();
  const { allCourses } = useCourses();

  const [filterCourse, setFilterCourse] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [loading] = useState(false);

  // Enrollment count per class (active only)
  const enrollmentCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of enrollments) {
      if (e.status === "active") {
        map[e.classId] = (map[e.classId] ?? 0) + 1;
      }
    }
    return map;
  }, [enrollments]);

  const filtered = useMemo(() => {
    return classes.filter((c) => {
      if (filterCourse !== "all" && !c.courseIds.includes(filterCourse)) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      return true;
    });
  }, [classes, filterCourse, filterStatus]);

  const hasFilters = filterCourse !== "all" || filterStatus !== "all";

  function handleToggleStatus(id: string, current: string) {
    const next = current === "active" ? "inactive" : "active";
    updateClass(id, { status: next as "active" | "inactive" });
    toast.success(next === "active" ? "Turma ativada." : "Turma desativada.");
  }

  function handleDelete() {
    if (!deleteTargetId) return;
    deleteClass(deleteTargetId);
    toast.success("Turma removida.");
    setDeleteTargetId(null);
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[{ label: "Admin", to: "/admin" }, { label: "Turmas" }]}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <UsersRound className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Turmas</h1>
            <p className="text-sm text-muted-foreground">
              {classes.length} turma{classes.length !== 1 ? "s" : ""} cadastrada{classes.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link to="/admin/turmas/nova/edit">
            <Plus className="mr-1.5 h-4 w-4" />
            Nova turma
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterCourse} onValueChange={setFilterCourse}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os cursos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cursos</SelectItem>
            {allCourses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as "all" | "active" | "inactive")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativa</SelectItem>
            <SelectItem value="inactive">Inativa</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterCourse("all"); setFilterStatus("all"); }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonCards />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title={hasFilters ? "Nenhuma turma encontrada" : "Nenhuma turma cadastrada"}
          description={
            hasFilters
              ? "Tente ajustar os filtros."
              : "Clique em \"+ Nova turma\" para criar a primeira turma."
          }
          action={
            !hasFilters ? (
              <Button size="sm" asChild>
                <Link to="/admin/turmas/nova/edit">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nova turma
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((cls) => {
            const courses = cls.courseIds
              .map((id) => allCourses.find((c) => c.id === id))
              .filter(Boolean) as typeof allCourses;
            const count = enrollmentCount[cls.id] ?? 0;

            return (
              <Card key={cls.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {cls.name}
                    </CardTitle>
                    <Badge
                      variant={cls.status === "active" ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {cls.status === "active" ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {courses.length === 0 ? (
                    <p className="text-muted-foreground italic text-xs">Nenhum curso vinculado</p>
                  ) : courses.length === 1 ? (
                    <p className="text-muted-foreground truncate">{courses[0].title}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {courses.map((c) => (
                        <Badge key={c.id} variant="outline" className="text-xs font-normal">
                          {c.title}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {ENROLLMENT_TYPE_LABELS[cls.enrollmentType] ?? cls.enrollmentType}
                    </span>
                    <span>·</span>
                    <span>
                      {count} aluno{count !== 1 ? "s" : ""}
                    </span>
                    {cls.accessDurationDays !== null && (
                      <>
                        <span>·</span>
                        <span>{cls.accessDurationDays} dias de acesso</span>
                      </>
                    )}
                    {cls.enrollmentType === "unlimited" && (
                      <>
                        <span>·</span>
                        <span>Acesso vitalício</span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1 pt-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/admin/turmas/${cls.id}/edit`}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(cls.id, cls.status)}
                    >
                      {cls.status === "active" ? (
                        <><UserX className="mr-1 h-3.5 w-3.5 text-yellow-500" />Desativar</>
                      ) : (
                        <><UserCheck className="mr-1 h-3.5 w-3.5 text-emerald-500" />Ativar</>
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteTargetId(cls.id)}
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

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir turma?</AlertDialogTitle>
            <AlertDialogDescription>
              A turma será removida permanentemente. Os alunos matriculados
              perderão o acesso vinculado a ela. Esta ação não pode ser desfeita.
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
