// Admin-only edge function to resend the welcome / access email.
//
//   1. Validate admin caller (owner/admin/support)
//   2. Reset the student's password to the default "123456"
//   3. Re-send the welcome email with the credentials and the login link
//
// Bypasses notify-email because the functions gateway rejects service-role
// JWTs with 401; Resend is called directly here.

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
        // ignore malformed origin
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
const PLATFORM_URL =
  Deno.env.get("PLATFORM_URL") ?? "https://app.membrosmaster.com.br";

const DEFAULT_PASSWORD = "123456";

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
    if (!["owner", "admin", "support"].includes(callerRole)) {
      return json({ error: "Forbidden: admin role required" }, 403, corsHeaders);
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    const userId = (body.userId ?? "").trim();
    if (!userId) {
      return json({ error: "userId obrigatório" }, 400, corsHeaders);
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, email, name, display_name")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr || !profile) {
      return json({ error: "Aluno não encontrado" }, 404, corsHeaders);
    }

    const email = (profile.email as string) ?? "";
    const name = ((profile.display_name as string) || (profile.name as string) || "Aluno").trim();
    if (!email) {
      return json({ error: "Aluno sem e-mail cadastrado" }, 400, corsHeaders);
    }

    // Reset password so the new credentials match what the email shows.
    const { error: pwdErr } = await supabase.auth.admin.updateUserById(userId, {
      password: DEFAULT_PASSWORD,
    });
    if (pwdErr) {
      console.error("password reset failed:", pwdErr);
      return json({ error: `Falha ao resetar senha: ${pwdErr.message}` }, 500, corsHeaders);
    }

    // Fetch active enrollments to populate the "classes_list" in the email.
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("class_id")
      .eq("student_id", userId)
      .eq("status", "active");
    const classIds = (enrollments ?? []).map((e) => e.class_id as string);
    let classNames = "";
    if (classIds.length > 0) {
      const { data: classes } = await supabase
        .from("classes")
        .select("id, name")
        .in("id", classIds);
      classNames = (classes ?? [])
        .map((c) => c.name as string)
        .filter(Boolean)
        .join(", ");
    }

    let emailSent = false;
    let emailError: string | null = null;
    try {
      await sendWelcomeEmail({
        email,
        name,
        tempPassword: DEFAULT_PASSWORD,
        classesList: classNames,
        loginUrl: `${PLATFORM_URL}/login`,
      });
      emailSent = true;
      try {
        await supabase.from("email_notification_log").insert({
          recipient_id: userId,
          type: "welcome_with_setup",
          automation_type: "welcome_with_setup",
          subject: "Reenvio: acesso à plataforma",
          status: "sent",
          metadata: { source: "admin-resend-access", reset_by: caller.id },
        });
      } catch (logErr) {
        console.error("email log insert failed:", logErr);
      }
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err);
      console.error("welcome email failed:", err);
    }

    return json({ emailSent, emailError, email }, 200, corsHeaders);
  } catch (err) {
    console.error("admin-resend-access fatal:", err);
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendWelcomeEmail(opts: {
  email: string;
  name: string;
  tempPassword: string;
  classesList: string;
  loginUrl: string;
}) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY não configurada");
  }
  const PLATFORM_NAME = Deno.env.get("PLATFORM_NAME") ?? "Membros Master";
  const FROM = `${PLATFORM_NAME} <enviar@membrosmaster.com.br>`;

  const safeName = escapeHtml(opts.name);
  const safeEmail = escapeHtml(opts.email);
  const safePassword = escapeHtml(opts.tempPassword);
  const safeClasses = escapeHtml(opts.classesList);
  const safeLogin = escapeHtml(opts.loginUrl);

  const subject = `Seu acesso à ${PLATFORM_NAME} 🔐`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(PLATFORM_NAME)}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; color: #1a1a1a;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <h1 style="color: #ff7b00; margin: 0 0 16px 0; font-size: 24px;">Olá, ${safeName}!</h1>
    <p style="margin: 0 0 16px 0; line-height: 1.5;">Seguem suas credenciais de acesso à plataforma <strong>${escapeHtml(PLATFORM_NAME)}</strong>.</p>
    ${safeClasses ? `<p style="margin: 0 0 16px 0; line-height: 1.5;">Turmas vinculadas: <strong>${safeClasses}</strong></p>` : ""}
    <div style="background: #fafafa; border: 1px solid #eee; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0 0 12px 0;"><strong>E-mail:</strong> ${safeEmail}</p>
      <p style="margin: 0;"><strong>Senha:</strong> <code style="background: white; padding: 4px 10px; border-radius: 4px; border: 1px solid #ddd; font-family: monospace; font-size: 15px;">${safePassword}</code></p>
    </div>
    <p style="margin: 0 0 24px 0; line-height: 1.5; color: #555;">Recomendamos alterar sua senha após o primeiro acesso em "Meu perfil", ou usar a opção "Esqueci minha senha" no login.</p>
    <p style="margin: 0 0 24px 0; text-align: center;">
      <a href="${safeLogin}" style="display: inline-block; background: #ff7b00; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Acessar plataforma</a>
    </p>
    <p style="margin: 24px 0 0 0; color: #999; font-size: 13px; text-align: center;">Feito com ♥ ${escapeHtml(PLATFORM_NAME)}</p>
  </div>
</body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [opts.email],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend ${res.status}: ${txt.slice(0, 200)}`);
  }
}
