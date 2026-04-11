import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { onProfileComplete } from "@/lib/gamificationEngine";
import type { StudentProfile, StudentRole } from "@/types/student";

const QK = ["profiles"] as const;

function mapRow(p: Record<string, unknown>): StudentProfile {
  return {
    id: p.id as string,
    studentId: p.id as string, // profiles.id = auth.users.id = student id
    username: (p.username as string) ?? "",
    displayName: (p.display_name as string) ?? (p.name as string) ?? "",
    avatarUrl: (p.avatar_url as string) ?? "",
    coverUrl: (p.cover_url as string) ?? "",
    coverPosition: (p.cover_position as string) ?? "50% 50%",
    bio: (p.bio as string) ?? "",
    link: (p.link as string) ?? "",
    location: (p.location as string) ?? "",
    cpf: (p.cpf as string) ?? "",
    socialInstagram: (p.social_instagram as string) ?? "",
    socialYoutube: (p.social_youtube as string) ?? "",
    socialTiktok: (p.social_tiktok as string) ?? "",
    socialTwitter: (p.social_twitter as string) ?? "",
    socialLinkedin: (p.social_linkedin as string) ?? "",
    socialWebsite: (p.social_website as string) ?? "",
    createdAt: p.created_at as string,
    followers: (p.followers as string[]) ?? [],
    following: (p.following as string[]) ?? [],
    role: ((p.role as string) ?? "student") as StudentRole,
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

  const checkUsernameAvailable = useCallback(
    async (username: string, currentUserId: string): Promise<boolean> => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", currentUserId)
        .limit(1);
      return !data || data.length === 0;
    },
    []
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
          | "coverPosition"
          | "bio"
          | "link"
          | "location"
          | "cpf"
          | "socialInstagram"
          | "socialYoutube"
          | "socialTiktok"
          | "socialTwitter"
          | "socialLinkedin"
          | "socialWebsite"
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
          ...(patch.coverPosition !== undefined && { cover_position: patch.coverPosition }),
          ...(patch.bio !== undefined && { bio: patch.bio }),
          ...(patch.link !== undefined && { link: patch.link }),
          ...(patch.location !== undefined && { location: patch.location }),
          ...(patch.cpf !== undefined && { cpf: patch.cpf }),
          ...(patch.socialInstagram !== undefined && { social_instagram: patch.socialInstagram }),
          ...(patch.socialYoutube !== undefined && { social_youtube: patch.socialYoutube }),
          ...(patch.socialTiktok !== undefined && { social_tiktok: patch.socialTiktok }),
          ...(patch.socialTwitter !== undefined && { social_twitter: patch.socialTwitter }),
          ...(patch.socialLinkedin !== undefined && { social_linkedin: patch.socialLinkedin }),
          ...(patch.socialWebsite !== undefined && { social_website: patch.socialWebsite }),
        })
        .eq("id", profileId);
      if (error) throw error;
      invalidate();

      // Check if profile is now complete → award points
      const existing = profiles.find((p) => p.id === profileId);
      if (existing) {
        const merged = { ...existing, ...patch };
        const isComplete = !!(
          merged.displayName?.trim() &&
          merged.bio?.trim() &&
          merged.avatarUrl?.trim() &&
          merged.username?.trim()
        );
        if (isComplete) {
          onProfileComplete(profileId).catch(() => {});
        }
      }
    },
    [invalidate, profiles]
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

      const [followingRes, followersRes] = await Promise.all([
        supabase
          .from("profiles")
          .update({ following: newFollowing })
          .eq("id", myStudentId),
        supabase
          .from("profiles")
          .update({ followers: newFollowers })
          .eq("id", targetStudentId),
      ]);
      if (followingRes.error) console.error("[profiles] update following:", followingRes.error.message);
      if (followersRes.error) console.error("[profiles] update followers:", followersRes.error.message);
      // Create follow notification
      const { error: notifError } = await supabase.from("notifications").insert({
        recipient_id: targetStudentId,
        type: "follow",
        actor_id: myStudentId,
        target_id: myStudentId,
        target_type: "profile",
        message: `${myProfile.displayName} começou a seguir você`,
        read: false,
      });
      if (notifError) console.error("[notifications] follow insert:", notifError.message);
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

      const [unfollowRes, unfollowersRes] = await Promise.all([
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
      if (unfollowRes.error) console.error("[profiles] update following:", unfollowRes.error.message);
      if (unfollowersRes.error) console.error("[profiles] update followers:", unfollowersRes.error.message);
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
    checkUsernameAvailable,
    isFollowing,
    follow,
    unfollow,
  };
}
