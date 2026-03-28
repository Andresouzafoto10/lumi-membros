import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserX,
  Mail,
  CalendarDays,
  ShieldCheck,
  BookOpen,
  UsersRound,
  RotateCcw,
  Ban,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useCourses } from "@/hooks/useCourses";
import { useProfiles } from "@/hooks/useProfiles";
import { usePosts } from "@/hooks/usePosts";
import { useCommunities } from "@/hooks/useCommunities";
import { useRestrictions } from "@/hooks/useRestrictions";
import type { StudentStatus, StudentRole } from "@/types/student";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
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
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/courses/EmptyState";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  expired: "Expirado",
};

const STATUS_VARIANTS: Record<
  StudentStatus,
  "default" | "secondary" | "destructive"
> = {
  active: "default",
  inactive: "secondary",
  expired: "destructive",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  support: "Atendimento",
  moderator: "Moderador",
  student: "Aluno",
};

const ENROLLMENT_TYPE_LABELS: Record<string, string> = {
  individual: "Curso individual",
  subscription: "Assinatura",
  unlimited: "Acesso ilimitado",
};

const ENROLLMENT_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  expired: "destructive",
  cancelled: "outline",
};

const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  expired: "Expirada",
  cancelled: "Cancelada",
};

// Deterministic "mock progress" seeded by student + course ids
function mockProgress(studentId: string, courseId: string): number {
  let hash = 0;
  const str = studentId + courseId;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % 101; // 0–100
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminStudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { students, enrollments, updateStudent, revokeEnrollment } = useStudents();
  const { findClass } = useClasses();
  const { findCourse } = useCourses();
  const { findProfile } = useProfiles();
  const { getPostsByAuthor } = usePosts();
  const { findCommunity } = useCommunities();
  const { isRestricted, getRestriction, getRestrictionsForStudent, removeRestriction } = useRestrictions();

  const profile = findProfile(studentId);
  const studentPosts = useMemo(
    () => (studentId ? getPostsByAuthor(studentId).slice(0, 5) : []),
    [getPostsByAuthor, studentId]
  );

  const student = useMemo(
    () => (studentId ? students.find((s) => s.id === studentId) ?? null : null),
    [students, studentId]
  );

  const studentEnrollments = useMemo(
    () => enrollments.filter((e) => e.studentId === studentId),
    [enrollments, studentId]
  );

  // Role edit
  const [roleValue, setRoleValue] = useState<StudentRole>(
    student?.role ?? "student"
  );
  const [roleChanged, setRoleChanged] = useState(false);

  // Revoke enrollment
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);

  // Reset progress
  const [resetTargetCourseId, setResetTargetCourseId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Derived enrollments with class + course resolved
  // ---------------------------------------------------------------------------
  const enrichedEnrollments = useMemo(
    () =>
      studentEnrollments.map((e) => {
        const cls = findClass(e.classId);
        const courses = cls
          ? cls.courseIds.map((id) => findCourse(id)).filter(Boolean)
          : [];
        return { enrollment: e, cls, courses };
      }),
    [studentEnrollments, findClass, findCourse]
  );

  // Unique courses across all enrollments (for the progress section)
  const allEnrolledCourses = useMemo(() => {
    const seen = new Set<string>();
    const result: NonNullable<ReturnType<typeof findCourse>>[] = [];
    for (const { courses } of enrichedEnrollments) {
      for (const c of courses) {
        if (c && !seen.has(c.id)) {
          seen.add(c.id);
          result.push(c);
        }
      }
    }
    return result;
  }, [enrichedEnrollments]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  function handleSaveRole() {
    if (!student) return;
    updateStudent(student.id, { role: roleValue });
    setRoleChanged(false);
    toast.success("Perfil de acesso atualizado.");
  }

  function handleToggleStatus() {
    if (!student) return;
    const next: StudentStatus = student.status === "active" ? "inactive" : "active";
    updateStudent(student.id, { status: next });
    toast.success(next === "active" ? "Aluno ativado." : "Aluno desativado.");
  }

  function handleRevoke() {
    if (!revokeTargetId) return;
    revokeEnrollment(revokeTargetId);
    toast.success("Acesso à turma revogado.");
    setRevokeTargetId(null);
  }

  function handleResetProgress() {
    if (!resetTargetCourseId || !student) return;
    // Mock — no real progress store per student yet
    toast.success("Progresso do curso resetado.");
    setResetTargetCourseId(null);
  }

  // ---------------------------------------------------------------------------
  // Not found
  // ---------------------------------------------------------------------------
  if (!student) {
    return (
      <div className="space-y-4">
        <Breadcrumb
          items={[
            { label: "Admin", to: "/admin" },
            { label: "Alunos", to: "/admin/alunos" },
            { label: "Aluno não encontrado" },
          ]}
        />
        <EmptyState
          icon={Users}
          title="Aluno não encontrado"
          description="O aluno que você está procurando não existe ou foi removido."
          action={
            <Button asChild variant="outline">
              <Link to="/admin/alunos">Voltar para Alunos</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Admin", to: "/admin" },
          { label: "Alunos", to: "/admin/alunos" },
          { label: student.name },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden bg-primary/10">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={student.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary font-bold text-lg">
                {student.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {profile?.displayName ?? student.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {profile && (
                <span className="text-sm text-muted-foreground">
                  @{profile.username}
                </span>
              )}
              <Badge variant={STATUS_VARIANTS[student.status]}>
                {STATUS_LABELS[student.status]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {ROLE_LABELS[student.role] ?? student.role}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleStatus}
        >
          {student.status === "active" ? (
            <><UserX className="mr-1.5 h-4 w-4 text-yellow-500" />Desativar</>
          ) : (
            <><UserCheck className="mr-1.5 h-4 w-4 text-emerald-500" />Ativar</>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — info + role */}
        <div className="space-y-4">
          {/* Info card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="break-all">{student.email}</span>
              </div>
              <div className="flex items-start gap-2">
                <CalendarDays className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span>
                  Cadastrado em{" "}
                  {format(parseISO(student.createdAt), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span>{ROLE_LABELS[student.role] ?? student.role}</span>
              </div>
            </CardContent>
          </Card>

          {/* Role editor */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Perfil de acesso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="role-select">Perfil</Label>
                <Select
                  value={roleValue}
                  onValueChange={(v) => {
                    setRoleValue(v as StudentRole);
                    setRoleChanged(v !== student.role);
                  }}
                >
                  <SelectTrigger id="role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Aluno</SelectItem>
                    <SelectItem value="moderator">Moderador</SelectItem>
                    <SelectItem value="support">Atendimento</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {roleChanged && (
                <Button size="sm" onClick={handleSaveRole} className="w-full">
                  Salvar perfil
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Restrictions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Ban className="h-4 w-4 text-yellow-500" />
                Restricoes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {studentId && isRestricted(studentId) ? (
                (() => {
                  const active = getRestriction(studentId);
                  return active ? (
                    <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="destructive" className="text-xs">Restrito</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            removeRestriction(active.id);
                            toast.success("Restricao removida.");
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                      <p className="text-sm"><span className="font-medium">Motivo:</span> {active.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Inicio: {format(parseISO(active.startsAt), "dd/MM/yyyy", { locale: ptBR })}
                        {" · "}
                        Fim: {active.endsAt ? format(parseISO(active.endsAt), "dd/MM/yyyy", { locale: ptBR }) : "Permanente"}
                      </p>
                    </div>
                  ) : null;
                })()
              ) : (
                <p className="text-sm text-muted-foreground">Sem restricao ativa.</p>
              )}

              {/* History */}
              {studentId && (() => {
                const history = getRestrictionsForStudent(studentId).filter(
                  (r) => !r.active || (r.endsAt && new Date(r.endsAt) < new Date())
                );
                if (history.length === 0) return null;
                return (
                  <div className="pt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Historico</p>
                    <div className="space-y-1.5">
                      {history.map((r) => (
                        <div key={r.id} className="text-xs text-muted-foreground">
                          {format(parseISO(r.startsAt), "dd/MM/yyyy", { locale: ptBR })} — {r.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Right column — enrollments + progress */}
        <div className="space-y-4 lg:col-span-2">
          {/* Turmas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UsersRound className="h-4 w-4 text-primary" />
                Turmas vinculadas ({studentEnrollments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {enrichedEnrollments.length === 0 ? (
                <p className="px-6 pb-4 text-sm text-muted-foreground">
                  Nenhuma turma vinculada.
                </p>
              ) : (
                <div className="divide-y">
                  {enrichedEnrollments.map(({ enrollment, cls, courses }) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between gap-3 px-6 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {cls?.name ?? enrollment.classId}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {ENROLLMENT_TYPE_LABELS[enrollment.type] ?? enrollment.type}
                          </span>
                          {courses.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              · {courses.length === 1
                                  ? courses[0]!.title
                                  : `${courses.length} cursos`}
                            </span>
                          )}
                          {enrollment.expiresAt && (
                            <span className="text-xs text-muted-foreground">
                              · Expira{" "}
                              {format(parseISO(enrollment.expiresAt), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={
                            ENROLLMENT_STATUS_VARIANTS[enrollment.status] ??
                            "outline"
                          }
                          className="text-xs"
                        >
                          {ENROLLMENT_STATUS_LABELS[enrollment.status] ??
                            enrollment.status}
                        </Badge>
                        {enrollment.status === "active" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Revogar acesso"
                            onClick={() => setRevokeTargetId(enrollment.id)}
                          >
                            <Ban className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Community posts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" />
                Posts na comunidade ({studentPosts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {studentPosts.length === 0 ? (
                <p className="px-6 pb-4 text-sm text-muted-foreground">
                  Nenhum post publicado.
                </p>
              ) : (
                <div className="divide-y">
                  {studentPosts.map((post) => (
                    <div key={post.id} className="px-6 py-3">
                      {post.title && (
                        <p className="text-sm font-medium leading-snug">
                          {post.title}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {post.body}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                        <span>
                          {findCommunity(post.communityId)?.name ??
                            post.communityId}
                        </span>
                        <span>·</span>
                        <span>
                          {post.likesCount} curtida
                          {post.likesCount !== 1 ? "s" : ""}
                        </span>
                        <span>·</span>
                        <span>
                          {post.commentsCount} comentario
                          {post.commentsCount !== 1 ? "s" : ""}
                        </span>
                        <span>·</span>
                        <span>
                          {format(parseISO(post.createdAt), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-primary" />
                Progresso por curso
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {allEnrolledCourses.length === 0 ? (
                <p className="px-6 pb-4 text-sm text-muted-foreground">
                  Nenhum curso vinculado.
                </p>
              ) : (
                <div className="divide-y">
                  {allEnrolledCourses.map((course) => {
                      const totalLessons = course.modules.reduce(
                        (acc, m) => acc + m.lessons.length,
                        0
                      );
                      const pct = mockProgress(student.id, course.id);
                      const watched = Math.round((pct / 100) * totalLessons);

                      return (
                        <div key={course.id} className="px-6 py-4 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {course!.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {watched} de {totalLessons} aula
                                {totalLessons !== 1 ? "s" : ""} assistida
                                {watched !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-semibold w-10 text-right">
                                {pct}%
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Resetar progresso"
                                onClick={() =>
                                  setResetTargetCourseId(course!.id)
                                }
                              >
                                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revoke enrollment dialog */}
      <AlertDialog
        open={!!revokeTargetId}
        onOpenChange={(open) => { if (!open) setRevokeTargetId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar acesso à turma?</AlertDialogTitle>
            <AlertDialogDescription>
              O aluno perderá o acesso a esta turma. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>Revogar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset progress dialog */}
      <AlertDialog
        open={!!resetTargetCourseId}
        onOpenChange={(open) => { if (!open) setResetTargetCourseId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar progresso?</AlertDialogTitle>
            <AlertDialogDescription>
              Todo o progresso deste aluno no curso será zerado. Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetProgress}>
              Resetar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
