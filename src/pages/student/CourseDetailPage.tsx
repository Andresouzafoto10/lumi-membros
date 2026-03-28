import { useState, useCallback, useEffect, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LessonPlayer } from "@/components/courses/LessonPlayer";
import { CourseSidebar } from "@/components/courses/CourseSidebar";
import { useCourses } from "@/hooks/useCourses";
import type { CourseLesson } from "@/types/course";

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const { findCourse } = useCourses();

  const course = findCourse(courseId);

  // Flatten all active lessons in order
  const allLessons = useMemo(() => {
    if (!course) return [];
    return course.modules
      .filter((m) => m.isActive)
      .sort((a, b) => a.order - b.order)
      .flatMap((m) =>
        [...m.lessons]
          .filter((l) => l.isActive)
          .sort((a, b) => a.order - b.order)
      );
  }, [course]);

  // localStorage key for this course's completed lessons
  const storageKey = `lumi-membros:progress:${courseId}`;

  // Load completed lessons from localStorage
  const [completedLessons, setCompletedLessons] = useState<
    Record<string, boolean>
  >(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Active lesson state
  const [activeLessonId, setActiveLessonId] = useState<string | null>(() => {
    const lessonParam = searchParams.get("lesson");
    if (lessonParam && allLessons.some((l) => l.id === lessonParam)) {
      return lessonParam;
    }
    return null;
  });

  // Open modules state
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(
    () => {
      if (!course) return {};
      const initial: Record<string, boolean> = {};
      course.modules.forEach((m) => {
        initial[m.id] = true;
      });
      return initial;
    }
  );

  // Persist completed lessons
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(completedLessons));
    } catch {
      // ignore
    }
  }, [completedLessons, storageKey]);

  const handleToggleModule = useCallback((moduleId: string) => {
    setOpenModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  }, []);

  const handleSelectLesson = useCallback((lessonId: string) => {
    setActiveLessonId(lessonId);
  }, []);

  const handleCompleteLesson = useCallback(() => {
    if (!activeLessonId) return;
    setCompletedLessons((prev) => ({
      ...prev,
      [activeLessonId]: true,
    }));
  }, [activeLessonId]);

  const handleStartCourse = useCallback(() => {
    if (allLessons.length > 0) {
      setActiveLessonId(allLessons[0].id);
    }
  }, [allLessons]);

  // Current lesson and navigation
  const activeLesson: CourseLesson | undefined = allLessons.find(
    (l) => l.id === activeLessonId
  );
  const activeLessonIndex = allLessons.findIndex(
    (l) => l.id === activeLessonId
  );
  const prevLesson =
    activeLessonIndex > 0 ? allLessons[activeLessonIndex - 1] : null;
  const nextLesson =
    activeLessonIndex >= 0 && activeLessonIndex < allLessons.length - 1
      ? allLessons[activeLessonIndex + 1]
      : null;

  // Compute progress percentage
  const percentCompleted = useMemo(() => {
    if (allLessons.length === 0) return 0;
    const count = allLessons.filter((l) => completedLessons[l.id]).length;
    return (count / allLessons.length) * 100;
  }, [allLessons, completedLessons]);

  if (!course) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <Link
          to="/cursos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Cursos
        </Link>
        <p className="text-muted-foreground">Curso nao encontrado.</p>
      </div>
    );
  }

  const hasContent = allLessons.length > 0;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Back link */}
      <Link
        to="/cursos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Cursos
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8">
        {/* Left column */}
        <div className="space-y-6 min-w-0">
          {/* Course header */}
          <div>
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="mt-1 text-muted-foreground">{course.description}</p>
          </div>

          {/* No content */}
          {!hasContent && (
            <Card className="flex flex-col items-center justify-center py-16 px-6 border-dashed">
              <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                Conteudo em breve
              </p>
            </Card>
          )}

          {/* Has content but no active lesson */}
          {hasContent && !activeLesson && (
            <Button size="lg" onClick={handleStartCourse}>
              Iniciar curso
            </Button>
          )}

          {/* Active lesson */}
          {activeLesson && (
            <>
              <LessonPlayer lesson={activeLesson} />

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-2">
                  {prevLesson && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectLesson(prevLesson.id)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Voltar aula
                    </Button>
                  )}
                  {nextLesson && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectLesson(nextLesson.id)}
                    >
                      Proxima aula
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={handleCompleteLesson}
                  disabled={completedLessons[activeLesson.id]}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {completedLessons[activeLesson.id]
                    ? "Aula concluida"
                    : "Concluir aula"}
                </Button>
              </div>

              {/* Lesson description */}
              {activeLesson.description && (
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p>{activeLesson.description}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right column - Sidebar */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <CourseSidebar
            course={course}
            activeLessonId={activeLessonId}
            completedLessons={completedLessons}
            openModules={openModules}
            onToggleModule={handleToggleModule}
            onSelectLesson={handleSelectLesson}
            percentCompleted={percentCompleted}
          />
        </div>
      </div>
    </div>
  );
}
