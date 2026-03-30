import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { StudentProfile } from "@/types/student";

const QK = ["profiles"] as const;

function mapRow(p: Record<string, unknown>): StudentProfile {
  return {
    id: p.id as string,
    studentId: p.id as string, // profiles.id = auth.users.id = student id
    username: (p.username as string) ?? "",
    displayName: (p.display_name as string) ?? (p.name as string) ?? "",
    avatarUrl: (p.avatar_url as string) ?? "",
    coverUrl: (p.cover_url as string) ?? "",
    bio: (p.bio as string) ?? "",
    link: (p.link as string) ?? "",
    location: (p.location as string) ?? "",
    createdAt: p.created_at as string,
    followers: (p.followers as string[]) ?? [],
    following: (p.following as string[]) ?? [],
  };
}

async function fetchProfiles(): Promise<StudentProfile[]> {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

// Direct accessor for non-hook contexts (kept for component compat)
let _profiles: StudentProfile[] = [];
export function findProfileDirect(studentId: string): StudentProfile | null {
  return _profiles.find((p) => p.studentId === studentId) ?? null;
}
export function findProfileByUsernameDirect(username: string): StudentProfile | null {
  return _profiles.find((p) => p.username === username) ?? null;
}

export function useProfiles() {
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: QK,
    queryFn: async () => {
      const result = await fetchProfiles();
      _profiles = result; // keep direct accessor in sync
      return result;
    },
    staleTime: 1000 * 60 * 2,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  const findProfile = useCallback(
    (studentId: string | undefined) =>
      studentId ? profiles.find((p) => p.studentId === studentId) ?? null : null,
    [profiles]
  );

  const findProfileByUsername = useCallback(
    (username: string | undefined) =>
      username ? profiles.find((p) => p.username === username) ?? null : null,
    [profiles]
  );

  const updateProfile = useCallback(
    async (
      profileId: string,
      patch: Partial<
        Pick<
          StudentProfile,
          | "username"
          | "displayName"
          | "avatarUrl"
          | "coverUrl"
          | "bio"
          | "link"
          | "location"
        >
      >
    ) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...(patch.username !== undefined && { username: patch.username }),
          ...(patch.displayName !== undefined && { display_name: patch.displayName }),
          ...(patch.avatarUrl !== undefined && { avatar_url: patch.avatarUrl }),
          ...(patch.coverUrl !== undefined && { cover_url: patch.coverUrl }),
          ...(patch.bio !== undefined && { bio: patch.bio }),
          ...(patch.link !== undefined && { link: patch.link }),
          ...(patch.location !== undefined && { location: patch.location }),
        })
        .eq("id", profileId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const follow = useCallback(
    async (myStudentId: string, targetStudentId: string) => {
      const myProfile = findProfile(myStudentId);
      const targetProfile = findProfile(targetStudentId);
      if (!myProfile || !targetProfile) return;
      if (myStudentId === targetStudentId) return;

      const newFollowing = myProfile.following.includes(targetStudentId)
        ? myProfile.following
        : [...myProfile.following, targetStudentId];
      const newFollowers = targetProfile.followers.includes(myStudentId)
        ? targetProfile.followers
        : [...targetProfile.followers, myStudentId];

      await Promise.all([
        supabase
          .from("profiles")
          .update({ following: newFollowing })
          .eq("id", myStudentId),
        supabase
          .from("profiles")
          .update({ followers: newFollowers })
          .eq("id", targetStudentId),
      ]);
      // Create follow notification
      await supabase.from("notifications").insert({
        recipient_id: targetStudentId,
        type: "follow",
        actor_id: myStudentId,
        target_id: myStudentId,
        target_type: "profile",
        message: `${myProfile.displayName} começou a seguir você`,
        read: false,
      });
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    [findProfile, invalidate, queryClient]
  );

  const unfollow = useCallback(
    async (myStudentId: string, targetStudentId: string) => {
      const myProfile = findProfile(myStudentId);
      const targetProfile = findProfile(targetStudentId);
      if (!myProfile || !targetProfile) return;

      await Promise.all([
        supabase
          .from("profiles")
          .update({
            following: myProfile.following.filter((id) => id !== targetStudentId),
          })
          .eq("id", myStudentId),
        supabase
          .from("profiles")
          .update({
            followers: targetProfile.followers.filter((id) => id !== myStudentId),
          })
          .eq("id", targetStudentId),
      ]);
      invalidate();
    },
    [findProfile, invalidate]
  );

  const isFollowing = useCallback(
    (myStudentId: string, targetStudentId: string): boolean => {
      const myProfile = profiles.find((p) => p.studentId === myStudentId);
      return myProfile?.following.includes(targetStudentId) ?? false;
    },
    [profiles]
  );

  return {
    profiles,
    loading: isLoading,
    findProfile,
    findProfileByUsername,
    updateProfile,
    isFollowing,
    follow,
    unfollow,
  };
}
