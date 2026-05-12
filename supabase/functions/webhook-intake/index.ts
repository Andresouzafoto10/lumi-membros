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
  offerId: string | null;
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

function normalizeCaktoEvent(raw: string): NormalizedEvent {
  const e = raw.toLowerCase();
  if (e === "purchase_approved" || e === "subscription_created") return "approved";
  if (e === "subscription_renewed") return "subscription_active";
  if (e === "refund") return "refunded";
  if (e === "chargeback") return "chargeback";
  if (e === "subscription_canceled" || e === "subscription_renewal_refused") return "canceled";
  if (
    e === "purchase_refused" ||
    e === "initiate_checkout" ||
    e === "checkout_abandonment" ||
    e === "pix_gerado" ||
    e === "boleto_gerado" ||
    e === "picpay_gerado" ||
    e === "openfinance_nubank_gerado"
  ) {
    return "pending";
  }
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
    offerId: null,
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
    offerId: null,
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
    offerId: null,
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
    offerId: null,
    eventType: normalizeMonetizzeEvent(rawEvent),
    transactionId: (venda?.codigo as string) ?? (body.codigo as string) ?? null,
  };
}

function extractFromCakto(body: Record<string, unknown>): StudentData | null {
  // Real Cakto payload (per docs): { event: "...", secret: "...", data: { customer, product, offer, refId, ... } }
  // Also accept legacy/flat shapes for resilience.
  const data = ((body.data ?? body) as Record<string, unknown>) || {};
  const customer = (data.customer ?? data.buyer ?? data.client) as Record<string, unknown> | undefined;
  const product = data.product as Record<string, unknown> | undefined;
  const offer = data.offer as Record<string, unknown> | undefined;
  if (!customer?.email) return null;

  const rawEvent =
    (body.event as string) ??
    (body.event_name as string) ??
    (body.type as string) ??
    (data.event as string) ??
    (data.status as string) ??
    "";

  // Prefer short_id when available (matches what admins see in the Cakto UI),
  // fall back to full UUID. Either form is accepted by the mapping table.
  const productId = String(
    product?.short_id ?? product?.id ?? body.product_id ?? ""
  );
  const offerId = offer?.id ? String(offer.id) : null;
  const transactionId =
    (data.refId as string) ??
    (data.id as string) ??
    (body.refId as string) ??
    (body.order_id as string) ??
    null;

  return {
    email: (customer.email as string).toLowerCase().trim(),
    name: (customer.name as string) ?? (customer.email as string).split("@")[0],
    productId,
    offerId,
    eventType: normalizeCaktoEvent(rawEvent),
    transactionId,
  };
}

const extractors: Record<string, (body: Record<string, unknown>) => StudentData | null> = {
  ticto: extractFromTicto,
  hotmart: extractFromHotmart,
  eduzz: extractFromEduzz,
  monetizze: extractFromMonetizze,
  cakto: extractFromCakto,
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
    case "cakto":
      // Cakto public docs do not specify the signing header.
      // Try the conventional headers; fallback to body-secret check below.
      return (
        headers.get("x-cakto-signature") ??
        headers.get("cakto-signature") ??
        headers.get("x-webhook-signature") ??
        headers.get("x-signature") ??
        ""
      );
    default:
      return headers.get("x-signature") ?? "";
  }
}

