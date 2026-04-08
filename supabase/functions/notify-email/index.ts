import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "../_shared/email-template.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PLATFORM_URL = Deno.env.get("PLATFORM_URL") ?? "https://app.membrosmaster.com.br";
const PLATFORM_NAME = Deno.env.get("PLATFORM_NAME") ?? "Membros Master";
const FROM_EMAIL = `${PLATFORM_NAME} <enviar@membrosmaster.com.br>`;

// All supported email types
type EmailType =
  | "comment"
  | "like"
  | "follow"
  | "mention"
  | "new_post"
  | "badge_earned"
  | "welcome"
  | "access_reminder_7d"
  | "community_post"
  | "community_inactive_30d"
  | "new_course"
  | "new_lesson"
  | "certificate_earned"
  | "mention_community"
  | "follower_milestone_10"
  | "post_reply"
  | "mission_complete"
  | "comment_milestone";

interface NotifyEmailPayload {
  type: EmailType;
  recipient_email?: string;
  recipient_name?: string;
  recipient_id?: string;
  actor_name?: string;
  context?: Record<string, string | number | undefined>;
}

const ALLOWED_ORIGIN = Deno.env.get("APP_URL") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function buildSubject(type: EmailType, payload: NotifyEmailPayload): string {
  const ctx = payload.context ?? {};
  const actor = payload.actor_name ?? "";
  switch (type) {
    case "comment":
      return `${actor} comentou no seu post`;
    case "like":
      return `${actor} curtiu seu post`;
    case "follow":
      return `${actor} comecou a te seguir`;
    case "mention":
    case "mention_community":
      return `${actor} te mencionou na comunidade`;
    case "new_post":
      return `Novo post em ${ctx.community_name ?? "comunidade"}`;
    case "badge_earned":
      return `Voce conquistou o badge "${ctx.badge_name}"!`;
    case "welcome":
      return `Bem-vindo(a) a ${PLATFORM_NAME}! 🎉`;
    case "access_reminder_7d":
      return `Sentimos sua falta, ${payload.recipient_name ?? ""}! 👋`;
    case "community_post":
      return `Sua publicacao esta no ar! 🚀`;
    case "community_inactive_30d":
      return `Tem novidades na comunidade, ${payload.recipient_name ?? ""}! 💬`;
    case "new_course":
      return `Novo curso disponivel: ${ctx.course_name ?? ""} 🎓`;
    case "new_lesson":
      return `Nova aula em ${ctx.course_name ?? ""}: ${ctx.lesson_name ?? ""} ▶️`;
    case "certificate_earned":
      return `Parabens! Seu certificado esta disponivel 🏆`;
    case "follower_milestone_10":
      return `Voce tem ${ctx.follower_count ?? ""} seguidores! 🌟`;
    case "post_reply":
      return `${actor} respondeu seu post 💬`;
    case "mission_complete":
      return `Missao concluida: ${ctx.mission_name ?? ""} ⚡`;
    case "comment_milestone":
      return `Voce fez ${ctx.comment_count ?? ""} comentarios! 🗣️`;
  }
}

