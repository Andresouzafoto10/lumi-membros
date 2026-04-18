import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { BookOpen, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseBannersCarousel } from "@/components/courses/CourseBannersCarousel";
import { EmptyState } from "@/components/courses/EmptyState";
import { ContinueWatching } from "@/components/courses/ContinueWatching";
import { useCourses } from "@/hooks/useCourses";
import { useLastWatched } from "@/hooks/useLastWatched";
import { useSearchContext } from "@/hooks/useSearchContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { useEnrolledCourses } from "@/hooks/useEnrolledCourses";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useAuth } from "@/contexts/AuthContext";
import { isStudentEnrolled } from "@/lib/accessControl";
import { UpcomingLiveBanner } from "@/components/courses/UpcomingLiveBanner";

export default function CoursesPage() {
  const { sessions, activeBanners } = useCourses();
  const { lastWatched } = useLastWatched();
  const { searchQuery, setSearchQuery } = useSearchContext();
  const { currentUserId } = useCurrentUser();
  const { enrollments } = useStudents();
  const { classes } = useClasses();
  const { getCourseProgress } = useLessonProgress();
  const { isAdmin } = useAuth();
  const { settings } = usePlatformSettings();
  const enrolledCourses = useEnrolledCourses();

  const [selectedSessionId, setSelectedSessionId] = useState("all");
  const showMyCourses = (settings.showMyCourses ?? true) && enrolledCourses.length > 0;

  // Set of course IDs the current student is enrolled in
  const enrolledCourseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const session of sessions) {
      for (const course of session.courses) {
        if (isStudentEnrolled(currentUserId, course.id, enrollments, classes)) {
          ids.add(course.id);
        }
      }
    }
    return ids;
  }, [sessions, currentUserId, enrollments, classes]);

  // Read progress from Supabase via useLessonProgress hook
  const courseProgress = useMemo(() => {
    const progress: Record<string, number> = {};
    const allCourses = sessions.flatMap((s) => s.courses);

    for (const course of allCourses) {
      const totalLessonIds = course.modules
        .filter((m) => m.isActive)
        .flatMap((m) => m.lessons.filter((l) => l.isActive))
        .map((l) => l.id);
      progress[course.id] = getCourseProgress(course.id, totalLessonIds).percentage;
    }

    return progress;
  }, [sessions, getCourseProgress]);

  const activeSessions = useMemo(() => {
    let filtered = sessions.filter(
      (s) => s.isActive && s.courses.some((c) => c.isActive)
    );

    if (selectedSessionId !== "all") {
      filtered = filtered.filter((s) => s.id === selectedSessionId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered
        .map((session) => ({
          ...session,
          courses: session.courses.filter((c) => {
            if (!c.isActive) return false;
            // Search course title and description
            if (c.title.toLowerCase().includes(query)) return true;
            if (c.description.toLowerCase().includes(query)) return true;
            // Deep search: lesson titles and descriptions
            return c.modules.some((m) =>
              m.lessons.some(
                (l) =>
                  l.title.toLowerCase().includes(query) ||
                  l.description.toLowerCase().includes(query)
              )
            );
          }),
        }))
        .filter((s) => s.courses.length > 0);
    }

    return filtered;
  }, [sessions, selectedSessionId, searchQuery]);

  const isFiltering = searchQuery.trim() !== "" || selectedSessionId !== "all";

  return (
    <div className="px-4 py-6 max-w-[1400px] mx-auto space-y-8 sm:px-6 sm:space-y-10">
      <Helmet>
        <title>Cursos</title>
      </Helmet>

      {/* Banner carousel */}
      {activeBanners.length > 0 && (
        <CourseBannersCarousel banners={activeBanners} />
      )}

      {/* Upcoming live lessons banner */}
      <UpcomingLiveBanner />

      {/* Continue watching + session filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          {lastWatched && (
            <ContinueWatching
              courseId={lastWatched.courseId}
              courseTitle={lastWatched.courseTitle}
              lessonId={lastWatched.lessonId}
              lessonTitle={lastWatched.lessonTitle}
            />
          )}
        </div>
        <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
          <SelectTrigger className="w-full shrink-0 sm:w-[200px]">
            <SelectValue placeholder="Todas as sessoes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as sessoes</SelectItem>
            {sessions
              .filter((s) => s.isActive)
              .map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.title}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Meus Cursos — exibido no topo para alunos com matricula ativa */}
      {showMyCourses && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 rounded-full bg-primary" />
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold tracking-tight sm:text-xl">Meus Cursos</h2>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {enrolledCourses.length} {enrolledCourses.length === 1 ? "curso" : "cursos"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Continue de onde parou nos cursos em que voce esta matriculado.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {enrolledCourses.map((course, idx) => (
              <div
                key={course.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <CourseCard
                  to={`/cursos/${course.id}`}
                  title={course.title}
                  description={course.description}
                  bannerUrl={course.bannerUrl}
                  progressPercent={course.progressPercent}
                  isDisabled={!course.isActive}
                  access={course.access}
                  courseId={course.id}
                  launchAt={course.launchAt}
                  launchStatus={course.launchStatus}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No courses at all */}
      {!isFiltering && activeSessions.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="Nenhum curso disponivel"
          description="Novos cursos estao sendo preparados. Volte em breve!"
        />
      )}

      {/* No results from search/filter */}
      {isFiltering && activeSessions.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="Nenhum curso encontrado"
          description="Tente buscar com outros termos ou limpe os filtros."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedSessionId("all");
              }}
            >
              Limpar filtros
            </Button>
          }
        />
      )}

      {/* Sessions with courses */}
      {activeSessions.map((session) => {
        const activeCourses = session.courses
          .filter((c) => c.isActive)
          .sort((a, b) => a.order - b.order);

        if (activeCourses.length === 0) return null;

        return (
          <section key={session.id}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 rounded-full bg-primary" />
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold tracking-tight sm:text-xl">{session.title}</h2>
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {activeCourses.length} {activeCourses.length === 1 ? "curso" : "cursos"}
                    </span>
                  </div>
                  {session.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {session.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {activeCourses.map((course, idx) => {
                const hasAccess = isAdmin || enrolledCourseIds.has(course.id);

                return (
                  <div
                    key={course.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <CourseCard
                      to={`/cursos/${course.id}`}
                      title={course.title}
                      description={course.description}
                      bannerUrl={course.bannerUrl}
                      progressPercent={hasAccess ? courseProgress[course.id] : undefined}
                      isDisabled={!course.isActive}
                      locked={!hasAccess}
                      access={course.access}
                      courseId={course.id}
                      launchAt={course.launchAt}
                      launchStatus={course.launchStatus}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
