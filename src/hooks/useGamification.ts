import { useCallback, useSyncExternalStore } from "react";
import type { GamificationData } from "@/types/student";
import { mockGamification, BADGES } from "@/data/mock-gamification";

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:gamification";

let state: GamificationData[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): GamificationData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as GamificationData[];
  } catch {
    // ignore
  }
  return [...mockGamification];
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: GamificationData[]) {
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

export function useGamification() {
  const gamificationData = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const getPlayerData = useCallback(
    (studentId: string) =>
      gamificationData.find((g) => g.studentId === studentId) ?? {
        studentId,
        points: 0,
        badges: [],
      },
    [gamificationData]
  );

  const getBadgeDetails = useCallback(
    (badgeId: string) => BADGES.find((b) => b.id === badgeId) ?? null,
    []
  );

  const getPlayerBadges = useCallback(
    (studentId: string) => {
      const data = gamificationData.find((g) => g.studentId === studentId);
      if (!data) return [];
      return data.badges
        .map((id) => BADGES.find((b) => b.id === id))
        .filter(Boolean) as typeof BADGES;
    },
    [gamificationData]
  );

  const getPrimaryBadge = useCallback(
    (studentId: string) => {
      const badges = getPlayerBadges(studentId);
      // Return the last (most recently earned) badge as primary
      return badges.length > 0 ? badges[badges.length - 1] : null;
    },
    [getPlayerBadges]
  );

  return {
    gamificationData,
    badges: BADGES,
    getPlayerData,
    getBadgeDetails,
    getPlayerBadges,
    getPrimaryBadge,
  };
}
