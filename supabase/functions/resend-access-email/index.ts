import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildEmailHtml } from "../_shared/email-template.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the caller is an admin
    const callerSupabase = createClient(SUPABASE_URL, authHeader.replace("Bearer ", ""), {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerSupabase.auth.getUser();

    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check admin role
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || !["owner", "admin", "support"].includes(callerProfile.role as string)) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get target user profile
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("email, display_name, name")
      .eq("id", userId)
      .single();

    if (!targetProfile || !targetProfile.email) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate magic link for the user
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: targetProfile.email as string,
    });

    if (linkError || !linkData) {
      return new Response(JSON.stringify({ error: linkError?.message ?? "Failed to generate link" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const displayName = (targetProfile.display_name as string) || (targetProfile.name as string) || "Membro";
    const magicLink = linkData.properties?.action_link ?? `${PLATFORM_URL}/login`;

    const html = buildEmailHtml({
      subject: `Seu acesso a ${PLATFORM_NAME}`,
      previewText: "Clique no botao abaixo para acessar a plataforma",
      heading: `Ola, ${displayName}!`,
      subheading: "Acesse a plataforma com o botao abaixo",
      bodyHtml: `<p style="margin:0 0 16px 0;">O administrador reenviou seu acesso a <strong>${PLATFORM_NAME}</strong>.</p>
        <p style="margin:0;">Clique no botao abaixo para entrar diretamente na plataforma. Este link e valido por 24 horas.</p>`,
      ctaText: "Acessar plataforma",
      ctaUrl: magicLink,
      footerNote: "Se voce nao solicitou este acesso, pode ignorar este email com seguranca.",
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
        to: [targetProfile.email],
        subject: `Seu acesso a ${PLATFORM_NAME}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: "Failed to send email", detail: errText }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Log the resend
    await supabase.from("email_notification_log").insert({
      recipient_id: userId,
      type: "resend_access",
      automation_type: "resend_access",
      subject: `Seu acesso a ${PLATFORM_NAME}`,
      status: "sent",
      metadata: { resent_by: caller.id },
    });

    return new Response(JSON.stringify({ success: true, message: "Email de acesso reenviado com sucesso" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("resend-access-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
