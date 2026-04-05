import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface EmailAutomation {
  id: string;
  type: string;
  name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  delay_hours: number;
  subject_template: string;
  preview_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailLogEntry {
  id: string;
  recipient_id: string;
  type: string;
  sent_at: string;
  status: string;
  metadata: Record<string, unknown> | null;
  automation_type: string | null;
  subject: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  // Joined
  recipient_name?: string;
  recipient_email?: string;
}

const LOGS_PER_PAGE = 20;

export function useEmailAutomations() {
  const queryClient = useQueryClient();

  // Fetch all automations
  const {
    data: automations = [],
    isLoading: automationsLoading,
  } = useQuery({
    queryKey: ["email-automations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_automations")
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return data as EmailAutomation[];
    },
    staleTime: 30_000,
  });

  // Toggle automation active status
  const toggleAutomation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("email_automations")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-automations"] });
    },
  });

  return {
    automations,
    automationsLoading,
    toggleAutomation,
  };
}

export function useEmailLogs(page: number, filters?: { type?: string; status?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ["email-logs", page, filters],
    queryFn: async () => {
      let query = supabase
        .from("email_notification_log")
        .select("*", { count: "exact" })
        .order("sent_at", { ascending: false })
        .range((page - 1) * LOGS_PER_PAGE, page * LOGS_PER_PAGE - 1);

      if (filters?.type) {
        query = query.eq("type", filters.type);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte("sent_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("sent_at", filters.dateTo);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Resolve recipient names
      const recipientIds = [...new Set((data ?? []).map((d) => d.recipient_id).filter(Boolean))];
      let profileMap: Record<string, { name: string; email: string }> = {};

      if (recipientIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, name, email")
          .in("id", recipientIds);

        profileMap = (profiles ?? []).reduce((acc, p) => {
          acc[p.id as string] = {
            name: (p.display_name as string) || (p.name as string) || "Membro",
            email: p.email as string,
          };
          return acc;
        }, {} as Record<string, { name: string; email: string }>);
      }

      const enrichedLogs: EmailLogEntry[] = (data ?? []).map((log) => ({
        ...log,
        recipient_name: profileMap[log.recipient_id]?.name ?? "Desconhecido",
        recipient_email: profileMap[log.recipient_id]?.email ?? "",
      }));

      return {
        logs: enrichedLogs,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / LOGS_PER_PAGE),
      };
    },
    staleTime: 10_000,
  });
}

export function useSchedulerTrigger() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("email-scheduler");
      if (error) throw error;
      return data as { success: boolean; processed: number; sent: number; skipped: number };
    },
  });
}