function buildBody(type: EmailType, payload: NotifyEmailPayload): { heading: string; bodyHtml: string; ctaText: string; ctaUrl: string; previewText: string } {
  const name = payload.recipient_name ?? "Membro";
  const actor = payload.actor_name ?? "Alguem";
  const ctx = payload.context ?? {};
  const baseUrl = PLATFORM_URL;

  switch (type) {
    case "welcome":
      return {
        heading: `Bem-vindo(a), ${name}!`,
        bodyHtml: `<p style="margin:0 0 16px 0;">Estamos muito felizes em ter voce conosco na <strong>${PLATFORM_NAME}</strong>!</p>
          <p style="margin:0 0 16px 0;">Aqui voce vai encontrar cursos exclusivos, uma comunidade incrivel e muito conteudo para sua evolucao.</p>
          <p style="margin:0;">Comece agora explorando os cursos disponiveis.</p>`,
        ctaText: "Explorar cursos",
        ctaUrl: `${baseUrl}/cursos`,
        previewText: "Sua jornada comeca agora",
      };

    case "access_reminder_7d":
      return {
        heading: `Sentimos sua falta, ${name}!`,
        bodyHtml: `<p style="margin:0 0 16px 0;">Faz um tempo que voce nao aparece por aqui. Seus cursos estao esperando por voce!</p>
          <p style="margin:0;">A comunidade tambem esta ativa — entre e veja as novidades.</p>`,
        ctaText: "Voltar a plataforma",
        ctaUrl: `${baseUrl}/cursos`,
        previewText: "Voce tem cursos esperando por voce",
      };

    case "community_post":
      return {
        heading: "Sua publicacao esta no ar!",
        bodyHtml: `<p style="margin:0;">Ola, ${name}! Sua publicacao na comunidade foi aprovada e ja esta visivel para todos os membros.</p>`,
        ctaText: "Ver publicacao",
        ctaUrl: (ctx.action_url as string) ?? `${baseUrl}/comunidade/feed`,
        previewText: "A comunidade ja pode ver seu post",
      };

    case "community_inactive_30d":
      return {
        heading: `Tem novidades na comunidade!`,
        bodyHtml: `<p style="margin:0 0 16px 0;">Ola, ${name}! Faz um tempo que voce nao participa da comunidade.</p>
          <p style="margin:0;">Tem muita coisa nova acontecendo — entre e confira as publicacoes recentes.</p>`,
        ctaText: "Ver comunidade",
        ctaUrl: `${baseUrl}/comunidade/feed`,
        previewText: "Veja o que esta acontecendo",
      };

    case "new_course":
      return {
        heading: `Novo curso: ${ctx.course_name ?? ""}`,
        bodyHtml: `<p style="margin:0;">Um novo curso foi publicado na plataforma: <strong>${ctx.course_name ?? ""}</strong>. Acesse agora e comece a aprender!</p>`,
        ctaText: "Acessar curso",
        ctaUrl: (ctx.action_url as string) ?? `${baseUrl}/cursos`,
        previewText: "Acesse agora e comece a aprender",
      };

    case "new_lesson":
      return {
        heading: `Nova aula: ${ctx.lesson_name ?? ""}`,
        bodyHtml: `<p style="margin:0;">Uma nova aula foi adicionada ao curso <strong>${ctx.course_name ?? ""}</strong>: <strong>${ctx.lesson_name ?? ""}</strong>.</p>`,
        ctaText: "Assistir aula",
        ctaUrl: (ctx.action_url as string) ?? `${baseUrl}/cursos`,
        previewText: "Assista agora",
      };

    case "certificate_earned":
      return {
        heading: "Parabens! Certificado disponivel!",
        bodyHtml: `<p style="margin:0 0 16px 0;">Ola, ${name}! Voce concluiu o curso <strong>${ctx.course_name ?? ""}</strong> e seu certificado esta pronto para download!</p>
          <p style="margin:0;">Acesse sua area de certificados para visualizar e baixar.</p>`,
        ctaText: "Ver certificado",
        ctaUrl: `${baseUrl}/meus-certificados`,
        previewText: `Voce concluiu ${ctx.course_name ?? "o curso"}`,
      };

    case "mention":
    case "mention_community":
      return {
        heading: `${actor} mencionou voce`,
        bodyHtml: `<p style="margin:0;"><strong>${actor}</strong> te mencionou em uma publicacao${ctx.community_name ? ` em "${ctx.community_name}"` : ""}.</p>`,
        ctaText: "Ver publicacao",
        ctaUrl: (ctx.action_url as string) ?? `${baseUrl}/comunidade/feed`,
        previewText: "Veja o que disseram",
      };

    case "follower_milestone_10":
      return {
        heading: `${ctx.follower_count ?? ""} seguidores!`,
        bodyHtml: `<p style="margin:0;">Parabens, ${name}! Voce alcancou <strong>${ctx.follower_count ?? ""} seguidores</strong> na plataforma. Sua audiencia esta crescendo!</p>`,
        ctaText: "Ver perfil",
        ctaUrl: `${baseUrl}/meu-perfil`,
        previewText: "Sua audiencia esta crescendo",
      };

    case "post_reply":
      return {
        heading: `${actor} respondeu seu post`,
        bodyHtml: `<p style="margin:0;"><strong>${actor}</strong> deixou um comentario na sua publicacao.</p>`,
        ctaText: "Ver comentario",
        ctaUrl: (ctx.action_url as string) ?? `${baseUrl}/comunidade/feed`,
        previewText: "Veja o que acharam",
      };

    case "mission_complete":
      return {
        heading: `Missao concluida!`,
        bodyHtml: `<p style="margin:0 0 16px 0;">Ola, ${name}! Voce completou a missao <strong>"${ctx.mission_name ?? ""}"</strong>!</p>
          <p style="margin:0;">Voce ganhou <strong>${ctx.points ?? 0} pontos</strong>. Continue assim!</p>`,
        ctaText: "Ver minhas missoes",
        ctaUrl: `${baseUrl}/meu-perfil`,
        previewText: `Voce ganhou ${ctx.points ?? 0} pontos`,
      };

    case "comment_milestone":
      return {
        heading: `${ctx.comment_count ?? ""} comentarios!`,
        bodyHtml: `<p style="margin:0;">Parabens, ${name}! Voce ja fez <strong>${ctx.comment_count ?? ""} comentarios</strong> na comunidade. Continue engajando!</p>`,
        ctaText: "Ver comunidade",
        ctaUrl: `${baseUrl}/comunidade/feed`,
        previewText: "Continue engajando a comunidade",
      };

    case "comment":
      return {
        heading: `${actor} comentou no seu post`,
        bodyHtml: `<p style="margin:0;"><strong>${actor}</strong> comentou na sua publicacao${ctx.post_title ? ` "${ctx.post_title}"` : ""}.</p>`,
        ctaText: "Ver comentario",
        ctaUrl: (ctx.action_url as string) ?? `${baseUrl}/comunidade/feed`,
        previewText: `${actor} comentou no seu post`,
      };

    case "like":
      return {
        heading: `${actor} curtiu seu post`,
        bodyHtml: `<p style="margin:0;"><strong>${actor}</strong> curtiu sua publicacao${ctx.post_title ? ` "${ctx.post_title}"` : ""}.</p>`,
        ctaText: "Ver publicacao",
        ctaUrl: (ctx.action_url as string) ?? `${baseUrl}/comunidade/feed`,
        previewText: `${actor} curtiu seu post`,
      };

    case "follow":
      return {
        heading: `${actor} comecou a te seguir`,
        bodyHtml: `<p style="margin:0;"><strong>${actor}</strong> comecou a te seguir na plataforma.</p>`,
        ctaText: "Ver perfil",
        ctaUrl: (ctx.action_url as string) ?? `${baseUrl}/meu-perfil`,
        previewText: `${actor} comecou a te seguir`,
      };

    case "new_post":
      return {
        heading: `Novo post em ${ctx.community_name ?? "comunidade"}`,
        bodyHtml: `<p style="margin:0;">Novo post em <strong>${ctx.community_name ?? ""}</strong>: ${ctx.post_title ?? ""}</p>`,
        ctaText: "Ver publicacao",
        ctaUrl: (ctx.action_url as string) ?? `${baseUrl}/comunidade/feed`,
        previewText: `Novo post em ${ctx.community_name ?? "comunidade"}`,
      };

    case "badge_earned":
      return {
        heading: `Badge conquistado!`,
        bodyHtml: `<p style="margin:0;">Parabens! Voce conquistou o badge <strong>"${ctx.badge_name ?? ""}"</strong>!</p>`,
        ctaText: "Ver perfil",
        ctaUrl: (ctx.action_url as string) ?? `${baseUrl}/meu-perfil`,
        previewText: `Voce conquistou o badge "${ctx.badge_name ?? ""}"`,
      };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: NotifyEmailPayload = await req.json();

    if (!payload.type) {
      return jsonResponse({ error: "Missing required field: type" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve recipient info if only recipient_id is provided
    let recipientEmail = payload.recipient_email;
    let recipientName = payload.recipient_name;
    let emailEnabled = true;

    if (payload.recipient_id && (!recipientEmail || !recipientName)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, display_name, name, email_notifications")
        .eq("id", payload.recipient_id)
        .single();

      if (!profile || !profile.email) {
        return jsonResponse({ success: false, skipped: true, reason: "recipient_not_found" });
      }

      recipientEmail = recipientEmail ?? (profile.email as string);
      recipientName = recipientName ?? ((profile.display_name as string) || (profile.name as string) || "Membro");
      emailEnabled = profile.email_notifications !== false;
    }

    if (!recipientEmail) {
      return jsonResponse({ error: "Missing recipient email" }, 400);
    }

    // Check if user has email notifications enabled
    if (!emailEnabled) {
      await logEmail(supabase, payload.recipient_id ?? "", payload.type, "", "skipped", { reason: "user_disabled" });
      return jsonResponse({ success: false, skipped: true, reason: "user_email_disabled" });
    }

    // Check global email toggle
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("email_notifications_enabled")
      .eq("id", "default")
      .single();

    if (settings && settings.email_notifications_enabled === false) {
      await logEmail(supabase, payload.recipient_id ?? "", payload.type, "", "skipped", { reason: "global_disabled" });
      return jsonResponse({ success: false, skipped: true, reason: "global_email_disabled" });
    }

    // Check automation is active
    const { data: automation } = await supabase
      .from("email_automations")
      .select("is_active, subject_template")
      .eq("type", payload.type)
      .single();

    // If automation exists and is disabled, skip
    if (automation && automation.is_active === false) {
      await logEmail(supabase, payload.recipient_id ?? "", payload.type, "", "skipped", { reason: "automation_disabled" });
      return jsonResponse({ success: false, skipped: true, reason: "automation_disabled" });
    }

    // Check per-user notification preferences
    const prefMap: Record<string, string | null> = {
      comment: "email_comments",
      post_reply: "email_post_reply",
      mention: "email_mentions",
      mention_community: "email_mentions",
      like: "email_likes",
      follow: "email_follows",
      new_course: "email_new_course",
      new_lesson: "email_new_lesson",
      certificate_earned: "email_certificate",
      mission_complete: "email_mission_complete",
      badge_earned: "email_badge_earned",
      follower_milestone_10: "email_follower_milestone",
      comment_milestone: "email_badge_earned",
      community_post: "email_comments",
      welcome: null,
      access_reminder_7d: null,
      community_inactive_30d: null,
    };

    const prefColumn = prefMap[payload.type] ?? undefined;
    if (prefColumn && payload.recipient_id) {
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select(prefColumn)
        .eq("user_id", payload.recipient_id)
        .single();

      if (prefs && prefs[prefColumn] === false) {
        await logEmail(supabase, payload.recipient_id, payload.type, "", "skipped", { reason: "user_preference_disabled", field: prefColumn });
        return jsonResponse({ success: false, skipped: true, reason: "user_preference_disabled" });
      }
    }

    // Build the email
    const subject = buildSubject(payload.type, { ...payload, recipient_name: recipientName });
    const body = buildBody(payload.type, { ...payload, recipient_name: recipientName });

    const html = buildEmailHtml({
      subject,
      previewText: body.previewText,
      heading: body.heading,
      bodyHtml: body.bodyHtml,
      ctaText: body.ctaText,
      ctaUrl: body.ctaUrl,
      platformName: PLATFORM_NAME,
      platformUrl: PLATFORM_URL,
    });

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);
      await logEmail(supabase, payload.recipient_id ?? "", payload.type, subject, "failed", { error: errText });
      return jsonResponse({ error: "Failed to send email", detail: errText }, 500);
    }

    const data = await res.json();
    await logEmail(supabase, payload.recipient_id ?? "", payload.type, subject, "sent", { resend_id: data.id });

    return jsonResponse({ success: true, emailId: data.id });
  } catch (err) {
    console.error("notify-email error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

async function logEmail(
  supabase: ReturnType<typeof createClient>,
  recipientId: string,
  type: string,
  subject: string,
  status: string,
  metadata: Record<string, unknown>
) {
  try {
    await supabase.from("email_notification_log").insert({
      recipient_id: recipientId,
      type,
      automation_type: type,
      subject,
      status,
      metadata,
    });
  } catch (e) {
    console.error("Failed to log email:", e);
  }
}
