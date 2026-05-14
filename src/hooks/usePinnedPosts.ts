import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { PinnedPost, PinScope } from "@/types/student";

const QK = ["pinned-posts"] as const;

async function fetchPinnedPosts(): Promise<PinnedPost[]> {
  const { data, error } = await supabase
    .from("pinned_posts")
    .select("*")
    .order("pinned_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    postId: r.post_id,
    scope: r.scope as PinScope,
    communityId: r.community_id,
    pinnedAt: r.pinned_at,
    pinnedBy: r.pinned_by,
  }));
}

export function usePinnedPosts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: pins = [], isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchPinnedPosts,
    staleTime: 1000 * 60 * 2,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  const pinnedByScope = useCallback(
    (scope: PinScope, communityId?: string | null): PinnedPost[] => {
      return pins.filter((p) => {
        if (p.scope !== scope) return false;
        if (scope === "community") return p.communityId === communityId;
        return true;
      });
    },
    [pins]
  );

  const isPinned = useCallback(
    (postId: string, scope: PinScope, communityId?: string | null): boolean => {
      return pins.some(
        (p) =>
          p.postId === postId &&
          p.scope === scope &&
          (scope !== "community" || p.communityId === communityId)
      );
    },
    [pins]
  );

  const getPinDestinations = useCallback(
    (postId: string, communityId: string | null) => {
      return {
        community: communityId
          ? pins.some(
              (p) =>
                p.postId === postId &&
                p.scope === "community" &&
                p.communityId === communityId
            )
          : false,
        feed: pins.some((p) => p.postId === postId && p.scope === "feed"),
        sidebar: pins.some((p) => p.postId === postId && p.scope === "sidebar"),
      };
    },
    [pins]
  );

  const pinPost = useCallback(
    async (args: { postId: string; scope: PinScope; communityId?: string | null }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase.from("pinned_posts").insert({
        post_id: args.postId,
        scope: args.scope,
        community_id: args.scope === "community" ? args.communityId ?? null : null,
        pinned_by: user.id,
      });
      if (error) {
        if (error.message?.includes("Limite de 3")) {
          throw new Error("Limite de 3 fixados atingido neste destino. Desafixe um antes.");
        }
        throw error;
      }
      invalidate();
    },
    [user?.id, invalidate]
  );

  const unpinPost = useCallback(
    async (args: { postId: string; scope: PinScope; communityId?: string | null }) => {
      let query = supabase
        .from("pinned_posts")
        .delete()
        .eq("post_id", args.postId)
        .eq("scope", args.scope);
      if (args.scope === "community") {
        query = query.eq("community_id", args.communityId ?? "");
      } else {
        query = query.is("community_id", null);
      }
      const { error } = await query;
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const allPinnedPostIds = useMemo(
    () => new Set(pins.map((p) => p.postId)),
    [pins]
  );

  return {
    pins,
    loading: isLoading,
    pinnedByScope,
    isPinned,
    getPinDestinations,
    pinPost,
    unpinPost,
    allPinnedPostIds,
  };
}
