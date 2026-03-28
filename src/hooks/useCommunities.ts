import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Community, CommunitySettings } from "@/types/student";
import { mockCommunities } from "@/data/mock-communities";
import { useStudents } from "@/hooks/useStudents";

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:communities";

let state: Community[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): Community[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Community[];
  } catch {
    // ignore
  }
  return [...mockCommunities];
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: Community[]) {
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

export function useCommunities() {
  const communities = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { enrollments } = useStudents();

  const activeCommunities = useMemo(
    () => communities.filter((c) => c.status === "active"),
    [communities]
  );

  const findCommunity = useCallback(
    (id: string | undefined) =>
      id ? communities.find((c) => c.id === id) ?? null : null,
    [communities]
  );

  const findBySlug = useCallback(
    (slug: string | undefined) =>
      slug ? communities.find((c) => c.slug === slug) ?? null : null,
    [communities]
  );

  const getCommunitiesForStudent = useCallback(
    (studentId: string) => {
      // Get classIds the student is actively enrolled in
      const studentClassIds = enrollments
        .filter((e) => e.studentId === studentId && e.status === "active")
        .map((e) => e.classId);

      // Return active communities whose classIds overlap with student's classIds
      return communities.filter(
        (c) =>
          c.status === "active" &&
          c.classIds.some((classId) => studentClassIds.includes(classId))
      );
    },
    [communities, enrollments]
  );

  const getCommunitiesByClass = useCallback(
    (classId: string) =>
      communities.filter((c) => c.classIds.includes(classId)),
    [communities]
  );

  const createCommunity = useCallback(
    (data: {
      name: string;
      slug: string;
      description: string;
      coverUrl: string;
      iconUrl: string;
      classIds: string[];
      settings: CommunitySettings;
    }) => {
      const newCommunity: Community = {
        id: uuid(),
        name: data.name,
        slug: data.slug,
        description: data.description,
        coverUrl: data.coverUrl,
        iconUrl: data.iconUrl,
        classIds: data.classIds,
        pinnedPostId: null,
        settings: data.settings,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      setState([...state, newCommunity]);
      return newCommunity.id;
    },
    []
  );

  const updateCommunity = useCallback(
    (
      communityId: string,
      patch: Partial<
        Pick<
          Community,
          | "name"
          | "slug"
          | "description"
          | "coverUrl"
          | "iconUrl"
          | "classIds"
          | "settings"
          | "status"
        >
      >
    ) => {
      setState(
        state.map((c) => (c.id === communityId ? { ...c, ...patch } : c))
      );
    },
    []
  );

  const deleteCommunity = useCallback((communityId: string) => {
    setState(state.filter((c) => c.id !== communityId));
  }, []);

  const pinPost = useCallback(
    (communityId: string, postId: string) => {
      setState(
        state.map((c) =>
          c.id === communityId ? { ...c, pinnedPostId: postId } : c
        )
      );
    },
    []
  );

  const unpinPost = useCallback((communityId: string) => {
    setState(
      state.map((c) =>
        c.id === communityId ? { ...c, pinnedPostId: null } : c
      )
    );
  }, []);

  return {
    communities,
    activeCommunities,
    findCommunity,
    findBySlug,
    getCommunitiesForStudent,
    getCommunitiesByClass,
    createCommunity,
    updateCommunity,
    deleteCommunity,
    pinPost,
    unpinPost,
  };
}
