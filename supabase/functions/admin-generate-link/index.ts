// Admin-only edge function that generates Supabase auth action links
// (recovery / magiclink / invite) for a target user.
//
// Used by the admin panel for:
//   - "Copiar link de redefinição"   → type: "recovery"
//   - "Acessar como aluno"           → type: "magiclink"
//   - Resend invite                  → type: "invite"
//
// The caller MUST be authenticated and have an admin-tier role
// (owner / admin / support).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PLATFORM_URL =
  Deno.env.get("PLATFORM_URL") ?? "https://teste.membrosmaster.com.br";

type LinkType = "recovery" | "magiclink" | "invite";

const REDIRECT_BY_TYPE: Record<LinkType, string> = {
  recovery: `${PLATFORM_URL}/nova-senha`,
  magiclink: `${PLATFORM_URL}/cursos`,
  invite: `${PLATFORM_URL}/cursos`,
};

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

    // Verify caller identity via JWT
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabase.auth.getUser(jwt);
    if (!caller) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    // Verify caller is admin-tier
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    const role = (callerProfile?.role as string | undefined) ?? "";
    if (!["owner", "admin", "support"].includes(role)) {
      return json({ error: "Forbidden: admin role required" }, 403, corsHeaders);
    }

    // Parse body
    let body: { userId?: string; type?: LinkType; redirectTo?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    const { userId, type = "recovery", redirectTo } = body;
    if (!userId) {
      return json({ error: "Missing userId" }, 400, corsHeaders);
    }
    if (!["recovery", "magiclink", "invite"].includes(type)) {
      return json({ error: "Invalid type" }, 400, corsHeaders);
    }

    // Resolve target user email
    const { data: target } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (!target?.email) {
      return json({ error: "User not found" }, 404, corsHeaders);
    }

    const finalRedirect = redirectTo ?? REDIRECT_BY_TYPE[type];

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type,
        email: target.email as string,
        options: { redirectTo: finalRedirect },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("generateLink error:", linkError);
      return json({ error: "Failed to generate link" }, 500, corsHeaders);
    }

    // Audit log (best effort — do not fail the request if log fails)
    try {
      await supabase.from("email_notification_log").insert({
        recipient_id: userId,
        type: `admin_link_${type}`,
        automation_type: `admin_link_${type}`,
        subject: `Admin generated ${type} link`,
        status: "generated",
        metadata: { generated_by: caller.id },
      });
    } catch (logErr) {
      console.error("audit log error:", logErr);
    }

    return json(
      {
        actionLink: linkData.properties.action_link,
        email: target.email,
        type,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("admin-generate-link error:", err);
    return json({ error: "Internal error" }, 500, corsHeaders);
  }
});

function json(payload: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
