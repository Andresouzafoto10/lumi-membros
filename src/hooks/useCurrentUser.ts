import { useSyncExternalStore, useCallback } from "react";

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:current-user";
const DEFAULT_USER = "aluno-001";

let state: string = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_USER;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, state);
  } catch {
    // ignore
  }
}

function setState(next: string) {
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

export function useCurrentUser() {
  const currentUserId = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const switchUser = useCallback((studentId: string) => {
    setState(studentId);
  }, []);

  return { currentUserId, switchUser };
}
