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
  Award,
  KeyRound,
  VolumeX,
  Plus,
  Minus,
  Trophy,
  X,
  ShieldBan,
  Clock,
  Bell,
  Pencil,
  Check,
  GraduationCap,
  CalendarClock,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useStudents } from "@/hooks/useStudents";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useClasses } from "@/hooks/useClasses";
import { useCourses } from "@/hooks/useCourses";
import { useProfiles } from "@/hooks/useProfiles";
import { usePosts } from "@/hooks/usePosts";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import { useCommunities } from "@/hooks/useCommunities";
import { useRestrictions } from "@/hooks/useRestrictions";
import { useCertificates } from "@/hooks/useCertificates";
import { useStudentProgress } from "@/hooks/useLessonProgress";
import { useGamification } from "@/hooks/useGamification";
import { useInviteLinks } from "@/hooks/useInviteLinks";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { StudentStatus, StudentRole } from "@/types/student";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import { StudyAnalyticsCard } from "@/components/gamification/StudyAnalyticsCard";

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
  owner: "Proprietario",
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

// ---------------------------------------------------------------------------
// Notification Preferences Card (admin view)
// ---------------------------------------------------------------------------

const ADMIN_PREF_ROWS: { label: string; emailField?: string; notifField?: string }[] = [
  { label: "Comentarios", emailField: "email_comments", notifField: "notif_comments" },
  { label: "Respostas a comentarios", emailField: "email_comment_replies", notifField: "notif_comment_replies" },
  { label: "Mencoes", emailField: "email_mentions", notifField: "notif_mentions" },
  { label: "Curtidas", emailField: "email_likes", notifField: "notif_likes" },
  { label: "Seguidores", emailField: "email_follows", notifField: "notif_follows" },
  { label: "Novo curso", emailField: "email_new_course", notifField: "notif_new_course" },
  { label: "Nova aula", emailField: "email_new_lesson", notifField: "notif_new_lesson" },
  { label: "Certificado", emailField: "email_certificate", notifField: "notif_certificate" },
  { label: "Missao concluida", emailField: "email_mission_complete", notifField: "notif_mission_complete" },
  { label: "Badge", emailField: "email_badge_earned", notifField: "notif_badge_earned" },
  { label: "Resposta no post", emailField: "email_post_reply", notifField: "notif_post_reply" },
  { label: "Resumo semanal", emailField: "email_weekly_digest" },
  { label: "Marco seguidores", emailField: "email_follower_milestone" },
];

