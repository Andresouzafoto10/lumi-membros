import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ALLOWED_ORIGIN = Deno.env.get("APP_URL") || "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// HMAC validation helpers per platform
// ---------------------------------------------------------------------------

async function verifyHmac(
  secret: string,
  payload: string,
  signature: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature.replace(/^sha256=/, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Extract student data from platform-specific payloads
// ---------------------------------------------------------------------------

type StudentData = { email: string; name: string; productId: string };

function extractFromTicto(body: Record<string, unknown>): StudentData | null {
  const customer = body.customer as Record<string, unknown> | undefined;
  const product = body.product as Record<string, unknown> | undefined;
  if (!customer?.email) return null;
  return {
    email: (customer.email as string).toLowerCase().trim(),
    name: (customer.name as string) ?? (customer.email as string).split("@")[0],
    productId: String(product?.id ?? body.product_id ?? ""),
  };
}

function extractFromHotmart(body: Record<string, unknown>): StudentData | null {
  const data = (body.data ?? body) as Record<string, unknown>;
  const buyer = data.buyer as Record<string, unknown> | undefined;
  const product = data.product as Record<string, unknown> | undefined;
  if (!buyer?.email) return null;
  return {
    email: (buyer.email as string).toLowerCase().trim(),
    name: (buyer.name as string) ?? (buyer.email as string).split("@")[0],
    productId: String(product?.id ?? data.product_id ?? ""),
  };
}

function extractFromEduzz(body: Record<string, unknown>): StudentData | null {
  const customer = body.customer as Record<string, unknown> | undefined;
  if (!customer?.email) return null;
  return {
    email: (customer.email as string).toLowerCase().trim(),
    name: (customer.name as string) ?? (customer.email as string).split("@")[0],
    productId: String(body.product_id ?? body.content_id ?? ""),
  };
}

function extractFromMonetizze(body: Record<string, unknown>): StudentData | null {
  const produto = body.produto as Record<string, unknown> | undefined;
  const comprador = body.comprador as Record<string, unknown> | undefined;
  if (!comprador?.email) return null;
  return {
    email: (comprador.email as string).toLowerCase().trim(),
    name: (comprador.nome as string) ?? (comprador.email as string).split("@")[0],
    productId: String(produto?.codigo ?? body.produto_id ?? ""),
  };
}

const extractors: Record<string, (body: Record<string, unknown>) => StudentData | null> = {
  ticto: extractFromTicto,
  hotmart: extractFromHotmart,
  eduzz: extractFromEduzz,
  monetizze: extractFromMonetizze,
};

// ---------------------------------------------------------------------------
// Get HMAC signature from request headers per platform
// ---------------------------------------------------------------------------

function getSignature(headers: Headers, platform: string): string {
  switch (platform) {
    case "ticto":
      return headers.get("x-ticto-signature") ?? "";
    case "hotmart":
      return headers.get("x-hotmart-hottok") ?? "";
    case "eduzz":
      return headers.get("x-eduzz-signature") ?? "";
    case "monetizze":
      return headers.get("x-monetizze-signature") ?? "";
    default:
      return headers.get("x-signature") ?? "";
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const url = new URL(req.url);
    const platform = url.searchParams.get("platform")?.toLowerCase();

    if (!platform) {
      return new Response(
        JSON.stringify({ error: "Query param 'platform' é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1. Find platform config
    const { data: platformRow, error: pfError } = await supabase
      .from("webhook_platforms")
      .select("*")
      .eq("slug", platform)
      .eq("active", true)
      .maybeSingle();

    if (pfError || !platformRow) {
      return new Response(
        JSON.stringify({ error: `Plataforma '${platform}' não encontrada ou inativa` }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Read body
    const rawBody = await req.text();
    const body = JSON.parse(rawBody) as Record<string, unknown>;

    // 3. Validate HMAC if secret is configured
    if (platformRow.secret_key) {
      const signature = getSignature(req.headers, platform);
      if (!signature) {
        await logEvent(supabase, platformRow.id, body, null, null, null, "error", "Assinatura HMAC ausente no header");
        return new Response(
          JSON.stringify({ error: "Assinatura ausente" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      const valid = await verifyHmac(platformRow.secret_key, rawBody, signature);
      if (!valid) {
        await logEvent(supabase, platformRow.id, body, null, null, null, "error", "Assinatura HMAC inválida");
        return new Response(
          JSON.stringify({ error: "Assinatura inválida" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // 4. Extract student data
    const extractor = extractors[platform];
    if (!extractor) {
      await logEvent(supabase, platformRow.id, body, null, null, null, "error", `Extractor não encontrado para '${platform}'`);
      return new Response(
        JSON.stringify({ error: `Plataforma '${platform}' não suportada` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const studentData = extractor(body);
    if (!studentData || !studentData.email || !studentData.productId) {
      await logEvent(supabase, platformRow.id, body, null, null, null, "error", "Dados do aluno não encontrados no payload");
      return new Response(
        JSON.stringify({ error: "Dados insuficientes no payload" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Find mapping → class
    const { data: mapping } = await supabase
      .from("webhook_mappings")
      .select("class_id")
      .eq("platform_id", platformRow.id)
      .eq("external_product_id", studentData.productId)
      .maybeSingle();

    if (!mapping) {
      await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, null, "error", `Sem mapeamento para produto '${studentData.productId}'`);
      return new Response(
        JSON.stringify({ error: `Sem mapeamento para produto '${studentData.productId}'` }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 6. Find or create student profile
    let { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", studentData.email)
      .maybeSingle();

    if (!profile) {
      // Create auth user + profile (handle_new_user trigger creates profile)
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: studentData.email,
        email_confirm: true,
        user_metadata: { name: studentData.name },
      });

      if (authErr && !authErr.message?.includes("already been registered")) {
        await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, mapping.class_id, "error", `Erro ao criar usuário: ${authErr.message}`);
        return new Response(
          JSON.stringify({ error: authErr.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (authUser?.user) {
        // Wait briefly for the trigger to create the profile
        await new Promise((r) => setTimeout(r, 500));
        const { data: newProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", authUser.user.id)
          .maybeSingle();
        profile = newProfile;

        // Update profile name if trigger didn't set it
        if (profile) {
          await supabase
            .from("profiles")
            .update({ name: studentData.name })
            .eq("id", profile.id);
        }
      } else {
        // User existed in auth but not in profiles query above — retry
        const { data: retryProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", studentData.email)
          .maybeSingle();
        profile = retryProfile;
      }
    }

    if (!profile) {
      await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, mapping.class_id, "error", "Não foi possível encontrar ou criar o perfil do aluno");
      return new Response(
        JSON.stringify({ error: "Falha ao criar perfil" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 7. Create enrollment (skip if duplicate)
    const { error: enrollErr } = await supabase.from("enrollments").upsert(
      {
        student_id: profile.id,
        class_id: mapping.class_id,
        type: "individual",
        status: "active",
        enrolled_at: new Date().toISOString(),
      },
      { onConflict: "student_id,class_id" }
    );

    if (enrollErr) {
      const isDuplicate = enrollErr.message?.includes("duplicate") || enrollErr.code === "23505";
      if (isDuplicate) {
        await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, mapping.class_id, "duplicate", "Aluno já matriculado nesta turma");
        await supabase.from("webhook_platforms").update({ last_event_at: new Date().toISOString() }).eq("id", platformRow.id);
        return new Response(
          JSON.stringify({ status: "duplicate", message: "Aluno já matriculado" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, mapping.class_id, "error", `Erro na matrícula: ${enrollErr.message}`);
      return new Response(
        JSON.stringify({ error: enrollErr.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 8. Send welcome email (fire-and-forget)
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/notify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          type: "welcome",
          recipientId: profile.id,
          recipientEmail: studentData.email,
          recipientName: studentData.name,
        }),
      });
    } catch {
      // Non-blocking
    }

    // 9. Log success + update last_event_at
    await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, mapping.class_id, "success", null);
    await supabase.from("webhook_platforms").update({ last_event_at: new Date().toISOString() }).eq("id", platformRow.id);

    return new Response(
      JSON.stringify({ status: "success", studentEmail: studentData.email, classId: mapping.class_id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// ---------------------------------------------------------------------------
// Log helper
// ---------------------------------------------------------------------------

async function logEvent(
  supabase: ReturnType<typeof createClient>,
  platformId: string,
  payload: unknown,
  email: string | null,
  name: string | null,
  classId: string | null,
  status: string,
  errorMessage: string | null
) {
  await supabase.from("webhook_logs").insert({
    platform_id: platformId,
    payload,
    student_email: email,
    student_name: name,
    class_id: classId,
    status,
    error_message: errorMessage,
  });
}
