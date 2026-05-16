// Admin-only edge function returning auth/activity stats for one student.
//
//   - createdAt      → auth.users.created_at (account creation)
//   - firstAccessAt  → auth.users.email_confirmed_at (or last_sign_in_at fallback)
//   - lastAccessAt   → auth.users.last_sign_in_at
//
// The frontend cannot query `auth.users` directly, so this proxies the lookup
// using the service role and validates the caller is admin-tier.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN_SUFFIXES = [".membrosmaster.com.br"];
const ALLOWED_ORIGINS_EXACT = new Set([
  "https://membrosmaster.com.br",
  "https://www.membrosmaster.com.br",
  "https://app.membrosmaster.com.br",
  "https://teste.membrosmaster.com.br",
  "http://localhost:5174",
  "http://localhost:5173",
]);

function makeCorsHeaders(req: Request): Record<string, string> {
  const envList = (Deno.env.get("APP_URL") ?? Deno.env.get("VITE_APP_URL") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  for (const o of envList) ALLOWED_ORIGINS_EXACT.add(o);

  const origin = req.headers.get("Origin") ?? "";
  let allowed = "https://app.membrosmaster.com.br";
  if (origin) {
    if (ALLOWED_ORIGINS_EXACT.has(origin)) {
      allowed = origin;
    } else {
      try {
        const host = new URL(origin).hostname;
        if (ALLOWED_ORIGIN_SUFFIXES.some((s) => host.endsWith(s))) {
          allowed = origin;
        }
      } catch {
        // ignore
      }
    }
  }
  return {
    "Access-Control-Allow-Origin": allowed,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type RequestBody = { userId?: string };

serve(async (req) => {
  const corsHeaders = makeCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401, corsHeaders);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabase.auth.getUser(jwt);
    if (!caller) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    const callerRole = (callerProfile?.role as string | undefined) ?? "";
    if (!["owner", "admin", "support", "moderator"].includes(callerRole)) {
      return json({ error: "Forbidden" }, 403, corsHeaders);
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, corsHeaders);
    }

    const userId = (body.userId ?? "").trim();
    if (!userId) {
      return json({ error: "userId obrigatório" }, 400, corsHeaders);
    }

    const { data: result, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !result?.user) {
      return json({ error: "Usuário não encontrado em auth" }, 404, corsHeaders);
    }
    const u = result.user;

    return json(
      {
        createdAt: u.created_at ?? null,
        firstAccessAt: u.email_confirmed_at ?? u.confirmed_at ?? null,
        lastAccessAt: u.last_sign_in_at ?? null,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("admin-student-stats fatal:", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return json({ error: msg }, 500, corsHeaders);
  }
});

function json(payload: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
