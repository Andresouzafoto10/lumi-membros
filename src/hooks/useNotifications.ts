import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
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
  const { error } = await supabase.from("notifications").insert({
    recipient_id: data.recipientId,
    type: data.type,
    actor_id: data.actorId,
    target_id: data.targetId,
    target_type: data.targetType,
    message: data.message,
    read: false,
  });
  if (error) console.error("[notifications] insert:", error.message);
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
  const { user } = useAuth();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchNotifications,
    staleTime: 1000 * 60 * 5, // 5 min — Realtime handles live updates
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  // Supabase Realtime — instant bell updates on INSERT/UPDATE/DELETE.
  // Channel is user-scoped to avoid collisions when the hook mounts in
  // multiple components simultaneously.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-realtime:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QK });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

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
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);
      if (error) console.error("[notifications] markAsRead:", error.message);
      invalidate();
    },
    [invalidate]
  );

  const markGroupAsRead = useCallback(
    async (group: GroupedNotification) => {
      const unreadIds = group.items.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length === 0) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds);
      if (error) console.error("[notifications] markGroupAsRead:", error.message);
      invalidate();
    },
    [invalidate]
  );

  const markAllAsRead = useCallback(
    async (recipientId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("recipient_id", recipientId)
        .eq("read", false);
      if (error) console.error("[notifications] markAllAsRead:", error.message);
      invalidate();
    },
    [invalidate]
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);
      if (error) console.error("[notifications] delete:", error.message);
      invalidate();
    },
    [invalidate]
  );

  const deleteAllRead = useCallback(
    async (recipientId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("recipient_id", recipientId)
        .eq("read", true);
      if (error) console.error("[notifications] deleteAllRead:", error.message);
      invalidate();
    },
    [invalidate]
  );

  const clearAll = useCallback(
    async (recipientId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("recipient_id", recipientId);
      if (error) console.error("[notifications] clearAll:", error.message);
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
