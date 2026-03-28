import { useCallback, useSyncExternalStore } from "react";
import type { PlatformSettings, ThemeColors } from "@/types/student";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: PlatformSettings = {
  name: "Lumi Membros",
  logoUrl: "",
  defaultTheme: "dark",
  ratingsEnabled: true,
  certificateBackgroundUrl: "",
  certificateDefaultText:
    "Certificamos que {{nome}} concluiu com êxito o curso {{curso}}, com carga horária de {{horas}} horas.",
  theme: {
    dark: {
      primary: "#00C2CB",
      background: "#09090b",
      card: "#18181b",
      foreground: "#fafafa",
    },
    light: {
      primary: "#00C2CB",
      background: "#ffffff",
      card: "#f4f4f5",
      foreground: "#09090b",
    },
  },
};

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:platform-settings";

let state: PlatformSettings = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): PlatformSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as PlatformSettings) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: PlatformSettings) {
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

export function usePlatformSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const updateSettings = useCallback(
    (patch: Partial<Omit<PlatformSettings, "theme">>) => {
      setState({ ...state, ...patch });
    },
    []
  );

  const updateThemeColors = useCallback(
    (mode: "dark" | "light", colors: Partial<ThemeColors>) => {
      setState({
        ...state,
        theme: {
          ...state.theme,
          [mode]: { ...state.theme[mode], ...colors },
        },
      });
    },
    []
  );

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ ...DEFAULT_SETTINGS });
  }, []);

  return {
    settings,
    updateSettings,
    updateThemeColors,
    resetSettings,
  };
}
