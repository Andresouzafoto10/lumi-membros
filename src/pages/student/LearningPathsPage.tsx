import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Route, Award, BookOpen } from "lucide-react";

import { useLearningPaths } from "@/hooks/useLearningPaths";
import { useCourses } from "@/hooks/useCourses";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { EmptyState } from "@/components/courses/EmptyState";

// Fetch student's enrollments to derive class IDs
function useStudentClassIds() {
  const { user } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["my-enrollments-classes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("class_id, status")
        .eq("student_id", user.id)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []).map((e) => e.class_id as string);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
  return data;
}

export default function LearningPathsPage() {
  const { user, isAdmin } = useAuth();
  const { paths, hasAccessViaClass, hasDirectAccess, pathCertificates } = useLearningPaths();
  const { allCourses } = useCourses();
  const { getCourseProgress } = useLessonProgress();
  const studentClassIds = useStudentClassIds();

  const myPaths = useMemo(() => {
    if (!user) return [];
    return paths.filter((p) => {
      if (!p.isActive) return false;
      if (isAdmin) return true;
      return hasDirectAccess(p.id, user.id) || hasAccessViaClass(p.id, studentClassIds);
    });
  }, [user, isAdmin, paths, hasDirectAccess, hasAccessViaClass, studentClassIds]);

  const courseMap = useMemo(() => {
    const m = new Map(allCourses.map((c) => [c.id, c]));
    return m;
  }, [allCourses]);

  return (
    <div className="mx-auto max-w-6xl pb-20 sm:pb-12 px-4">
      <Helmet>
        <title>Trilhas</title>
      </Helmet>

      <div className="flex items-center gap-3 pt-6 pb-4">
        <Route className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trilhas de Aprendizado</h1>
          <p className="text-sm text-muted-foreground">
            Sequencias de cursos para você dominar uma area completa
          </p>
        </div>
      </div>

      {myPaths.length === 0 ? (
        <EmptyState
          icon={Route}
          title="Nenhuma trilha disponivel"
          description="Voce ainda nao tem acesso a nenhuma trilha de aprendizado. Entre em contato com o suporte para saber mais."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {myPaths.map((path, idx) => {
            // Compute aggregate progress: sum of completed lessons / total lessons across all courses
            let totalLessons = 0;
            let completedLessons = 0;
            for (const courseId of path.courseIds) {
              const course = courseMap.get(courseId);
              if (!course) continue;
              const lessonIds = course.modules.flatMap((m) =>
                m.lessons.filter((l) => l.isActive).map((l) => l.id)
              );
              const prog = getCourseProgress(courseId, lessonIds);
              totalLessons += prog.total;
              completedLessons += prog.completed;
            }
            const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
            const completed = percent === 100 && totalLessons > 0;
            const started = completedLessons > 0;
            const earnedCert = pathCertificates.find((c) => c.pathId === path.id);

            return (
              <Link
                key={path.id}
                to={`/trilhas/${path.id}`}
                className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] transition-transform animate-fade-in-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <Card className="overflow-hidden border-border/50 shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/5 group-hover:-translate-y-1 group-hover:border-primary/20">
                  <div className="relative">
                    <AspectRatio ratio={16 / 9}>
                      <div className="h-full w-full bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center">
                        <Route className="h-12 w-12 text-primary/40" />
                      </div>
                      {path.bannerUrl && (
                        <img
                          src={path.bannerUrl}
                          alt={path.title}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    </AspectRatio>

                    {completed && (
                      <Badge className="absolute top-3 right-3 bg-amber-500 text-white shadow-lg shadow-amber-500/30 gap-1">
                        <Award className="h-3 w-3" />
                        Concluida
                      </Badge>
                    )}
                    {!completed && started && (
                      <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground shadow-lg">
                        Em andamento
                      </Badge>
                    )}
                    {!started && (
                      <Badge variant="outline" className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm">
                        Nao iniciada
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-5 space-y-3">
                    <h3 className="text-base font-semibold leading-snug line-clamp-2">{path.title}</h3>
                    {path.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{path.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" />
                      {path.courseIds.length} cursos
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Progresso</span>
                        <span className="text-xs font-semibold text-primary">{percent}%</span>
                      </div>
                      <Progress value={percent} className="h-1.5" />
                    </div>

                    {earnedCert && (
                      <div className="pt-2 border-t border-border/30">
                        <p className="text-xs flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <Award className="h-3 w-3" />
                          Certificado emitido
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
