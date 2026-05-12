// Shared Cakto OAuth2 client used by cakto-api and cakto-reconcile functions.
// Caches the access_token in `cakto_oauth_tokens` table (expires in ~10h per Cakto docs).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CAKTO_BASE_URL = "https://api.cakto.com.br";
const TOKEN_ENDPOINT = `${CAKTO_BASE_URL}/public_api/token/`;
const TOKEN_SAFETY_MARGIN_SEC = 120;

export type CaktoToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

export async function getCaktoAccessToken(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const nowIso = new Date(Date.now() + TOKEN_SAFETY_MARGIN_SEC * 1000).toISOString();
  const { data: cached } = await supabase
    .from("cakto_oauth_tokens")
    .select("access_token, expires_at")
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached?.access_token) return cached.access_token as string;

  const clientId = Deno.env.get("CAKTO_CLIENT_ID");
  const clientSecret = Deno.env.get("CAKTO_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error(
      "CAKTO_CLIENT_ID / CAKTO_CLIENT_SECRET ausentes nos secrets do projeto"
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha OAuth Cakto (${res.status}): ${text.slice(0, 300)}`);
  }

  const token = (await res.json()) as CaktoToken;
  if (!token.access_token) throw new Error("Resposta OAuth Cakto sem access_token");

  const expiresAt = new Date(
    Date.now() + (token.expires_in ?? 36000) * 1000
  ).toISOString();

  // Prune previous tokens (keep table small).
  await supabase.from("cakto_oauth_tokens").delete().lt("expires_at", new Date().toISOString());
  await supabase.from("cakto_oauth_tokens").insert({
    access_token: token.access_token,
    token_type: token.token_type ?? "Bearer",
    scope: token.scope ?? null,
    expires_at: expiresAt,
  });

  return token.access_token;
}

export async function caktoFetch(
  supabase: ReturnType<typeof createClient>,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): Promise<{ status: number; data: unknown }> {
  const token = await getCaktoAccessToken(supabase);
  const url = path.startsWith("http") ? path : `${CAKTO_BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // keep as raw text
  }
  return { status: res.status, data: parsed };
}

export function isAuthorizedAdmin(authHeader: string | null): {
  token: string | null;
  ok: boolean;
} {
  if (!authHeader?.startsWith("Bearer ")) return { token: null, ok: false };
  return { token: authHeader.slice(7), ok: true };
}

export async function assertAdmin(
  supabase: ReturnType<typeof createClient>,
  jwt: string
): Promise<boolean> {
  const { data: userRes, error } = await supabase.auth.getUser(jwt);
  if (error || !userRes?.user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userRes.user.id)
    .maybeSingle();
  const role = (profile?.role as string | undefined) ?? "";
  return ["owner", "admin", "support"].includes(role);
}
