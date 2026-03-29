import { Check, ChevronDown, Circle, Lock, Clock, EyeOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ProgressRing } from "@/components/courses/ProgressRing";
import { cn } from "@/lib/utils";
import type { Course } from "@/types/course";
import type { LessonAccessStatus } from "@/lib/accessControl";

interface CourseSidebarProps {
  course: Course;
  activeLessonId: string | null;
  completedLessons: Record<string, boolean>;
  openModuleId: string | null;
  onToggleModule: (moduleId: string) => void;
  onSelectLesson: (lessonId: string) => void;
  percentCompleted: number;
  lessonAccess?: Record<string, LessonAccessStatus>;
}

export function CourseSidebar({
  course,
  activeLessonId,
  completedLessons,
  openModuleId,
  onToggleModule,
  onSelectLesson,
  percentCompleted,
  lessonAccess,
}: CourseSidebarProps) {
  const sortedModules = [...course.modules]
    .filter((module) => module.isActive)
    .sort((a, b) => a.order - b.order);

  const totalLessons = sortedModules.reduce(
    (count, module) =>
      count + module.lessons.filter((lesson) => lesson.isActive).length,
    0
  );

  const completedLessonsCount = sortedModules.reduce(
    (count, module) =>
      count +
      module.lessons.filter(
        (lesson) => lesson.isActive && completedLessons[lesson.id]
      ).length,
    0
  );

  return (
    <div className="px-1 lg:px-0">
      <div className="mb-7 flex items-start gap-3.5">
        <div className="pt-0.5">
          <ProgressRing
            percent={percentCompleted}
            size={28}
            strokeWidth={4}
            showLabel={false}
          />
        </div>

        <div className="min-w-0">
          <p className="text-[0.98rem] font-semibold leading-5 tracking-[-0.012em] text-foreground">
            Progresso do curso
          </p>
          <p className="mt-1 text-[0.82rem] font-medium text-muted-foreground">
            {completedLessonsCount} de {totalLessons} aulas concluidas
          </p>
        </div>
      </div>

      <ScrollArea className="max-h-[calc(100vh-11rem)] pr-2">
        <div className="space-y-5 pr-2">
          {sortedModules.map((module) => {
            const sortedLessons = [...module.lessons]
              .filter((lesson) => lesson.isActive)
              .sort((a, b) => a.order - b.order);
            const completedCount = sortedLessons.filter(
              (lesson) => completedLessons[lesson.id]
            ).length;
            const allComplete =
              sortedLessons.length > 0 && completedCount === sortedLessons.length;
            const isOpen = openModuleId === module.id;

            return (
              <Collapsible
                key={module.id}
                open={isOpen}
                onOpenChange={() => onToggleModule(module.id)}
              >
                <div className="relative pl-10">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-[2.5px] transition-colors duration-200",
                      allComplete
                        ? "border-emerald-500/90 text-emerald-500"
                        : isOpen
                          ? "border-primary/80 text-primary"
                          : "border-muted-foreground/35 text-muted-foreground/40"
                    )}
                  >
                    {allComplete ? (
                      <Check className="h-3 w-3" strokeWidth={3} />
                    ) : null}
                  </span>

                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 bg-transparent py-0 text-left outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <span className="min-w-0">
                        <span className="block text-[0.98rem] font-semibold leading-7 tracking-[-0.015em] text-foreground">
                          {module.title}
                        </span>
                        <span className="mt-0.5 block text-[0.8rem] font-medium text-muted-foreground">
                          {completedCount} de {sortedLessons.length} aulas
                        </span>
                      </span>

                      <ChevronDown
                        className={cn(
                          "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                          isOpen && "rotate-180"
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div className="relative ml-[11px] mt-3 border-l border-border/65 pb-1 pl-7">
                    {sortedLessons.map((lesson) => {
                      const isCompleted = completedLessons[lesson.id] ?? false;
                      const isActive = lesson.id === activeLessonId;
                      const access = lessonAccess?.[lesson.id];
                      const isBlocked = access && !access.allowed;
                      const isHidden = isBlocked && !access.allowed && access.reason === "hidden";
                      const isScheduled = isBlocked && !access.allowed && (access.reason === "scheduled_date" || access.reason === "days_after_enrollment");

                      // Hide lessons with "hidden" rule
                      if (isHidden) return null;

                      return (
                        <button
                          key={lesson.id}
                          id={`lesson-${lesson.id}`}
                          type="button"
                          onClick={() => !isBlocked && onSelectLesson(lesson.id)}
                          disabled={!!isBlocked}
                          className={cn(
                            "group relative flex w-full items-start bg-transparent py-2 text-left outline-none scroll-mt-4",
                            isBlocked && "opacity-50 cursor-not-allowed"
                          )}
                          title={isBlocked && access ? (() => {
                            switch (access.reason) {
                              case "blocked": return "Conteúdo bloqueado";
                              case "scheduled_date": return `Disponível em ${access.detail ? new Date(access.detail).toLocaleDateString("pt-BR") : "breve"}`;
                              case "days_after_enrollment": return `Liberado em ${access.detail ? new Date(access.detail).toLocaleDateString("pt-BR") : "breve"}`;
                              case "course_complete": return "Complete o curso de pré-requisito";
                              case "module_complete": return "Complete o módulo anterior";
                              case "lesson_complete": return "Complete a aula anterior";
                              default: return "Conteúdo indisponível";
                            }
                          })() : undefined}
                        >
                          <span className="absolute -left-[29px] top-[14px] flex h-4 w-4 items-center justify-center">
                            {isBlocked ? (
                              isScheduled ? (
                                <Clock className="h-3.5 w-3.5 text-yellow-500/70" />
                              ) : (
                                <Lock className="h-3.5 w-3.5 text-muted-foreground/45" />
                              )
                            ) : isCompleted ? (
                              <Check
                                className="h-3.5 w-3.5 text-emerald-500"
                                strokeWidth={3}
                              />
                            ) : isActive ? (
                              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground/45" />
                            )}
                          </span>

                          <span
                            className={cn(
                              "text-[0.92rem] font-semibold leading-7 tracking-[-0.012em] transition-colors",
                              isBlocked
                                ? "text-muted-foreground/50"
                                : isActive
                                  ? "text-primary"
                                  : "text-foreground/78 group-hover:text-foreground",
                              isCompleted && !isActive && !isBlocked && "text-foreground/66"
                            )}
                          >
                            {lesson.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
