import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type NavMenuItemRow = Database["public"]["Tables"]["nav_menu_items"]["Row"];
type NavMenuItemInsert = Database["public"]["Tables"]["nav_menu_items"]["Insert"];
type NavMenuItemUpdate = Database["public"]["Tables"]["nav_menu_items"]["Update"];

const QK = ["nav-menu-items"] as const;

export function useNavMenuItems(area: "student" | "admin") {
  const queryClient = useQueryClient();
  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: QK }),
    [queryClient],
  );

  const { data: items = [], isLoading } = useQuery({
    queryKey: [...QK, area],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nav_menu_items")
        .select("*")
        .eq("area", area)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as NavMenuItemRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: NavMenuItemInsert) => {
      const { error } = await supabase.from("nav_menu_items").insert(input);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: NavMenuItemUpdate }) => {
      const { error } = await supabase
        .from("nav_menu_items")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("nav_menu_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: async (reordered: { id: string; sort_order: number }[]) => {
      const promises = reordered.map(({ id, sort_order }) =>
        supabase.from("nav_menu_items").update({ sort_order }).eq("id", id),
      );
      const results = await Promise.all(promises);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: invalidate,
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase
        .from("nav_menu_items")
        .update({ visible })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    items,
    isLoading,
    createNavMenuItem: createMutation.mutateAsync,
    updateNavMenuItem: (id: string, data: NavMenuItemUpdate) =>
      updateMutation.mutateAsync({ id, data }),
    deleteNavMenuItem: deleteMutation.mutateAsync,
    reorderNavMenuItems: reorderMutation.mutateAsync,
    toggleNavMenuItemVisibility: (id: string, visible: boolean) =>
      toggleVisibilityMutation.mutateAsync({ id, visible }),
  };
}

export type { NavMenuItemRow, NavMenuItemInsert, NavMenuItemUpdate };
