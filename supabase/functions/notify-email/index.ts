import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "../_shared/email-template.ts";
import { makeCorsHeaders } from "../_shared/cors.ts";

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
  | "welcome_with_setup"
  | "course_unlocked"
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
      return `Bem-vindo(a) a Escola Master! Sua jornada comeca agora 📸`;
    case "welcome_with_setup":
      return `Bem-vindo(a) a ${PLATFORM_NAME}! Crie sua senha 🔐`;
    case "course_unlocked":
      return `Novo acesso liberado: ${ctx.classes_list ?? "novas turmas"} 🎉`;
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
        heading: `Que bom te ver aqui, ${name}!`,
        bodyHtml: `<p style="margin:0 0 16px 0;">Voce acaba de entrar na <strong style="color:#ff7b00;">Escola Master</strong> &mdash; o lugar onde fotografos viram profissionais que vivem da propria arte.</p>
          <p style="margin:0 0 12px 0;">Aqui voce vai dominar tudo que um fotografo de verdade precisa:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px 0;width:100%;">
            <tr><td style="padding:6px 0;color:#fafafa;"><span style="color:#ff7b00;font-weight:700;">&#9679;</span> &nbsp;<strong>Fotografia</strong> &mdash; tecnica, luz, composicao, direcao</td></tr>
            <tr><td style="padding:6px 0;color:#fafafa;"><span style="color:#ff7b00;font-weight:700;">&#9679;</span> &nbsp;<strong>Edicao</strong> &mdash; fluxo profissional, cor e retoque</td></tr>
            <tr><td style="padding:6px 0;color:#fafafa;"><span style="color:#ff7b00;font-weight:700;">&#9679;</span> &nbsp;<strong>Marketing</strong> &mdash; atrair clientes que pagam o seu preco</td></tr>
            <tr><td style="padding:6px 0;color:#fafafa;"><span style="color:#ff7b00;font-weight:700;">&#9679;</span> &nbsp;<strong>Vendas</strong> &mdash; fechar contratos sem medo</td></tr>
            <tr><td style="padding:6px 0;color:#fafafa;"><span style="color:#ff7b00;font-weight:700;">&#9679;</span> &nbsp;<strong>Gestao</strong> &mdash; organizar agenda, financas e equipe</td></tr>
            <tr><td style="padding:6px 0;color:#fafafa;"><span style="color:#ff7b00;font-weight:700;">&#9679;</span> &nbsp;<strong>Ferramentas</strong> &mdash; saber o que usar e quando usar</td></tr>
          </table>
          <p style="margin:0 0 16px 0;">E o melhor: <strong>voce nao vai trilhar esse caminho sozinho.</strong></p>
          <div style="margin:0 0 20px 0;padding:18px 20px;background:#27272a;border:1px solid #3f3f46;border-radius:10px;">
            <p style="margin:0 0 6px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#ff7b00;font-weight:700;">Comunidade Master</p>
            <p style="margin:0;color:#fafafa;line-height:22px;">Poste suas fotos, receba avaliacao direta dos professores Master, troque ideia com outros alunos que estao na mesma jornada e veja seu trabalho evoluir a cada feedback. E ali que muitos descobrem o salto que faltava &mdash; aquela critica certa, no momento certo, que muda tudo.</p>
          </div>
          <p style="margin:0;">Sua transformacao comeca com um clique. Bora?</p>`,
        ctaText: "Entrar na plataforma",
        ctaUrl: `${baseUrl}/cursos`,
        previewText: "Cursos + comunidade + avaliacao dos professores. Tudo pra voce viver de fotografia.",
      };

    case "welcome_with_setup": {
      const classesList = (ctx.classes_list as string) ?? "";
      const tempPassword = (ctx.temp_password as string) ?? "";
      const loginUrl = (ctx.action_url as string) ?? `${baseUrl}/login`;
      const userEmail = payload.recipient_email ?? "";
      // Outside text colors: light tones (#fafafa / #d4d4d8) to read on the
      // dark body bg (#18181b) of the base template. Inside the credentials
      // card the bg is light so we use dark text there.
      const classesBlock = classesList
        ? `<div style="margin:0 0 20px 0;padding:14px 16px;background:#27272a;border:1px solid #3f3f46;border-radius:10px;">
            <p style="margin:0 0 6px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#ff7b00;font-weight:700;">Acessos liberados</p>
            <p style="margin:0;color:#fafafa;font-weight:500;">${classesList}</p>
          </div>`
        : "";
      const credBlock = `<div style="margin:0 0 20px 0;padding:18px 20px;background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;">
          <p style="margin:0 0 12px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#374151;font-weight:700;">Seus dados de acesso</p>
          <p style="margin:0 0 4px 0;color:#4b5563;font-size:13px;">Email</p>
          <p style="margin:0 0 14px 0;font-family:'SFMono-Regular',Menlo,monospace;font-size:15px;color:#111827;">${userEmail}</p>
          <p style="margin:0 0 4px 0;color:#4b5563;font-size:13px;">Senha</p>
          <p style="margin:0;font-family:'SFMono-Regular',Menlo,monospace;font-size:22px;color:#111827;letter-spacing:2px;font-weight:800;">${tempPassword}</p>
        </div>`;
      return {
        heading: `Bem-vindo(a), ${name}!`,
        bodyHtml: `<p style="margin:0 0 16px 0;color:#fafafa;">Sua compra na <strong style="color:#ff7b00;">${PLATFORM_NAME}</strong> foi confirmada. 🎉</p>
          ${classesBlock}
          <p style="margin:0 0 12px 0;color:#fafafa;">Use os dados abaixo para entrar na plataforma:</p>
          ${credBlock}
          <p style="margin:0;font-size:14px;line-height:22px;color:#e4e4e7;"><strong style="color:#ff7b00;">Dica de seguranca:</strong> altere sua senha quando quiser em <strong style="color:#fafafa;">Perfil &rarr; Alterar senha</strong>, ou use a opcao <strong style="color:#fafafa;">"Esqueci minha senha"</strong> na tela de login.</p>`,
        ctaText: "Acessar plataforma",
        ctaUrl: loginUrl,
        previewText: "Sua senha de acesso esta neste email",
      };
    }


    case "course_unlocked": {
      const classesList = (ctx.classes_list as string) ?? "novas turmas";
      const classesBlock = `<div style="margin:0 0 20px 0;padding:14px 16px;background:#27272a;border:1px solid #3f3f46;border-radius:10px;">
          <p style="margin:0 0 6px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#ff7b00;font-weight:700;">Acessos liberados</p>
          <p style="margin:0;color:#fafafa;font-weight:500;">${classesList}</p>
        </div>`;
      return {
        heading: `Ola, ${name}!`,
        bodyHtml: `<p style="margin:0 0 16px 0;color:#fafafa;">Sua compra foi confirmada e voce ja tem novos acessos liberados na <strong style="color:#ff7b00;">${PLATFORM_NAME}</strong>! 🎉</p>
          ${classesBlock}
          <p style="margin:0;color:#fafafa;">Clique abaixo para entrar na plataforma e comecar a estudar agora mesmo.</p>`,
        ctaText: "Acessar plataforma",
        ctaUrl: (ctx.action_url as string) ?? `${baseUrl}/cursos`,
        previewText: `Voce desbloqueou ${classesList}`,
      };
    }

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
  const corsHeaders = makeCorsHeaders(req);
  const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const contentLength = Number(req.headers.get("Content-Length") ?? 0);
    if (contentLength > 32768) {
      return jsonResponse({ error: "Payload too large" }, 413);
    }

    const payload: NotifyEmailPayload = await req.json();

    const allowedTypes: ReadonlySet<string> = new Set([
      "comment", "like", "follow", "mention", "new_post", "badge_earned",
      "welcome", "welcome_with_setup", "course_unlocked",
      "access_reminder_7d", "community_post", "community_inactive_30d",
      "new_course", "new_lesson", "certificate_earned", "mention_community",
      "follower_milestone_10", "post_reply", "mission_complete", "comment_milestone",
    ]);
    if (!payload.type || !allowedTypes.has(payload.type)) {
      return jsonResponse({ error: "Invalid or missing field: type" }, 400);
    }
    if (payload.recipient_email && typeof payload.recipient_email !== "string") {
      return jsonResponse({ error: "Invalid recipient_email" }, 400);
    }
    if (payload.recipient_id && typeof payload.recipient_id !== "string") {
      return jsonResponse({ error: "Invalid recipient_id" }, 400);
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
      // Comment milestones are achievement-like (5/25/100 comments) — gated by
      // the same preference as badge_earned by design.
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
      return jsonResponse({ error: "Failed to send email" }, 502);
    }

    const data = await res.json();
    await logEmail(supabase, payload.recipient_id ?? "", payload.type, subject, "sent", { resend_id: data.id });

    return jsonResponse({ success: true, emailId: data.id });
  } catch (err) {
    console.error("notify-email error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
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
