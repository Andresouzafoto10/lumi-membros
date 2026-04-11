import { useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Route, Lock, CheckCircle2, PlayCircle, Circle, Award } from "lucide-react";

import { useLearningPaths } from "@/hooks/useLearningPaths";
import { useCourses } from "@/hooks/useCourses";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export default function LearningPathDetailPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { paths, pathCertificates, awardPathCertificate } = useLearningPaths();
  const { allCourses } = useCourses();
  const { getCourseProgress } = useLessonProgress();

  const path = paths.find((p) => p.id === pathId);

  const courses = useMemo(() => {
    if (!path) return [];
    return path.courseIds
      .map((id) => allCourses.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => !!c);
  }, [path, allCourses]);

  // Compute progress per course
  const courseProgress = useMemo(() => {
    return courses.map((course) => {
      const lessonIds = course.modules.flatMap((m) =>
        m.lessons.filter((l) => l.isActive).map((l) => l.id)
      );
      return getCourseProgress(course.id, lessonIds);
    });
  }, [courses, getCourseProgress]);

  // Aggregate progress
  const aggregate = useMemo(() => {
    let total = 0;
    let completed = 0;
    for (const p of courseProgress) {
      total += p.total;
      completed += p.completed;
    }
    return {
      total,
      completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [courseProgress]);

  const isComplete = aggregate.percent === 100 && aggregate.total > 0;
  const earnedCert = pathCertificates.find((c) => c.pathId === pathId);

  // Auto-award certificate when path completes
  useEffect(() => {
    if (!path || !isComplete || earnedCert || !user) return;
    if (!path.certificateEnabled) return;
    awardPathCertificate(path.id, path.certificateTemplateId).catch(() => {});
  }, [path, isComplete, earnedCert, user, awardPathCertificate]);

  if (!path) {
    return (
      <div className="mx-auto max-w-4xl pt-16 px-4 text-center">
        <Route className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-lg font-medium">Trilha nao encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/trilhas")}>
          Voltar para trilhas
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-20 sm:pb-12 px-4">
      <Helmet>
        <title>{path.title}</title>
      </Helmet>

      <div className="pt-6">
        <Breadcrumb
          items={[
            { label: "Trilhas", to: "/trilhas" },
            { label: path.title },
          ]}
        />
      </div>

      {/* Header banner */}
      <div className="mt-4 rounded-xl overflow-hidden border border-border/50 mb-6">
        {path.bannerUrl ? (
          <div className="relative aspect-[3/1]">
            <img src={path.bannerUrl} alt={path.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{path.title}</h1>
              {path.description && (
                <p className="text-sm text-white/80 max-w-2xl">{path.description}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary/20 to-background p-6">
            <div className="flex items-start gap-3">
              <Route className="h-8 w-8 text-primary shrink-0" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">{path.title}</h1>
                {path.description && (
                  <p className="text-sm text-muted-foreground max-w-2xl">{path.description}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Aggregate progress */}
      <Card className="mb-6 border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Progresso geral da trilha</p>
            <span className="text-2xl font-bold text-primary">{aggregate.percent}%</span>
          </div>
          <Progress value={aggregate.percent} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground">
            {aggregate.completed} de {aggregate.total} aulas concluidas em {courses.length} cursos
          </p>

          {isComplete && (
            <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                <p className="text-sm font-semibold">Trilha concluida!</p>
              </div>
              {earnedCert && (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/meus-certificados">Ver certificado</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Courses timeline */}
      <h2 className="text-sm font-semibold mb-3">Cursos da trilha</h2>
      <div className="space-y-3">
        {courses.map((course, idx) => {
          const prog = courseProgress[idx];
          const completed = prog.percentage === 100 && prog.total > 0;
          const started = prog.completed > 0;

          // Sequential lock — locked if previous course not 100%
          const isLocked = path.sequential && idx > 0 && courseProgress[idx - 1].percentage < 100;

          return (
            <Card
              key={course.id}
              className={cn(
                "border-border/50 transition-all",
                isLocked && "opacity-60",
                completed && "border-green-500/30 bg-green-500/5"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Step number */}
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
                      completed
                        ? "bg-green-500 border-green-500 text-white"
                        : started
                          ? "bg-primary border-primary text-white"
                          : "bg-muted border-border text-muted-foreground"
                    )}
                  >
                    {completed ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                  </div>

                  {/* Thumbnail */}
                  <div className="hidden sm:block h-14 w-20 rounded-md bg-muted shrink-0 overflow-hidden">
                    {course.bannerUrl ? (
                      <img src={course.bannerUrl} alt={course.title} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    ) : (
                      <div className="h-full w-full bg-muted" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{course.title}</p>
                      {completed && <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30">Concluido</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {prog.total} aulas • {prog.percentage}% concluido
                    </p>
                    {!isLocked && started && !completed && (
                      <Progress value={prog.percentage} className="h-1 mt-2 max-w-xs" />
                    )}
                  </div>

                  {/* Action */}
                  <div className="shrink-0">
                    {isLocked ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Bloqueado</span>
                      </div>
                    ) : completed ? (
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/cursos/${course.id}`}>
                          <PlayCircle className="h-3.5 w-3.5 mr-1" />
                          Revisar
                        </Link>
                      </Button>
                    ) : started ? (
                      <Button size="sm" asChild>
                        <Link to={`/cursos/${course.id}`}>Continuar</Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/cursos/${course.id}`}>
                          <Circle className="h-3.5 w-3.5 mr-1" />
                          Comecar
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Locked message */}
                {isLocked && idx > 0 && (
                  <p className="mt-2 ml-14 text-xs text-muted-foreground">
                    Conclua "{courses[idx - 1].title}" para desbloquear
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
