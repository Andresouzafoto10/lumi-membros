// Admin-only edge function to bulk-create students from a CSV import.
//
// For each row:
//   1. Create auth user with default password "123456" (or recover the
//      orphan auth user if one already exists for the email).
//   2. Wait for the handle_new_user trigger to materialize the profile.
//   3. Patch profile with name, role=student, status, unique username,
//      and the optional phone / whatsapp / cpf columns from the CSV.
//   4. Upsert enrollments respecting each class's access_duration_days.
//   5. Send the welcome email with the credentials via Resend directly
//      (the notify-email gateway rejects service-role JWTs with 401).
//
// Returns { imported, failed, results: [{email, status, error?}] }.

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
const PLATFORM_URL =
  Deno.env.get("PLATFORM_URL") ?? "https://app.membrosmaster.com.br";
const DEFAULT_PASSWORD = "123456";

type CsvStudent = {
  name: string;
  email: string;
  phone?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
};

type RequestBody = {
  students?: CsvStudent[];
  classIds?: string[];
  sendEmail?: boolean;
};

type ClassInfo = {
  id: string;
  name: string;
  access_duration_days: number | null;
  access_grace_days: number | null;
  enrollment_type: string | null;
};

type RowResult = {
  email: string;
  status: "created" | "skipped" | "failed";
  error?: string;
  userId?: string;
  emailSent?: boolean;
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

    const students = Array.isArray(body.students) ? body.students : [];
    const classIds = Array.isArray(body.classIds) ? body.classIds : [];
    const sendEmail = body.sendEmail !== false;
    if (students.length === 0) {
      return json({ error: "Nenhum aluno na lista" }, 400, corsHeaders);
    }
    if (students.length > 500) {
      return json({ error: "Maximo de 500 alunos por importacao" }, 400, corsHeaders);
    }

    // Fetch class info once for all rows.
    let classMap: Record<string, ClassInfo> = {};
    let classNames = "";
    if (classIds.length > 0) {
      const { data: classesInfo } = await supabase
        .from("classes")
        .select("id, name, access_duration_days, access_grace_days, enrollment_type")
        .in("id", classIds);
      for (const c of (classesInfo ?? []) as ClassInfo[]) classMap[c.id] = c;
      classNames = classIds
        .map((cid) => classMap[cid]?.name)
        .filter(Boolean)
        .join(", ");
    }

    // Used to skip the username uniqueness probe entirely when possible.
    // We add freshly-picked usernames as we go to avoid collisions inside
    // the same batch.
    const usedUsernames = new Set<string>();
    const results: RowResult[] = [];

    for (const raw of students) {
      const email = (raw.email ?? "").trim().toLowerCase();
      const name = (raw.name ?? "").trim();
      const phone = (raw.phone ?? "").toString().trim() || null;
      const whatsapp = (raw.whatsapp ?? "").toString().trim() || null;
      const cpf = (raw.cpf ?? "").toString().replace(/\D/g, "") || null;

      if (!name || !email || !email.includes("@")) {
        results.push({ email, status: "failed", error: "Nome ou email invalido" });
        continue;
      }

      let userId: string | null = null;

      const created = await supabase.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { name },
      });

      if (created.error) {
        const msg = created.error.message ?? "";
        const isDuplicate = /already been registered|already exists/i.test(msg);
        if (!isDuplicate) {
          results.push({ email, status: "failed", error: msg });
          continue;
        }
        // Try to find the orphan auth user (no matching profile).
        const { data: list } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const found = (list?.users ?? []).find(
          (u) => (u.email ?? "").toLowerCase() === email,
        );
        if (!found) {
          results.push({ email, status: "skipped", error: "Ja cadastrado" });
          continue;
        }
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", found.id)
          .maybeSingle();
        if (existingProfile) {
          results.push({ email, status: "skipped", error: "Ja cadastrado" });
          continue;
        }
        // Orphan recovery: backfill profile and reset password to default.
        await supabase.from("profiles").insert({
          id: found.id,
          email,
          name,
          display_name: name,
        });
        await supabase.auth.admin.updateUserById(found.id, {
          password: DEFAULT_PASSWORD,
        });
        userId = found.id;
      } else if (created.data?.user) {
        userId = created.data.user.id;
      }

      if (!userId) {
        results.push({ email, status: "failed", error: "Auth nao retornou usuario" });
        continue;
      }

      // Wait for the handle_new_user trigger.
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
        results.push({ email, status: "failed", error: "Profile nao criado pelo trigger" });
        continue;
      }

      // Generate a unique username.
      const baseUsername =
        email.split("@")[0].replace(/[^a-z0-9_.-]/gi, "").toLowerCase() ||
        `user${userId.slice(0, 6)}`;
      let username = baseUsername;
      for (let i = 0; i < 5; i++) {
        if (usedUsernames.has(username)) {
          username = `${baseUsername}${Math.floor(Math.random() * 9000) + 1000}`;
          continue;
        }
        const { data: clash } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username)
          .neq("id", profileId)
          .maybeSingle();
        if (!clash) break;
        username = `${baseUsername}${Math.floor(Math.random() * 9000) + 1000}`;
      }
      usedUsernames.add(username);

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          name,
          display_name: name,
          role: "student",
          status: "active",
          username,
          ...(phone !== null && { phone }),
          ...(whatsapp !== null && { whatsapp }),
          ...(cpf !== null && { cpf }),
        })
        .eq("id", profileId);
      if (updateErr) {
        results.push({
          email,
          status: "failed",
          error: `Profile update: ${updateErr.message}`,
        });
        continue;
      }

      // Upsert enrollments for every selected class.
      if (classIds.length > 0) {
        const nowIso = new Date().toISOString();
        const rows = classIds.map((cid) => {
          const cls = classMap[cid];
          const durationDays = cls?.access_duration_days ?? null;
          const graceDays = cls?.access_grace_days ?? 0;
          let expiresAt: string | null = null;
          if (durationDays && durationDays > 0) {
            const d = new Date();
            d.setDate(d.getDate() + durationDays + Math.max(0, graceDays));
            expiresAt = d.toISOString();
          }
          return {
            student_id: profileId,
            class_id: cid,
            type: cls?.enrollment_type ?? "individual",
            status: "active",
            enrolled_at: nowIso,
            expires_at: expiresAt,
          };
        });
        await supabase
          .from("enrollments")
          .upsert(rows, { onConflict: "student_id,class_id" });
      }

      let emailSent = false;
      if (sendEmail) {
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
              recipient_id: profileId,
              type: "welcome_with_setup",
              automation_type: "welcome_with_setup",
              subject: "Bem-vindo(a) à plataforma",
              status: "sent",
              metadata: { source: "admin-bulk-create-students" },
            });
          } catch (logErr) {
            console.error("email log insert failed:", logErr);
          }
        } catch (err) {
          console.error("welcome email failed:", err);
        }
      }

      results.push({
        email,
        status: "created",
        userId: profileId,
        emailSent,
      });
    }

    const imported = results.filter((r) => r.status === "created").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return json(
      { imported, skipped, failed, results },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("admin-bulk-create-students fatal:", err);
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
