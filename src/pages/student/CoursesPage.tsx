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

export default function CoursesPage() {
  const { sessions, activeBanners } = useCourses();
  const { lastWatched } = useLastWatched();
  const { searchQuery, setSearchQuery } = useSearchContext();

  const [selectedSessionId, setSelectedSessionId] = useState("all");

  // Read progress from localStorage for each course
  const courseProgress = useMemo(() => {
    const progress: Record<string, number> = {};
    const allCourses = sessions.flatMap((s) => s.courses);

    for (const course of allCourses) {
      try {
        const raw = localStorage.getItem(
          `lumi-membros:progress:${course.id}`
        );
        if (raw) {
          const completed: Record<string, boolean> = JSON.parse(raw);
          const totalLessons = course.modules
            .filter((m) => m.isActive)
            .flatMap((m) => m.lessons.filter((l) => l.isActive));
          const completedCount = totalLessons.filter(
            (l) => completed[l.id]
          ).length;
          progress[course.id] =
            totalLessons.length > 0
              ? (completedCount / totalLessons.length) * 100
              : 0;
        } else {
          progress[course.id] = 0;
        }
      } catch {
        progress[course.id] = 0;
      }
    }

    return progress;
  }, [sessions]);

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
    <div className="p-6 max-w-[1400px] mx-auto space-y-10">
      <Helmet>
        <title>Cursos | Lumi Membros</title>
      </Helmet>

      {/* Banner carousel */}
      {activeBanners.length > 0 && (
        <CourseBannersCarousel banners={activeBanners} />
      )}

      {/* Continue watching + session filter — same row */}
      <div className="flex items-center justify-between gap-4">
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
          <SelectTrigger className="w-[200px] shrink-0">
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">{session.title}</h2>
                {session.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {session.description}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {activeCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  to={`/cursos/${course.id}`}
                  title={course.title}
                  description={course.description}
                  bannerUrl={course.bannerUrl}
                  progressPercent={courseProgress[course.id]}
                  isDisabled={!course.isActive}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
