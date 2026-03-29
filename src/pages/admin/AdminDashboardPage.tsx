import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserX,
  UserMinus,
  GraduationCap,
  UsersRound,
  UserPlus,
  CalendarDays,
} from "lucide-react";
import { format, subDays, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useCourses } from "@/hooks/useCourses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Metric card
// ---------------------------------------------------------------------------
type MetricCardProps = {
  label: string;
  value: number;
  icon: React.ElementType;
  iconClass?: string;
  description?: string;
};

function MetricCard({ label, value, icon: Icon, iconClass, description }: MetricCardProps) {
  return (
    <Card className="border-border/50 hover:shadow-md hover:border-border transition-all duration-200">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={cn("mt-0.5 rounded-lg p-2.5", iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground leading-none mb-1.5">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------
const statusLabel: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  expired: "Expirado",
  cancelled: "Cancelado",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  inactive: "secondary",
  expired: "destructive",
  cancelled: "outline",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminDashboardPage() {
  const { students, enrollments } = useStudents();
  const { activeClasses } = useClasses();
  const { allCourses } = useCourses();

  const thirtyDaysAgo = useMemo(() => subDays(new Date(), 30), []);

  // Metrics
  const activeStudents = useMemo(
    () => students.filter((s) => s.status === "active").length,
    [students]
  );
  const inactiveStudents = useMemo(
    () => students.filter((s) => s.status === "inactive").length,
    [students]
  );
  const expiredStudents = useMemo(
    () => students.filter((s) => s.status === "expired").length,
    [students]
  );
  const recentStudents = useMemo(
    () =>
      students.filter((s) => isAfter(parseISO(s.createdAt), thirtyDaysAgo))
        .length,
    [students, thirtyDaysAgo]
  );
  const activeCourses = useMemo(
    () => allCourses.filter((c) => c.isActive).length,
    [allCourses]
  );

  // Recent activity — last 5 students registered
  const lastStudents = useMemo(
    () =>
      [...students]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5),
    [students]
  );

  // Recent activity — last 5 enrollments
  const lastEnrollments = useMemo(
    () =>
      [...enrollments]
        .sort(
          (a, b) =>
            new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()
        )
        .slice(0, 5),
    [enrollments]
  );

  // Helper to find student name by id
  const studentName = (id: string) =>
    students.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral da plataforma
          </p>
        </div>
      </div>

      {/* Metrics grid */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Métricas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Alunos ativos"
            value={activeStudents}
            icon={UserCheck}
            iconClass="text-emerald-500 bg-emerald-500/10"
          />
          <MetricCard
            label="Alunos inativos"
            value={inactiveStudents}
            icon={UserMinus}
            iconClass="text-yellow-500 bg-yellow-500/10"
          />
          <MetricCard
            label="Alunos expirados"
            value={expiredStudents}
            icon={UserX}
            iconClass="text-destructive bg-destructive/10"
          />
          <MetricCard
            label="Cursos ativos"
            value={activeCourses}
            icon={GraduationCap}
            iconClass="text-primary bg-primary/10"
          />
          <MetricCard
            label="Turmas ativas"
            value={activeClasses.length}
            icon={UsersRound}
            iconClass="text-blue-500 bg-blue-500/10"
          />
          <MetricCard
            label="Novos alunos (30 dias)"
            value={recentStudents}
            icon={UserPlus}
            iconClass="text-primary bg-primary/10"
            description="cadastros nos últimos 30 dias"
          />
        </div>
      </section>

      {/* Recent activity */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Last students */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Últimos alunos cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {lastStudents.length === 0 ? (
              <p className="px-6 pb-4 text-sm text-muted-foreground">
                Nenhum aluno cadastrado ainda.
              </p>
            ) : (
              lastStudents.map((student) => (
                <Link
                  key={student.id}
                  to={`/admin/alunos/${student.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{student.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {student.email}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-2 shrink-0">
                    <Badge variant={statusVariant[student.status] ?? "outline"} className="text-xs">
                      {statusLabel[student.status] ?? student.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      <CalendarDays className="h-3 w-3 inline mr-1" />
                      {format(parseISO(student.createdAt), "dd/MM/yy", { locale: ptBR })}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Last enrollments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersRound className="h-4 w-4 text-primary" />
              Últimas matrículas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {lastEnrollments.length === 0 ? (
              <p className="px-6 pb-4 text-sm text-muted-foreground">
                Nenhuma matrícula registrada ainda.
              </p>
            ) : (
              lastEnrollments.map((enrollment) => (
                <Link
                  key={enrollment.id}
                  to={`/admin/alunos/${enrollment.studentId}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {studentName(enrollment.studentId)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Turma: {enrollment.classId}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-2 shrink-0">
                    <Badge variant={statusVariant[enrollment.status] ?? "outline"} className="text-xs">
                      {statusLabel[enrollment.status] ?? enrollment.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      <CalendarDays className="h-3 w-3 inline mr-1" />
                      {format(parseISO(enrollment.enrolledAt), "dd/MM/yy", { locale: ptBR })}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
