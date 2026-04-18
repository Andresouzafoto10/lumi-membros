/**
 * Shared CORS helper for all Master Membros Edge Functions.
 *
 * Replaces the per-function `ALLOWED_ORIGIN = Deno.env.get("APP_URL") || "*"`
 * pattern (which fell back to wildcard "*" when env var missing).
 *
 * Usage inside a handler:
 *   const corsHeaders = makeCorsHeaders(req);
 *   if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
 *
 * APP_URL or VITE_APP_URL accept a comma-separated list of allowed origins, e.g.:
 *   APP_URL="https://app.membrosmaster.com.br,https://teste.membrosmaster.com.br"
 */

const FALLBACK_ORIGINS = [
  "https://app.membrosmaster.com.br",
  "https://teste.membrosmaster.com.br",
  "http://localhost:5174",
];

export function getAllowedOrigins(): string[] {
  const env =
    Deno.env.get("APP_URL") ??
    Deno.env.get("VITE_APP_URL") ??
    "";
  if (!env.trim()) return FALLBACK_ORIGINS;
  return env
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function makeCorsHeaders(req: Request): Record<string, string> {
  const origins = getAllowedOrigins();
  const origin = req.headers.get("Origin") ?? "";
  const allowed = origins.includes(origin) ? origin : origins[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}
