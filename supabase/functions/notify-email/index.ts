import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "Lumi Membros <noreply@lumimembros.com>";

type NotificationType =
  | "comment"
  | "like"
  | "follow"
  | "mention"
  | "new_post"
  | "badge_earned";

interface NotifyEmailPayload {
  type: NotificationType;
  recipient_email: string;
  recipient_name: string;
  actor_name: string;
  context: {
    post_title?: string;
    community_name?: string;
    badge_name?: string;
    action_url: string;
  };
}

function getSubject(type: NotificationType, payload: NotifyEmailPayload): string {
  switch (type) {
    case "comment":
      return `${payload.actor_name} comentou no seu post`;
    case "like":
      return `${payload.actor_name} curtiu seu post`;
    case "follow":
      return `${payload.actor_name} comecou a te seguir`;
    case "mention":
      return `${payload.actor_name} te mencionou`;
    case "new_post":
      return `Novo post em ${payload.context.community_name ?? "comunidade"}`;
    case "badge_earned":
      return `Voce conquistou o badge "${payload.context.badge_name}"!`;
  }
}

function getMessage(type: NotificationType, payload: NotifyEmailPayload): string {
  const { actor_name, context } = payload;
  switch (type) {
    case "comment":
      return `<strong>${actor_name}</strong> comentou no seu post "${context.post_title ?? ""}".`;
    case "like":
      return `<strong>${actor_name}</strong> curtiu seu post "${context.post_title ?? ""}".`;
    case "follow":
      return `<strong>${actor_name}</strong> comecou a te seguir na plataforma.`;
    case "mention":
      return `<strong>${actor_name}</strong> te mencionou em uma publicacao em "${context.community_name ?? ""}".`;
    case "new_post":
      return `Novo post em "<strong>${context.community_name ?? ""}</strong>": ${context.post_title ?? ""}`;
    case "badge_earned":
      return `Parabens! Voce conquistou o badge "<strong>${context.badge_name ?? ""}</strong>".`;
  }
}

function getEmoji(type: NotificationType): string {
  switch (type) {
    case "comment": return "💬";
    case "like": return "❤️";
    case "follow": return "👤";
    case "mention": return "📢";
    case "new_post": return "📝";
    case "badge_earned": return "🏆";
  }
}

function buildHtml(payload: NotifyEmailPayload): string {
  const emoji = getEmoji(payload.type);
  const message = getMessage(payload.type, payload);
  const actionUrl = payload.context.action_url;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 24px; margin-bottom: 24px; }
    .header { background: linear-gradient(135deg, #00C2CB, #00a8b0); padding: 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 20px; margin: 0; font-weight: 700; letter-spacing: -0.02em; }
    .body { padding: 32px 24px; }
    .greeting { font-size: 15px; color: #3f3f46; margin-bottom: 16px; }
    .message { font-size: 15px; color: #18181b; line-height: 1.6; margin-bottom: 24px; padding: 16px; background: #f4f4f5; border-radius: 8px; border-left: 3px solid #00C2CB; }
    .emoji { font-size: 24px; display: block; margin-bottom: 8px; }
    .cta { display: inline-block; background: #00C2CB; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .cta:hover { background: #00a8b0; }
    .cta-wrapper { text-align: center; margin-top: 24px; }
    .footer { padding: 20px 24px; text-align: center; border-top: 1px solid #e4e4e7; }
    .footer p { font-size: 12px; color: #a1a1aa; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Lumi Membros</h1>
    </div>
    <div class="body">
      <p class="greeting">Ola, ${payload.recipient_name}!</p>
      <div class="message">
        <span class="emoji">${emoji}</span>
        ${message}
      </div>
      <div class="cta-wrapper">
        <a href="${actionUrl}" class="cta">Ver na plataforma</a>
      </div>
    </div>
    <div class="footer">
      <p>Voce recebeu este email porque e membro da plataforma Lumi Membros.</p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const payload: NotifyEmailPayload = await req.json();

    if (!payload.recipient_email || !payload.type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const subject = getSubject(payload.type, payload);
    const html = buildHtml(payload);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [payload.recipient_email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ error: "Failed to send email", detail: err }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
