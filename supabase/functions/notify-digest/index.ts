import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "../_shared/email-template.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const PLATFORM_URL = Deno.env.get("PLATFORM_URL") ?? "https://app.membrosmaster.com.br";
const PLATFORM_NAME = Deno.env.get("PLATFORM_NAME") ?? "Membros Master";
const FROM_EMAIL = `${PLATFORM_NAME} <enviar@membrosmaster.com.br>`;
const ALLOWED_ORIGIN = Deno.env.get("APP_URL") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check global email toggle
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("email_notifications_enabled")
      .eq("id", "default")
      .single();

    if (settings?.email_notifications_enabled === false) {
      return new Response(JSON.stringify({ sent: 0, reason: "global_disabled" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const sinceDate = oneWeekAgo.toISOString();

    const { data: students } = await supabase
      .from("profiles")
      .select("id, email, display_name, name, email_notifications")
      .eq("status", "active");

    if (!students || students.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: recentPosts } = await supabase
      .from("community_posts")
      .select("id, community_id, title")
      .eq("status", "published")
      .gte("created_at", sinceDate);

    const { data: recentAchievements } = await supabase
      .from("user_achievements")
      .select("student_id, achievement_id")
      .gte("created_at", sinceDate);

    const { data: recentMentions } = await supabase
      .from("notifications")
      .select("recipient_id")
      .eq("type", "mention")
      .gte("created_at", sinceDate);

    let sentCount = 0;

    for (const student of students) {
      if (student.email_notifications === false) continue;
      if (!student.email) continue;

      const displayName = (student.display_name as string) || (student.name as string) || "Membro";

      const newPostsCount = (recentPosts ?? []).length;
      const badgesEarned = (recentAchievements ?? []).filter(
        (a) => a.student_id === student.id
      ).length;
      const mentionsCount = (recentMentions ?? []).filter(
        (m) => m.recipient_id === student.id
      ).length;

      if (newPostsCount === 0 && badgesEarned === 0 && mentionsCount === 0) continue;

      const items: string[] = [];
      if (newPostsCount > 0) {
        items.push(`<strong>${newPostsCount}</strong> novos posts nas suas comunidades`);
      }
      if (badgesEarned > 0) {
        items.push(`<strong>${badgesEarned}</strong> badge${badgesEarned > 1 ? "s" : ""} conquistado${badgesEarned > 1 ? "s" : ""}`);
      }
      if (mentionsCount > 0) {
        items.push(`<strong>${mentionsCount}</strong> mencao${mentionsCount > 1 ? "es" : ""} recebida${mentionsCount > 1 ? "s" : ""}`);
      }

      const bodyHtml = `<p style="margin:0 0 16px 0;">Veja o que aconteceu esta semana:</p>
        <div style="padding:16px;background-color:#27272a;border-radius:8px;border-left:3px solid #ff7b00;">
          ${items.map((i) => `<p style="margin:0 0 8px 0;color:#d4d4d8;font-size:14px;line-height:22px;">${i}</p>`).join("")}
        </div>`;

      const html = buildEmailHtml({
        subject: `Seu resumo semanal da ${PLATFORM_NAME}`,
        previewText: `${newPostsCount} posts, ${badgesEarned} badges, ${mentionsCount} mencoes`,
        heading: `Resumo Semanal`,
        subheading: `Ola, ${displayName}!`,
        bodyHtml,
        ctaText: "Acessar a plataforma",
        ctaUrl: `${PLATFORM_URL}/comunidade/feed`,
        platformName: PLATFORM_NAME,
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
          subject: `Seu resumo semanal da ${PLATFORM_NAME}`,
          html,
        }),
      });

      if (res.ok) {
        sentCount++;
        await supabase.from("email_notification_log").insert({
          recipient_id: student.id,
          type: "digest",
          automation_type: "digest",
          subject: `Seu resumo semanal da ${PLATFORM_NAME}`,
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
