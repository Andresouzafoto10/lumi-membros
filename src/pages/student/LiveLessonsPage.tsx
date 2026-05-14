import { useCallback, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Video, Calendar, Clock, ExternalLink, PlayCircle, ShoppingCart } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { useLiveLessons, getComputedStatus, getReplayUrl } from "@/hooks/useLiveLessons";
import type { LiveLesson } from "@/hooks/useLiveLessons";
import { useCurrentUserEnrollments } from "@/hooks/useCurrentUserEnrollments";
import { useClasses } from "@/hooks/useClasses";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/contexts/AuthContext";
import { isStudentEnrolled, isEnrollmentValid } from "@/lib/accessControl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LessonHero } from "@/components/live/LessonHero";
import { StatusBadgeWithCountdown } from "@/components/live/StatusBadgeWithCountdown";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "live", label: "Ao vivo" },
  { id: "upcoming", label: "Próximas" },
  { id: "replays", label: "Replays" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

// ---------------------------------------------------------------------------
// Card — reused for the grid below the hero
// ---------------------------------------------------------------------------

function LessonCard({
  lesson,
  onJoin,
  isEnrolled,
}: {
  lesson: LiveLesson;
  onJoin: (l: LiveLesson) => void;
  isEnrolled: boolean;
}) {
  const cs = getComputedStatus(lesson);
  const replayUrl = getReplayUrl(lesson);
  const isPast = cs === "ended" || cs === "recorded";

  return (
    <Card
      className={cn(
        "border-border/50 hover:border-border transition-all overflow-hidden",
        cs === "live" && "border-red-500/40 shadow-lg shadow-red-500/10"
      )}
    >
      {lesson.coverUrl && (
        <div className="aspect-video bg-muted overflow-hidden">
          <img
            src={lesson.coverUrl}
            alt={lesson.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold line-clamp-2 flex-1">{lesson.title}</h3>
          <StatusBadgeWithCountdown status={cs} scheduledAt={lesson.scheduledAt} />
        </div>

        {lesson.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{lesson.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(lesson.scheduledAt), "dd/MM HH:mm", { locale: ptBR })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {lesson.durationMinutes}min
          </span>
          {lesson.instructorName && <span>por {lesson.instructorName}</span>}
        </div>

        {cs === "scheduled" && isEnrolled && lesson.meetingUrl && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(lesson.scheduledAt), { locale: ptBR, addSuffix: true })}
            </span>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onJoin(lesson)}>
              <ExternalLink className="h-3.5 w-3.5" />
              Salvar link
            </Button>
          </div>
        )}

        {cs === "scheduled" && !isEnrolled && lesson.salesUrl && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(lesson.scheduledAt), { locale: ptBR, addSuffix: true })}
            </span>
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <a href={lesson.salesUrl} target="_blank" rel="noreferrer">
                <ShoppingCart className="h-3.5 w-3.5" />
                Quero participar
              </a>
            </Button>
          </div>
        )}

        {cs === "live" && isEnrolled && lesson.meetingUrl && (
          <Button
            size="sm"
            className="w-full gap-2 bg-red-500 hover:bg-red-600 text-white"
            onClick={() => onJoin(lesson)}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Entrar agora
          </Button>
        )}

        {cs === "live" && !isEnrolled && lesson.salesUrl && (
          <Button size="sm" variant="outline" className="w-full gap-2" asChild>
            <a href={lesson.salesUrl} target="_blank" rel="noreferrer">
              <ShoppingCart className="h-3.5 w-3.5" />
              Quero participar
            </a>
          </Button>
        )}

        {isPast && replayUrl && (
          <Button size="sm" variant="secondary" className="w-full gap-2" asChild>
            <a href={replayUrl} target="_blank" rel="noreferrer">
              <PlayCircle className="h-3.5 w-3.5" />
              Assistir gravação
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page — Combo D (hero + chips + grid)
// ---------------------------------------------------------------------------

export default function LiveLessonsPage() {
  const { lessons, loading, joinLesson } = useLiveLessons();
  const { currentUserId } = useCurrentUser();
  const { enrollments } = useCurrentUserEnrollments();
  const { classes } = useClasses();
  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState<FilterId>("all");

  const checkEnrolled = useCallback(
    (lesson: LiveLesson): boolean => {
      if (!currentUserId) return false;
      if (isAdmin) return true;
      if (lesson.accessMode === "open") return true;
      if (lesson.accessMode === "classes") {
        return enrollments.some(
          (e) =>
            e.studentId === currentUserId &&
            lesson.classIds.includes(e.classId) &&
            isEnrollmentValid(e)
        );
      }
      if (lesson.courseId) {
        return isStudentEnrolled(currentUserId, lesson.courseId, enrollments, classes);
      }
      return enrollments.some(
        (e) => e.studentId === currentUserId && isEnrollmentValid(e)
      );
    },
    [currentUserId, isAdmin, enrollments, classes]
  );

  // Bucket all lessons into live / scheduled / visibleReplays.
  const { live, scheduled, replays, hero } = useMemo(() => {
    const all = lessons.filter((l) => getComputedStatus(l) !== "cancelled");
    const live: LiveLesson[] = [];
    const scheduled: LiveLesson[] = [];
    const replays: LiveLesson[] = [];

    for (const l of all) {
      const cs = getComputedStatus(l);
      if (cs === "live") live.push(l);
      else if (cs === "scheduled") scheduled.push(l);
      else if ((cs === "ended" || cs === "recorded") && l.replayEnabled && getReplayUrl(l)) {
        replays.push(l);
      }
    }
    scheduled.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    replays.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    const hero = live[0] ?? scheduled[0] ?? null;
    return { live, scheduled, replays, hero };
  }, [lessons]);

  // Filtered grid (excludes hero from "all"/"upcoming"/"live")
  const gridLessons = useMemo(() => {
    const exceptHero = (arr: LiveLesson[]) => (hero ? arr.filter((l) => l.id !== hero.id) : arr);
    switch (filter) {
      case "live":
        return exceptHero(live);
      case "upcoming":
        return exceptHero(scheduled);
      case "replays":
        return replays;
      case "all":
      default:
        return [...exceptHero(live), ...exceptHero(scheduled), ...replays];
    }
  }, [filter, live, scheduled, replays, hero]);

  const handleJoin = async (lesson: LiveLesson) => {
    if (!lesson.meetingUrl) {
      toast.error("Link da reunião não disponível");
      return;
    }
    try {
      await joinLesson(lesson.id);
    } catch {
      /* non-blocking */
    }
    window.open(lesson.meetingUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl pb-20 sm:pb-12 px-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mt-6 mb-4" />
        <div className="aspect-[21/9] bg-muted animate-pulse rounded-xl mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const totalVisible = live.length + scheduled.length + replays.length;

  return (
    <div className="mx-auto max-w-6xl pb-20 sm:pb-12 px-4">
      <Helmet>
        <title>Aulas ao Vivo</title>
      </Helmet>

      <div className="flex items-center gap-3 pt-6 pb-4">
        <Video className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Aulas ao Vivo</h1>
          <p className="text-sm text-muted-foreground">
            Participe das aulas ao vivo e assista gravações anteriores
          </p>
        </div>
      </div>

      {hero && (
        <LessonHero lesson={hero} isEnrolled={checkEnrolled(hero)} onJoin={handleJoin} />
      )}

      {totalVisible > 0 && (
        <div className="sticky top-[64px] z-10 -mx-4 px-4 bg-background/85 backdrop-blur-sm py-2 mb-4 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors",
                  filter === f.id
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-background text-muted-foreground border-border/40 hover:border-border"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {totalVisible === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma aula ao vivo no momento.
            </p>
          </CardContent>
        </Card>
      ) : gridLessons.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma aula nesta categoria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gridLessons.map((l) => (
            <LessonCard
              key={l.id}
              lesson={l}
              onJoin={handleJoin}
              isEnrolled={checkEnrolled(l)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
