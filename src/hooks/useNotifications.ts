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
  // Defence-in-depth: filter by current user even though RLS should enforce it
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
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

// ---------------------------------------------------------------------------
// Grouped notification type for UI display
// ---------------------------------------------------------------------------

export interface GroupedNotification {
  /** First (newest) notification in the group */
  primary: AppNotification;
  /** All notifications in this group */
  items: AppNotification[];
  /** Count of notifications grouped together */
  count: number;
  /** Whether the group has any unread items */
  hasUnread: boolean;
}

/**
 * Groups notifications by target_id + type within 24h windows.
 * E.g. 3 likes on the same post → one group with count=3.
 */
function groupNotifications(notifications: AppNotification[]): GroupedNotification[] {
  const groups: GroupedNotification[] = [];
  const keyMap = new Map<string, GroupedNotification>();
  const DAY_MS = 24 * 60 * 60 * 1000;

  for (const n of notifications) {
    const dateKey = Math.floor(new Date(n.createdAt).getTime() / DAY_MS);
    const key = `${n.type}:${n.targetId}:${dateKey}`;

    const existing = keyMap.get(key);
    if (existing) {
      existing.items.push(n);
      existing.count = existing.items.length;
      if (!n.read) existing.hasUnread = true;
    } else {
      const group: GroupedNotification = {
        primary: n,
        items: [n],
        count: 1,
        hasUnread: !n.read,
      };
      keyMap.set(key, group);
      groups.push(group);
    }
  }

  return groups;
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

  const getGroupedForUser = useCallback(
    (recipientId: string) => {
      const userNotifs = notifications
        .filter((n) => n.recipientId === recipientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return groupNotifications(userNotifs);
    },
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

  const markGroupAsRead = useCallback(
    async (group: GroupedNotification) => {
      const unreadIds = group.items.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length === 0) return;
      await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds);
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

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);
      invalidate();
    },
    [invalidate]
  );

  const deleteAllRead = useCallback(
    async (recipientId: string) => {
      await supabase
        .from("notifications")
        .delete()
        .eq("recipient_id", recipientId)
        .eq("read", true);
      invalidate();
    },
    [invalidate]
  );

  const clearAll = useCallback(
    async (recipientId: string) => {
      await supabase
        .from("notifications")
        .delete()
        .eq("recipient_id", recipientId);
      invalidate();
    },
    [invalidate]
  );

  return {
    notifications,
    loading: isLoading,
    getNotificationsForUser,
    getGroupedForUser,
    unreadCount,
    unreadCountMemo,
    markAsRead,
    markGroupAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    clearAll,
  };
}
