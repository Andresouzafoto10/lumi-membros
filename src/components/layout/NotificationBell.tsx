import { memo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  AtSign,
  Info,
  Check,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications } from "@/hooks/useNotifications";
import type { GroupedNotification } from "@/hooks/useNotifications";
import { useProfiles } from "@/hooks/useProfiles";
import { getProxiedImageUrl } from "@/lib/imageProxy";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_ICONS = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  mention: AtSign,
  system: Info,
};

type Filter = "all" | "unread" | "mentions";

function NotificationBellInner() {
  const { currentUserId } = useCurrentUser();
  const {
    getGroupedForUser,
    unreadCount,
    markGroupAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();
  const { findProfile } = useProfiles();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const allGroups = getGroupedForUser(currentUserId);
  const count = unreadCount(currentUserId);

  const filteredGroups = allGroups.filter((g) => {
    if (filter === "unread") return g.hasUnread;
    if (filter === "mentions") return g.primary.type === "mention";
    return true;
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideTrigger && !insidePanel) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead(currentUserId);
    toast.success("Todas marcadas como lidas");
  }, [markAllAsRead, currentUserId]);

  const handleClearAll = useCallback(() => {
    clearAll(currentUserId);
    toast.success("Notificacoes limpas");
    setOpen(false);
  }, [clearAll, currentUserId]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse-soft">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>

      {open && createPortal(
        <>
        <div className="fixed inset-0 z-[190] bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
        <div
          ref={panelRef}
          className="fixed inset-x-0 bottom-0 z-[200] flex max-h-[75vh] flex-col rounded-t-2xl border-t bg-popover shadow-lg animate-slide-up md:inset-x-auto md:bottom-auto md:right-4 md:top-[4.5rem] md:w-96 md:max-w-[calc(100vw-2rem)] md:max-h-[28rem] md:rounded-lg md:border md:animate-fade-in"
        >
          <div className="mx-auto my-2 h-1 w-10 rounded-full bg-muted-foreground/30 md:hidden" />
          {/* Header */}
          <div className="px-4 py-2.5 border-b shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Notificacoes</p>
              <div className="flex gap-1">
                {count > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleMarkAllRead}
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Ler todas
                  </Button>
                )}
                {allGroups.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    onClick={handleClearAll}
                    title="Limpar todas"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            {/* Filter tabs */}
            <div className="flex gap-1">
              {([
                ["all", "Todas"],
                ["unread", "Nao lidas"],
                ["mentions", "Mencoes"],
              ] as [Filter, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                    filter === key
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {label}
                  {key === "unread" && count > 0 && (
                    <span className="ml-1 text-[10px]">({count})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {filter === "unread"
                  ? "Nenhuma notificacao nao lida."
                  : filter === "mentions"
                    ? "Nenhuma mencao."
                    : "Nenhuma notificacao."}
              </p>
            ) : (
              <div>
                {filteredGroups.map((group) => (
                  <NotificationGroupItem
                    key={group.primary.id}
                    group={group}
                    findProfile={findProfile}
                    onMarkRead={() => markGroupAsRead(group)}
                    onDelete={() => {
                      for (const item of group.items) {
                        deleteNotification(item.id);
                      }
                    }}
                    onClose={() => setOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {allGroups.length > 0 && (
            <div className="px-4 py-2 border-t shrink-0">
              <p className="text-[10px] text-muted-foreground text-center">
                {allGroups.length} notificacao{allGroups.length !== 1 ? "es" : ""}
              </p>
            </div>
          )}
        </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual grouped notification item
// ---------------------------------------------------------------------------

function NotificationGroupItem({
  group,
  findProfile,
  onMarkRead,
  onDelete,
  onClose,
}: {
  group: GroupedNotification;
  findProfile: (id: string) => { avatarUrl?: string } | null | undefined;
  onMarkRead: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const n = group.primary;
  const Icon = TYPE_ICONS[n.type] ?? Info;
  const actor = n.actorId ? findProfile(n.actorId) : null;

  const linkTo =
    n.targetType === "profile"
      ? `/perfil/${n.targetId}`
      : `/comunidade/feed`;

  // Build grouped message
  let message = n.message;
  if (group.count > 1) {
    const otherCount = group.count - 1;
    const verb =
      n.type === "like"
        ? "curtiram"
        : n.type === "comment"
          ? "comentaram"
          : n.type === "follow"
            ? "seguiram voce"
            : "";
    if (verb) {
      const firstName = n.message.split(" ")[0];
      message = `${firstName} e +${otherCount} ${verb}`;
    }
  }

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border/20 last:border-0",
        group.hasUnread && "bg-primary/5"
      )}
    >
      {/* Avatar */}
      <Link
        to={linkTo}
        onClick={() => {
          if (group.hasUnread) onMarkRead();
          onClose();
        }}
        className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0"
      >
        {actor?.avatarUrl ? (
          <img src={getProxiedImageUrl(actor.avatarUrl)} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/20">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
      </Link>

      {/* Content */}
      <Link
        to={linkTo}
        onClick={() => {
          if (group.hasUnread) onMarkRead();
          onClose();
        }}
        className="flex-1 min-w-0"
      >
        <p className="text-sm leading-snug">
          {message}
          {group.count > 1 && (
            <span className="ml-1 text-[10px] text-muted-foreground font-medium bg-muted/50 px-1.5 py-0.5 rounded-full">
              {group.count}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(n.createdAt), {
            addSuffix: true,
            locale: ptBR,
          })}
        </p>
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {group.hasUnread && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkRead();
            }}
            className="p-1 rounded hover:bg-muted/80 text-muted-foreground hover:text-primary transition-colors"
            title="Marcar como lida"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-muted/80 text-muted-foreground hover:text-destructive transition-colors"
          title="Remover"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Unread dot */}
      {group.hasUnread && (
        <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary shrink-0" />
      )}
    </div>
  );
}

export const NotificationBell = memo(NotificationBellInner);
