import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Tracks last-seen timestamp per community for unread badge.
// Migrated from localStorage to Supabase for cross-device sync.
// ---------------------------------------------------------------------------

type LastSeenMap = Record<string, string>; // { [communityId]: ISODate }

const QK = ["community-last-seen"] as const;

async function fetchLastSeen(userId: string): Promise<LastSeenMap> {
  const { data, error } = await supabase
    .from("community_last_seen")
    .select("community_id, last_seen_at")
    .eq("user_id", userId);
  if (error) throw error;

  const map: LastSeenMap = {};
  for (const row of data ?? []) {
    map[row.community_id as string] = row.last_seen_at as string;
  }
  return map;
}

export function useCommunityLastSeen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: lastSeen = {} } = useQuery({
    queryKey: [...QK, user?.id],
    queryFn: () => fetchLastSeen(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const markSeen = useCallback(
    async (communityId: string) => {
      if (!user) return;

      const now = new Date().toISOString();

      // Optimistic update
      queryClient.setQueryData([...QK, user.id], (old: LastSeenMap | undefined) => ({
        ...(old ?? {}),
        [communityId]: now,
      }));

      await supabase.from("community_last_seen").upsert(
        {
          user_id: user.id,
          community_id: communityId,
          last_seen_at: now,
        },
        { onConflict: "user_id,community_id" }
      );
    },
    [user, queryClient]
  );

  const getLastSeen = useCallback(
    (communityId: string): string | null => {
      return lastSeen[communityId] ?? null;
    },
    [lastSeen]
  );

  return { lastSeen, markSeen, getLastSeen };
}
