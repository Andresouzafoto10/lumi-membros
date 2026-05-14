// src/components/live/StatusBadgeWithCountdown.tsx
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { LiveBadge } from "@/components/ui/LiveBadge";
import type { LiveLessonStatus } from "@/hooks/useLiveLessons";

interface Props {
  status: LiveLessonStatus;
  scheduledAt?: string;
}

function humanCountdown(scheduledAt: string): string {
  const start = new Date(scheduledAt).getTime();
  const diffMin = Math.round((start - Date.now()) / 60_000);
  if (diffMin < 0) return "Já começou";
  if (diffMin < 60) return `Começa em ${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (hours < 24) {
    return mins > 0 ? `Em ${hours}h ${mins}min` : `Em ${hours}h`;
  }
  const days = Math.round(hours / 24);
  if (days === 1) return `Amanhã às ${format(new Date(scheduledAt), "HH:mm", { locale: ptBR })}`;
  return `Em ${days} dias`;
}

export function StatusBadgeWithCountdown({ status, scheduledAt }: Props) {
  if (status === "live") return <LiveBadge />;
  if (status === "scheduled" && scheduledAt) {
    return (
      <Badge variant="outline" className="text-[11px] gap-1">
        {humanCountdown(scheduledAt)}
      </Badge>
    );
  }
  const cfg: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    scheduled: { label: "Agendada", variant: "outline" },
    ended: { label: "Encerrada", variant: "secondary" },
    recorded: { label: "Replay", variant: "default" },
    cancelled: { label: "Cancelada", variant: "outline" },
  };
  const c = cfg[status] ?? cfg.scheduled;
  return <Badge variant={c.variant} className="text-[11px]">{c.label}</Badge>;
}
