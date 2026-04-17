import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebhookPlatform = {
  id: string;
  name: string;
  /** Platform type identifier (e.g. "hotmart", "ticto"). No longer unique
   *  — multiple integrations per platform type are allowed. */
  slug: string;
  /** Admin-chosen label ("Hotmart Principal"). Falls back to `name`. */
  label: string | null;
  /** Unique token used in the webhook URL (?token=<webhookToken>). */
  webhookToken: string;
  secretKey: string | null;
  active: boolean;
  lastEventAt: string | null;
  createdAt: string;
};

export const PLATFORM_SLUGS = ["ticto", "hotmart", "eduzz", "monetizze"] as const;
export type PlatformSlug = typeof PLATFORM_SLUGS[number];

export type WebhookMapping = {
  id: string;
  platformId: string;
  externalProductId: string;
  /** Legacy single-class column (kept for backward compat, may be null). */
  classId: string | null;
  /** Preferred: list of classes to enroll into on purchase. */
  classIds: string[];
  createdAt: string;
};

export type WebhookLog = {
  id: string;
  platformId: string | null;
  payload: unknown;
  studentEmail: string | null;
  studentName: string | null;
  classId: string | null;
  status: string;
  errorMessage: string | null;
  eventType: string | null;
  transactionId: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const QK_PLATFORMS = ["webhook-platforms"] as const;
const QK_MAPPINGS = ["webhook-mappings"] as const;
const QK_LOGS = ["webhook-logs"] as const;

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapPlatform(r: Record<string, unknown>): WebhookPlatform {
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    label: (r.label as string | null) ?? null,
    webhookToken: r.webhook_token as string,
    secretKey: r.secret_key as string | null,
    active: r.active as boolean,
    lastEventAt: r.last_event_at as string | null,
    createdAt: r.created_at as string,
  };
}

function mapMapping(r: Record<string, unknown>): WebhookMapping {
  const legacyClassId = r.class_id as string | null;
  const classIds = (r.class_ids as string[] | null) ?? [];
  const effective = classIds.length > 0 ? classIds : (legacyClassId ? [legacyClassId] : []);
  return {
    id: r.id as string,
    platformId: r.platform_id as string,
    externalProductId: r.external_product_id as string,
    classId: legacyClassId,
    classIds: effective,
    createdAt: r.created_at as string,
  };
}

function mapLog(r: Record<string, unknown>): WebhookLog {
  return {
    id: r.id as string,
    platformId: r.platform_id as string | null,
    payload: r.payload,
    studentEmail: r.student_email as string | null,
    studentName: r.student_name as string | null,
    classId: r.class_id as string | null,
    status: r.status as string,
    errorMessage: r.error_message as string | null,
    eventType: (r.event_type as string | null) ?? null,
    transactionId: (r.transaction_id as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWebhookIntegrations() {
  const queryClient = useQueryClient();

  // --- Platforms ---
  const { data: platforms = [], isLoading: loadingPlatforms } = useQuery({
    queryKey: QK_PLATFORMS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_platforms")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []).map(mapPlatform);
    },
    staleTime: 1000 * 60 * 5,
  });

  // --- Mappings ---
  const { data: mappings = [], isLoading: loadingMappings } = useQuery({
    queryKey: QK_MAPPINGS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_mappings")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map(mapMapping);
    },
    staleTime: 1000 * 60 * 5,
  });

  // --- Logs (last 50) ---
  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: QK_LOGS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map(mapLog);
    },
    staleTime: 1000 * 60 * 2,
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK_PLATFORMS });
    queryClient.invalidateQueries({ queryKey: QK_MAPPINGS });
    queryClient.invalidateQueries({ queryKey: QK_LOGS });
  }, [queryClient]);

  // --- Mutations ---

  const updatePlatform = useCallback(
    async (
      id: string,
      data: {
        secret_key?: string | null;
        active?: boolean;
        label?: string | null;
        name?: string;
      }
    ) => {
      const { error } = await supabase
        .from("webhook_platforms")
        .update(data)
        .eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: QK_PLATFORMS });
    },
    [queryClient]
  );

  const createPlatform = useCallback(
    async (data: { slug: PlatformSlug; label: string; secretKey?: string | null }) => {
      const { error } = await supabase.from("webhook_platforms").insert({
        slug: data.slug,
        name: data.label,
        label: data.label,
        secret_key: data.secretKey ?? null,
        active: false,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: QK_PLATFORMS });
    },
    [queryClient]
  );

  const deletePlatform = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("webhook_platforms")
        .delete()
        .eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: QK_PLATFORMS });
      queryClient.invalidateQueries({ queryKey: QK_MAPPINGS });
    },
    [queryClient]
  );

  const addMapping = useCallback(
    async (platformId: string, externalProductId: string, classIds: string[]) => {
      const { error } = await supabase.from("webhook_mappings").insert({
        platform_id: platformId,
        external_product_id: externalProductId,
        class_ids: classIds,
        // keep legacy column populated with first class for backward compat
        class_id: classIds[0] ?? null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: QK_MAPPINGS });
    },
    [queryClient]
  );

  const updateMapping = useCallback(
    async (
      id: string,
      data: { external_product_id?: string; class_ids?: string[] }
    ) => {
      const patch: Record<string, unknown> = {};
      if (data.external_product_id !== undefined) patch.external_product_id = data.external_product_id;
      if (data.class_ids !== undefined) {
        patch.class_ids = data.class_ids;
        patch.class_id = data.class_ids[0] ?? null;
      }
      const { error } = await supabase
        .from("webhook_mappings")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: QK_MAPPINGS });
    },
    [queryClient]
  );

  const deleteMapping = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("webhook_mappings")
        .delete()
        .eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: QK_MAPPINGS });
    },
    [queryClient]
  );

  return {
    platforms,
    mappings,
    logs,
    loading: loadingPlatforms || loadingMappings || loadingLogs,
    loadingPlatforms,
    loadingMappings,
    loadingLogs,
    updatePlatform,
    createPlatform,
    deletePlatform,
    addMapping,
    updateMapping,
    deleteMapping,
    invalidateAll,
  };
}
