import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type ScriptInjectionRow = Database["public"]["Tables"]["script_injections"]["Row"];
type ScriptInjectionInsert = Database["public"]["Tables"]["script_injections"]["Insert"];
type ScriptInjectionUpdate = Database["public"]["Tables"]["script_injections"]["Update"];

const QK = ["script-injections"] as const;

export function useScriptInjections() {
  const queryClient = useQueryClient();
  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: QK }),
    [queryClient],
  );

  const { data: scripts = [], isLoading } = useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("script_injections")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ScriptInjectionRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: ScriptInjectionInsert) => {
      const { error } = await supabase.from("script_injections").insert(input);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ScriptInjectionUpdate }) => {
      const { error } = await supabase
        .from("script_injections")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("script_injections")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("script_injections")
        .update({ enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    scripts,
    isLoading,
    createScriptInjection: createMutation.mutateAsync,
    updateScriptInjection: (id: string, data: ScriptInjectionUpdate) =>
      updateMutation.mutateAsync({ id, data }),
    deleteScriptInjection: deleteMutation.mutateAsync,
    toggleScriptInjection: (id: string, enabled: boolean) =>
      toggleMutation.mutateAsync({ id, enabled }),
  };
}

export function useActiveScriptInjections(area: "admin" | "student") {
  const { data: scripts = [], isLoading } = useQuery({
    queryKey: [...QK, "active", area],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("script_injections")
        .select("*")
        .eq("enabled", true);
      if (error) throw error;
      return (data as ScriptInjectionRow[]).filter((s) => {
        if (s.apply_to === "all") return true;
        if (s.apply_to === "admin_only") return area === "admin";
        if (s.apply_to === "student_only") return area === "student";
        return true; // specific_pages filtered at injection time
      });
    },
    staleTime: 1000 * 60 * 5,
  });

  return { scripts, isLoading };
}

export type { ScriptInjectionRow, ScriptInjectionInsert, ScriptInjectionUpdate };
