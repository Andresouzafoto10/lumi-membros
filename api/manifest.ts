// Vercel serverless function — manifest PWA dinâmico.
//
// Servido em /manifest.webmanifest via rewrite no vercel.json (mesma origem,
// requisito do Chrome para instalabilidade). Lê platform_settings (coluna
// anon-readable) para que o nome/cores/ícone configurados no painel admin
// valham AO VIVO no app instalado.
//
// Por que existe: a abordagem anterior injetava o manifest como blob: URL no
// runtime, e navegadores não consideram manifests blob/data instaláveis
// (o scope deriva da URL blob e start_url "/" fica fora de escopo).

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://gdbkbeurjjtjgmrmfngk.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const FALLBACK = {
  name: "Master Membros",
  short_name: "Master",
  theme_color: "#00C2CB",
  background_color: "#09090b",
};

// Ícones same-origin garantem instalabilidade mesmo se o R2 falhar.
const BASE_ICONS = [
  { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  {
    src: "/pwa-maskable-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
];

interface SettingsRow {
  name?: string | null;
  pwa_enabled?: boolean | null;
  pwa_name?: string | null;
  pwa_short_name?: string | null;
  pwa_theme_color?: string | null;
  pwa_background_color?: string | null;
  pwa_icon_url?: string | null;
}

async function loadSettings(): Promise<SettingsRow | null> {
  if (!SUPABASE_ANON_KEY) return null;
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/platform_settings` +
      `?select=name,pwa_enabled,pwa_name,pwa_short_name,pwa_theme_color,pwa_background_color,pwa_icon_url&limit=1`;
    const r = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!r.ok) return null;
    const rows = (await r.json()) as SettingsRow[];
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch {
    return null;
  }
}

export default async function handler(
  _req: { method?: string },
  res: {
    setHeader: (k: string, v: string) => void;
    status: (n: number) => { send: (b: string) => void };
  }
) {
  const s = await loadSettings();

  const name = String(s?.pwa_name || s?.name || FALLBACK.name);
  const shortName = String(s?.pwa_short_name || s?.name || FALLBACK.short_name).slice(0, 12);

  // Ícone do admin entra como entrada extra (dinâmico). Bundled cobre o caso
  // de falha/ausência. Browser escolhe o melhor disponível.
  const icons = [...BASE_ICONS];
  const adminIcon = s?.pwa_icon_url?.trim();
  if (adminIcon && /^https?:\/\//i.test(adminIcon)) {
    icons.push({ src: adminIcon, sizes: "512x512", type: "image/png", purpose: "any" });
  }

  const manifest = {
    id: "/",
    name,
    short_name: shortName,
    // App instalado abre no login (não na landing de vendas "/"). Se houver
    // sessão lembrada, a LoginPage redireciona direto para /cursos.
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: s?.pwa_background_color || FALLBACK.background_color,
    theme_color: s?.pwa_theme_color || FALLBACK.theme_color,
    icons,
  };

  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  // Cache na CDN 5min, revalida em background. Mudanças no admin refletem rápido.
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=300, stale-while-revalidate=600"
  );
  res.status(200).send(JSON.stringify(manifest));
}
