// accept-invite — server-side invite-link acceptance.
//
// The old flow did enrollment / use_count / invite_link_uses / signup_source
// writes client-side with the student's session; all are admin-only under RLS,
// so they silently failed. This function does them with the service role.
//
// Auth: the caller must already be authenticated (new account just created, or
// existing account logged in). We identify the student from their JWT, then use
// the service role for the privileged writes. Email is sent directly via Resend
// (the notify-email gateway rejects service-role calls — see webhook-intake).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  const corsHeaders = makeCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Identify the authenticated student.
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ error: "Não autenticado" }, 401);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    const authUser = userData?.user;
    if (userErr || !authUser) return json({ error: "Sessão inválida" }, 401);

    // 2. Parse input.
    let body: { slug?: string; isNew?: boolean };
    try {
      body = await req.json();
    } catch {
      return json({ error: "JSON inválido" }, 400);
    }
    const slug = (body.slug ?? "").trim();
    const isNew = body.isNew === true;
    if (!slug) return json({ error: "slug obrigatório" }, 400);

    // 3. Load + validate the invite.
    const { data: invite } = await supabase
      .from("invite_links")
      .select("id, name, class_id, class_ids, max_uses, use_count, expires_at, is_active")
      .eq("slug", slug)
      .maybeSingle();

    if (!invite || !invite.is_active) {
      return json({ error: "Convite inválido ou inativo" }, 404);
    }
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return json({ error: "Convite expirado" }, 400);
    }

    // Whether this student already used this link (idempotent re-submit).
    const { data: priorUse } = await supabase
      .from("invite_link_uses")
      .select("id")
      .eq("invite_link_id", invite.id)
      .eq("student_id", authUser.id)
      .maybeSingle();
    const alreadyUsed = !!priorUse;

    if (
      !alreadyUsed &&
      invite.max_uses != null &&
      (invite.use_count ?? 0) >= invite.max_uses
    ) {
      return json({ error: "Este link atingiu o limite máximo de usos" }, 409);
    }

    // 4. Resolve target classes.
    const classIds: string[] =
      (invite.class_ids && invite.class_ids.length > 0)
        ? invite.class_ids
        : (invite.class_id ? [invite.class_id] : []);
    if (classIds.length === 0) {
      return json({ error: "Convite sem turmas vinculadas" }, 500);
    }

    const { data: classesInfo } = await supabase
      .from("classes")
      .select("id, name, access_duration_days, access_grace_days, enrollment_type")
      .in("id", classIds);
    type ClassInfo = {
      id: string;
      name: string;
      access_duration_days: number | null;
      access_grace_days: number | null;
      enrollment_type: string | null;
    };
    const classMap: Record<string, ClassInfo> = {};
    for (const c of (classesInfo ?? []) as ClassInfo[]) classMap[c.id] = c;

    // 5. Enroll (upsert) into every class.
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
        student_id: authUser.id,
        class_id: cid,
        type: cls?.enrollment_type ?? "individual",
        status: "active",
        enrolled_at: nowIso,
        expires_at: expiresAt,
      };
    });
    const { error: enrollErr } = await supabase
      .from("enrollments")
      .upsert(rows, { onConflict: "student_id,class_id" });
    if (enrollErr) {
      return json({ error: `Falha na matrícula: ${enrollErr.message}` }, 500);
    }

    // 6. Record the use (idempotent). Trigger keeps invite_links.use_count in sync.
    if (!alreadyUsed) {
      await supabase
        .from("invite_link_uses")
        .insert({ invite_link_id: invite.id, student_id: authUser.id })
        .then(() => {}, () => {}); // unique violation = already recorded, ignore
    }

    // 7. Tag the account origin only if not already set (don't overwrite how the
    //    account was originally created — e.g. webhook/direct existing users).
    const { data: profile } = await supabase
      .from("profiles")
      .select("signup_source, name, display_name, email")
      .eq("id", authUser.id)
      .maybeSingle();
    if (profile && !profile.signup_source) {
      await supabase
        .from("profiles")
        .update({ signup_source: "invite_link", invite_link_id: invite.id })
        .eq("id", authUser.id);
    }

    // 8. Send the access email via Resend (best-effort).
    const classNames = classIds.map((cid) => classMap[cid]?.name).filter(Boolean).join(", ");
    const recipientEmail = (profile?.email as string) || authUser.email || "";
    const recipientName =
      ((profile?.display_name as string) || (profile?.name as string) || "Aluno").trim();
    try {
      if (recipientEmail) {
        const appUrl = Deno.env.get("PLATFORM_URL") ?? "https://app.membrosmaster.com.br";
        const { subject, html } = buildInviteEmail({
          name: recipientName,
          classesList: classNames,
          isNew,
          coursesUrl: `${appUrl}/cursos`,
          loginUrl: `${appUrl}/login`,
        });
        const sent = await sendResendEmail(recipientEmail, subject, html);
        await supabase.from("email_notification_log").insert({
          recipient_id: authUser.id,
          type: isNew ? "welcome" : "course_unlocked",
          automation_type: isNew ? "welcome" : "course_unlocked",
          subject,
          status: sent.ok ? "sent" : "error",
          metadata: { source: "accept-invite", invite_link_id: invite.id, error: sent.error ?? null },
        });
      }
    } catch (err) {
      console.error("accept-invite email error:", err);
    }

    return json({
      status: "success",
      isNew,
      classIds,
      classNames,
    });
  } catch (err) {
    console.error("accept-invite error:", err);
    return json({ error: "Erro interno" }, 500);
  }
});

