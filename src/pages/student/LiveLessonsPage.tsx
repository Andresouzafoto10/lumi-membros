import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Video, Calendar, Clock, Radio, ExternalLink, PlayCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { useLiveLessons } from "@/hooks/useLiveLessons";
import type { LiveLesson } from "@/hooks/useLiveLessons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function LessonCard({ lesson, onJoin }: { lesson: LiveLesson; onJoin: (l: LiveLesson) => void }) {
  const isLive = lesson.status === "live";
  const isUpcoming = lesson.status === "scheduled" && new Date(lesson.scheduledAt) > new Date();
  const isEnded = lesson.status === "ended" || lesson.status === "recorded";
  const hasRecording = !!lesson.recordingUrl;

  return (
    <Card className={cn(
      "border-border/50 hover:border-border transition-all overflow-hidden",
      isLive && "border-destructive/40 shadow-lg shadow-destructive/10"
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
          {isLive && (
            <Badge variant="destructive" className="text-[10px] gap-1 animate-pulse shrink-0">
              <Radio className="h-2.5 w-2.5" />
              AO VIVO
            </Badge>
          )}
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
        </div>

        {isUpcoming && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground">
              Começa {formatDistanceToNow(new Date(lesson.scheduledAt), { locale: ptBR, addSuffix: true })}
            </span>
            {lesson.meetingUrl && (
              <Button size="sm" variant="outline" disabled>
                Em breve
              </Button>
            )}
          </div>
        )}

        {isLive && lesson.meetingUrl && (
          <Button size="sm" className="w-full gap-2" onClick={() => onJoin(lesson)}>
            <ExternalLink className="h-3.5 w-3.5" />
            Entrar na aula
          </Button>
        )}

        {isEnded && hasRecording && (
          <Button size="sm" variant="secondary" className="w-full gap-2" asChild>
            <a href={lesson.recordingUrl!} target="_blank" rel="noreferrer">
              <PlayCircle className="h-3.5 w-3.5" />
              Assistir gravação
            </a>
          </Button>
        )}

        {isEnded && !hasRecording && (
          <p className="text-xs text-center text-muted-foreground py-1">
            Gravação ainda não disponível
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function LiveLessonsPage() {
  const { lessons, loading, joinLesson } = useLiveLessons();

  const { upcoming, live, past } = useMemo(() => {
    const now = new Date();
    const upcoming: LiveLesson[] = [];
    const live: LiveLesson[] = [];
    const past: LiveLesson[] = [];

    for (const l of lessons) {
      if (l.status === "cancelled") continue;
      if (l.status === "live") {
        live.push(l);
      } else if (l.status === "scheduled" && new Date(l.scheduledAt) > now) {
        upcoming.push(l);
      } else {
        past.push(l);
      }
    }

    upcoming.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    past.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    return { upcoming, live, past };
  }, [lessons]);

  const handleJoin = async (lesson: LiveLesson) => {
    if (!lesson.meetingUrl) {
      toast.error("Link da reunião não disponível");
      return;
    }
    try {
      await joinLesson(lesson.id);
    } catch {
      // Non-blocking
    }
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
            Participe das aulas ao vivo e assista gravações anteriores
          </p>
        </div>
      </div>

      {/* Live now */}
      {live.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Radio className="h-4 w-4 text-destructive animate-pulse" />
            Ao vivo agora
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {live.map((l) => <LessonCard key={l.id} lesson={l} onJoin={handleJoin} />)}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Próximas</h2>
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
            {upcoming.map((l) => <LessonCard key={l.id} lesson={l} onJoin={handleJoin} />)}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3">Gravações anteriores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {past.map((l) => <LessonCard key={l.id} lesson={l} onJoin={handleJoin} />)}
          </div>
        </section>
      )}
    </div>
  );
}
