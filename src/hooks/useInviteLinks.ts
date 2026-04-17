import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { InviteLink } from "@/types/student";

const QK = ["invite-links"] as const;

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

async function fetchInviteLinks(): Promise<InviteLink[]> {
  const { data, error } = await supabase
    .from("invite_links")
    .select("*, classes(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const classes = row.classes as { name?: string } | null | undefined;
    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      class_id: row.class_id as string,
      created_by: row.created_by as string,
      max_uses: row.max_uses as number | null,
      use_count: row.use_count as number,
      expires_at: row.expires_at as string | null,
      is_active: row.is_active as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      class_name: classes?.name ?? undefined,
    };
  });
}

export function useInviteLinks() {
  const queryClient = useQueryClient();
  const { data: inviteLinks = [], isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchInviteLinks,
    staleTime: 1000 * 60 * 5,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  const createInviteLink = useCallback(
    async (data: {
      name: string;
      class_id?: string | null;
      max_uses?: number | null;
      expires_at?: string | null;
      created_by?: string | null;
    }) => {
      const slug = generateSlug(data.name);
      const { data: row, error } = await supabase
        .from("invite_links")
        .insert({
          name: data.name,
          slug,
          class_id: data.class_id ?? null,
          max_uses: data.max_uses ?? null,
          expires_at: data.expires_at ?? null,
          created_by: data.created_by ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      invalidate();
      return row;
    },
    [invalidate]
  );

  const updateInviteLink = useCallback(
    async (
      id: string,
      data: {
        name?: string;
        class_id?: string | null;
        max_uses?: number | null;
        expires_at?: string | null;
        is_active?: boolean;
      }
    ) => {
      const { error } = await supabase
        .from("invite_links")
        .update(data)
        .eq("id", id);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const deleteInviteLink = useCallback(
    async (id: string, useCount: number) => {
      if (useCount > 0) {
        // Don't delete if already used — just deactivate
        await supabase
          .from("invite_links")
          .update({ is_active: false })
          .eq("id", id);
      } else {
        const { error } = await supabase
          .from("invite_links")
          .delete()
          .eq("id", id);
        if (error) throw error;
      }
      invalidate();
    },
    [invalidate]
  );

  const toggleInviteLinkActive = useCallback(
    async (id: string, isActive: boolean) => {
      const { error } = await supabase
        .from("invite_links")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  return {
    inviteLinks,
    isLoading,
    createInviteLink,
    updateInviteLink,
    deleteInviteLink,
    toggleInviteLinkActive,
  };
}
