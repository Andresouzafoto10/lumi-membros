import { getProxiedImageUrl } from "@/lib/imageProxy";

// NOTA: O manifest do PWA NÃO é mais injetado em runtime.
// Antes usávamos um blob: URL, mas navegadores não consideram manifests
// blob/data instaláveis (scope/start_url ficam fora de escopo).
// Agora o manifest é servido de mesma origem por /manifest.webmanifest
// (função serverless api/manifest.ts, dinâmica via platform_settings),
// linkado estaticamente em index.html.

export function applyFavicon(faviconUrl: string | null | undefined) {
  if (!faviconUrl) return;
  const proxiedFaviconUrl = getProxiedImageUrl(faviconUrl);

  let link = document.querySelector(
    "link[rel='icon']"
  ) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = proxiedFaviconUrl;
}
