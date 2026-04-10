import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Video, Calendar, Clock, ExternalLink, PlayCircle, ShoppingCart } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { useLiveLessons, getComputedStatus } from "@/hooks/useLiveLessons";
import type { LiveLesson, LiveLessonStatus } from "@/hooks/useLiveLessons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Status badge for non-live states
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: LiveLessonStatus }) {
  if (status === "live") return <LiveBadge />;
  const cfg: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    scheduled: { label: "Agendada", variant: "outline" },
    ended: { label: "Encerrada", variant: "secondary" },
    recorded: { label: "Gravada", variant: "default" },
    cancelled: { label: "Cancelada", variant: "outline" },
  };
  const c = cfg[status] ?? cfg.scheduled;
  return <Badge variant={c.variant} className="text-[10px]">{c.label}</Badge>;
}

// ---------------------------------------------------------------------------
// Lesson card — uses computed status
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
  const hasRecording = !!lesson.recordingUrl;

  return (
    <Card className={cn(
      "border-border/50 hover:border-border transition-all overflow-hidden",
      cs === "live" && "border-red-500/40 shadow-lg shadow-red-500/10"
    )}>
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
          <StatusBadge status={cs} />
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
          {lesson.instructorName && (
            <span>por {lesson.instructorName}</span>
          )}
        </div>

        {/* ---- Action buttons based on computed status + enrollment ---- */}

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
          <Button size="sm" className="w-full gap-2 bg-red-500 hover:bg-red-600 text-white" onClick={() => onJoin(lesson)}>
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

        {(cs === "ended" || cs === "recorded") && hasRecording && (
          <Button size="sm" variant="secondary" className="w-full gap-2" asChild>
            <a href={lesson.recordingUrl!} target="_blank" rel="noreferrer">
              <PlayCircle className="h-3.5 w-3.5" />
              Ver gravacao
            </a>
          </Button>
        )}

        {(cs === "ended" || cs === "recorded") && !hasRecording && (
          <p className="text-xs text-center text-muted-foreground py-1">
            Gravacao ainda nao disponivel
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LiveLessonsPage() {
  const { lessons, loading, joinLesson } = useLiveLessons();

  // TODO: real enrollment check — for now assume enrolled if authenticated
  const isEnrolled = true;

  const { upcoming, live, past } = useMemo(() => {
    const upcoming: LiveLesson[] = [];
    const live: LiveLesson[] = [];
    const past: LiveLesson[] = [];

    for (const l of lessons) {
      const cs = getComputedStatus(l);
      if (cs === "cancelled") continue;
      if (cs === "live") live.push(l);
      else if (cs === "scheduled") upcoming.push(l);
      else past.push(l);
    }

    upcoming.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    past.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    return { upcoming, live, past };
  }, [lessons]);

  const handleJoin = async (lesson: LiveLesson) => {
    if (!lesson.meetingUrl) {
      toast.error("Link da reuniao nao disponivel");
      return;
    }
    try { await joinLesson(lesson.id); } catch { /* non-blocking */ }
    window.open(lesson.meetingUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl pb-20 sm:pb-12 px-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mt-6 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

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
            Participe das aulas ao vivo e assista gravacoes anteriores
          </p>
        </div>
      </div>

      {live.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <LiveBadge />
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {live.map((l) => <LessonCard key={l.id} lesson={l} onJoin={handleJoin} isEnrolled={isEnrolled} />)}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Proximas</h2>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma aula ao vivo agendada no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((l) => <LessonCard key={l.id} lesson={l} onJoin={handleJoin} isEnrolled={isEnrolled} />)}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3">Gravacoes anteriores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {past.map((l) => <LessonCard key={l.id} lesson={l} onJoin={handleJoin} isEnrolled={isEnrolled} />)}
          </div>
        </section>
      )}
    </div>
  );
}
