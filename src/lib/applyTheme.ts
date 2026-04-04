import type { ThemeColors } from "@/types/student";

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

export function applyThemeToCss(dark: ThemeColors, light: ThemeColors) {
  let el = document.getElementById("lumi-custom-theme") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "lumi-custom-theme";
    document.head.appendChild(el);
  }
  el.textContent = [
    ":root {",
    `  --primary: ${hexToHsl(light.primary)};`,
    `  --background: ${hexToHsl(light.background)};`,
    `  --card: ${hexToHsl(light.card)};`,
    `  --foreground: ${hexToHsl(light.foreground)};`,
    `  --ring: ${hexToHsl(light.primary)};`,
    "}",
    ".dark {",
    `  --primary: ${hexToHsl(dark.primary)};`,
    `  --background: ${hexToHsl(dark.background)};`,
    `  --card: ${hexToHsl(dark.card)};`,
    `  --foreground: ${hexToHsl(dark.foreground)};`,
    `  --ring: ${hexToHsl(dark.primary)};`,
    "}",
  ].join("\n");
}
