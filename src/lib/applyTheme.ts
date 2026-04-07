import type { ThemeColors } from "@/types/student";

const CACHE_KEY = "lumi-theme-cache";

function hexToHsl(hex: string): string {
  const m = hex.replace("#", "").match(/([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i);
  if (!m) return "0 0% 0%";
  let r = parseInt(m[1], 16) / 255;
  let g = parseInt(m[2], 16) / 255;
  let b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function buildThemeCss(dark: ThemeColors, light: ThemeColors): string {
  return [
    ":root {",
    `  --primary: ${hexToHsl(light.primary)};`,
    `  --background: ${hexToHsl(light.background)};`,
    `  --card: ${hexToHsl(light.card)};`,
    `  --foreground: ${hexToHsl(light.foreground)};`,
    `  --ring: ${hexToHsl(light.primary)};`,
    `  --sidebar-primary: ${hexToHsl(light.primary)};`,
    `  --sidebar-accent-foreground: ${hexToHsl(light.primary)};`,
    `  --sidebar-ring: ${hexToHsl(light.primary)};`,
    "}",
    ".dark {",
    `  --primary: ${hexToHsl(dark.primary)};`,
    `  --background: ${hexToHsl(dark.background)};`,
    `  --card: ${hexToHsl(dark.card)};`,
    `  --foreground: ${hexToHsl(dark.foreground)};`,
    `  --ring: ${hexToHsl(dark.primary)};`,
    `  --sidebar-primary: ${hexToHsl(dark.primary)};`,
    `  --sidebar-accent-foreground: ${hexToHsl(dark.primary)};`,
    `  --sidebar-ring: ${hexToHsl(dark.primary)};`,
    "}",
  ].join("\n");
}

function injectStyle(css: string) {
  let el = document.getElementById("lumi-custom-theme") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "lumi-custom-theme";
    document.head.appendChild(el);
  }
  el.textContent = css;
}

/** Save theme to localStorage for instant application on next page load. */
function cacheTheme(dark: ThemeColors, light: ThemeColors) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ dark, light }));
  } catch { /* quota exceeded — ignore */ }
}

/**
 * Apply cached theme instantly (called before React mounts).
 * Returns true if a cached theme was found and applied.
 */
export function applyCachedTheme(): boolean {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const { dark, light } = JSON.parse(raw) as { dark: ThemeColors; light: ThemeColors };
    if (dark?.primary && light?.primary) {
      injectStyle(buildThemeCss(dark, light));
      return true;
    }
  } catch { /* corrupt cache — ignore */ }
  return false;
}

/**
 * Fetch theme directly from Supabase REST API (no SDK needed).
 * Used on first visit when no cache exists — runs before React mounts so
 * the user never sees the default teal colors.
 */
export async function fetchAndApplyTheme(): Promise<void> {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (!url || !key) return;

  try {
    const res = await fetch(
      `${url}/rest/v1/platform_settings?id=eq.default&select=theme`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      }
    );
    if (!res.ok) return;
    const rows = await res.json();
    const theme = rows?.[0]?.theme;
    if (theme?.dark?.primary && theme?.light?.primary) {
      applyThemeToCss(theme.dark, theme.light);
    }
  } catch { /* network error — app will retry via React Query */ }
}

/** Apply theme from Supabase settings and cache for next load. */
export function applyThemeToCss(dark: ThemeColors, light: ThemeColors) {
  injectStyle(buildThemeCss(dark, light));
  cacheTheme(dark, light);
}
