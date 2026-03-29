import { useCallback, useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Tracks last-seen timestamp per community for unread badge
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:community-last-seen";

type LastSeenMap = Record<string, string>; // { [communityId]: ISODate }

let state: LastSeenMap = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): LastSeenMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LastSeenMap;
  } catch {
    // ignore
  }
  return {};
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: LastSeenMap) {
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

export function useCommunityLastSeen() {
  const lastSeen = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const markSeen = useCallback((communityId: string) => {
    setState({ ...state, [communityId]: new Date().toISOString() });
  }, []);

  const getLastSeen = useCallback(
    (communityId: string): string | null => {
      return lastSeen[communityId] ?? null;
    },
    [lastSeen]
  );

  return { lastSeen, markSeen, getLastSeen };
}
