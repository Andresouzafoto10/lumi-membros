import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AppNotification } from "@/types/student";

const QK = ["notifications"] as const;

function mapRow(n: Record<string, unknown>): AppNotification {
  return {
    id: n.id as string,
    recipientId: n.recipient_id as string,
    type: n.type as AppNotification["type"],
    actorId: n.actor_id as string | null,
    targetId: n.target_id as string,
    targetType: n.target_type as AppNotification["targetType"],
    message: n.message as string,
    read: n.read as boolean,
    createdAt: n.created_at as string,
  };
}

async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

// Direct mutator — kept for compat with hooks that call addNotification()
export async function addNotification(data: {
  type: AppNotification["type"];
  recipientId: string;
  actorId: string | null;
  targetId: string;
  targetType: AppNotification["targetType"];
  message: string;
}) {
  await supabase.from("notifications").insert({
    recipient_id: data.recipientId,
    type: data.type,
    actor_id: data.actorId,
    target_id: data.targetId,
    target_type: data.targetType,
    message: data.message,
    read: false,
  });
}

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchNotifications,
    staleTime: 1000 * 30,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  const getNotificationsForUser = useCallback(
    (recipientId: string) =>
      notifications
        .filter((n) => n.recipientId === recipientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notifications]
  );

  const unreadCount = useCallback(
    (recipientId: string) =>
      notifications.filter((n) => n.recipientId === recipientId && !n.read)
        .length,
    [notifications]
  );

  const unreadCountMemo = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of notifications) {
      if (!n.read) {
        map[n.recipientId] = (map[n.recipientId] ?? 0) + 1;
      }
    }
    return map;
  }, [notifications]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);
      invalidate();
    },
    [invalidate]
  );

  const markAllAsRead = useCallback(
    async (recipientId: string) => {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("recipient_id", recipientId)
        .eq("read", false);
      invalidate();
    },
    [invalidate]
  );

  return {
    notifications,
    loading: isLoading,
    getNotificationsForUser,
    unreadCount,
    unreadCountMemo,
    markAsRead,
    markAllAsRead,
  };
}
