import { useCallback, useSyncExternalStore } from "react";
import type { StudentProfile } from "@/types/student";
import { mockProfiles } from "@/data/mock-profiles";

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:profiles";

let state: StudentProfile[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): StudentProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StudentProfile[];
  } catch {
    // ignore
  }
  return [...mockProfiles];
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: StudentProfile[]) {
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

export function useProfiles() {
  const profiles = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const findProfile = useCallback(
    (studentId: string | undefined) =>
      studentId ? profiles.find((p) => p.studentId === studentId) ?? null : null,
    [profiles]
  );

  const findProfileByUsername = useCallback(
    (username: string | undefined) =>
      username ? profiles.find((p) => p.username === username) ?? null : null,
    [profiles]
  );

  const updateProfile = useCallback(
    (
      profileId: string,
      patch: Partial<
        Pick<
          StudentProfile,
          | "username"
          | "displayName"
          | "avatarUrl"
          | "coverUrl"
          | "bio"
          | "link"
          | "location"
        >
      >
    ) => {
      setState(
        state.map((p) => (p.id === profileId ? { ...p, ...patch } : p))
      );
    },
    []
  );

  const follow = useCallback(
    (myStudentId: string, targetStudentId: string) => {
      setState(
        state.map((p) => {
          if (p.studentId === myStudentId && !p.following.includes(targetStudentId)) {
            return { ...p, following: [...p.following, targetStudentId] };
          }
          if (p.studentId === targetStudentId && !p.followers.includes(myStudentId)) {
            return { ...p, followers: [...p.followers, myStudentId] };
          }
          return p;
        })
      );
    },
    []
  );

  const unfollow = useCallback(
    (myStudentId: string, targetStudentId: string) => {
      setState(
        state.map((p) => {
          if (p.studentId === myStudentId) {
            return {
              ...p,
              following: p.following.filter((id) => id !== targetStudentId),
            };
          }
          if (p.studentId === targetStudentId) {
            return {
              ...p,
              followers: p.followers.filter((id) => id !== myStudentId),
            };
          }
          return p;
        })
      );
    },
    []
  );

  const isFollowing = useCallback(
    (myStudentId: string, targetStudentId: string) => {
      const myProfile = profiles.find((p) => p.studentId === myStudentId);
      return myProfile ? myProfile.following.includes(targetStudentId) : false;
    },
    [profiles]
  );

  const getFollowers = useCallback(
    (studentId: string) => {
      const profile = profiles.find((p) => p.studentId === studentId);
      return profile ? profile.followers : [];
    },
    [profiles]
  );

  const getFollowing = useCallback(
    (studentId: string) => {
      const profile = profiles.find((p) => p.studentId === studentId);
      return profile ? profile.following : [];
    },
    [profiles]
  );

  return {
    profiles,
    findProfile,
    findProfileByUsername,
    updateProfile,
    follow,
    unfollow,
    isFollowing,
    getFollowers,
    getFollowing,
  };
}
