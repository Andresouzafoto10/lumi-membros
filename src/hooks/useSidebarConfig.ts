import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { CommunitySidebarItem } from "@/types/student";
import { mockSidebarConfig } from "@/data/mock-sidebar-config";

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:community-sidebar";

let state: CommunitySidebarItem[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): CommunitySidebarItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CommunitySidebarItem[];
  } catch {
    // ignore
  }
  return [...mockSidebarConfig];
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: CommunitySidebarItem[]) {
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

export function useSidebarConfig() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.order - b.order),
    [items]
  );

  const findByCommunityId = useCallback(
    (communityId: string) =>
      items.find((i) => i.communityId === communityId) ?? null,
    [items]
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<Omit<CommunitySidebarItem, "id">>) => {
      setState(state.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    },
    []
  );

  const reorder = useCallback((orderedIds: string[]) => {
    setState(
      state.map((item) => {
        const idx = orderedIds.indexOf(item.id);
        return idx >= 0 ? { ...item, order: idx } : item;
      })
    );
  }, []);

  const addItem = useCallback((communityId: string) => {
    const newItem: CommunitySidebarItem = {
      id: crypto.randomUUID(),
      communityId,
      emoji: "💬",
      order: state.length,
      visible: true,
      salesPageUrl: "",
    };
    setState([...state, newItem]);
    return newItem.id;
  }, []);

  const removeItem = useCallback((id: string) => {
    setState(state.filter((i) => i.id !== id));
  }, []);

  return {
    items: sortedItems,
    findByCommunityId,
    updateItem,
    reorder,
    addItem,
    removeItem,
  };
}
