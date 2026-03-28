import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "lumi-membros:last-watched";

type LastWatched = {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  timestamp: number;
} | null;

let cached: LastWatched = load();
const listeners = new Set<() => void>();

function load(): LastWatched {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(value: LastWatched) {
  cached = value;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return cached;
}

export function useLastWatched() {
  const lastWatched = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setLastWatched = useCallback(
    (data: {
      courseId: string;
      courseTitle: string;
      lessonId: string;
      lessonTitle: string;
    }) => {
      save({ ...data, timestamp: Date.now() });
    },
    []
  );

  return { lastWatched, setLastWatched };
}
