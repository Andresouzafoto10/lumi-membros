import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types (loose — Cakto REST returns vary by endpoint)
// ---------------------------------------------------------------------------

export type CaktoProduct = {
  id: number | string;
  name: string;
  custom_id?: string;
  short_id?: string;
  status?: string;
};

export type CaktoOffer = {
  id: number | string;
  name: string;
  price?: number;
  product?: number | string;
  short_id?: string;
  status?: string;
};

export type CaktoWebhook = {
  id: number | string;
  status: string;
  name: string;
  url: string;
  events: Array<{ id: number; name: string; custom_id: string }>;
  fields?: { secret?: string };
  createdAt?: string;
  updatedAt?: string;
};

export type CaktoApiAction =
  | "list_products"
  | "list_offers"
  | "list_webhooks"
  | "get_webhook"
  | "create_webhook"
  | "delete_webhook"
  | "test_webhook"
  | "get_orders";

type CaktoApiResponse<T> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
};

function extractCaktoErrorMessage(body: unknown): string {
  if (!body) return "Resposta vazia";
  if (typeof body === "string") return body.slice(0, 400);
  if (typeof body === "object") {
    const obj = body as Record<string, unknown>;
    // Common error shapes from Cakto / DRF
    if (typeof obj.detail === "string") return obj.detail;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    // Field-level validation errors: { field: ["msg1", "msg2"] }
    const fieldErrors: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
        fieldErrors.push(`${k}: ${(v as string[]).join(", ")}`);
      } else if (typeof v === "string") {
        fieldErrors.push(`${k}: ${v}`);
      }
    }
    if (fieldErrors.length > 0) return fieldErrors.join(" | ");
    try {
      return JSON.stringify(obj).slice(0, 400);
    } catch {
      return "Erro desconhecido";
    }
  }
  return String(body).slice(0, 400);
}

// ---------------------------------------------------------------------------
// Generic invoker
// ---------------------------------------------------------------------------

async function invokeCakto<T = unknown>(
  action: CaktoApiAction,
  payload?: Record<string, unknown>
): Promise<CaktoApiResponse<T>> {
  const { data, error } = await supabase.functions.invoke("cakto-api", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message ?? "Erro ao chamar cakto-api");
  const resp = data as CaktoApiResponse<T>;
  if (!resp.ok) {
    const msg = resp.error ?? extractCaktoErrorMessage(resp.data);
    throw new Error(`Cakto API ${resp.status}: ${msg}`);
  }
  return resp;
}

function extractList<T>(payload: unknown): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.results)) return obj.results as T[];
  if (Array.isArray(obj.data)) return obj.data as T[];
  return [];
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useCaktoProducts(enabled: boolean) {
  return useQuery({
    queryKey: ["cakto-products"],
    enabled,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const res = await invokeCakto<{ results?: CaktoProduct[] } | CaktoProduct[]>(
        "list_products",
        { page: 1, page_size: 100 }
      );
      return extractList<CaktoProduct>(res.data);
    },
  });
}

export function useCaktoOffers(enabled: boolean, productId?: string | number) {
  return useQuery({
    queryKey: ["cakto-offers", productId ?? "all"],
    enabled,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const payload: Record<string, unknown> = { page: 1, page_size: 200 };
      if (productId) payload.product = productId;
      const res = await invokeCakto<{ results?: CaktoOffer[] } | CaktoOffer[]>(
        "list_offers",
        payload
      );
      return extractList<CaktoOffer>(res.data);
    },
  });
}

export function useCaktoWebhooks(enabled: boolean) {
  return useQuery({
    queryKey: ["cakto-webhooks"],
    enabled,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const res = await invokeCakto<{ results?: CaktoWebhook[] } | CaktoWebhook[]>(
        "list_webhooks",
        { page: 1, page_size: 50 }
      );
      return extractList<CaktoWebhook>(res.data);
    },
  });
}

export function useCaktoActions() {
  const [busy, setBusy] = useState<string | null>(null);

  const createWebhook = useCallback(
    async (input: {
      name: string;
      url: string;
      products?: string[];
      events: string[];
    }) => {
      setBusy("create_webhook");
      try {
        const res = await invokeCakto<CaktoWebhook>("create_webhook", input);
        return res.data;
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const deleteWebhook = useCallback(async (id: string | number) => {
    setBusy("delete_webhook");
    try {
      await invokeCakto<unknown>("delete_webhook", { id });
    } finally {
      setBusy(null);
    }
  }, []);

  const testWebhook = useCallback(
    async (id: string | number, event?: string) => {
      setBusy("test_webhook");
      try {
        const res = await invokeCakto<unknown>("test_webhook", { id, event });
        return res.data;
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const reconcile = useCallback(
    async (opts?: { hours?: number; dryRun?: boolean }) => {
      setBusy("reconcile");
      try {
        const { data, error } = await supabase.functions.invoke("cakto-reconcile", {
          body: opts ?? { hours: 24 },
        });
        if (error) throw new Error(error.message ?? "Erro ao reconciliar");
        return data as {
          ok: boolean;
          hours: number;
          dryRun: boolean;
          processed: number;
          created: number;
          skipped: number;
          errors: number;
          details: Array<Record<string, unknown>>;
        };
      } finally {
        setBusy(null);
      }
    },
    []
  );

  return { busy, createWebhook, deleteWebhook, testWebhook, reconcile };
}
