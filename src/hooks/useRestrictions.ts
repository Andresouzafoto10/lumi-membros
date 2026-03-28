import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { StudentRestriction } from "@/types/student";
import { mockRestrictions } from "@/data/mock-restrictions";

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:restrictions";

let state: StudentRestriction[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): StudentRestriction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StudentRestriction[];
  } catch {
    // ignore
  }
  return [...mockRestrictions];
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: StudentRestriction[]) {
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

function uuid(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRestrictions() {
  const restrictions = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const activeRestrictions = useMemo(
    () =>
      restrictions.filter((r) => {
        if (!r.active) return false;
        // If endsAt exists and is past, it's no longer active
        if (r.endsAt && new Date(r.endsAt) < new Date()) return false;
        return true;
      }),
    [restrictions]
  );

  const isRestricted = useCallback(
    (studentId: string) =>
      activeRestrictions.some((r) => r.studentId === studentId),
    [activeRestrictions]
  );

  const getRestriction = useCallback(
    (studentId: string) =>
      activeRestrictions.find((r) => r.studentId === studentId) ?? null,
    [activeRestrictions]
  );

  const getRestrictionsForStudent = useCallback(
    (studentId: string) =>
      restrictions
        .filter((r) => r.studentId === studentId)
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    [restrictions]
  );

  const addRestriction = useCallback(
    (data: {
      studentId: string;
      reason: string;
      appliedBy: string;
      durationDays: number | null; // null = permanent
    }) => {
      const now = new Date();
      const newRestriction: StudentRestriction = {
        id: uuid(),
        studentId: data.studentId,
        reason: data.reason,
        appliedBy: data.appliedBy,
        startsAt: now.toISOString(),
        endsAt: data.durationDays
          ? new Date(
              now.getTime() + data.durationDays * 24 * 60 * 60 * 1000
            ).toISOString()
          : null,
        active: true,
      };
      setState([...state, newRestriction]);
      return newRestriction.id;
    },
    []
  );

  const removeRestriction = useCallback((restrictionId: string) => {
    setState(
      state.map((r) =>
        r.id === restrictionId ? { ...r, active: false } : r
      )
    );
  }, []);

  return {
    restrictions,
    activeRestrictions,
    isRestricted,
    getRestriction,
    getRestrictionsForStudent,
    addRestriction,
    removeRestriction,
  };
}
