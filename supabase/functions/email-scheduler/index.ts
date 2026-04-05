import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "../_shared/email-template.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PLATFORM_URL = Deno.env.get("PLATFORM_URL") ?? "https://app.membrosmaster.com.br";
const PLATFORM_NAME = Deno.env.get("PLATFORM_NAME") ?? "Membros Master";
const FROM_EMAIL = `${PLATFORM_NAME} <enviar@membrosmaster.com.br>`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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
      return new Response(JSON.stringify({ processed: 0, sent: 0, skipped: 0, reason: "global_disabled" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let totalSent = 0;
    let totalSkipped = 0;

    // ------------------------------------------------------------------
    // 1. Access reminder — students inactive for 7+ days
    // ------------------------------------------------------------------
    const { data: reminderAutomation } = await supabase
      .from("email_automations")
      .select("is_active")
      .eq("type", "access_reminder_7d")
      .single();

    if (reminderAutomation?.is_active) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get students who haven't watched anything in 7 days
      const { data: allStudents } = await supabase
        .from("profiles")
        .select("id, email, display_name, name, email_notifications")
        .eq("status", "active")
        .eq("role", "student");

      for (const student of allStudents ?? []) {
        if (student.email_notifications === false || !student.email) continue;

        // Check if already sent this reminder
        const { data: existingLog } = await supabase
          .from("email_notification_log")
          .select("id")
          .eq("recipient_id", student.id)
          .eq("type", "access_reminder_7d")
          .eq("status", "sent")
          .limit(1);

        if (existingLog && existingLog.length > 0) {
          totalSkipped++;
          continue;
        }

        // Check last watched
        const { data: lastWatched } = await supabase
          .from("last_watched")
          .select("updated_at")
          .eq("student_id", student.id)
          .single();

        const lastActivity = lastWatched?.updated_at
          ? new Date(lastWatched.updated_at as string)
          : null;

        // If no activity at all, or last activity > 7 days ago
        if (lastActivity && lastActivity > sevenDaysAgo) {
          totalSkipped++;
          continue;
        }

        const displayName = (student.display_name as string) || (student.name as string) || "Membro";

        const html = buildEmailHtml({
          subject: `Sentimos sua falta, ${displayName}! 👋`,
          previewText: "Voce tem cursos esperando por voce",
          heading: `Sentimos sua falta, ${displayName}!`,
          bodyHtml: `<p style="margin:0 0 16px 0;">Faz um tempo que voce nao aparece por aqui. Seus cursos estao esperando por voce!</p>
            <p style="margin:0;">A comunidade tambem esta ativa — entre e veja as novidades.</p>`,
          ctaText: "Voltar a plataforma",
          ctaUrl: `${PLATFORM_URL}/cursos`,
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
            subject: `Sentimos sua falta, ${displayName}! 👋`,
            html,
          }),
        });

        if (res.ok) {
          totalSent++;
          await supabase.from("email_notification_log").insert({
            recipient_id: student.id,
            type: "access_reminder_7d",
            automation_type: "access_reminder_7d",
            subject: `Sentimos sua falta, ${displayName}! 👋`,
            status: "sent",
          });
        } else {
          totalSkipped++;
        }
      }
    }

    // ------------------------------------------------------------------
    // 2. Community inactive 30 days — students who haven't posted
    // ------------------------------------------------------------------
    const { data: communityAutomation } = await supabase
      .from("email_automations")
      .select("is_active")
      .eq("type", "community_inactive_30d")
      .single();

    if (communityAutomation?.is_active) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const oneMonthAgo = thirtyDaysAgo.toISOString();

      const { data: students } = await supabase
        .from("profiles")
        .select("id, email, display_name, name, email_notifications")
        .eq("status", "active")
        .eq("role", "student");

      for (const student of students ?? []) {
        if (student.email_notifications === false || !student.email) continue;

        // Check if sent this month already
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const { data: existingLog } = await supabase
          .from("email_notification_log")
          .select("id")
          .eq("recipient_id", student.id)
          .eq("type", "community_inactive_30d")
          .eq("status", "sent")
          .gte("sent_at", monthStart.toISOString())
          .limit(1);

        if (existingLog && existingLog.length > 0) {
          totalSkipped++;
          continue;
        }

        // Check if student has posted in last 30 days
        const { data: recentPosts } = await supabase
          .from("community_posts")
          .select("id")
          .eq("author_id", student.id)
          .gte("created_at", oneMonthAgo)
          .limit(1);

        if (recentPosts && recentPosts.length > 0) {
          totalSkipped++;
          continue;
        }

        const displayName = (student.display_name as string) || (student.name as string) || "Membro";

        const html = buildEmailHtml({
          subject: `Tem novidades na comunidade, ${displayName}! 💬`,
          previewText: "Veja o que esta acontecendo",
          heading: `Tem novidades na comunidade!`,
          bodyHtml: `<p style="margin:0 0 16px 0;">Ola, ${displayName}! Faz um tempo que voce nao participa da comunidade.</p>
            <p style="margin:0;">Tem muita coisa nova acontecendo — entre e confira as publicacoes recentes.</p>`,
          ctaText: "Ver comunidade",
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
            subject: `Tem novidades na comunidade, ${displayName}! 💬`,
            html,
          }),
        });

        if (res.ok) {
          totalSent++;
          await supabase.from("email_notification_log").insert({
            recipient_id: student.id,
            type: "community_inactive_30d",
            automation_type: "community_inactive_30d",
            subject: `Tem novidades na comunidade, ${displayName}! 💬`,
            status: "sent",
          });
        } else {
          totalSkipped++;
        }
      }
    }

    // ------------------------------------------------------------------
    // 3. Cleanup old read notifications (30+ days)
    // ------------------------------------------------------------------
    let cleanedNotifications = 0;
    try {
      const { data: cleanupResult } = await supabase.rpc("cleanup_old_notifications");
      cleanedNotifications = (cleanupResult as number) ?? 0;
    } catch {
      console.warn("cleanup_old_notifications failed — function may not exist yet");
    }

    return new Response(
      JSON.stringify({ success: true, processed: totalSent + totalSkipped, sent: totalSent, skipped: totalSkipped, cleanedNotifications }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    console.error("email-scheduler error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
