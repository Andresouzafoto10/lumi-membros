import type { PlatformSettings } from "@/types/student";

export function applyPwaManifest(settings: PlatformSettings) {
  if (!settings.pwaEnabled) return;

  const manifest = {
    name: settings.pwaName || settings.name || "Lumi Membros",
    short_name:
      settings.pwaShortName || (settings.name || "Lumi").slice(0, 12),
    start_url: "/",
    display: "standalone" as const,
    background_color: settings.pwaBackgroundColor || "#09090b",
    theme_color: settings.pwaThemeColor || "#00C2CB",
    icons: settings.pwaIconUrl
      ? [
          { src: settings.pwaIconUrl, sizes: "192x192", type: "image/png" },
          { src: settings.pwaIconUrl, sizes: "512x512", type: "image/png" },
        ]
      : [],
  };

  const blob = new Blob([JSON.stringify(manifest)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  let link = document.querySelector(
    "link[rel='manifest']"
  ) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "manifest";
    document.head.appendChild(link);
  }
  link.href = url;
}

export function applyFavicon(faviconUrl: string | null | undefined) {
  if (!faviconUrl) return;

  let link = document.querySelector(
    "link[rel='icon']"
  ) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = faviconUrl;
}