// ---------------------------------------------------------------------------
// Email helpers (Resend direct — same pattern as webhook-intake)
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildInviteEmail(opts: {
  name: string;
  classesList: string;
  isNew: boolean;
  coursesUrl: string;
  loginUrl: string;
}): { subject: string; html: string } {
  const platformName = Deno.env.get("PLATFORM_NAME") ?? "Membros Master";
  const safeName = escapeHtml(opts.name || "Aluno");
  const safeClasses = escapeHtml(opts.classesList);

  const subject = opts.isNew
    ? `Bem-vindo(a) à ${platformName}! Acesso liberado 🎉`
    : `Novo acesso liberado${opts.classesList ? `: ${opts.classesList}` : ""} 🎉`;

  const intro = opts.isNew
    ? `Sua conta na plataforma <strong>${escapeHtml(platformName)}</strong> foi criada e seu acesso já está liberado.`
    : `Você recebeu acesso a <strong>${safeClasses || "novas turmas"}</strong>.`;

  const ctaUrl = opts.isNew ? opts.loginUrl : opts.coursesUrl;
  const ctaLabel = opts.isNew ? "Acessar plataforma" : "Ver meus cursos";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(platformName)}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;margin:0;padding:20px;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <h1 style="color:#ff7b00;margin:0 0 16px 0;font-size:24px;">Olá, ${safeName}!</h1>
    <p style="margin:0 0 16px 0;line-height:1.5;">${intro}</p>
    ${safeClasses ? `<p style="margin:0 0 16px 0;line-height:1.5;">Turmas: <strong>${safeClasses}</strong></p>` : ""}
    <p style="margin:0 0 24px 0;text-align:center;">
      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#ff7b00;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">${ctaLabel}</a>
    </p>
    <p style="margin:24px 0 0 0;color:#999;font-size:13px;text-align:center;">Feito com ♥ ${escapeHtml(platformName)}</p>
  </div>
</body></html>`;

  return { subject, html };
}

async function sendResendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY ausente" };
  const platformName = Deno.env.get("PLATFORM_NAME") ?? "Membros Master";
  const from = `${platformName} <enviar@membrosmaster.com.br>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const txt = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${txt.slice(0, 200)}` };
  }
  return { ok: true };
}
