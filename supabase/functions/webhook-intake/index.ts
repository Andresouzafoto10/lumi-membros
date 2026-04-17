import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { makeCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ---------------------------------------------------------------------------
// Normalized event types (access lifecycle)
// ---------------------------------------------------------------------------

type NormalizedEvent =
  | "approved"            // new purchase / payment captured → create or reactivate
  | "subscription_active" // recurring renewal → extend expires_at
  | "refunded"            // refund → revoke
  | "chargeback"          // chargeback → revoke
  | "canceled"            // subscription cancelation / manual cancel → revoke
  | "pending"             // awaiting payment → no-op
  | "unknown";            // not recognized → log & no-op

type StudentData = {
  email: string;
  name: string;
  productId: string;
  eventType: NormalizedEvent;
  transactionId: string | null;
};

// ---------------------------------------------------------------------------
// HMAC validation
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
// Event normalization per platform
// ---------------------------------------------------------------------------

function normalizeTictoEvent(raw: string): NormalizedEvent {
  const e = raw.toLowerCase();
  if (e.includes("approved") || e.includes("paid") || e.includes("complete")) return "approved";
  if (e.includes("refund")) return "refunded";
  if (e.includes("chargeback")) return "chargeback";
  if (e.includes("subscription.renewed") || e.includes("subscription.active")) return "subscription_active";
  if (e.includes("subscription.cancel") || e.includes("subscription.expired")) return "canceled";
  if (e.includes("pending") || e.includes("waiting")) return "pending";
  return "unknown";
}

function normalizeHotmartEvent(raw: string): NormalizedEvent {
  const e = raw.toUpperCase();
  if (e === "PURCHASE_APPROVED" || e === "PURCHASE_COMPLETE") return "approved";
  if (e === "PURCHASE_REFUNDED") return "refunded";
  if (e === "PURCHASE_CHARGEBACK") return "chargeback";
  if (e === "SUBSCRIPTION_CANCELLATION" || e === "PURCHASE_CANCELED") return "canceled";
  if (e === "PURCHASE_BILLET_PRINTED" || e === "PURCHASE_DELAYED" || e === "PURCHASE_EXPIRED") return "pending";
  return "unknown";
}

function normalizeEduzzEvent(raw: string): NormalizedEvent {
  const e = raw.toLowerCase();
  if (e === "paid" || e === "approved") return "approved";
  if (e === "refunded") return "refunded";
  if (e === "chargeback") return "chargeback";
  if (e === "canceled" || e === "cancelled") return "canceled";
  if (e === "subscription_renewed" || e === "subscription_active") return "subscription_active";
  if (e === "pending" || e === "waiting_payment") return "pending";
  return "unknown";
}

function normalizeMonetizzeEvent(raw: string): NormalizedEvent {
  const e = raw.toLowerCase();
  if (e === "aprovado" || e === "pago") return "approved";
  if (e === "estornado" || e === "refund") return "refunded";
  if (e === "chargeback" || e === "medb") return "chargeback";
  if (e === "cancelado") return "canceled";
  if (e === "pendente" || e === "aguardando") return "pending";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Extractors per platform
// ---------------------------------------------------------------------------

function extractFromTicto(body: Record<string, unknown>): StudentData | null {
  const customer = body.customer as Record<string, unknown> | undefined;
  const product = body.product as Record<string, unknown> | undefined;
  const transaction = body.transaction as Record<string, unknown> | undefined;
  if (!customer?.email) return null;
  const rawEvent = (body.event as string) ?? (body.status as string) ?? "";
  return {
    email: (customer.email as string).toLowerCase().trim(),
    name: (customer.name as string) ?? (customer.email as string).split("@")[0],
    productId: String(product?.id ?? body.product_id ?? ""),
    eventType: normalizeTictoEvent(rawEvent),
    transactionId: (transaction?.id as string) ?? (body.transaction_id as string) ?? null,
  };
}

function extractFromHotmart(body: Record<string, unknown>): StudentData | null {
  const data = (body.data ?? body) as Record<string, unknown>;
  const buyer = data.buyer as Record<string, unknown> | undefined;
  const product = data.product as Record<string, unknown> | undefined;
  const purchase = data.purchase as Record<string, unknown> | undefined;
  if (!buyer?.email) return null;
  const rawEvent = (body.event as string) ?? (data.event as string) ?? "";
  return {
    email: (buyer.email as string).toLowerCase().trim(),
    name: (buyer.name as string) ?? (buyer.email as string).split("@")[0],
    productId: String(product?.id ?? data.product_id ?? ""),
    eventType: normalizeHotmartEvent(rawEvent),
    transactionId: (purchase?.transaction as string) ?? (purchase?.order_ref as string) ?? null,
  };
}

function extractFromEduzz(body: Record<string, unknown>): StudentData | null {
  const customer = body.customer as Record<string, unknown> | undefined;
  if (!customer?.email) return null;
  const rawEvent = (body.event_type as string) ?? (body.status as string) ?? "";
  return {
    email: (customer.email as string).toLowerCase().trim(),
    name: (customer.name as string) ?? (customer.email as string).split("@")[0],
    productId: String(body.product_id ?? body.content_id ?? ""),
    eventType: normalizeEduzzEvent(rawEvent),
    transactionId: (body.trans_cod as string) ?? (body.transaction_id as string) ?? null,
  };
}

function extractFromMonetizze(body: Record<string, unknown>): StudentData | null {
  const produto = body.produto as Record<string, unknown> | undefined;
  const comprador = body.comprador as Record<string, unknown> | undefined;
  const venda = body.venda as Record<string, unknown> | undefined;
  if (!comprador?.email) return null;
  const rawEvent = (body.tipoEvento as string) ?? (venda?.status as string) ?? "";
  return {
    email: (comprador.email as string).toLowerCase().trim(),
    name: (comprador.nome as string) ?? (comprador.email as string).split("@")[0],
    productId: String(produto?.codigo ?? body.produto_id ?? ""),
    eventType: normalizeMonetizzeEvent(rawEvent),
    transactionId: (venda?.codigo as string) ?? (body.codigo as string) ?? null,
  };
}

const extractors: Record<string, (body: Record<string, unknown>) => StudentData | null> = {
  ticto: extractFromTicto,
  hotmart: extractFromHotmart,
  eduzz: extractFromEduzz,
  monetizze: extractFromMonetizze,
};

// ---------------------------------------------------------------------------
// HMAC header per platform
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
  const corsHeaders = makeCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const platformQuery = url.searchParams.get("platform")?.toLowerCase();

    if (!token && !platformQuery) {
      return new Response(
        JSON.stringify({ error: "Query param 'token' ou 'platform' é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1. Find platform config by token (primary) or slug (backward compat).
    type PlatformRow = {
      id: string;
      slug: string;
      name: string;
      label: string | null;
      secret_key: string | null;
      active: boolean;
      webhook_token: string;
    };
    let platformRow: PlatformRow | null = null;
    if (token) {
      const { data } = await supabase
        .from("webhook_platforms")
        .select("*")
        .eq("webhook_token", token)
        .eq("active", true)
        .maybeSingle();
      platformRow = data as PlatformRow | null;
    } else if (platformQuery) {
      const { data } = await supabase
        .from("webhook_platforms")
        .select("*")
        .eq("slug", platformQuery)
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      platformRow = data as PlatformRow | null;
    }

    if (!platformRow) {
      return new Response(
        JSON.stringify({ error: `Integração não encontrada ou inativa` }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const platform = platformRow.slug.toLowerCase();

    // 2. Read body
    const rawBody = await req.text();
    const body = JSON.parse(rawBody) as Record<string, unknown>;

    // 3. Validate HMAC if secret is configured
    if (platformRow.secret_key) {
      const signature = getSignature(req.headers, platform);
      if (!signature) {
        await logEvent(supabase, platformRow.id, body, null, null, null, "error", "Assinatura HMAC ausente", null, null);
        return new Response(
          JSON.stringify({ error: "Assinatura ausente" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      const valid = await verifyHmac(platformRow.secret_key, rawBody, signature);
      if (!valid) {
        await logEvent(supabase, platformRow.id, body, null, null, null, "error", "Assinatura HMAC inválida", null, null);
        return new Response(
          JSON.stringify({ error: "Assinatura inválida" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // 4. Extract student + event data
    const extractor = extractors[platform];
    if (!extractor) {
      await logEvent(supabase, platformRow.id, body, null, null, null, "error", `Extractor não encontrado para '${platform}'`, null, null);
      return new Response(
        JSON.stringify({ error: `Plataforma '${platform}' não suportada` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const studentData = extractor(body);
    if (!studentData || !studentData.email || !studentData.productId) {
      await logEvent(supabase, platformRow.id, body, null, null, null, "error", "Dados do aluno não encontrados no payload", null, null);
      return new Response(
        JSON.stringify({ error: "Dados insuficientes no payload" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Idempotency: skip if same transaction already processed successfully in last 24h.
    if (studentData.transactionId) {
      const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: dup } = await supabase
        .from("webhook_logs")
        .select("id")
        .eq("transaction_id", studentData.transactionId)
        .eq("status", "success")
        .gte("created_at", sinceIso)
        .limit(1);
      if (dup && dup.length > 0) {
        await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, null, "duplicate", "Transação já processada (idempotency)", studentData.eventType, studentData.transactionId);
        return new Response(
          JSON.stringify({ status: "duplicate", message: "Transação já processada" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // 6. Find mapping → class_ids
    type MappingRow = { class_ids: string[] | null; class_id: string | null };
    const { data: mapping } = await supabase
      .from("webhook_mappings")
      .select("class_ids, class_id")
      .eq("platform_id", platformRow.id)
      .eq("external_product_id", studentData.productId)
      .maybeSingle();

    if (!mapping) {
      await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, null, "error", `Sem mapeamento para produto '${studentData.productId}'`, studentData.eventType, studentData.transactionId);
      await notifyAdminsUnmappedProduct(
        supabase,
        platformRow.slug,
        platformRow.label ?? platformRow.name,
        studentData.productId
      );
      return new Response(
        JSON.stringify({ error: `Sem mapeamento para produto '${studentData.productId}'` }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const mappingRow = mapping as MappingRow;
    const classIds = (mappingRow.class_ids && mappingRow.class_ids.length > 0)
      ? mappingRow.class_ids
      : (mappingRow.class_id ? [mappingRow.class_id] : []);

    if (classIds.length === 0) {
      await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, null, "error", "Mapeamento sem turmas vinculadas", studentData.eventType, studentData.transactionId);
      return new Response(
        JSON.stringify({ error: "Mapeamento sem turmas vinculadas" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 7. Branch on event lifecycle.
    const revokeEvents: NormalizedEvent[] = ["refunded", "chargeback", "canceled"];
    const activateEvents: NormalizedEvent[] = ["approved", "subscription_active"];

    // --- PENDING / UNKNOWN → log and return 200 ---
    if (!revokeEvents.includes(studentData.eventType) && !activateEvents.includes(studentData.eventType)) {
      await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, null, "pending", `Evento '${studentData.eventType}' sem ação`, studentData.eventType, studentData.transactionId);
      await supabase.from("webhook_platforms").update({ last_event_at: new Date().toISOString() }).eq("id", platformRow.id);
      return new Response(
        JSON.stringify({ status: "ignored", eventType: studentData.eventType }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // --- REVOKE path (refund/chargeback/cancel) — doesn't need profile creation ---
    if (revokeEvents.includes(studentData.eventType)) {
      // Find the student (may not exist if they were never created).
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", studentData.email)
        .maybeSingle();

      if (!profile) {
        await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, null, "success", "Revogação ignorada: aluno não cadastrado", studentData.eventType, studentData.transactionId);
        return new Response(
          JSON.stringify({ status: "success", action: "skip", reason: "student_not_found" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { error: revokeErr } = await supabase
        .from("enrollments")
        .update({ status: "cancelled", expires_at: new Date().toISOString() })
        .eq("student_id", profile.id)
        .in("class_id", classIds);

      if (revokeErr) {
        await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, classIds[0], "error", `Erro ao revogar: ${revokeErr.message}`, studentData.eventType, studentData.transactionId);
        return new Response(
          JSON.stringify({ error: revokeErr.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      for (const cid of classIds) {
        await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, cid, "success", `Acesso revogado (${studentData.eventType})`, studentData.eventType, studentData.transactionId);
      }
      await supabase.from("webhook_platforms").update({ last_event_at: new Date().toISOString() }).eq("id", platformRow.id);

      return new Response(
        JSON.stringify({
          status: "success",
          action: "revoke",
          eventType: studentData.eventType,
          studentEmail: studentData.email,
          classIds,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // --- ACTIVATE path (approved / subscription_active) ---

    // 8. Find or create profile
    let { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", studentData.email)
      .maybeSingle();

    let isNewUser = false;
    if (!profile) {
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: studentData.email,
        email_confirm: true,
        user_metadata: { name: studentData.name },
      });

      if (authErr && !authErr.message?.includes("already been registered")) {
        await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, classIds[0], "error", `Erro ao criar usuário: ${authErr.message}`, studentData.eventType, studentData.transactionId);
        return new Response(
          JSON.stringify({ error: authErr.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (authUser?.user) {
        isNewUser = true;
        await new Promise((r) => setTimeout(r, 500));
        const { data: newProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", authUser.user.id)
          .maybeSingle();
        profile = newProfile;
        if (profile) {
          await supabase.from("profiles").update({ name: studentData.name }).eq("id", profile.id);
        }
      } else {
        const { data: retryProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", studentData.email)
          .maybeSingle();
        profile = retryProfile;
      }
    }

    if (!profile) {
      await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, classIds[0], "error", "Não foi possível encontrar/criar perfil", studentData.eventType, studentData.transactionId);
      return new Response(
        JSON.stringify({ error: "Falha ao criar perfil" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 9. Upsert enrollment for each class in classIds
    const enrollmentRows = classIds.map((cid) => ({
      student_id: profile.id,
      class_id: cid,
      type: "individual",
      status: "active",
      enrolled_at: new Date().toISOString(),
      expires_at: null,
    }));

    const { error: enrollErr } = await supabase
      .from("enrollments")
      .upsert(enrollmentRows, { onConflict: "student_id,class_id" });

    if (enrollErr) {
      await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, classIds[0], "error", `Erro na matrícula: ${enrollErr.message}`, studentData.eventType, studentData.transactionId);
      return new Response(
        JSON.stringify({ error: enrollErr.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 10. Welcome email ONLY for brand-new users (fire-and-forget).
    if (isNewUser) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/notify-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            type: "welcome",
            recipient_id: profile.id,
            recipient_email: studentData.email,
            recipient_name: studentData.name,
          }),
        });

        // Also trigger access email (magic link) via resend-access-email.
        await fetch(`${SUPABASE_URL}/functions/v1/resend-access-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ userId: profile.id }),
        });
      } catch {
        // Non-blocking: emails are best-effort.
      }
    }

    // 11. Log success (one row per enrolled class) + update last_event_at
    for (const cid of classIds) {
      await logEvent(
        supabase, platformRow.id, body, studentData.email, studentData.name, cid,
        "success", null, studentData.eventType, studentData.transactionId
      );
    }
    await supabase.from("webhook_platforms").update({ last_event_at: new Date().toISOString() }).eq("id", platformRow.id);

    return new Response(
      JSON.stringify({
        status: "success",
        action: studentData.eventType === "subscription_active" ? "extend" : "activate",
        eventType: studentData.eventType,
        studentEmail: studentData.email,
        classIds,
        isNewUser,
      }),
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
  errorMessage: string | null,
  eventType: string | null,
  transactionId: string | null
) {
  await supabase.from("webhook_logs").insert({
    platform_id: platformId,
    payload,
    student_email: email,
    student_name: name,
    class_id: classId,
    status,
    error_message: errorMessage,
    event_type: eventType,
    transaction_id: transactionId,
  });
}

async function notifyAdminsUnmappedProduct(
  supabase: ReturnType<typeof createClient>,
  platformSlug: string,
  platformLabel: string,
  productId: string
) {
  const dedupKey = `webhook-unmapped:${platformSlug}:${productId}`;
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("type", "system")
    .eq("target_id", dedupKey)
    .gte("created_at", sinceIso)
    .limit(1);

  if (existing && existing.length > 0) return;

  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["owner", "admin"]);

  if (!admins || admins.length === 0) return;

  const rows = admins.map((a: { id: string }) => ({
    recipient_id: a.id,
    type: "system",
    target_id: dedupKey,
    target_type: "profile",
    message: `Webhook ${platformLabel}: produto '${productId}' sem mapeamento. Configure em Integrações.`,
    read: false,
  }));

  await supabase.from("notifications").insert(rows);
}
