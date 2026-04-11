import { Link } from "react-router-dom";
import { Calendar, Clock, PlayCircle, ExternalLink, Video } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useUpcomingLiveLessons, getComputedStatus } from "@/hooks/useLiveLessons";
import type { LiveLesson } from "@/hooks/useLiveLessons";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { cn } from "@/lib/utils";

function MiniCard({ lesson }: { lesson: LiveLesson }) {
  const cs = getComputedStatus(lesson);

  return (
    <Card className={cn(
      "min-w-[260px] max-w-[300px] border-border/50 shrink-0 snap-start",
      cs === "live" && "border-red-500/40"
    )}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-14 w-20 rounded-md bg-muted shrink-0 overflow-hidden">
          {lesson.coverUrl ? (
            <img src={lesson.coverUrl} alt={lesson.title} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Video className="h-5 w-5 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-1">{lesson.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {cs === "live" ? (
              <LiveBadge />
            ) : (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" />
                {format(new Date(lesson.scheduledAt), "dd/MM HH:mm", { locale: ptBR })}
              </span>
            )}
          </div>
          <div className="mt-1.5">
            {cs === "live" && lesson.meetingUrl ? (
              <a
                href={lesson.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500 hover:underline"
              >
                <PlayCircle className="h-3 w-3" />
                Entrar agora
              </a>
            ) : cs === "scheduled" && lesson.meetingUrl ? (
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(lesson.scheduledAt), { locale: ptBR, addSuffix: true })}
              </span>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function UpcomingLiveBanner() {
  const { upcoming, hasLiveNow, loading } = useUpcomingLiveLessons();
  const { settings } = usePlatformSettings();

  // Check show_live_banner setting
  const showBanner = (settings.theme as Record<string, unknown>)?.show_live_banner !== false;

  if (loading || upcoming.length === 0 || !showBanner) return null;

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          {hasLiveNow ? <LiveBadge /> : (
            <>
              <Calendar className="h-4 w-4 text-primary" />
              Proximas aulas ao vivo
            </>
          )}
        </h2>
        <Link to="/aulas-ao-vivo" className="text-xs text-primary hover:underline font-medium">
          Ver todas
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-thin">
        {upcoming.map((l) => (
          <MiniCard key={l.id} lesson={l} />
        ))}
      </div>
    </section>
  );
}
