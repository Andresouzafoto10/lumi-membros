// Admin-only edge function to manually create a student.
//
// Mirrors the webhook-intake activation flow:
//   1. Validate admin caller (owner/admin/support)
//   2. Create auth user with provided (or default "123456") password
//   3. Wait for handle_new_user trigger to materialize the profile row
//   4. Patch profile with name / role / status / unique username
//   5. Upsert enrollments respecting class access_duration_days
//   6. Send `welcome_with_setup` email via notify-email so the student
//      receives credentials and the login link.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS inlined here (not the _shared helper) so we can keep the membrosmaster
// domain allowlist in sync without touching other functions.
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

// Default password assigned when the admin leaves the field empty.
// Student is instructed in the welcome email to change it in the profile
// or via "Esqueci minha senha".
const DEFAULT_PASSWORD = "123456";

type StudentRole = "student" | "moderator" | "support" | "admin" | "owner";

type RequestBody = {
  name?: string;
  email?: string;
  password?: string;
  role?: StudentRole;
  classIds?: string[];
};

type ClassInfo = {
  id: string;
  name: string;
  access_duration_days: number | null;
  access_grace_days: number | null;
  enrollment_type: string | null;
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

    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const password = ((body.password ?? "").trim()) || DEFAULT_PASSWORD;
    const role: StudentRole = body.role ?? "student";
    const classIds = Array.isArray(body.classIds) ? body.classIds : [];

    if (!name) {
      return json({ error: "Nome obrigatório" }, 400, corsHeaders);
    }
    if (!email || !email.includes("@")) {
      return json({ error: "E-mail inválido" }, 400, corsHeaders);
    }
    if (password.length < 6) {
      return json({ error: "Senha precisa de no mínimo 6 caracteres" }, 400, corsHeaders);
    }

    // Create the auth user. If the email is already in auth.users we attempt
    // recovery for the orphan case (auth user without a matching profile —
    // legacy bug). Real duplicates still return 409.
    let userId: string | null = null;
    const created = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (created.error) {
      const msg = created.error.message ?? "";
      const isDuplicate = /already been registered|already exists/i.test(msg);
      if (!isDuplicate) {
        console.error("auth.admin.createUser failed:", created.error);
        return json({ error: `Falha ao criar usuário: ${msg}` }, 500, corsHeaders);
      }

      // Find the existing auth user.
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listErr) {
        return json({ error: `Falha listando usuários: ${listErr.message}` }, 500, corsHeaders);
      }
      const found = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (!found) {
        return json({ error: "E-mail já cadastrado" }, 409, corsHeaders);
      }
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", found.id)
        .maybeSingle();
      if (existingProfile) {
        return json({ error: "E-mail já cadastrado" }, 409, corsHeaders);
      }

      // Orphan auth user — backfill profile and reset password to the new one
      // so the admin's input matches the welcome email.
      const { error: insErr } = await supabase.from("profiles").insert({
        id: found.id,
        email,
        name,
        display_name: name,
      });
      if (insErr) {
        console.error("orphan profile backfill failed:", insErr);
        return json({ error: `Recuperando órfão falhou: ${insErr.message}` }, 500, corsHeaders);
      }
      const { error: pwdErr } = await supabase.auth.admin.updateUserById(found.id, {
        password,
      });
      if (pwdErr) {
        console.error("orphan password reset failed:", pwdErr);
      }
      userId = found.id;
    } else if (created.data?.user) {
      userId = created.data.user.id;
    }

    if (!userId) {
      return json({ error: "Auth não retornou usuário" }, 500, corsHeaders);
    }

    // The handle_new_user trigger inserts the profile row asynchronously.
    // Retry with exponential backoff until it shows up.
    let profileId: string | null = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
      const { data: p } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      if (p) {
        profileId = p.id as string;
        break;
      }
    }
    if (!profileId) {
      console.error("profile trigger never ran for", userId);
      return json({ error: "Profile não foi criado pelo trigger handle_new_user" }, 500, corsHeaders);
    }

    // username must be unique. If the obvious choice collides, suffix it.
    const baseUsername = email.split("@")[0].replace(/[^a-z0-9_.-]/gi, "").toLowerCase() || `user${userId.slice(0, 6)}`;
    let username = baseUsername;
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", profileId)
        .maybeSingle();
      if (!clash) break;
      username = `${baseUsername}${Math.floor(Math.random() * 9000) + 1000}`;
    }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        name,
        display_name: name,
        role,
        status: "active",
        username,
      })
      .eq("id", profileId);
    if (updateErr) {
      console.error("profile update failed:", updateErr);
      return json({ error: `Falha ao atualizar perfil: ${updateErr.message}` }, 500, corsHeaders);
    }

    let classNames = "";
    if (classIds.length > 0) {
      const { data: classesInfo, error: classesErr } = await supabase
        .from("classes")
        .select("id, name, access_duration_days, access_grace_days, enrollment_type")
        .in("id", classIds);
      if (classesErr) {
        console.error("classes fetch failed:", classesErr);
      }
      const classMap: Record<string, ClassInfo> = {};
      for (const c of (classesInfo ?? []) as ClassInfo[]) classMap[c.id] = c;

      const nowIso = new Date().toISOString();
      const enrollmentRows = classIds.map((cid) => {
        const cls = classMap[cid];
        const durationDays = cls?.access_duration_days ?? null;
        const graceDays = cls?.access_grace_days ?? 0;
        const enrollType = cls?.enrollment_type ?? "individual";
        let expiresAt: string | null = null;
        if (durationDays && durationDays > 0) {
          const d = new Date();
          d.setDate(d.getDate() + durationDays + Math.max(0, graceDays));
          expiresAt = d.toISOString();
        }
        return {
          student_id: profileId,
          class_id: cid,
          type: enrollType,
          status: "active",
          enrolled_at: nowIso,
          expires_at: expiresAt,
        };
      });

      const { error: enrollErr } = await supabase
        .from("enrollments")
        .upsert(enrollmentRows, { onConflict: "student_id,class_id" });
      if (enrollErr) {
        console.error("enrollments upsert error:", enrollErr);
      }

      classNames = classIds
        .map((cid) => classMap[cid]?.name)
        .filter(Boolean)
        .join(", ");
    }

    // Send the welcome_with_setup email via the supabase admin client, which
    // attaches the apikey + bearer headers the functions gateway requires.
    // Plain `fetch` with only `Authorization` was returning 401.
    let emailSent = false;
    let emailError: string | null = null;
    try {
      await sendWelcomeEmail({
        email,
        name,
        tempPassword: password,
        classesList: classNames,
        loginUrl: `${PLATFORM_URL}/login`,
      });
      emailSent = true;
      // Best-effort audit log (failure here must not break the request).
      try {
        await supabase.from("email_notification_log").insert({
          recipient_id: profileId,
          type: "welcome_with_setup",
          automation_type: "welcome_with_setup",
          subject: "Bem-vindo(a) à plataforma",
          status: "sent",
          metadata: { source: "admin-create-student" },
        });
      } catch (logErr) {
        console.error("email log insert failed:", logErr);
      }
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err);
      console.error("welcome email failed:", err);
    }

    return json(
      { userId: profileId, email, emailSent, emailError },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("admin-create-student fatal:", err);
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

  const subject = `Bem-vindo(a) à ${PLATFORM_NAME}! Acesso liberado 🔐`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(PLATFORM_NAME)}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; color: #1a1a1a;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <h1 style="color: #ff7b00; margin: 0 0 16px 0; font-size: 24px;">Bem-vindo(a), ${safeName}!</h1>
    <p style="margin: 0 0 16px 0; line-height: 1.5;">Seu acesso à plataforma <strong>${escapeHtml(PLATFORM_NAME)}</strong> foi criado.</p>
    ${safeClasses ? `<p style="margin: 0 0 16px 0; line-height: 1.5;">Você foi matriculado em: <strong>${safeClasses}</strong></p>` : ""}
    <div style="background: #fafafa; border: 1px solid #eee; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0 0 12px 0;"><strong>E-mail:</strong> ${safeEmail}</p>
      <p style="margin: 0;"><strong>Senha temporária:</strong> <code style="background: white; padding: 4px 10px; border-radius: 4px; border: 1px solid #ddd; font-family: monospace; font-size: 15px;">${safePassword}</code></p>
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
