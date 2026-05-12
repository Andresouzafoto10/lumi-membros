// Cakto order reconciliation.
// Polls Cakto orders from the last N hours (default 24) and creates missing
// enrollments. Designed to catch webhook deliveries that failed or were
// dropped. Can be invoked:
//   1) Manually via POST from the admin UI ("Sincronizar agora" button)
//   2) On a cron schedule (daily 03:00 BRT recommended)
//
// Request body (optional):
//   { hours?: number, dryRun?: boolean }
//
// Response:
//   { processed, created, skipped, errors, details: [...] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeCorsHeaders } from "../_shared/cors.ts";
import { caktoFetch, assertAdmin } from "../_shared/cakto.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CAKTO_RECONCILE_CRON_SECRET") ?? "";

type CaktoOrderCustomer = {
  email?: string;
  name?: string;
};

type CaktoOrder = {
  id?: string | number;
  refId?: string | number;
  status?: string;
  customer?: CaktoOrderCustomer;
  buyer?: CaktoOrderCustomer;
  product?: { id?: string | number; custom_id?: string };
  offer?: { id?: string | number };
  created_at?: string;
  paid_at?: string;
};

serve(async (req) => {
  const corsHeaders = makeCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Authentication: accept either admin JWT (manual trigger) OR cron secret header.
  const cronHeader = req.headers.get("x-cron-secret");
  const isCron = !!CRON_SECRET && cronHeader === CRON_SECRET;

  if (!isCron) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const jwt = authHeader.slice(7);
    const ok = await assertAdmin(supabase, jwt);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  let hours = 24;
  let dryRun = false;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.hours === "number" && body.hours > 0 && body.hours <= 168) {
      hours = body.hours;
    }
    if (body.dryRun === true) dryRun = true;
  } catch {
    // ignore — defaults
  }

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Lookup Cakto platform_id (needed for webhook_mappings + logs).
  const { data: platformRow } = await supabase
    .from("webhook_platforms")
    .select("id")
    .eq("slug", "cakto")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!platformRow) {
    return new Response(
      JSON.stringify({
        error: "Plataforma 'cakto' não cadastrada em webhook_platforms",
      }),
      { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
  const platformId = platformRow.id as string;

  // Fetch mappings into memory (small set).
  const { data: mappings } = await supabase
    .from("webhook_mappings")
    .select("external_product_id, class_ids, class_id")
    .eq("platform_id", platformId);

  type MappingRow = {
    external_product_id: string;
    class_ids: string[] | null;
    class_id: string | null;
  };
  const mappingByProduct: Record<string, string[]> = {};
  for (const m of (mappings ?? []) as MappingRow[]) {
    const cls = m.class_ids && m.class_ids.length > 0
      ? m.class_ids
      : (m.class_id ? [m.class_id] : []);
    if (cls.length > 0) mappingByProduct[m.external_product_id] = cls;
  }

  // Paginate through Cakto orders.
  const summary = {
    processed: 0,
    created: 0,
    skipped: 0,
    errors: 0,
    details: [] as Array<Record<string, unknown>>,
  };

  let page = 1;
  const pageSize = 50;
  const fromIso = since.toISOString();
  const seenTxIds = new Set<string>();

  while (true) {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      status: "approved",
      from: fromIso,
    });
    const { status, data } = await caktoFetch(
      supabase,
      "GET",
      `/public_api/orders/?${qs.toString()}`
    );
    if (status < 200 || status >= 300) {
      summary.details.push({ error: "Falha ao buscar pedidos Cakto", status, page });
      summary.errors++;
      break;
    }

    const orders = extractOrderList(data);
    if (orders.length === 0) break;

    for (const order of orders) {
      summary.processed++;
      const customer = order.customer ?? order.buyer ?? {};
      const email = (customer.email ?? "").toLowerCase().trim();
      const name = customer.name ?? email.split("@")[0];
      const productId = String(order.product?.id ?? order.product?.custom_id ?? order.offer?.id ?? "");
      const transactionId = String(order.refId ?? order.id ?? "");

      if (!email || !productId) {
        summary.skipped++;
        summary.details.push({ skipped: "dados incompletos", email, productId, transactionId });
        continue;
      }
      if (transactionId && seenTxIds.has(transactionId)) continue;
      if (transactionId) seenTxIds.add(transactionId);

      const classIds = mappingByProduct[productId];
      if (!classIds || classIds.length === 0) {
        summary.skipped++;
        summary.details.push({ skipped: "sem mapeamento", productId, transactionId });
        continue;
      }

      // Idempotency: skip if any webhook_log for this transaction succeeded.
      if (transactionId) {
        const { data: dup } = await supabase
          .from("webhook_logs")
          .select("id")
          .eq("transaction_id", transactionId)
          .eq("status", "success")
          .limit(1);
        if (dup && dup.length > 0) {
          summary.skipped++;
          continue;
        }
      }

      if (dryRun) {
        summary.details.push({ wouldCreate: true, email, productId, classIds, transactionId });
        continue;
      }

      // Find or create profile (same logic as webhook-intake activate path).
      let { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      let isNewUser = false;
      let tempPassword: string | null = null;
      if (!profile) {
        tempPassword = generateTempPassword();
        const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { name },
        });
        if (authErr && !authErr.message?.includes("already been registered")) {
          summary.errors++;
          await logReconcile(supabase, platformId, email, name, null, "error", authErr.message, transactionId);
          continue;
        }
        if (authUser?.user) {
          isNewUser = true;
          for (let attempt = 0; attempt < 5; attempt++) {
            await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
            const { data: np } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", authUser.user.id)
              .maybeSingle();
            if (np) {
              profile = np;
              break;
            }
          }
          if (profile) {
            await supabase.from("profiles").update({ name }).eq("id", profile.id);
          }
        } else {
          const { data: rp } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          profile = rp;
        }
      }

      if (!profile) {
        summary.errors++;
        await logReconcile(supabase, platformId, email, name, null, "error", "Falha ao criar/encontrar perfil", transactionId);
        continue;
      }

      // Honor access_duration_days from each class to compute expires_at.
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
        summary.errors++;
        await logReconcile(supabase, platformId, email, name, classIds[0], "error", enrollErr.message, transactionId);
        continue;
      }

      summary.created++;
      for (const cid of classIds) {
        await logReconcile(supabase, platformId, email, name, cid, "success", null, transactionId);
      }

      try {
        const classNames = classIds.map((cid) => classMap[cid]?.name).filter(Boolean).join(", ");
        const appUrl = Deno.env.get("PLATFORM_URL") ?? "https://app.membrosmaster.com.br";
        if (isNewUser && tempPassword) {
          await fetch(`${SUPABASE_URL}/functions/v1/notify-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
            body: JSON.stringify({
              type: "welcome_with_setup",
              recipient_id: profile.id,
              recipient_email: email,
              recipient_name: name,
              context: { classes_list: classNames, temp_password: tempPassword, action_url: `${appUrl}/login` },
            }),
          });
        } else {
          await fetch(`${SUPABASE_URL}/functions/v1/notify-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
            body: JSON.stringify({
              type: "course_unlocked",
              recipient_id: profile.id,
              recipient_email: email,
              recipient_name: name,
              context: { classes_list: classNames, action_url: `${appUrl}/cursos` },
            }),
          });
        }
      } catch (err) {
        console.error("cakto-reconcile email error:", err);
      }
    }

    if (orders.length < pageSize) break;
    page++;
    if (page > 20) break; // hard cap: 1000 orders per run
  }

  if (!dryRun) {
    await supabase
      .from("webhook_platforms")
      .update({ last_event_at: new Date().toISOString() })
      .eq("id", platformId);
  }

  return new Response(JSON.stringify({ ok: true, hours, dryRun, ...summary }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});

const DEFAULT_STUDENT_PASSWORD = "123456";
function generateTempPassword(): string {
  return DEFAULT_STUDENT_PASSWORD;
}

function extractOrderList(data: unknown): CaktoOrder[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as CaktoOrder[];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.results)) return obj.results as CaktoOrder[];
  if (Array.isArray(obj.data)) return obj.data as CaktoOrder[];
  if (Array.isArray(obj.orders)) return obj.orders as CaktoOrder[];
  return [];
}

async function logReconcile(
  supabase: ReturnType<typeof createClient>,
  platformId: string,
  email: string | null,
  name: string | null,
  classId: string | null,
  status: string,
  errorMessage: string | null,
  transactionId: string | null
) {
  await supabase.from("webhook_logs").insert({
    platform_id: platformId,
    payload: { source: "cakto-reconcile" },
    student_email: email,
    student_name: name,
    class_id: classId,
    status,
    error_message: errorMessage,
    event_type: "reconciled",
    transaction_id: transactionId,
  });
}
