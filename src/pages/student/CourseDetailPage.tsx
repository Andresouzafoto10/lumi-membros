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
  const lessonParam = searchParams.get("lesson");

  const activeModules = useMemo(() => {
    if (!course) return [];

    return course.modules
      .filter((module) => module.isActive)
      .sort((a, b) => a.order - b.order)
      .map((module) => ({
        ...module,
        lessons: [...module.lessons]
          .filter((lesson) => lesson.isActive)
          .sort((a, b) => a.order - b.order),
      }));
  }, [course]);

  // Flatten all active lessons in order
  const allLessons = useMemo(() => {
    return activeModules.flatMap((module) => module.lessons);
  }, [activeModules]);

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
    if (lessonParam && allLessons.some((l) => l.id === lessonParam)) {
      return lessonParam;
    }
    return allLessons[0]?.id ?? null;
  });

  // Lesson notes
  const { content: noteContent, saveNote } = useLessonNotes(courseId, activeLessonId);

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Open module state - only one module open at a time
  const [openModuleId, setOpenModuleId] = useState<string | null>(() => {
    const initialLessonId =
      lessonParam && allLessons.some((lesson) => lesson.id === lessonParam)
        ? lessonParam
        : allLessons[0]?.id;

    if (!initialLessonId) return activeModules[0]?.id ?? null;

    return (
      activeModules.find((module) =>
        module.lessons.some((lesson) => lesson.id === initialLessonId)
      )?.id ?? activeModules[0]?.id ?? null
    );
  });

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

  const getModuleIdForLesson = useCallback(
    (lessonId: string) =>
      activeModules.find((module) =>
        module.lessons.some((lesson) => lesson.id === lessonId)
      )?.id ?? null,
    [activeModules]
  );

  const handleToggleModule = useCallback((moduleId: string) => {
    setOpenModuleId((prev) => (prev === moduleId ? null : moduleId));
  }, []);

  const handleSelectLesson = useCallback(
    (lessonId: string) => {
      setActiveLessonId(lessonId);
      const nextModuleId = getModuleIdForLesson(lessonId);
      if (nextModuleId) {
        setOpenModuleId(nextModuleId);
      }

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
    [course, allLessons, getModuleIdForLesson, setLastWatched]
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

  useEffect(() => {
    if (allLessons.length === 0) {
      if (activeLessonId !== null) setActiveLessonId(null);
      setOpenModuleId((prev) => (prev === null ? prev : null));
      return;
    }

    const resolvedLessonId =
      lessonParam && allLessons.some((lesson) => lesson.id === lessonParam)
        ? lessonParam
        : activeLessonId && allLessons.some((lesson) => lesson.id === activeLessonId)
          ? activeLessonId
          : allLessons[0]?.id ?? null;

    if (!resolvedLessonId) return;

    if (resolvedLessonId !== activeLessonId) {
      handleSelectLesson(resolvedLessonId);
      return;
    }

    const resolvedModuleId = getModuleIdForLesson(resolvedLessonId);
    setOpenModuleId((prev) => (prev === resolvedModuleId ? prev : resolvedModuleId));
  }, [
    lessonParam,
    allLessons,
    activeLessonId,
    handleSelectLesson,
    getModuleIdForLesson,
  ]);

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
    <div className="mx-auto max-w-[1240px] px-5 pb-10 pt-6 sm:px-6 lg:px-8">
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
        className="mb-5"
      />

      {/* Mobile sidebar toggle */}
      {hasContent && (
        <div className="mb-4 lg:hidden">
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-12">
        {/* Left column */}
        <div className="min-w-0 space-y-5">
          {/* Course header */}
          <div className="max-w-[780px]">
            <h1 className="text-[1.85rem] font-bold leading-tight tracking-[-0.035em] text-foreground sm:text-[2rem]">
              {course.title}
            </h1>
            <p className="mt-2 max-w-[720px] text-[0.98rem] leading-8 text-muted-foreground">
              {course.description}
            </p>
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

          {/* Active lesson */}
          {activeLesson && (
            <>
              <div className="max-w-[860px]">
                <LessonPlayer lesson={activeLesson} />
              </div>

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
                <div className="prose prose-sm max-w-[820px] text-muted-foreground">
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
          "lg:sticky lg:top-24 lg:self-start",
          sidebarOpen ? "block" : "hidden lg:block"
        )}>
          <CourseSidebar
            course={course}
            activeLessonId={activeLessonId}
            completedLessons={completedLessons}
            openModuleId={openModuleId}
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
