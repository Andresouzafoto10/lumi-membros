import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PlatformSettings, ThemeColors } from "@/types/student";

const DEFAULT_SETTINGS: PlatformSettings = {
  name: "Master Membros",
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
    .maybeSingle();

  if (error) {
    console.error("[platform_settings] Falha ao carregar configurações:", error.message);
    return { ...DEFAULT_SETTINGS };
  }

  if (!data) return { ...DEFAULT_SETTINGS };

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
    faviconUrl: (data.favicon_url as string) ?? null,
    logoUploadUrl: (data.logo_upload_url as string) ?? null,
    pwaEnabled: (data.pwa_enabled as boolean) ?? false,
    pwaName: (data.pwa_name as string) ?? null,
    pwaShortName: (data.pwa_short_name as string) ?? null,
    pwaIconUrl: (data.pwa_icon_url as string) ?? null,
    pwaThemeColor: (data.pwa_theme_color as string) ?? null,
    pwaBackgroundColor: (data.pwa_background_color as string) ?? null,
    loginCoverUrl: (data.login_cover_url as string) ?? null,
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
    async (patch: Partial<PlatformSettings>) => {
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.logoUrl !== undefined) dbPatch.logo_url = patch.logoUrl;
      if (patch.defaultTheme !== undefined) dbPatch.default_theme = patch.defaultTheme;
      if (patch.ratingsEnabled !== undefined) dbPatch.ratings_enabled = patch.ratingsEnabled;
      if (patch.certificateBackgroundUrl !== undefined) dbPatch.certificate_background_url = patch.certificateBackgroundUrl;
      if (patch.certificateDefaultText !== undefined) dbPatch.certificate_default_text = patch.certificateDefaultText;
      if (patch.theme !== undefined) dbPatch.theme = patch.theme;
      if (patch.faviconUrl !== undefined) dbPatch.favicon_url = patch.faviconUrl;
      if (patch.logoUploadUrl !== undefined) dbPatch.logo_upload_url = patch.logoUploadUrl;
      if (patch.pwaEnabled !== undefined) dbPatch.pwa_enabled = patch.pwaEnabled;
      if (patch.pwaName !== undefined) dbPatch.pwa_name = patch.pwaName;
      if (patch.pwaShortName !== undefined) dbPatch.pwa_short_name = patch.pwaShortName;
      if (patch.pwaIconUrl !== undefined) dbPatch.pwa_icon_url = patch.pwaIconUrl;
      if (patch.pwaThemeColor !== undefined) dbPatch.pwa_theme_color = patch.pwaThemeColor;
      if (patch.pwaBackgroundColor !== undefined) dbPatch.pwa_background_color = patch.pwaBackgroundColor;
      if (patch.loginCoverUrl !== undefined) dbPatch.login_cover_url = patch.loginCoverUrl;
      const { error } = await supabase
        .from("platform_settings")
        .update(dbPatch)
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
