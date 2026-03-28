import { useCallback, useSyncExternalStore } from "react";
import type { AccessProfile } from "@/types/student";

// ---------------------------------------------------------------------------
// System (fixed) profiles — never persisted, always present
// ---------------------------------------------------------------------------

const SYSTEM_PROFILES: AccessProfile[] = [
  {
    id: "system-aluno",
    name: "Aluno",
    description: "Acesso ao conteúdo da plataforma como estudante.",
    permissions: {
      courses: false,
      students: false,
      classes: false,
      settings: false,
      community: true,
    },
  },
  {
    id: "system-moderador",
    name: "Moderador",
    description: "Moderação de conteúdo e suporte aos alunos.",
    permissions: {
      courses: true,
      students: true,
      classes: false,
      settings: false,
      community: true,
    },
  },
  {
    id: "system-admin",
    name: "Administrador",
    description: "Acesso total à plataforma.",
    permissions: {
      courses: true,
      students: true,
      classes: true,
      settings: true,
      community: true,
    },
  },
];

// ---------------------------------------------------------------------------
// Store — custom profiles only
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:access-profiles";

let state: AccessProfile[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): AccessProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AccessProfile[];
  } catch {
    // ignore
  }
  return [];
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: AccessProfile[]) {
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

export function useAccessProfiles() {
  const customProfiles = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const createProfile = useCallback(
    (data: Omit<AccessProfile, "id">) => {
      const profile: AccessProfile = {
        ...data,
        id: `profile-${Date.now()}`,
      };
      setState([...state, profile]);
      return profile;
    },
    []
  );

  const updateProfile = useCallback((id: string, patch: Partial<AccessProfile>) => {
    setState(state.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setState(state.filter((p) => p.id !== id));
  }, []);

  return {
    systemProfiles: SYSTEM_PROFILES,
    customProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
  };
}
