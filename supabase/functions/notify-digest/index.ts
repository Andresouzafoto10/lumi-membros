import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const PLATFORM_URL = Deno.env.get("PLATFORM_URL") ?? "https://app.lumimembros.com";
const FROM_EMAIL = "Lumi Membros <noreply@lumimembros.com>";

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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const sinceDate = oneWeekAgo.toISOString();

    // Get all active students with email notifications enabled
    const { data: students } = await supabase
      .from("profiles")
      .select("id, email, display_name, name, email_notifications")
      .eq("status", "active");

    if (!students || students.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get new posts from the past week
    const { data: recentPosts } = await supabase
      .from("community_posts")
      .select("id, community_id, title")
      .eq("status", "published")
      .gte("created_at", sinceDate);

    // Get new badges earned this week
    const { data: recentAchievements } = await supabase
      .from("user_achievements")
      .select("student_id, achievement_id")
      .gte("created_at", sinceDate);

    // Get mentions this week
    const { data: recentMentions } = await supabase
      .from("notifications")
      .select("recipient_id")
      .eq("type", "mention")
      .gte("created_at", sinceDate);

    let sentCount = 0;

    for (const student of students) {
      // Skip if email notifications are disabled
      if (student.email_notifications === false) continue;
      if (!student.email) continue;

      const displayName = (student.display_name as string) || (student.name as string) || "Membro";

      // Count new posts in accessible communities
      const newPostsCount = (recentPosts ?? []).length;

      // Count badges earned by this student
      const badgesEarned = (recentAchievements ?? []).filter(
        (a) => a.student_id === student.id
      ).length;

      // Count mentions for this student
      const mentionsCount = (recentMentions ?? []).filter(
        (m) => m.recipient_id === student.id
      ).length;

      // Skip if nothing happened
      if (newPostsCount === 0 && badgesEarned === 0 && mentionsCount === 0) continue;

      const html = buildDigestHtml({
        name: displayName,
        newPostsCount,
        badgesEarned,
        mentionsCount,
        platformUrl: PLATFORM_URL,
      });

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [student.email],
          subject: `Seu resumo semanal da Lumi Membros`,
          html,
        }),
      });

      if (res.ok) {
        sentCount++;
        // Log
        await supabase.from("email_notification_log").insert({
          recipient_id: student.id,
          type: "digest",
          status: "sent",
          metadata: { newPostsCount, badgesEarned, mentionsCount },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-digest error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function buildDigestHtml(data: {
  name: string;
  newPostsCount: number;
  badgesEarned: number;
  mentionsCount: number;
  platformUrl: string;
}): string {
  const items: string[] = [];
  if (data.newPostsCount > 0) {
    items.push(`📝 <strong>${data.newPostsCount}</strong> novos posts nas suas comunidades`);
  }
  if (data.badgesEarned > 0) {
    items.push(`🏆 <strong>${data.badgesEarned}</strong> badge${data.badgesEarned > 1 ? "s" : ""} conquistado${data.badgesEarned > 1 ? "s" : ""}`);
  }
  if (data.mentionsCount > 0) {
    items.push(`📢 <strong>${data.mentionsCount}</strong> mencao${data.mentionsCount > 1 ? "oes" : ""} recebida${data.mentionsCount > 1 ? "s" : ""}`);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 24px; margin-bottom: 24px; }
    .header { background: linear-gradient(135deg, #00C2CB, #00a8b0); padding: 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 20px; margin: 0; font-weight: 700; }
    .body { padding: 32px 24px; }
    .greeting { font-size: 15px; color: #3f3f46; margin-bottom: 16px; }
    .summary { font-size: 14px; color: #18181b; line-height: 1.8; margin-bottom: 24px; padding: 16px; background: #f4f4f5; border-radius: 8px; }
    .summary-item { margin-bottom: 8px; }
    .cta { display: inline-block; background: #00C2CB; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .cta-wrapper { text-align: center; margin-top: 24px; }
    .footer { padding: 20px 24px; text-align: center; border-top: 1px solid #e4e4e7; }
    .footer p { font-size: 12px; color: #a1a1aa; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Resumo Semanal</h1>
    </div>
    <div class="body">
      <p class="greeting">Ola, ${data.name}! Veja o que aconteceu esta semana:</p>
      <div class="summary">
        ${items.map((i) => `<div class="summary-item">${i}</div>`).join("\n        ")}
      </div>
      <div class="cta-wrapper">
        <a href="${data.platformUrl}/comunidade/feed" class="cta">Acessar a plataforma</a>
      </div>
    </div>
    <div class="footer">
      <p>Voce recebeu este email porque e membro da plataforma Lumi Membros.</p>
    </div>
  </div>
</body>
</html>`;
}
