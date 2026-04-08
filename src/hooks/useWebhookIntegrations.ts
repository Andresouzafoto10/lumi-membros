import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebhookPlatform = {
  id: string;
  name: string;
  slug: string;
  secretKey: string | null;
  active: boolean;
  lastEventAt: string | null;
  createdAt: string;
};

export type WebhookMapping = {
  id: string;
  platformId: string;
  externalProductId: string;
  classId: string;
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
    secretKey: r.secret_key as string | null,
    active: r.active as boolean,
    lastEventAt: r.last_event_at as string | null,
    createdAt: r.created_at as string,
  };
}

function mapMapping(r: Record<string, unknown>): WebhookMapping {
  return {
    id: r.id as string,
    platformId: r.platform_id as string,
    externalProductId: r.external_product_id as string,
    classId: r.class_id as string,
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
    async (id: string, data: { secret_key?: string | null; active?: boolean }) => {
      const { error } = await supabase
        .from("webhook_platforms")
        .update(data)
        .eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: QK_PLATFORMS });
    },
    [queryClient]
  );

  const addMapping = useCallback(
    async (platformId: string, externalProductId: string, classId: string) => {
      const { error } = await supabase.from("webhook_mappings").insert({
        platform_id: platformId,
        external_product_id: externalProductId,
        class_id: classId,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: QK_MAPPINGS });
    },
    [queryClient]
  );

  const updateMapping = useCallback(
    async (id: string, data: { external_product_id?: string; class_id?: string }) => {
      const { error } = await supabase
        .from("webhook_mappings")
        .update(data)
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
    addMapping,
    updateMapping,
    deleteMapping,
    invalidateAll,
  };
}
