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

serve(async (req) => {
  const corsHeaders = makeCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authentication: accept service role key (cron) OR admin/owner/support JWT.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;
    if (!isServiceRole) {
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();
      const allowed = profile && ["owner", "admin", "support"].includes(profile.role as string);
      if (!allowed) {
        return new Response(
          JSON.stringify({ error: "Admin role required" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

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

      // Get students who haven't watched anything in 7 days (paginated, max 500/batch)
      type StudentRow = { id: string; email: string; display_name: string | null; name: string | null; email_notifications: boolean | null };
      const allStudents: StudentRow[] = [];
      let pgFrom = 0;
      const PG = 500;
      while (true) {
        const { data: page } = await supabase
          .from("profiles")
          .select("id, email, display_name, name, email_notifications")
          .eq("status", "active")
          .eq("role", "student")
          .range(pgFrom, pgFrom + PG - 1);
        if (!page || page.length === 0) break;
        allStudents.push(...(page as StudentRow[]));
        if (page.length < PG) break;
        pgFrom += PG;
      }

      for (const student of allStudents) {
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

      // Paginated student fetch (max 500/batch)
      type StudentRow2 = { id: string; email: string; display_name: string | null; name: string | null; email_notifications: boolean | null };
      const students: StudentRow2[] = [];
      let pgFrom2 = 0;
      const PG2 = 500;
      while (true) {
        const { data: page } = await supabase
          .from("profiles")
          .select("id, email, display_name, name, email_notifications")
          .eq("status", "active")
          .eq("role", "student")
          .range(pgFrom2, pgFrom2 + PG2 - 1);
        if (!page || page.length === 0) break;
        students.push(...(page as StudentRow2[]));
        if (page.length < PG2) break;
        pgFrom2 += PG2;
      }

      for (const student of students) {
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
    // 3. Live lesson reminders — 24h / 12h / 1h before scheduled_at
    // ------------------------------------------------------------------
    const { data: liveAutomation } = await supabase
      .from("email_automations")
      .select("is_active")
      .eq("type", "live_reminder")
      .single();

    if (liveAutomation?.is_active) {
      const nowMs = Date.now();
      const WINDOW_MIN = 15;

      const fromIso = new Date(nowMs - 60 * 60 * 1000).toISOString();   // -1h
      const toIso = new Date(nowMs + 25 * 60 * 60 * 1000).toISOString(); // +25h

      const { data: liveLessons } = await supabase
        .from("live_lessons")
        .select("*")
        .eq("notify_email_enabled", true)
        .not("status", "in", "(cancelled,ended,recorded)")
        .gte("scheduled_at", fromIso)
        .lte("scheduled_at", toIso);

      type LL = {
        id: string;
        title: string;
        description: string | null;
        cover_url: string | null;
        meeting_url: string | null;
        scheduled_at: string;
        duration_minutes: number;
        access_mode: "all" | "classes" | "open";
        class_ids: string[] | null;
        notify_24h: boolean;
        notify_12h: boolean;
        notify_1h: boolean;
        notify_24h_sent_at: string | null;
        notify_12h_sent_at: string | null;
        notify_1h_sent_at: string | null;
      };

      for (const lessonRaw of (liveLessons ?? []) as LL[]) {
        const startMs = new Date(lessonRaw.scheduled_at).getTime();
        const minsToStart = (startMs - nowMs) / 60_000;

        const slots: Array<{ key: "24h" | "12h" | "1h"; target: number; enabled: boolean; sent: string | null }> = [
          { key: "24h", target: 24 * 60, enabled: lessonRaw.notify_24h, sent: lessonRaw.notify_24h_sent_at },
          { key: "12h", target: 12 * 60, enabled: lessonRaw.notify_12h, sent: lessonRaw.notify_12h_sent_at },
          { key: "1h",  target: 1 * 60,  enabled: lessonRaw.notify_1h,  sent: lessonRaw.notify_1h_sent_at  },
        ];

        for (const slot of slots) {
          if (!slot.enabled || slot.sent) continue;
          if (Math.abs(minsToStart - slot.target) > WINDOW_MIN) continue;

          // Resolve recipients
          if (lessonRaw.access_mode === "open") continue;

          let enrollmentQ = supabase
            .from("enrollments")
            .select("student_id, expires_at")
            .eq("status", "active");
          if (lessonRaw.access_mode === "classes") {
            enrollmentQ = enrollmentQ.in("class_id", lessonRaw.class_ids ?? []);
          }
          const { data: enrollmentRows } = await enrollmentQ;

          const studentIds = new Set<string>();
          for (const e of enrollmentRows ?? []) {
            if (e.expires_at && new Date(e.expires_at as string).getTime() < nowMs) continue;
            studentIds.add(e.student_id as string);
          }
          if (studentIds.size === 0) {
            // Nothing to send; mark slot to avoid retrying the same empty list forever
            await supabase
              .from("live_lessons")
              .update({ [`notify_${slot.key}_sent_at`]: new Date().toISOString() })
              .eq("id", lessonRaw.id);
            continue;
          }

          const ids = Array.from(studentIds);
          const { data: profileRows } = await supabase
            .from("profiles")
            .select("id, email, display_name, name, email_notifications")
            .in("id", ids);

          // Bulk-fetch notification_preferences for these IDs
          const { data: prefRows } = await supabase
            .from("notification_preferences")
            .select("user_id, email_live_reminder")
            .in("user_id", ids);
          const prefMap = new Map<string, boolean>();
          for (const p of prefRows ?? []) {
            prefMap.set(p.user_id as string, (p.email_live_reminder as boolean) ?? true);
          }

          const whenLabel = slot.key === "24h" ? "é amanhã" : slot.key === "12h" ? "em 12 horas" : "em 1 hora";
          const whenHuman =
            slot.key === "24h"
              ? `amanhã às ${new Date(lessonRaw.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}`
              : slot.key === "12h"
              ? "em 12 horas"
              : "em 1 hora";
          const subject = `Sua aula ao vivo ${whenLabel}: ${lessonRaw.title}`;
          const previewText = `Não perca: ${lessonRaw.title} ${whenHuman}`;

          let slotSent = 0;
          let slotSkipped = 0;

          for (const p of (profileRows ?? []) as Array<{ id: string; email: string; display_name: string | null; name: string | null; email_notifications: boolean | null }>) {
            if (!p.email) {
              slotSkipped++;
              continue;
            }
            // Tier 1: user global opt-in
            if (p.email_notifications === false) {
              await supabase.from("email_notification_log").insert({
                recipient_id: p.id, type: "live_reminder", automation_type: "live_reminder",
                subject, status: "skipped", metadata: { lesson_id: lessonRaw.id, slot: slot.key, reason: "user_email_off" },
              });
              slotSkipped++;
              continue;
            }
            // Tier 4: per-type preference
            const pref = prefMap.get(p.id);
            if (pref === false) {
              await supabase.from("email_notification_log").insert({
                recipient_id: p.id, type: "live_reminder", automation_type: "live_reminder",
                subject, status: "skipped", metadata: { lesson_id: lessonRaw.id, slot: slot.key, reason: "pref_off" },
              });
              slotSkipped++;
              continue;
            }

            const displayName = (p.display_name as string) || (p.name as string) || "Membro";
            const coverHtml = lessonRaw.cover_url
              ? `<img src="${lessonRaw.cover_url}" alt="" style="width:100%;border-radius:8px;margin-bottom:16px;" />`
              : "";
            const bodyHtml = `${coverHtml}
              <p style="margin:0 0 12px 0;">Olá, ${displayName}!</p>
              <p style="margin:0 0 16px 0;">Sua aula ao vivo <strong>${lessonRaw.title}</strong> começa ${whenHuman}.</p>
              ${lessonRaw.description ? `<p style="margin:0 0 16px 0;color:#a1a1aa;">${lessonRaw.description}</p>` : ""}`;

            const html = buildEmailHtml({
              subject,
              previewText,
              heading: lessonRaw.title,
              subheading: whenHuman,
              bodyHtml,
              ctaText: "Salvar link",
              ctaUrl: lessonRaw.meeting_url ?? `${PLATFORM_URL}/ao-vivo`,
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
                to: [p.email],
                subject,
                html,
              }),
            });

            if (res.ok) {
              slotSent++;
              await supabase.from("email_notification_log").insert({
                recipient_id: p.id, type: "live_reminder", automation_type: "live_reminder",
                subject, status: "sent", metadata: { lesson_id: lessonRaw.id, slot: slot.key },
              });
            } else {
              slotSkipped++;
              await supabase.from("email_notification_log").insert({
                recipient_id: p.id, type: "live_reminder", automation_type: "live_reminder",
                subject, status: "failed", metadata: { lesson_id: lessonRaw.id, slot: slot.key, http: res.status },
              });
            }
          }

          totalSent += slotSent;
          totalSkipped += slotSkipped;

          // Mark the slot dispatched (idempotency) — set sent_at regardless of per-recipient outcome
          // to avoid hot-retry loops if Resend is failing for a single send.
          await supabase
            .from("live_lessons")
            .update({ [`notify_${slot.key}_sent_at`]: new Date().toISOString() })
            .eq("id", lessonRaw.id);
        }
      }
    }

    // ------------------------------------------------------------------
    // 4. Cleanup old read notifications (30+ days)
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
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
