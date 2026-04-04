import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Community, CommunitySettings } from "@/types/student";
import { isCommunityPublic } from "@/types/student";
import { useAuth } from "@/contexts/AuthContext";

const QK_ENROLLED = (userId: string) => ["my-class-ids", userId] as const;

const QK = ["communities"] as const;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

async function fetchCommunities(): Promise<Community[]> {
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    coverUrl: c.cover_url,
    iconUrl: c.icon_url,
    classIds: c.class_ids ?? [],
    pinnedPostId: c.pinned_post_id,
    settings: c.settings as CommunitySettings,
    status: c.status as "active" | "inactive",
    createdAt: c.created_at,
  }));
}

export function useCommunities() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: communities = [], isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchCommunities,
    staleTime: 1000 * 60 * 5,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  // Pre-fetch current user's enrolled class IDs for sync community access
  const { data: myEnrolledClassIds = [] } = useQuery({
    queryKey: QK_ENROLLED(user?.id ?? ""),
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", user.id)
        .eq("status", "active");
      return (data ?? []).map((e) => e.class_id as string);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const activeCommunities = useMemo(
    () => communities.filter((c) => c.status === "active"),
    [communities]
  );

  const myCommunities = useMemo(
    () =>
      communities.filter(
        (c) =>
          c.status === "active" &&
          (isCommunityPublic(c) ||
            c.classIds.some((cid) => myEnrolledClassIds.includes(cid)))
      ),
    [communities, myEnrolledClassIds]
  );

  const findCommunity = useCallback(
    (id: string | undefined) =>
      id ? communities.find((c) => c.id === id) ?? null : null,
    [communities]
  );

  const findBySlug = useCallback(
    (slug: string | undefined) =>
      slug ? communities.find((c) => c.slug === slug) ?? null : null,
    [communities]
  );

  // Sync — uses pre-fetched enrollment data for the current user
  const getCommunitiesForStudent = useCallback(
    (studentId: string): Community[] => {
      if (studentId === user?.id) return myCommunities;
      // For other users (admin context) return all active
      return activeCommunities;
    },
    [myCommunities, activeCommunities, user?.id]
  );

  // Sync version for components that already have enrollment class IDs
  const getCommunitiesForStudentSync = useCallback(
    (_studentId: string, enrolledClassIds: string[]): Community[] =>
      communities.filter(
        (c) =>
          c.status === "active" &&
          (isCommunityPublic(c) ||
            c.classIds.some((cid) => enrolledClassIds.includes(cid)))
      ),
    [communities]
  );

  const getCommunitiesByClass = useCallback(
    (classId: string) => communities.filter((c) => c.classIds.includes(classId)),
    [communities]
  );

  const createCommunity = useCallback(
    async (data: Partial<Community> & { name: string }) => {
      const slug = data.slug || slugify(data.name);
      const { data: row, error } = await supabase
        .from("communities")
        .insert({
          slug,
          name: data.name,
          description: data.description ?? "",
          cover_url: data.coverUrl ?? "",
          icon_url: data.iconUrl ?? "",
          class_ids: data.classIds ?? [],
          pinned_post_id: null,
          settings: data.settings ?? {
            allowStudentPosts: true,
            requireApproval: false,
            allowImages: true,
          },
          status: data.status ?? "active",
        })
        .select()
        .single();
      if (error) throw error;
      invalidate();
      return row.id as string;
    },
    [invalidate]
  );

  const updateCommunity = useCallback(
    async (communityId: string, patch: Partial<Community>) => {
      const { error } = await supabase
        .from("communities")
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.slug !== undefined && { slug: patch.slug }),
          ...(patch.description !== undefined && { description: patch.description }),
          ...(patch.coverUrl !== undefined && { cover_url: patch.coverUrl }),
          ...(patch.iconUrl !== undefined && { icon_url: patch.iconUrl }),
          ...(patch.classIds !== undefined && { class_ids: patch.classIds }),
          ...(patch.settings !== undefined && { settings: patch.settings }),
          ...(patch.status !== undefined && { status: patch.status }),
          ...(patch.pinnedPostId !== undefined && {
            pinned_post_id: patch.pinnedPostId,
          }),
        })
        .eq("id", communityId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const deleteCommunity = useCallback(
    async (communityId: string) => {
      const { error } = await supabase
        .from("communities")
        .delete()
        .eq("id", communityId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const pinPost = useCallback(
    async (communityId: string, postId: string) => {
      await updateCommunity(communityId, { pinnedPostId: postId });
    },
    [updateCommunity]
  );

  const unpinPost = useCallback(
    async (communityId: string) => {
      await updateCommunity(communityId, { pinnedPostId: null });
    },
    [updateCommunity]
  );

  return {
    communities,
    activeCommunities,
    myCommunities,
    loading: isLoading,
    findCommunity,
    findBySlug,
    getCommunitiesForStudent,
    getCommunitiesForStudentSync,
    getCommunitiesByClass,
    createCommunity,
    updateCommunity,
    deleteCommunity,
    pinPost,
    unpinPost,
  };
}
