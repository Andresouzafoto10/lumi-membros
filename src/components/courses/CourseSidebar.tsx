import { CheckCircle2, ChevronDown, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ProgressRing } from "@/components/courses/ProgressRing";
import { cn } from "@/lib/utils";
import type { Course } from "@/types/course";

interface CourseSidebarProps {
  course: Course;
  activeLessonId: string | null;
  completedLessons: Record<string, boolean>;
  openModules: Record<string, boolean>;
  onToggleModule: (moduleId: string) => void;
  onSelectLesson: (lessonId: string) => void;
  percentCompleted: number;
}

export function CourseSidebar({
  course,
  activeLessonId,
  completedLessons,
  openModules,
  onToggleModule,
  onSelectLesson,
  percentCompleted,
}: CourseSidebarProps) {
  const sortedModules = [...course.modules]
    .filter((m) => m.isActive)
    .sort((a, b) => a.order - b.order);

  return (
    <Card className="p-4 border-none shadow-md">
      {/* Progress header */}
      <div className="flex items-center gap-3">
        <ProgressRing percent={percentCompleted} />
        <div className="min-w-0">
          <p className="text-sm font-medium">Progresso do curso</p>
          <p className="text-xs text-muted-foreground">
            {Math.round(percentCompleted)}% concluido
          </p>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Module list */}
      <ScrollArea className="h-[60vh]">
        <div className="space-y-1 pr-3">
          {sortedModules.map((mod) => {
            const sortedLessons = [...mod.lessons]
              .filter((l) => l.isActive)
              .sort((a, b) => a.order - b.order);

            return (
              <Collapsible
                key={mod.id}
                open={openModules[mod.id] ?? false}
                onOpenChange={() => onToggleModule(mod.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between gap-2 text-left h-auto py-2.5 px-3"
                  >
                    <span className="text-sm font-medium truncate">
                      {mod.title}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                        openModules[mod.id] && "rotate-180"
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="ml-1 space-y-0.5 py-1">
                    {sortedLessons.map((lesson) => {
                      const isCompleted = completedLessons[lesson.id] ?? false;
                      const isActive = lesson.id === activeLessonId;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => onSelectLesson(lesson.id)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                            isActive && "bg-sidebar-accent"
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{lesson.title}</span>
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
    </Card>
  );
}
