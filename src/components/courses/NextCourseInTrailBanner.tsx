import { Link, useParams } from "react-router-dom";
import { ArrowRight, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLearningPathContext } from "@/hooks/useLearningPathContext";

interface NextCourseInTrailBannerProps {
  currentCourseCompleted: boolean;
  variant?: "default" | "compact";
  className?: string;
}

export function NextCourseInTrailBanner({
  currentCourseCompleted,
  variant = "default",
  className,
}: NextCourseInTrailBannerProps) {
  const { courseId } = useParams<{ courseId: string }>();
  const { isInTrail, trailId, nextCourse } = useLearningPathContext(courseId);

  if (!isInTrail || !nextCourse || !currentCourseCompleted) return null;

  const params = new URLSearchParams();
  if (trailId) params.set("trilhaId", trailId);
  if (nextCourse.firstLessonId) params.set("lesson", nextCourse.firstLessonId);
  const href = `/cursos/${nextCourse.id}?${params.toString()}`;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-lg border border-primary/30 bg-primary/5 p-3",
          className
        )}
      >
        <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-wide text-primary/80">
          <Route className="h-3.5 w-3.5" />
          Próximo curso da trilha
        </div>
        <p className="mt-1 text-sm font-semibold text-foreground line-clamp-2">
          {nextCourse.title}
        </p>
        <Button asChild size="sm" className="mt-3 w-full gap-1.5">
          <Link to={href}>
            Continuar trilha
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary/80">
          <Route className="h-3.5 w-3.5" />
          Próximo curso da trilha
        </div>
        <p className="mt-1 text-base font-semibold text-foreground">
          {nextCourse.title}
        </p>
      </div>
      <Button asChild size="sm" className="gap-1.5 shrink-0 shadow-sm shadow-primary/15">
        <Link to={href}>
          Continuar trilha
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
