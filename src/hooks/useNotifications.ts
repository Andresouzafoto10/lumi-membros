import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { AppNotification } from "@/types/student";
import { mockNotifications } from "@/data/mock-notifications";

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:notifications";

let state: AppNotification[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppNotification[];
  } catch {
    // ignore
  }
  return [...mockNotifications];
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: AppNotification[]) {
  state = next;
  persist();
  listeners.forEach((fn) => fn());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotifications() {
  const notifications = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const getNotificationsForUser = useCallback(
    (recipientId: string) =>
      notifications
        .filter((n) => n.recipientId === recipientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notifications]
  );

  const unreadCount = useCallback(
    (recipientId: string) =>
      notifications.filter(
        (n) => n.recipientId === recipientId && !n.read
      ).length,
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

  const markAsRead = useCallback((notificationId: string) => {
    setState(
      state.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }, []);

  const markAllAsRead = useCallback((recipientId: string) => {
    setState(
      state.map((n) =>
        n.recipientId === recipientId && !n.read ? { ...n, read: true } : n
      )
    );
  }, []);

  return {
    notifications,
    getNotificationsForUser,
    unreadCount,
    unreadCountMemo,
    markAsRead,
    markAllAsRead,
  };
}