// Cakto-specific: when no HMAC header is present, the platform may send the
// configured secret inside the JSON body. Compare it constant-time to the
// stored secret_key.
function caktoBodySecretMatches(body: Record<string, unknown>, secret: string): boolean {
  const candidates = [
    body.secret,
    body.webhook_secret,
    (body.webhook as Record<string, unknown> | undefined)?.secret,
    (body.meta as Record<string, unknown> | undefined)?.secret,
  ].filter((v): v is string => typeof v === "string" && v.length > 0);
  if (candidates.length === 0) return false;
  for (const c of candidates) {
    if (constantTimeEqual(c, secret)) return true;
  }
  return false;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Default password assigned to every student created via webhook.
// The student is instructed in the welcome email to change it in their profile
// or via "Forgot my password" on the login screen.
const DEFAULT_STUDENT_PASSWORD = "123456";

function generateTempPassword(): string {
  return DEFAULT_STUDENT_PASSWORD;
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

    // 3. HMAC is mandatory — reject if secret_key not configured (closes bypass).
    if (!platformRow.secret_key) {
      await logEvent(supabase, platformRow.id, body, null, null, null, "error", "Plataforma sem secret_key configurada", null, null);
      return new Response(
        JSON.stringify({ error: "Integração sem secret_key — configure antes de receber webhooks" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const signature = getSignature(req.headers, platform);
    let signatureValid = false;
    if (signature) {
      signatureValid = await verifyHmac(platformRow.secret_key, rawBody, signature);
    }

    // Cakto fallback: docs do not specify the signing header. Accept the
    // request if the configured secret_key matches a secret field inside the
    // JSON body (constant-time comparison).
    if (!signatureValid && platform === "cakto") {
      signatureValid = caktoBodySecretMatches(body, platformRow.secret_key);
    }

    if (!signature && !signatureValid) {
      await logEvent(supabase, platformRow.id, body, null, null, null, "error", "Assinatura HMAC ausente", null, null);
      return new Response(
        JSON.stringify({ error: "Assinatura ausente" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (!signatureValid) {
      await logEvent(supabase, platformRow.id, body, null, null, null, "error", "Assinatura HMAC inválida", null, null);
      return new Response(
        JSON.stringify({ error: "Assinatura inválida" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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

    // Validate productId format (alphanumeric, dashes, underscores only — prevents injection in DB lookups + logs)
    if (!/^[a-zA-Z0-9_\-]{1,128}$/.test(studentData.productId)) {
      await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, null, "error", `productId inválido: ${studentData.productId.slice(0, 32)}`, studentData.eventType, studentData.transactionId);
      return new Response(
        JSON.stringify({ error: "productId inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentData.email) || studentData.email.length > 254) {
      await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, null, "error", "Email inválido", studentData.eventType, studentData.transactionId);
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
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
    // Priority: exact (product+offer) match → product-only fallback (offer NULL).
    type MappingRow = {
      class_ids: string[] | null;
      class_id: string | null;
      external_offer_id: string | null;
    };

    let mappingRow: MappingRow | null = null;
    if (studentData.offerId) {
      const { data: exact } = await supabase
        .from("webhook_mappings")
        .select("class_ids, class_id, external_offer_id")
        .eq("platform_id", platformRow.id)
        .eq("external_product_id", studentData.productId)
        .eq("external_offer_id", studentData.offerId)
        .maybeSingle();
      mappingRow = (exact as MappingRow | null) ?? null;
    }
    if (!mappingRow) {
      const { data: fallback } = await supabase
        .from("webhook_mappings")
        .select("class_ids, class_id, external_offer_id")
        .eq("platform_id", platformRow.id)
        .eq("external_product_id", studentData.productId)
        .is("external_offer_id", null)
        .maybeSingle();
      mappingRow = (fallback as MappingRow | null) ?? null;
    }

    if (!mappingRow) {
      const unmappedLabel = studentData.offerId
        ? `${studentData.productId} / oferta ${studentData.offerId}`
        : studentData.productId;
      await logEvent(supabase, platformRow.id, body, studentData.email, studentData.name, null, "error", `Sem mapeamento para produto '${unmappedLabel}'`, studentData.eventType, studentData.transactionId);
      await notifyAdminsUnmappedProduct(
        supabase,
        platformRow.slug,
        platformRow.label ?? platformRow.name,
        unmappedLabel
      );
      return new Response(
        JSON.stringify({ error: `Sem mapeamento para produto '${unmappedLabel}'` }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
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
    let tempPassword: string | null = null;
    if (!profile) {
      tempPassword = generateTempPassword();
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: studentData.email,
        password: tempPassword,
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
        // Wait for handle_new_user trigger to create the profile row.
        // Retry with exponential backoff instead of fixed sleep.
        for (let attempt = 0; attempt < 5; attempt++) {
          await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
          const { data: newProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", authUser.user.id)
            .maybeSingle();
          if (newProfile) {
            profile = newProfile;
            break;
          }
        }
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

    // 9. Upsert enrollment for each class — respect class.access_duration_days.
    // - access_duration_days = NULL  → expires_at = NULL (vitalícia)
    // - access_duration_days = N     → expires_at = now() + N days
    //
    // For subscription_active (renewal), reset expires_at to now() + duration
    // so the access period rolls forward with each renewal.
    const { data: classesInfo } = await supabase
      .from("classes")
      .select("id, name, access_duration_days, access_grace_days, enrollment_type")
      .in("id", classIds);
    type ClassInfo = {
      id: string;
      name: string;
      access_duration_days: number | null;
      access_grace_days: number | null;
      enrollment_type: string | null;
    };
    const classMap: Record<string, ClassInfo> = {};
    for (const c of (classesInfo ?? []) as ClassInfo[]) classMap[c.id] = c;

    const nowIso = new Date().toISOString();
    const enrollmentRows = classIds.map((cid) => {
      const cls = classMap[cid];
      const durationDays = cls?.access_duration_days ?? null;
      const graceDays = cls?.access_grace_days ?? 0;
      const enrollType = cls?.enrollment_type ?? "individual";
      let expiresAt: string | null = null;
      if (durationDays && durationDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + durationDays + Math.max(0, graceDays));
        expiresAt = d.toISOString();
      }
      return {
        student_id: profile.id,
        class_id: cid,
        type: enrollType,
        status: "active",
        enrolled_at: nowIso,
        expires_at: expiresAt,
      };
    });

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

    // 10. Send the right email to the student based on whether they are new.
    // Always fire (re-purchases get a "course unlocked" notice too).
    try {
      const classNames = classIds
        .map((cid) => classMap[cid]?.name)
        .filter(Boolean)
        .join(", ");

      if (isNewUser && tempPassword) {
        // New user → email with the temporary password and login CTA. User can
        // change later in Profile or via "Esqueci minha senha".
        const appUrl =
          Deno.env.get("PLATFORM_URL") ?? "https://app.membrosmaster.com.br";
        await fetch(`${SUPABASE_URL}/functions/v1/notify-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            type: "welcome_with_setup",
            recipient_id: profile.id,
            recipient_email: studentData.email,
            recipient_name: studentData.name,
            context: {
              classes_list: classNames,
              temp_password: tempPassword,
              action_url: `${appUrl}/login`,
            },
          }),
        });
      } else {
        // Existing user → "Novo acesso liberado" with direct login CTA.
        await fetch(`${SUPABASE_URL}/functions/v1/notify-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            type: "course_unlocked",
            recipient_id: profile.id,
            recipient_email: studentData.email,
            recipient_name: studentData.name,
            context: {
              classes_list: classNames,
              action_url: `${Deno.env.get("PLATFORM_URL") ?? "https://app.membrosmaster.com.br"}/cursos`,
            },
          }),
        });
      }
    } catch (err) {
      console.error("webhook-intake email error:", err);
      // Non-blocking: emails are best-effort.
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
    console.error("webhook-intake error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
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
