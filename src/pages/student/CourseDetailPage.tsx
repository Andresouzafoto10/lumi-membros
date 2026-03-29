import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { LessonPlayer } from "@/components/courses/LessonPlayer";
import { CourseSidebar } from "@/components/courses/CourseSidebar";
import { CourseProgressTopBar } from "@/components/courses/CourseProgressTopBar";
import { LessonRating } from "@/components/courses/LessonRating";
import { LessonNotes } from "@/components/courses/LessonNotes";
import { cn } from "@/lib/utils";
import { useCourses } from "@/hooks/useCourses";
import { useLastWatched } from "@/hooks/useLastWatched";
import { useLessonNotes } from "@/hooks/useLessonNotes";
import type { CourseLesson } from "@/types/course";

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const { findCourse } = useCourses();

  const { setLastWatched } = useLastWatched();
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

  // Lesson notes
  const { content: noteContent, saveNote } = useLessonNotes(courseId, activeLessonId);

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Current lesson and navigation — must be computed before callbacks that reference them
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

  const handleToggleModule = useCallback((moduleId: string) => {
    setOpenModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  }, []);

  const handleSelectLesson = useCallback(
    (lessonId: string) => {
      setActiveLessonId(lessonId);
      if (course) {
        const lesson = allLessons.find((l) => l.id === lessonId);
        if (lesson) {
          setLastWatched({
            courseId: course.id,
            courseTitle: course.title,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
          });
        }
      }
    },
    [course, allLessons, setLastWatched]
  );

  const handleCompleteLesson = useCallback(() => {
    if (!activeLessonId) return;
    const wasAlreadyCompleted = completedLessons[activeLessonId];
    setCompletedLessons((prev) => ({
      ...prev,
      [activeLessonId]: true,
    }));
    if (!wasAlreadyCompleted) {
      toast.success("Aula concluida!", {
        description: nextLesson
          ? "Avancando para a proxima aula..."
          : "Parabens pelo progresso!",
      });
      if (nextLesson) {
        setTimeout(() => handleSelectLesson(nextLesson.id), 1200);
      }
    }
  }, [activeLessonId, completedLessons, nextLesson, handleSelectLesson]);

  const handleStartCourse = useCallback(() => {
    if (allLessons.length > 0 && course) {
      setActiveLessonId(allLessons[0].id);
      setLastWatched({
        courseId: course.id,
        courseTitle: course.title,
        lessonId: allLessons[0].id,
        lessonTitle: allLessons[0].title,
      });
    }
  }, [allLessons, course, setLastWatched]);

  if (!course) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <Breadcrumb
          items={[
            { label: "Cursos", to: "/cursos" },
            { label: "Nao encontrado" },
          ]}
          className="mb-6"
        />
        <p className="text-muted-foreground">Curso nao encontrado.</p>
      </div>
    );
  }

  const hasContent = allLessons.length > 0;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <Helmet>
        <title>{course ? `${course.title} | Lumi Membros` : "Curso | Lumi Membros"}</title>
      </Helmet>

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Cursos", to: "/cursos" },
          { label: course.title },
          ...(activeLesson ? [{ label: activeLesson.title }] : []),
        ]}
        className="mb-4"
      />

      {/* Progress bar */}
      {hasContent && <CourseProgressTopBar percent={percentCompleted} className="mb-6" />}

      {/* Mobile sidebar toggle */}
      {hasContent && (
        <div className="lg:hidden mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Conteudo do curso
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(percentCompleted)}% concluido
            </span>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8">
        {/* Left column */}
        <div className="space-y-6 min-w-0">
          {/* Course header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
            <p className="mt-1.5 text-muted-foreground leading-relaxed">{course.description}</p>
          </div>

          {/* No content */}
          {!hasContent && (
            <Card className="flex flex-col items-center justify-center py-16 px-6 border-dashed animate-fade-in">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <BookOpen className="h-8 w-8 text-primary/60" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Conteudo em breve
              </p>
            </Card>
          )}

          {/* Has content but no active lesson */}
          {hasContent && !activeLesson && (
            <Button size="lg" onClick={handleStartCourse} className="shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all">
              Iniciar curso
            </Button>
          )}

          {/* Active lesson */}
          {activeLesson && (
            <>
              <LessonPlayer lesson={activeLesson} />

              {/* Navigation buttons + rating */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
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

                  <div className="hidden sm:block w-px h-6 bg-border mx-1" />
                  <LessonRating lessonId={activeLesson.id} />
                </div>

                <Button
                  size="sm"
                  onClick={handleCompleteLesson}
                  disabled={completedLessons[activeLesson.id]}
                  className={cn(
                    "gap-1.5 transition-all active:scale-[0.97]",
                    !completedLessons[activeLesson.id] && "shadow-sm shadow-primary/15 hover:shadow-md hover:shadow-primary/20"
                  )}
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

              {/* Lesson notes */}
              <LessonNotes content={noteContent} onChange={saveNote} />
            </>
          )}
        </div>

        {/* Right column - Sidebar */}
        <div className={cn(
          "lg:sticky lg:top-6 lg:self-start",
          sidebarOpen ? "block" : "hidden lg:block"
        )}>
          <CourseSidebar
            course={course}
            activeLessonId={activeLessonId}
            completedLessons={completedLessons}
            openModules={openModules}
            onToggleModule={handleToggleModule}
            onSelectLesson={(lessonId) => {
              handleSelectLesson(lessonId);
              setSidebarOpen(false);
            }}
            percentCompleted={percentCompleted}
          />
        </div>
      </div>
    </div>
  );
}
