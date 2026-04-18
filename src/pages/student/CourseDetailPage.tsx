import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  Lock,
  AlertTriangle,
  ExternalLink,
  FileText,
  LinkIcon,
  Download,
  Award,
  SearchX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { LessonPlayer } from "@/components/courses/LessonPlayer";
import { CourseSidebar } from "@/components/courses/CourseSidebar";
import { LessonRating } from "@/components/courses/LessonRating";
import { LessonNotes } from "@/components/courses/LessonNotes";
import { NextCourseInTrailBanner } from "@/components/courses/NextCourseInTrailBanner";
import { cn } from "@/lib/utils";
import { useCourses } from "@/hooks/useCourses";
import { useLastWatched } from "@/hooks/useLastWatched";
import { useLessonNotes } from "@/hooks/useLessonNotes";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useCertificates } from "@/hooks/useCertificates";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useQuizAttempts } from "@/hooks/useQuizAttempts";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { LessonQuiz } from "@/components/courses/LessonQuiz";
import { LessonMaterials } from "@/components/courses/LessonMaterials";
import { LessonComments } from "@/components/courses/LessonComments";
import { downloadCertificateAsPng } from "@/lib/generateCertificate";
import { CertificateRenderer } from "@/components/certificates/CertificateRenderer";
import { Progress } from "@/components/ui/progress";
import {
  buildCourseAccessMap,
  blockReasonMessage,
} from "@/lib/accessControl";
import type { CourseLesson } from "@/types/course";
import type { LessonAccessStatus } from "@/lib/accessControl";

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const { findCourse } = useCourses();
  const { currentUserId } = useCurrentUser();
  const { enrollments } = useStudents();
  const { classes } = useClasses();

  const { setLastWatched } = useLastWatched();
  const { hasEarnedCertificate, checkAndAwardCertificate, getTemplateById, generateCertificateData, markDownloaded, getEarnedCertificate } = useCertificates();
  const { settings: platformSettings } = usePlatformSettings();
  const { hasPassedQuiz, getQuizScoresForCourse } = useQuizAttempts();
  const {
    getCompletedForCourse,
    markLessonComplete,
    unmarkLessonComplete,
    updateWatchPosition,
    getLastPosition,
  } = useLessonProgress();
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

  // Completed lessons from Supabase via useLessonProgress hook
  const completedLessons = useMemo(
    () => (courseId ? getCompletedForCourse(courseId) : {}),
    [courseId, getCompletedForCourse]
  );

  // Build access map for current student (passing Supabase-based completed lessons)
  const accessMap = useMemo(() => {
    if (!course || !courseId) return null;
    return buildCourseAccessMap(
      currentUserId,
      courseId,
      activeModules.map((m) => ({
        id: m.id,
        lessons: m.lessons.map((l) => ({ id: l.id })),
      })),
      enrollments,
      classes,
      completedLessons
    );
  }, [currentUserId, courseId, course, activeModules, enrollments, classes, completedLessons]);

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

  // Progress is now managed by useLessonProgress hook (Supabase) — no localStorage sync needed

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

  const handleToggleCompleteLesson = useCallback(async () => {
    if (!activeLessonId || !courseId) return;
    const wasAlreadyCompleted = completedLessons[activeLessonId];
    const moduleId = getModuleIdForLesson(activeLessonId);
    if (wasAlreadyCompleted) {
      // Unmark
      await unmarkLessonComplete(activeLessonId);
      toast.info("Aula desmarcada como concluída.");
    } else {
      // Mark complete
      if (moduleId) {
        await markLessonComplete(activeLessonId, courseId, moduleId);
      }
      toast.success("Aula concluída!", {
        description: nextLesson
          ? "Avançando para a próxima aula..."
          : "Parabéns pelo progresso!",
      });

      // Check certificate award
      if (course) {
        const nextCompleted = { ...completedLessons, [activeLessonId]: true };
        checkAndAwardCertificate(
          currentUserId,
          courseId,
          course,
          nextCompleted,
          (lessonIds) => getQuizScoresForCourse(currentUserId, lessonIds)
        ).then((awarded) => {
          if (awarded) {
            setTimeout(() => {
              toast.success("Parabéns! Você ganhou um certificado!", {
                description:
                  "Acesse 'Meus Certificados' no seu perfil para baixar.",
                duration: 6000,
              });
            }, 800);
          }
        });
      }

      if (nextLesson) {
        setTimeout(() => handleSelectLesson(nextLesson.id), 1200);
      }
    }
  }, [activeLessonId, courseId, completedLessons, nextLesson, handleSelectLesson, getModuleIdForLesson, markLessonComplete, unmarkLessonComplete]);

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

  // Check if the active lesson is accessible (hook declared BEFORE early return)
  const activeLessonAccess: LessonAccessStatus | null = useMemo(() => {
    if (!activeLessonId || !accessMap) return null;
    return accessMap.lessonAccess[activeLessonId] ?? { allowed: true };
  }, [activeLessonId, accessMap]);

  if (!course) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 pt-8 pb-16">
        <Helmet>
          <title>Curso não encontrado</title>
        </Helmet>
        <Breadcrumb
          items={[
            { label: "Cursos", to: "/cursos" },
            { label: "Não encontrado" },
          ]}
          className="mb-8"
        />
        <div className="flex flex-col items-center text-center gap-4 py-16">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <SearchX className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Curso não encontrado</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Este curso pode ter sido removido ou você não tem acesso a ele.
              Confira seus cursos disponíveis.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" asChild>
              <Link to="/cursos">Ver meus cursos</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasContent = allLessons.length > 0;
  const isEnrolled = accessMap?.enrolled ?? false;
  const isExpired = accessMap?.expired ?? false;

  const lessonBlocked = activeLessonAccess && !activeLessonAccess.allowed;

  return (
    <div className="mx-auto max-w-[1240px] px-3 pb-10 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <Helmet>
        <title>{course ? course.title : "Curso"}</title>
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

      {/* Enrollment gate */}
      {!isEnrolled && (
        <Card className="flex flex-col items-center justify-center py-16 px-6 border-dashed animate-fade-in">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <Lock className="h-8 w-8 text-destructive/60" />
          </div>
          <p className="text-foreground font-medium mb-1">Acesso restrito</p>
          <p className="text-muted-foreground text-sm text-center max-w-md">
            Você não está matriculado neste curso. Entre em contato com o administrador para obter acesso.
          </p>
          <Link to="/cursos">
            <Button variant="outline" size="sm" className="mt-4">
              Voltar para cursos
            </Button>
          </Link>
        </Card>
      )}

      {/* Expired enrollment */}
      {isExpired && (
        <Card className="flex flex-col items-center justify-center py-16 px-6 border-dashed animate-fade-in">
          <div className="rounded-full bg-yellow-500/10 p-4 mb-4">
            <AlertTriangle className="h-8 w-8 text-yellow-500/60" />
          </div>
          <p className="text-foreground font-medium mb-1">Matrícula expirada</p>
          <p className="text-muted-foreground text-sm text-center max-w-md">
            Sua matrícula neste curso expirou. Entre em contato com o administrador para renovar.
          </p>
          <Link to="/cursos">
            <Button variant="outline" size="sm" className="mt-4">
              Voltar para cursos
            </Button>
          </Link>
        </Card>
      )}

      {/* Course content (only if enrolled and not expired) */}
      {isEnrolled && !isExpired && (
        <>
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

              {/* Certificate earned banner */}
              {courseId && hasEarnedCertificate(currentUserId, courseId) && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 animate-fade-in">
                  <Award className="text-yellow-500 shrink-0" size={20} />
                  <span className="text-sm text-yellow-700 dark:text-yellow-400 flex-1">
                    Você tem um certificado para este curso!
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.location.href = "/meus-certificados";
                    }}
                  >
                    Ver certificado
                  </Button>
                </div>
              )}

              {/* Certificate progress */}
              {courseId &&
                !hasEarnedCertificate(currentUserId, courseId) &&
                course.certificateConfig?.templateId && (() => {
                  const reqType = course.certificateConfig.requirementType ?? "completion";
                  const showCompletion = reqType === "completion" || reqType === "completion_and_quiz";
                  const showQuiz = reqType === "quiz" || reqType === "completion_and_quiz";
                  const quizLessonIds = allLessons.filter(l => l.quiz && l.quiz.length > 0).map(l => l.id);
                  const quizAvg = showQuiz && quizLessonIds.length > 0
                    ? getQuizScoresForCourse(currentUserId, quizLessonIds)
                    : 0;
                  const quizThreshold = course.certificateConfig.quizThreshold ?? 70;

                  return (
                    <div className="space-y-2 text-xs text-muted-foreground">
                      {showCompletion && (
                        <div className="space-y-1">
                          <span className="flex items-center gap-1.5">
                            {percentCompleted >= course.certificateConfig!.completionThreshold ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Award className="h-3.5 w-3.5 text-primary/60" />
                            )}
                            Complete {course.certificateConfig!.completionThreshold}% das aulas
                            ({Math.round(percentCompleted)}% atual)
                          </span>
                          <Progress value={percentCompleted} className="h-1" />
                        </div>
                      )}
                      {showQuiz && quizLessonIds.length > 0 && (
                        <div className="space-y-1">
                          <span className="flex items-center gap-1.5">
                            {quizAvg >= quizThreshold ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Award className="h-3.5 w-3.5 text-primary/60" />
                            )}
                            Alcance {quizThreshold}% de média nos quizzes
                            ({quizAvg}% atual)
                          </span>
                          <Progress value={quizAvg} className="h-1" />
                        </div>
                      )}
                    </div>
                  );
                })()}

              {/* No content */}
              {!hasContent && (
                <Card className="flex flex-col items-center justify-center py-16 px-6 border-dashed animate-fade-in">
                  <div className="rounded-full bg-primary/10 p-4 mb-4">
                    <BookOpen className="h-8 w-8 text-primary/60" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Conteúdo em breve
                  </p>
                </Card>
              )}

              {/* Lesson blocked by rule */}
              {activeLesson && lessonBlocked && activeLessonAccess && (
                <Card className="flex flex-col items-center justify-center py-16 px-6 border-dashed animate-fade-in">
                  <div className="rounded-full bg-yellow-500/10 p-4 mb-4">
                    <Lock className="h-8 w-8 text-yellow-500/60" />
                  </div>
                  <p className="text-foreground font-medium mb-1">Aula bloqueada</p>
                  <p className="text-muted-foreground text-sm text-center max-w-md">
                    {blockReasonMessage(activeLessonAccess)}
                  </p>
                </Card>
              )}

              {/* Active lesson (accessible) */}
              {activeLesson && !lessonBlocked && (
                <>
                  <div className="-mx-3 sm:mx-0 sm:max-w-[860px]">
                    <LessonPlayer lesson={activeLesson} />
                  </div>

                  {/* Quiz — below video or replacing video */}
                  {activeLesson.quiz && activeLesson.quiz.length > 0 && (
                    <div className="max-w-[860px]">
                      <LessonQuiz
                        quiz={activeLesson.quiz}
                        passingScore={activeLesson.quizPassingScore ?? 70}
                        lessonId={activeLesson.id}
                        onPass={() => {}}
                      />
                    </div>
                  )}

                  {/* Navigation buttons + rating */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex gap-2">
                        {prevLesson && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-initial"
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
                            className="flex-1 sm:flex-initial"
                            onClick={() => handleSelectLesson(nextLesson.id)}
                          >
                            Próxima aula
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      </div>
                      <div className="hidden sm:block w-px h-6 bg-border mx-1" />
                      <LessonRating lessonId={activeLesson.id} ratingsEnabled={activeLesson.ratingsEnabled} />
                    </div>

                    {(() => {
                      const quizRequired = activeLesson.quizRequiredToAdvance && activeLesson.quiz && activeLesson.quiz.length > 0;
                      const quizBlocked = quizRequired && !hasPassedQuiz(currentUserId, activeLesson.id);
                      return (
                        <Button
                          size="sm"
                          variant={completedLessons[activeLesson.id] ? "outline" : "default"}
                          onClick={handleToggleCompleteLesson}
                          disabled={quizBlocked}
                          title={quizBlocked ? "Aprove no quiz para concluir" : undefined}
                          className={cn(
                            "w-full gap-1.5 transition-all active:scale-[0.97] sm:w-auto",
                            !completedLessons[activeLesson.id] && "shadow-sm shadow-primary/15 hover:shadow-md hover:shadow-primary/20"
                          )}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {completedLessons[activeLesson.id]
                            ? "Aula concluída"
                            : "Concluir aula"}
                        </Button>
                      );
                    })()}
                  </div>

                  {/* Next course in trail banner */}
                  <NextCourseInTrailBanner
                    currentCourseCompleted={percentCompleted === 100}
                    className="max-w-[860px]"
                  />

                  {/* Lesson description */}
                  {activeLesson.description && (
                    <div className="prose prose-sm dark:prose-invert max-w-[820px] prose-img:rounded-lg prose-img:max-w-full">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "hsl(var(--primary))" }}
                              className="underline font-medium hover:opacity-80 transition-opacity break-words"
                            >
                              {children}
                            </a>
                          ),
                          img: ({ src, alt }) => (
                            <img
                              src={src}
                              alt={alt}
                              className="rounded-lg max-w-full"
                            />
                          ),
                          p: ({ children }) => (
                            <p className="text-foreground/80 leading-relaxed">
                              {children}
                            </p>
                          ),
                        }}
                      >
                        {activeLesson.description}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Lesson materials (DRM-protected downloads via Edge Function) */}
                  <LessonMaterials lessonId={activeLesson.id} />

                  {/* Lesson links */}
                  {activeLesson.links && activeLesson.links.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" /> Links
                      </h3>
                      <div className="flex flex-col gap-1.5">
                        {activeLesson.links.map((l, i) => (
                          <a
                            key={i}
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1.5"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {l.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lesson files */}
                  {activeLesson.files && activeLesson.files.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Download className="h-4 w-4" /> Arquivos
                      </h3>
                      <div className="flex flex-col gap-1.5">
                        {activeLesson.files.map((f, i) => (
                          <span
                            key={i}
                            className="text-sm text-muted-foreground flex items-center gap-1.5"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {f.name}
                            {f.sizeLabel && (
                              <span className="text-xs text-muted-foreground/60">
                                ({f.sizeLabel})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lesson notes */}
                  <LessonNotes content={noteContent} onChange={saveNote} />

                  {/* Lesson comments */}
                  <LessonComments
                    lessonId={activeLesson.id}
                    courseId={course.id}
                    commentsEnabled={course.commentsEnabled !== false && activeLesson.commentsEnabled !== false}
                  />
                </>
              )}
            </div>

            {/* Right column - Sidebar */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              {/* Mobile: collapsible accordion header */}
              <div className="lg:hidden mb-2">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50 active:scale-[0.99]"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <BookOpen className="h-4 w-4" />
                    Conteúdo do curso
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {Math.round(percentCompleted)}% concluído
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", sidebarOpen && "rotate-180")} />
                  </div>
                </button>
              </div>
              <div className={cn(sidebarOpen ? "block" : "hidden lg:block")}>
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
                  lessonAccess={accessMap?.lessonAccess}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