function AdminNotificationPrefsCard({ userId }: { userId: string }) {
  const { preferences, isLoading, updatePreference, emailActiveCount, emailTotalCount, notifActiveCount, notifTotalCount } =
    useNotificationPreferences(userId);

  if (isLoading || !preferences) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-blue-400" />
            Preferencias de Notificacao
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 animate-pulse bg-muted/30 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-blue-400" />
            Preferencias de Notificacao
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[10px]">Email: {emailActiveCount}/{emailTotalCount}</Badge>
            <Badge variant="outline" className="text-[10px]">Plataforma: {notifActiveCount}/{notifTotalCount}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-[1fr_60px_60px] gap-1 px-6 pb-1">
          <span className="text-[10px] text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground text-center">Email</span>
          <span className="text-[10px] text-muted-foreground text-center">App</span>
        </div>
        <div className="divide-y px-6 pb-4">
          {ADMIN_PREF_ROWS.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_60px_60px] gap-1 items-center py-1.5">
              <span className="text-xs">{row.label}</span>
              <div className="flex justify-center">
                {row.emailField ? (
                  <Checkbox
                    checked={preferences[row.emailField as keyof typeof preferences] as boolean}
                    onCheckedChange={(v) => { updatePreference.mutate({ field: row.emailField!, value: !!v }); toast.success("Preferencia atualizada"); }}
                  />
                ) : <span className="text-muted-foreground/30 text-xs">—</span>}
              </div>
              <div className="flex justify-center">
                {row.notifField ? (
                  <Checkbox
                    checked={preferences[row.notifField as keyof typeof preferences] as boolean}
                    onCheckedChange={(v) => { updatePreference.mutate({ field: row.notifField!, value: !!v }); toast.success("Preferencia atualizada"); }}
                  />
                ) : <span className="text-muted-foreground/30 text-xs">—</span>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminStudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { students, enrollments, updateStudent, revokeEnrollment, addEnrollment, updateEnrollment } =
    useStudents();
  const { classes, findClass } = useClasses();
  const { findCourse, allCourses } = useCourses();
  const { findProfile } = useProfiles();
  const { getProgressForCourse } = useStudentProgress(studentId);
  const { getPostsByAuthor } = usePosts();
  const { findCommunity } = useCommunities();
  const {
    isRestricted,
    getRestriction,
    getRestrictionsForStudent,
    addRestriction,
    removeRestriction,
  } = useRestrictions();
  const { getEarnedCertificates, getTemplateById } = useCertificates();
  const { getPlayerData, getPlayerMissions, missions, awardPoints, grantMission, revokeMission } =
    useGamification();
  const { user: adminUser, resetPassword } = useAuth();
  const { inviteLinks } = useInviteLinks();

  // -- Derived data --
  const student = useMemo(
    () => (studentId ? students.find((s) => s.id === studentId) ?? null : null),
    [students, studentId]
  );

  const profile = findProfile(studentId);

  const studentEnrollments = useMemo(
    () => enrollments.filter((e) => e.studentId === studentId),
    [enrollments, studentId]
  );

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

  const studentCerts = useMemo(
    () => (studentId ? getEarnedCertificates(studentId) : []),
    [getEarnedCertificates, studentId]
  );

  const studentPosts = useMemo(
    () => (studentId ? getPostsByAuthor(studentId).slice(0, 5) : []),
    [getPostsByAuthor, studentId]
  );

  const playerData = studentId ? getPlayerData(studentId) : null;
  const completedMissions = studentId ? getPlayerMissions(studentId) : [];

  // Classes the student is NOT enrolled in (for add turma dropdown)
  const enrolledClassIds = useMemo(
    () => new Set(studentEnrollments.filter((e) => e.status === "active").map((e) => e.classId)),
    [studentEnrollments]
  );
  const availableClasses = useMemo(
    () => classes.filter((c) => c.status === "active" && !enrolledClassIds.has(c.id)),
    [classes, enrolledClassIds]
  );

  // Missions the student does NOT have yet
  const unownedMissions = useMemo(
    () => missions.filter((m) => !completedMissions.some((cm) => cm.id === m.id)),
    [missions, completedMissions]
  );

  // -- State --
  const [roleValue, setRoleValue] = useState<StudentRole>(student?.role ?? "student");
  const [roleChanged, setRoleChanged] = useState(false);
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);
  const [resetTargetCourseId, setResetTargetCourseId] = useState<string | null>(null);

  // Add turma
  const [addClassId, setAddClassId] = useState("");

  // Edit enrollment expiration
  const [editingEnrollmentId, setEditingEnrollmentId] = useState<string | null>(null);
  const [editExpiresAt, setEditExpiresAt] = useState("");

  // Gamification
  const [pointsInput, setPointsInput] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const [grantMissionId, setGrantMissionId] = useState("");

  // Restriction inline
  const [showAddRestriction, setShowAddRestriction] = useState(false);
  const [restrictionReason, setRestrictionReason] = useState("");
  const [restrictionDays, setRestrictionDays] = useState("");

  // Loading states
  const [resetPwLoading, setResetPwLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

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
    toast.success("Acesso a turma revogado.");
    setRevokeTargetId(null);
  }

  async function handleResetProgress() {
    if (!resetTargetCourseId || !student) return;
    try {
      await supabase
        .from("lesson_progress")
        .delete()
        .eq("student_id", student.id)
        .eq("course_id", resetTargetCourseId);
    } catch {
      // ignore
    }
    toast.success("Progresso do curso resetado.");
    setResetTargetCourseId(null);
  }

  // SUPERPOWER 1: Reset password
  async function handleResetPassword() {
    if (!student) return;
    setResetPwLoading(true);
    try {
      const { error } = await resetPassword(student.email);
      if (error) {
        toast.error(error);
      } else {
        toast.success(`Email de redefinicao enviado para ${student.email}`);
      }
    } catch {
      toast.error("Erro ao enviar email de redefinicao.");
    }
    setResetPwLoading(false);
  }

  // SUPERPOWER 3: Add class enrollment
  async function handleAddClass() {
    if (!addClassId || !studentId) return;
    const cls = findClass(addClassId);
    const enrollType = cls?.enrollmentType ?? "individual";
    let expiresAt: string | null = null;
    if (cls?.accessDurationDays) {
      const d = new Date();
      d.setDate(d.getDate() + cls.accessDurationDays);
      expiresAt = d.toISOString();
    }
    try {
      await addEnrollment({
        studentId,
        classId: addClassId,
        type: enrollType,
        expiresAt,
        status: "active",
      });
      toast.success("Turma vinculada com sucesso.");
      setAddClassId("");
    } catch {
      toast.error("Erro ao vincular turma.");
    }
  }

  // SUPERPOWER 4: Manual points
  async function handleAwardPoints(positive: boolean) {
    if (!studentId || !pointsInput) return;
    const pts = parseInt(pointsInput, 10);
    if (isNaN(pts) || pts <= 0) {
      toast.error("Informe um numero valido de pontos.");
      return;
    }
    const actualPts = positive ? pts : -pts;
    const reason = pointsReason.trim() || (positive ? "Ajuste manual (admin)" : "Deducao manual (admin)");
    try {
      await awardPoints(studentId, actualPts, reason);
      toast.success(`${positive ? "+" : "-"}${pts} pontos aplicados.`);
      setPointsInput("");
      setPointsReason("");
    } catch {
      toast.error("Erro ao ajustar pontos.");
    }
  }

  // SUPERPOWER 5: Block access
  async function handleBlockAccess() {
    if (!student) return;
    setBlockLoading(true);
    const newStatus: StudentStatus = student.status === "inactive" ? "active" : "inactive";
    try {
      await updateStudent(student.id, { status: newStatus });
      toast.success(newStatus === "inactive" ? "Acesso bloqueado." : "Acesso liberado.");
    } catch {
      toast.error("Erro ao alterar status.");
    }
    setBlockLoading(false);
  }

  // Grant mission manually
  async function handleGrantMission() {
    if (!studentId || !grantMissionId) return;
    try {
      await grantMission(studentId, grantMissionId);
      toast.success("Missão concedida manualmente.");
      setGrantMissionId("");
    } catch {
      toast.error("Erro ao conceder missão.");
    }
  }

  // SUPERPOWER 8: Add restriction inline
  async function handleAddRestriction() {
    if (!studentId || !restrictionReason.trim()) {
      toast.error("Informe o motivo da restricao.");
      return;
    }
    try {
      await addRestriction({
        studentId,
        reason: restrictionReason.trim(),
        appliedBy: adminUser?.id ?? "admin",
        durationDays: restrictionDays ? parseInt(restrictionDays, 10) : null,
      });
      toast.success("Restricao aplicada.");
      setRestrictionReason("");
      setRestrictionDays("");
      setShowAddRestriction(false);
    } catch {
      toast.error("Erro ao aplicar restricao.");
    }
  }

  // SUPERPOWER 8: Silence in community
  async function handleToggleSilence() {
    if (!student) return;
    // We use a restriction with reason "Silenciado na comunidade" as a convention
    const silenceRestriction = getRestrictionsForStudent(student.id).find(
      (r) => r.active && r.reason === "Silenciado na comunidade"
    );
    if (silenceRestriction) {
      await removeRestriction(silenceRestriction.id);
      toast.success("Silenciamento removido.");
    } else {
      await addRestriction({
        studentId: student.id,
        reason: "Silenciado na comunidade",
        appliedBy: adminUser?.id ?? "admin",
        durationDays: null,
      });
      toast.success("Aluno silenciado na comunidade.");
    }
  }

  // Check if currently silenced
  const isSilenced = useMemo(() => {
    if (!studentId) return false;
    return getRestrictionsForStudent(studentId).some(
      (r) => r.active && r.reason === "Silenciado na comunidade" && (!r.endsAt || new Date(r.endsAt) > new Date())
    );
  }, [studentId, getRestrictionsForStudent]);

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
            { label: "Aluno nao encontrado" },
          ]}
        />
        <EmptyState
          icon={Users}
          title="Aluno nao encontrado"
          description="O aluno que voce esta procurando nao existe ou foi removido."
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

      {/* ================================================================= */}
      {/* HEADER — Avatar grande + info + action bar                        */}
      {/* ================================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 rounded-full overflow-hidden bg-primary/10 ring-2 ring-primary/20 shadow-lg">
            {profile?.avatarUrl ? (
              <img
                src={getProxiedImageUrl(profile.avatarUrl)}
                alt={student.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary font-bold text-2xl">
                {student.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {profile?.displayName ?? student.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              {profile && (
                <span className="text-sm text-muted-foreground">
                  @{profile.username}
                </span>
              )}
              <Badge variant={STATUS_VARIANTS[student.status]}>
                {STATUS_LABELS[student.status]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {ROLE_LABELS[student.role] ?? student.role}
              </Badge>
              {playerData && playerData.points > 0 && (
                <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-600">
                  <Trophy className="h-3 w-3 mr-1" />
                  {playerData.points} pts
                </Badge>
              )}
              {isSilenced && (
                <Badge variant="destructive" className="text-xs">
                  <VolumeX className="h-3 w-3 mr-1" />
                  Silenciado
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Quick action bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetPassword}
            disabled={resetPwLoading}
          >
            <KeyRound className="mr-1.5 h-4 w-4" />
            {resetPwLoading ? "Enviando..." : "Redefinir senha"}
          </Button>
          <Button
            variant={student.status === "active" ? "outline" : "default"}
            size="sm"
            onClick={handleBlockAccess}
            disabled={blockLoading}
          >
            {student.status === "active" ? (
              <><ShieldBan className="mr-1.5 h-4 w-4 text-destructive" />Bloquear acesso</>
            ) : (
              <><UserCheck className="mr-1.5 h-4 w-4 text-emerald-500" />Liberar acesso</>
            )}
          </Button>
          <Button
            variant={isSilenced ? "default" : "outline"}
            size="sm"
            onClick={handleToggleSilence}
          >
            <VolumeX className="mr-1.5 h-4 w-4" />
            {isSilenced ? "Remover silencio" : "Silenciar"}
          </Button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* GRID — 2-column card layout                                       */}
      {/* ================================================================= */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* ---- Card: Identidade & Acesso ---- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Identidade & Acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="break-all">{student.email}</span>
              </div>
              <div className="flex items-start gap-2">
                <CalendarDays className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span>
                  Cadastrado em{" "}
                  {format(parseISO(student.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span>{ROLE_LABELS[student.role] ?? student.role}</span>
              </div>
              <div className="flex items-start gap-2">
                <Link2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <span>
                  Origem:{" "}
                  {student.signupSource === "invite_link" ? (
                    <Badge variant="default" className="text-[10px] ml-1">
                      Link de convite
                      {student.inviteLinkId &&
                        (() => {
                          const il = inviteLinks.find((l) => l.id === student.inviteLinkId);
                          return il ? ` — ${il.name}` : "";
                        })()}
                    </Badge>
                  ) : student.signupSource === "webhook" ? (
                    <Badge variant="outline" className="text-[10px] ml-1">Webhook</Badge>
                  ) : student.signupSource === "direct" ? (
                    <Badge variant="secondary" className="text-[10px] ml-1">Cadastro direto</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
              </div>
            </div>

            <Separator />

            {/* Role editor */}
            <div className="space-y-2">
              <Label htmlFor="role-select" className="text-xs font-medium text-muted-foreground">
                Perfil de acesso
              </Label>
              <div className="flex items-center gap-2">
                <Select
                  value={roleValue}
                  onValueChange={(v) => {
                    setRoleValue(v as StudentRole);
                    setRoleChanged(v !== student.role);
                  }}
                >
                  <SelectTrigger id="role-select" className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Aluno</SelectItem>
                    <SelectItem value="moderator">Moderador</SelectItem>
                    <SelectItem value="support">Atendimento</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                {roleChanged && (
                  <Button size="sm" onClick={handleSaveRole}>
                    Salvar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ---- Card: Turmas Vinculadas ---- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersRound className="h-4 w-4 text-primary" />
              Turmas vinculadas ({studentEnrollments.filter((e) => e.status === "active").length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Add turma inline */}
            {availableClasses.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={addClassId} onValueChange={setAddClassId}>
                  <SelectTrigger className="flex-1 text-sm">
                    <SelectValue placeholder="Vincular turma..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        <span className="text-muted-foreground ml-1">
                          ({ENROLLMENT_TYPE_LABELS[c.enrollmentType] ?? c.enrollmentType}
                          {c.accessDurationDays ? ` · ${c.accessDurationDays} dias` : " · Ilimitado"})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleAddClass}
                  disabled={!addClassId}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Vincular
                </Button>
              </div>
            )}

            {enrichedEnrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma turma vinculada.</p>
            ) : (
              <div className="divide-y -mx-6">
                {enrichedEnrollments.map(({ enrollment, cls, courses }) => {
                  const isEditing = editingEnrollmentId === enrollment.id;
                  const isActive = enrollment.status === "active";
                  const durationLabel = cls?.accessDurationDays
                    ? `${cls.accessDurationDays} dias`
                    : "Ilimitado";

                  return (
                    <div key={enrollment.id} className="px-6 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {cls?.name ?? enrollment.classId}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {ENROLLMENT_TYPE_LABELS[enrollment.type] ?? enrollment.type}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              · Duracao: {durationLabel}
                            </span>
                            {courses.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                · {courses.length} {courses.length === 1 ? "curso" : "cursos"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant={ENROLLMENT_STATUS_VARIANTS[enrollment.status] ?? "outline"}
                            className="text-xs"
                          >
                            {ENROLLMENT_STATUS_LABELS[enrollment.status] ?? enrollment.status}
                          </Badge>
                          {isActive && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Editar acesso"
                                className="h-7 w-7"
                                onClick={() => {
                                  if (isEditing) {
                                    setEditingEnrollmentId(null);
                                  } else {
                                    setEditingEnrollmentId(enrollment.id);
                                    setEditExpiresAt(
                                      enrollment.expiresAt
                                        ? enrollment.expiresAt.slice(0, 10)
                                        : ""
                                    );
                                  }
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Revogar acesso"
                                className="h-7 w-7"
                                onClick={() => setRevokeTargetId(enrollment.id)}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expiration info */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarClock className="h-3 w-3 shrink-0" />
                        {enrollment.expiresAt ? (
                          <>
                            Acesso ate {format(parseISO(enrollment.expiresAt), "dd/MM/yyyy", { locale: ptBR })}
                            {new Date(enrollment.expiresAt) < new Date() && (
                              <Badge variant="destructive" className="text-[9px] ml-1 px-1 py-0">Expirado</Badge>
                            )}
                          </>
                        ) : (
                          <span>Acesso sem prazo de expiracao</span>
                        )}
                      </div>

                      {/* Inline expiration editor */}
                      {isEditing && (
                        <div className="flex items-center gap-2 rounded-md border border-border/60 p-2.5 bg-muted/20">
                          <Label className="text-xs shrink-0">Expiracao:</Label>
                          <Input
                            type="date"
                            value={editExpiresAt}
                            onChange={(e) => setEditExpiresAt(e.target.value)}
                            className="w-44 h-8 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => {
                              setEditExpiresAt("");
                            }}
                          >
                            Sem prazo
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            onClick={async () => {
                              try {
                                await updateEnrollment(enrollment.id, {
                                  expiresAt: editExpiresAt
                                    ? new Date(editExpiresAt + "T23:59:59").toISOString()
                                    : null,
                                });
                                toast.success("Prazo de acesso atualizado.");
                                setEditingEnrollmentId(null);
                              } catch {
                                toast.error("Erro ao atualizar prazo.");
                              }
                            }}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Salvar
                          </Button>
                        </div>
                      )}

                      {/* Course list for this enrollment */}
                      {courses.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {courses.map((c) => c && (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 rounded-md bg-muted/50 border border-border/30 px-2 py-0.5 text-[10px] text-muted-foreground"
                            >
                              <GraduationCap className="h-2.5 w-2.5" />
                              {c.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- Card: Cursos com acesso ---- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-primary" />
              Cursos com acesso
              {student && ["owner", "admin", "support"].includes(student.role) && (
                <Badge variant="outline" className="text-[10px] ml-1">Acesso total</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {student && ["owner", "admin", "support"].includes(student.role) ? (
              <div className="px-6 pb-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Administradores tem acesso a todos os cursos da plataforma.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {allCourses.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/5 border border-primary/20 px-2 py-0.5 text-[10px]"
                    >
                      <GraduationCap className="h-2.5 w-2.5 text-primary" />
                      {c.title}
                    </span>
                  ))}
                  {allCourses.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum curso cadastrado.</p>
                  )}
                </div>
              </div>
            ) : allEnrolledCourses.length === 0 ? (
              <p className="px-6 pb-4 text-sm text-muted-foreground">
                Nenhum curso vinculado. Adicione uma turma para conceder acesso a cursos.
              </p>
            ) : (
              <div className="divide-y">
                {allEnrolledCourses.map((course) => {
                  // Find which turmas give access to this course
                  const turmasForCourse = enrichedEnrollments
                    .filter(({ enrollment, cls }) =>
                      enrollment.status === "active" && cls?.courseIds.includes(course.id)
                    )
                    .map(({ cls }) => cls?.name)
                    .filter(Boolean);

                  return (
                    <div key={course.id} className="px-6 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{course.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {course.modules.filter((m) => m.isActive).length} modulo{course.modules.filter((m) => m.isActive).length !== 1 ? "s" : ""}
                            {" · "}
                            {course.modules.filter((m) => m.isActive).flatMap((m) => m.lessons.filter((l) => l.isActive)).length} aula{course.modules.filter((m) => m.isActive).flatMap((m) => m.lessons.filter((l) => l.isActive)).length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <Badge variant="default" className="text-[10px] shrink-0">
                          Ativo
                        </Badge>
                      </div>
                      {turmasForCourse.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Via: {turmasForCourse.join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- Card: Estatisticas de Estudo ---- */}
        <StudyAnalyticsCard studentId={studentId} />

        {/* ---- Card: Gamificacao ---- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Gamificacao
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current points */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{playerData?.points ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pontos acumulados</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{completedMissions.length} / {missions.length}</p>
                <p className="text-xs text-muted-foreground">Missões concluídas</p>
              </div>
            </div>

            {/* Completed missions */}
            {completedMissions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {completedMissions.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs"
                  >
                    <span>{m.icon}</span>
                    <span>{m.name}</span>
                    <button
                      className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                      title="Revogar missão"
                      onClick={async () => {
                        if (!studentId) return;
                        await revokeMission(studentId, m.id);
                        toast.success(`Missão "${m.name}" revogada.`);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Manual points */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Ajustar pontos manualmente
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  placeholder="Pontos"
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  className="w-24"
                />
                <Input
                  placeholder="Motivo (opcional)"
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="outline"
                  title="Adicionar pontos"
                  className="shrink-0"
                  disabled={!pointsInput}
                  onClick={() => handleAwardPoints(true)}
                >
                  <Plus className="h-4 w-4 text-emerald-500" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  title="Remover pontos"
                  className="shrink-0"
                  disabled={!pointsInput}
                  onClick={() => handleAwardPoints(false)}
                >
                  <Minus className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Grant mission */}
            {unownedMissions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Conceder missão manualmente
                </Label>
                <div className="flex items-center gap-2">
                  <Select value={grantMissionId} onValueChange={setGrantMissionId}>
                    <SelectTrigger className="flex-1 text-sm">
                      <SelectValue placeholder="Selecionar missão..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unownedMissions.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.icon} {m.name} — {m.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleGrantMission}
                    disabled={!grantMissionId}
                  >
                    <Award className="h-4 w-4 mr-1" />
                    Conceder
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- Card: Moderacao & Restricoes ---- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ban className="h-4 w-4 text-yellow-500" />
              Moderacao & Restricoes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Active restriction */}
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
                    <p className="text-sm">
                      <span className="font-medium">Motivo:</span> {active.reason}
                    </p>
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

            {/* Add restriction inline */}
            {!showAddRestriction ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowAddRestriction(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar restricao
              </Button>
            ) : (
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Nova restricao</Label>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setShowAddRestriction(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Motivo da restricao..."
                  value={restrictionReason}
                  onChange={(e) => setRestrictionReason(e.target.value)}
                  rows={2}
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Dias (vazio = permanente)"
                    value={restrictionDays}
                    onChange={(e) => setRestrictionDays(e.target.value)}
                    className="w-48"
                  />
                  <Button size="sm" onClick={handleAddRestriction}>
                    Aplicar
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            {/* History */}
            {studentId && (() => {
              const history = getRestrictionsForStudent(studentId).filter(
                (r) => !r.active || (r.endsAt && new Date(r.endsAt) < new Date())
              );
              if (history.length === 0) return null;
              return (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Historico de restricoes
                  </p>
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

        {/* ---- Card: Progresso por curso (full width) ---- */}
        <Card className="lg:col-span-2">
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
                  const totalLessonIds = course.modules
                    .filter((m: { isActive: boolean }) => m.isActive)
                    .flatMap((m: { lessons: { id: string; isActive: boolean }[] }) =>
                      m.lessons.filter((l) => l.isActive).map((l) => l.id)
                    );
                  const {
                    completed: watched,
                    total: totalLessons,
                    percentage: pct,
                  } = getProgressForCourse(course.id, totalLessonIds);

                  return (
                    <div key={course.id} className="px-6 py-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{course.title}</p>
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
                            className="h-7 w-7"
                            onClick={() => setResetTargetCourseId(course.id)}
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

        {/* ---- Card: Posts na comunidade ---- */}
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
                      <p className="text-sm font-medium leading-snug">{post.title}</p>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2">{post.body}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                      <span>{findCommunity(post.communityId)?.name ?? post.communityId}</span>
                      <span>·</span>
                      <span>{post.likesCount} curtida{post.likesCount !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>{post.commentsCount} comentario{post.commentsCount !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>{format(parseISO(post.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- Card: Certificados ---- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-yellow-500" />
              Certificados ({studentCerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {studentCerts.length === 0 ? (
              <p className="px-6 pb-4 text-sm text-muted-foreground">
                Nenhum certificado emitido.
              </p>
            ) : (
              <div className="divide-y">
                {studentCerts.map((cert) => {
                  const certCourse = findCourse(cert.courseId);
                  const tpl = getTemplateById(cert.templateId);
                  return (
                    <div key={cert.id} className="px-6 py-3">
                      <p className="text-sm font-medium">
                        {certCourse?.title ?? cert.courseId}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        <span>
                          Concluido em{" "}
                          {format(parseISO(cert.earnedAt), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        {certCourse?.certificateConfig?.hoursLoad ? (
                          <>
                            <span>·</span>
                            <span>{certCourse.certificateConfig.hoursLoad}h</span>
                          </>
                        ) : null}
                        {tpl && (
                          <>
                            <span>·</span>
                            <span>Modelo: {tpl.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Card: Preferencias de Notificacao ---- */}
      {/* TODO: AdminNotificationPrefsCard */}

      {/* ================================================================= */}
      {/* DIALOGS                                                            */}
      {/* ================================================================= */}

      {/* Revoke enrollment dialog */}
      <AlertDialog
        open={!!revokeTargetId}
        onOpenChange={(open) => { if (!open) setRevokeTargetId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar acesso a turma?</AlertDialogTitle>
            <AlertDialogDescription>
              O aluno perdera o acesso a esta turma. Esta acao nao pode ser desfeita.
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
              Todo o progresso deste aluno no curso sera zerado. Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetProgress}>Resetar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
