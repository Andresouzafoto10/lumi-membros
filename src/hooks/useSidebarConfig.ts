import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CommunitySidebarItem } from "@/types/student";

const QK = ["sidebar-config"] as const;

async function fetchSidebarConfig(): Promise<CommunitySidebarItem[]> {
  const { data, error } = await supabase
    .from("sidebar_config")
    .select("*")
    .order("order");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    communityId: r.community_id as string,
    emoji: r.emoji as string,
    order: r.order as number,
    visible: r.visible as boolean,
    salesPageUrl: (r.sales_page_url as string) ?? "",
  }));
}

export function useSidebarConfig() {
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: QK,
    queryFn: fetchSidebarConfig,
    staleTime: 1000 * 60 * 5,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.order - b.order),
    [items]
  );

  const findByCommunityId = useCallback(
    (communityId: string) =>
      items.find((i) => i.communityId === communityId) ?? null,
    [items]
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<Omit<CommunitySidebarItem, "id">>) => {
      await supabase
        .from("sidebar_config")
        .update({
          ...(patch.emoji !== undefined && { emoji: patch.emoji }),
          ...(patch.order !== undefined && { order: patch.order }),
          ...(patch.visible !== undefined && { visible: patch.visible }),
          ...(patch.salesPageUrl !== undefined && {
            sales_page_url: patch.salesPageUrl,
          }),
          ...(patch.communityId !== undefined && {
            community_id: patch.communityId,
          }),
        })
        .eq("id", id);
      invalidate();
    },
    [invalidate]
  );

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, idx) =>
          supabase.from("sidebar_config").update({ order: idx }).eq("id", id)
        )
      );
      invalidate();
    },
    [invalidate]
  );

  const addItem = useCallback(
    async (communityId: string): Promise<string> => {
      const { data, error } = await supabase
        .from("sidebar_config")
        .insert({
          community_id: communityId,
          emoji: "💬",
          order: items.length,
          visible: true,
          sales_page_url: "",
        })
        .select()
        .single();
      if (error) throw error;
      invalidate();
      return data.id as string;
    },
    [items.length, invalidate]
  );

  const removeItem = useCallback(
    async (id: string) => {
      await supabase.from("sidebar_config").delete().eq("id", id);
      invalidate();
    },
    [invalidate]
  );

  return {
    items: sortedItems,
    findByCommunityId,
    updateItem,
    reorder,
    addItem,
    removeItem,
  };
}
