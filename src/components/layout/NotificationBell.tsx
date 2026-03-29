import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, Heart, MessageCircle, UserPlus, AtSign, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications } from "@/hooks/useNotifications";
import { useProfiles } from "@/hooks/useProfiles";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_ICONS = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  mention: AtSign,
  system: Info,
};

export function NotificationBell() {
  const { currentUserId } = useCurrentUser();
  const { getNotificationsForUser, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const { findProfile } = useProfiles();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const notifications = getNotificationsForUser(currentUserId).slice(0, 15);
  const count = unreadCount(currentUserId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 max-h-96 overflow-y-auto rounded-lg border bg-popover shadow-lg animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <p className="text-sm font-semibold">Notificacoes</p>
            {count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllAsRead(currentUserId)}
              >
                Marcar todas
              </Button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhuma notificacao.
            </p>
          ) : (
            <div>
              {notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] ?? Info;
                const actor = n.actorId ? findProfile(n.actorId) : null;

                const linkTo =
                  n.targetType === "profile"
                    ? `/perfil/${n.targetId}`
                    : `/comunidade/feed`;

                return (
                  <Link
                    key={n.id}
                    to={linkTo}
                    onClick={() => {
                      if (!n.read) markAsRead(n.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-accent transition-colors",
                      !n.read && "bg-primary/5 border-l-2 border-primary"
                    )}
                  >
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
                      {actor?.avatarUrl ? (
                        <img
                          src={actor.avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/20">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
