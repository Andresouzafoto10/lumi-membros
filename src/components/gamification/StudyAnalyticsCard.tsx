import { Clock, Flame, CheckCircle2, TrendingUp, BookOpen, Calendar } from "lucide-react";
import { useStudyAnalytics, formatDuration } from "@/hooks/useStudyAnalytics";
import { useCourses } from "@/hooks/useCourses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";

interface Props {
  /** If provided, show analytics for this student (admin view). Otherwise current user. */
  studentId?: string;
}

export function StudyAnalyticsCard({ studentId }: Props) {
  const { analytics, loading } = useStudyAnalytics(studentId);
  const { allCourses } = useCourses();

  const topCourseTitle = useMemo(() => {
    if (!analytics?.topCourseByTime) return null;
    const course = allCourses.find((c) => c.id === analytics.topCourseByTime!.courseId);
    return course?.title ?? null;
  }, [analytics, allCourses]);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Estatisticas de Estudo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  const stats = [
    {
      icon: Clock,
      label: "Tempo este mes",
      value: formatDuration(analytics.monthWatchSeconds),
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Flame,
      label: "Sequencia atual",
      value: `${analytics.currentStreakDays} ${analytics.currentStreakDays === 1 ? "dia" : "dias"}`,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: CheckCircle2,
      label: "Aulas concluidas",
      value: String(analytics.lessonsCompleted),
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: BookOpen,
      label: "Cursos em andamento",
      value: String(analytics.coursesInProgress),
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Estatisticas de Estudo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-lg border border-border/40 p-3">
                <div className={`inline-flex items-center justify-center rounded-md p-1.5 mb-2 ${stat.bgColor}`}>
                  <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
                <p className="text-lg font-bold leading-none">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-border/30 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Tempo total
            </span>
            <span className="font-medium">{formatDuration(analytics.totalWatchSeconds)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> Media por dia ativo
            </span>
            <span className="font-medium">{formatDuration(analytics.avgSecondsPerDay)}</span>
          </div>
          {topCourseTitle && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="h-3 w-3" /> Curso mais estudado
              </span>
              <span className="font-medium truncate ml-2 max-w-[150px]">{topCourseTitle}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
