import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PlatformSettings, ThemeColors } from "@/types/student";

const DEFAULT_SETTINGS: PlatformSettings = {
  name: "Lumi Membros",
  logoUrl: "",
  defaultTheme: "dark",
  ratingsEnabled: true,
  emailNotificationsEnabled: true,
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

const QK = ["platform-settings"] as const;

function mergeTheme(
  raw: unknown
): PlatformSettings["theme"] {
  const def = DEFAULT_SETTINGS.theme;
  if (!raw || typeof raw !== "object") return { ...def };
  const t = raw as Record<string, unknown>;
  const mergeSide = (
    side: unknown,
    fallback: ThemeColors
  ): ThemeColors => {
    if (!side || typeof side !== "object") return { ...fallback };
    const s = side as Record<string, unknown>;
    return {
      primary: (typeof s.primary === "string" && s.primary) || fallback.primary,
      background: (typeof s.background === "string" && s.background) || fallback.background,
      card: (typeof s.card === "string" && s.card) || fallback.card,
      foreground: (typeof s.foreground === "string" && s.foreground) || fallback.foreground,
    };
  };
  return {
    dark: mergeSide(t.dark, def.dark),
    light: mergeSide(t.light, def.light),
  };
}

async function fetchSettings(): Promise<PlatformSettings> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("id", "default")
    .single();
  if (error || !data) return { ...DEFAULT_SETTINGS };
  return {
    name: (data.name as string) ?? DEFAULT_SETTINGS.name,
    logoUrl: (data.logo_url as string) ?? "",
    defaultTheme: (data.default_theme as "dark" | "light") ?? "dark",
    ratingsEnabled: (data.ratings_enabled as boolean) ?? true,
    emailNotificationsEnabled: (data.email_notifications_enabled as boolean) ?? true,
    certificateBackgroundUrl: (data.certificate_background_url as string) ?? "",
    certificateDefaultText:
      (data.certificate_default_text as string) ??
      DEFAULT_SETTINGS.certificateDefaultText,
    theme: mergeTheme(data.theme),
  };
}

export function usePlatformSettings() {
  const queryClient = useQueryClient();

  const { data: settings = DEFAULT_SETTINGS, isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 10,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  const updateSettings = useCallback(
    async (patch: Partial<Omit<PlatformSettings, "theme">>) => {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.logoUrl !== undefined && { logo_url: patch.logoUrl }),
          ...(patch.defaultTheme !== undefined && {
            default_theme: patch.defaultTheme,
          }),
          ...(patch.ratingsEnabled !== undefined && {
            ratings_enabled: patch.ratingsEnabled,
          }),
          ...(patch.emailNotificationsEnabled !== undefined && {
            email_notifications_enabled: patch.emailNotificationsEnabled,
          }),
          ...(patch.certificateBackgroundUrl !== undefined && {
            certificate_background_url: patch.certificateBackgroundUrl,
          }),
          ...(patch.certificateDefaultText !== undefined && {
            certificate_default_text: patch.certificateDefaultText,
          }),
        })
        .eq("id", "default");
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const updateThemeColors = useCallback(
    async (mode: "dark" | "light", colors: Partial<ThemeColors>) => {
      const newTheme = {
        ...settings.theme,
        [mode]: { ...settings.theme[mode], ...colors },
      };
      const { error } = await supabase
        .from("platform_settings")
        .update({ theme: newTheme })
        .eq("id", "default");
      if (error) throw error;
      invalidate();
    },
    [settings, invalidate]
  );

  const resetSettings = useCallback(async () => {
    const { error } = await supabase
      .from("platform_settings")
      .update({
        name: DEFAULT_SETTINGS.name,
        logo_url: DEFAULT_SETTINGS.logoUrl,
        default_theme: DEFAULT_SETTINGS.defaultTheme,
        ratings_enabled: DEFAULT_SETTINGS.ratingsEnabled,
        email_notifications_enabled: DEFAULT_SETTINGS.emailNotificationsEnabled,
        certificate_background_url: DEFAULT_SETTINGS.certificateBackgroundUrl,
        certificate_default_text: DEFAULT_SETTINGS.certificateDefaultText,
        theme: DEFAULT_SETTINGS.theme,
      })
      .eq("id", "default");
    if (error) throw error;
    invalidate();
  }, [invalidate]);

  return {
    settings,
    loading: isLoading,
    updateSettings,
    updateThemeColors,
    resetSettings,
  };
}
