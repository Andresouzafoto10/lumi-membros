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
  const [linksRes, classesRes] = await Promise.all([
    supabase
      .from("invite_links")
      .select("*, classes(name)")
      .order("created_at", { ascending: false }),
    supabase.from("classes").select("id, name"),
  ]);
  if (linksRes.error) throw linksRes.error;
  const classNameById = new Map<string, string>();
  for (const c of (classesRes.data ?? []) as Array<{ id: string; name: string }>) {
    classNameById.set(c.id, c.name);
  }
  return (linksRes.data ?? []).map((row: Record<string, unknown>) => {
    const classes = row.classes as { name?: string } | null | undefined;
    const classIds = ((row.class_ids as string[] | null) ?? []).filter(Boolean);
    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      class_id: (row.class_id as string | null) ?? null,
      class_ids: classIds,
      created_by: row.created_by as string,
      max_uses: row.max_uses as number | null,
      use_count: row.use_count as number,
      expires_at: row.expires_at as string | null,
      is_active: row.is_active as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      class_name: classes?.name ?? undefined,
      class_names: classIds
        .map((id) => classNameById.get(id))
        .filter((n): n is string => Boolean(n)),
    };
  });
}

export type InviteLinkUse = {
  studentId: string;
  name: string;
  email: string;
  usedAt: string;
};

// Who joined via a given invite link (admin-only read; RLS allows admins).
export async function fetchInviteLinkUses(linkId: string): Promise<InviteLinkUse[]> {
  const { data: uses, error } = await supabase
    .from("invite_link_uses")
    .select("student_id, used_at")
    .eq("invite_link_id", linkId)
    .order("used_at", { ascending: false });
  if (error) throw error;
  const rows = (uses ?? []) as Array<{ student_id: string; used_at: string }>;
  const ids = rows.map((r) => r.student_id).filter(Boolean);
  if (ids.length === 0) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, name, display_name, email")
    .in("id", ids);
  const byId = new Map<string, { name?: string; display_name?: string; email?: string }>();
  for (const p of (profs ?? []) as Array<Record<string, string>>) byId.set(p.id, p);
  return rows.map((r) => {
    const p = byId.get(r.student_id);
    return {
      studentId: r.student_id,
      name: (p?.display_name || p?.name || "Aluno").trim(),
      email: p?.email ?? "",
      usedAt: r.used_at,
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
      class_ids?: string[];
      max_uses?: number | null;
      expires_at?: string | null;
      created_by?: string | null;
    }) => {
      const slug = generateSlug(data.name);
      const classIds = data.class_ids ?? [];
      const { data: row, error } = await supabase
        .from("invite_links")
        .insert({
          name: data.name,
          slug,
          // Keep class_id in sync with the first class for legacy readers.
          class_id: classIds[0] ?? null,
          class_ids: classIds,
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
        class_ids?: string[];
        max_uses?: number | null;
        expires_at?: string | null;
        is_active?: boolean;
      }
    ) => {
      const payload: Record<string, unknown> = { ...data };
      if (data.class_ids !== undefined) {
        payload.class_ids = data.class_ids;
        payload.class_id = data.class_ids[0] ?? null;
      }
      const { error } = await supabase
        .from("invite_links")
        .update(payload)
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
