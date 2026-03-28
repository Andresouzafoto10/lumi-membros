import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseBannersCarousel } from "@/components/courses/CourseBannersCarousel";
import { useCourses } from "@/hooks/useCourses";

export default function CoursesPage() {
  const { sessions, activeBanners } = useCourses();

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

  const activeSessions = sessions.filter(
    (s) => s.isActive && s.courses.some((c) => c.isActive)
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-10">
      {/* Banner carousel */}
      {activeBanners.length > 0 && (
        <CourseBannersCarousel banners={activeBanners} />
      )}

      {/* No courses message */}
      {activeSessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground text-sm">
            Nenhum curso disponivel no momento.
          </p>
        </div>
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
              <Button variant="ghost" size="sm" asChild>
                <Link to="#">Ver tudo</Link>
              </Button>
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
