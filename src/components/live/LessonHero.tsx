// src/components/live/LessonHero.tsx
import { Clock, PlayCircle, ExternalLink, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadgeWithCountdown } from "./StatusBadgeWithCountdown";
import { getComputedStatus } from "@/hooks/useLiveLessons";
import type { LiveLesson } from "@/hooks/useLiveLessons";
import { cn } from "@/lib/utils";

interface Props {
  lesson: LiveLesson;
  isEnrolled: boolean;
  onJoin: (l: LiveLesson) => void;
}

export function LessonHero({ lesson, isEnrolled, onJoin }: Props) {
  const cs = getComputedStatus(lesson);
  const isLive = cs === "live";

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border border-border/50 mb-6 group",
        isLive && "border-red-500/40 shadow-lg shadow-red-500/10"
      )}
    >
      <div className="aspect-[16/9] sm:aspect-[21/9] bg-muted">
        {lesson.coverUrl ? (
          <img
            src={lesson.coverUrl}
            alt={lesson.title}
            loading="eager"
            className="w-full h-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 space-y-2 sm:space-y-3">
        <StatusBadgeWithCountdown status={cs} scheduledAt={lesson.scheduledAt} />
        <h2 className="text-xl sm:text-3xl font-bold tracking-tight line-clamp-2">
          {lesson.title}
        </h2>
        {lesson.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 max-w-2xl">
            {lesson.description}
          </p>
        )}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {lesson.instructorName && <span>por {lesson.instructorName}</span>}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lesson.durationMinutes}min
            </span>
          </div>

          {isLive && isEnrolled && lesson.meetingUrl && (
            <Button
              size="sm"
              className="gap-2 bg-red-500 hover:bg-red-600 text-white animate-pulse-soft"
              onClick={() => onJoin(lesson)}
            >
              <PlayCircle className="h-4 w-4" />
              Entrar agora
            </Button>
          )}
          {cs === "scheduled" && isEnrolled && lesson.meetingUrl && (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => onJoin(lesson)}>
              <ExternalLink className="h-3.5 w-3.5" />
              Salvar link
            </Button>
          )}
          {!isEnrolled && lesson.salesUrl && (
            <Button size="sm" variant="outline" className="gap-2" asChild>
              <a href={lesson.salesUrl} target="_blank" rel="noreferrer">
                <ShoppingCart className="h-3.5 w-3.5" />
                Quero participar
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
