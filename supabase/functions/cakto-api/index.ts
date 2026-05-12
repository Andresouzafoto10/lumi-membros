// Admin-facing Cakto REST API proxy.
// Authenticates the caller (admin JWT) and forwards to Cakto using a
// service-side OAuth2 token cached in the `cakto_oauth_tokens` table.
//
// Request shape:
//   { action: "list_products" | "list_webhooks" | "create_webhook" | "test_webhook" | "get_orders" | "get_webhook" | "delete_webhook",
//     payload?: Record<string, unknown> }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeCorsHeaders } from "../_shared/cors.ts";
import { caktoFetch, assertAdmin } from "../_shared/cakto.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type Action =
  | "list_products"
  | "list_offers"
  | "list_webhooks"
  | "get_webhook"
  | "create_webhook"
  | "delete_webhook"
  | "test_webhook"
  | "get_orders";

serve(async (req) => {
  const corsHeaders = makeCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, status: 405, error: "Method not allowed" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ ok: false, status: 401, error: "Não autenticado" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
  const jwt = authHeader.slice(7);
  const okAdmin = await assertAdmin(supabase, jwt);
  if (!okAdmin) {
    return new Response(
      JSON.stringify({ ok: false, status: 403, error: "Acesso negado" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  let action: Action;
  let payload: Record<string, unknown> | undefined;
  try {
    const json = (await req.json()) as { action: Action; payload?: Record<string, unknown> };
    action = json.action;
    payload = json.payload;
  } catch {
    return new Response(
      JSON.stringify({ ok: false, status: 400, error: "JSON inválido" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    let result: { status: number; data: unknown };
    switch (action) {
      case "list_products": {
        const qs = buildQs(payload, ["page", "page_size", "name"]);
        result = await caktoFetch(supabase, "GET", `/public_api/products/${qs}`);
        break;
      }
      case "list_offers": {
        const qs = buildQs(payload, ["page", "page_size", "product", "name"]);
        result = await caktoFetch(supabase, "GET", `/public_api/offers/${qs}`);
        break;
      }
      case "list_webhooks": {
        const qs = buildQs(payload, ["page", "page_size", "name", "url", "status", "events"]);
        result = await caktoFetch(supabase, "GET", `/public_api/webhook/${qs}`);
        break;
      }
      case "get_webhook": {
        const id = payload?.id;
        if (!id) return badRequest("payload.id é obrigatório", corsHeaders);
        result = await caktoFetch(supabase, "GET", `/public_api/webhook/${encodeURIComponent(String(id))}/`);
        break;
      }
      case "create_webhook": {
        const { name, url, products, events } = (payload ?? {}) as {
          name?: string;
          url?: string;
          products?: string[];
          events?: string[];
        };
        if (!name || !url || !Array.isArray(events) || events.length === 0) {
          return badRequest("Campos obrigatórios: name, url, events[]", corsHeaders);
        }
        const body: Record<string, unknown> = { name, url, events };
        if (Array.isArray(products) && products.length > 0) body.products = products;
        result = await caktoFetch(supabase, "POST", `/public_api/webhook/`, body);
        break;
      }
      case "delete_webhook": {
        const id = payload?.id;
        if (!id) return badRequest("payload.id é obrigatório", corsHeaders);
        result = await caktoFetch(supabase, "DELETE", `/public_api/webhook/${encodeURIComponent(String(id))}/`);
        break;
      }
      case "test_webhook": {
        const id = payload?.id;
        const event = payload?.event;
        if (!id) return badRequest("payload.id é obrigatório", corsHeaders);
        result = await caktoFetch(
          supabase,
          "POST",
          `/public_api/webhook/event_test/${encodeURIComponent(String(id))}/`,
          event ? { event } : undefined
        );
        break;
      }
      case "get_orders": {
        const qs = buildQs(payload, [
          "page",
          "page_size",
          "status",
          "from",
          "to",
          "product",
          "email",
        ]);
        result = await caktoFetch(supabase, "GET", `/public_api/orders/${qs}`);
        break;
      }
      default:
        return badRequest(`Ação '${action}' não suportada`, corsHeaders);
    }

    const ok = result.status >= 200 && result.status < 300;
    if (!ok) {
      console.error(
        `cakto-api upstream error: action=${action} status=${result.status} body=${JSON.stringify(result.data).slice(0, 600)}`
      );
    }
    return new Response(
      JSON.stringify({ ok, status: result.status, data: result.data }),
      {
        // Always return HTTP 200 so supabase.functions.invoke does not swallow
        // the upstream error body. The client reads `ok` and `data` to decide.
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("cakto-api error:", message);
    return new Response(
      JSON.stringify({ ok: false, status: 500, error: message }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

function buildQs(payload: Record<string, unknown> | undefined, allowed: string[]): string {
  if (!payload) return "";
  const params = new URLSearchParams();
  for (const key of allowed) {
    const v = payload[key];
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) params.append(key, String(item));
    } else {
      params.append(key, String(v));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

function badRequest(message: string, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ ok: false, status: 400, error: message }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
}
