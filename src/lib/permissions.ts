import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Permission types
// ---------------------------------------------------------------------------

export type AdminPermission =
  | "courses"
  | "students"
  | "classes"
  | "settings"
  | "community"
  | "moderation";

// System roles always have full access
const FULL_ACCESS_ROLES = ["owner", "admin", "support"];

// Moderator has limited access
const MODERATOR_PERMISSIONS: AdminPermission[] = [
  "courses",
  "students",
  "community",
  "moderation",
];

// ---------------------------------------------------------------------------
// Check permission
// ---------------------------------------------------------------------------

/**
 * Check if a user has a specific admin permission.
 * - owner/admin/support → always true
 * - moderator → limited set of permissions
 * - student with custom profile → check access_profiles
 */
export async function checkPermission(
  userId: string,
  permission: AdminPermission
): Promise<boolean> {
  // Get user's role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!profile) return false;

  const role = profile.role as string;

  // System admin roles → always allowed
  if (FULL_ACCESS_ROLES.includes(role)) return true;

  // Moderator → check specific permissions
  if (role === "moderator") {
    return MODERATOR_PERMISSIONS.includes(permission);
  }

  // For custom roles, we'd check access_profiles table
  // Currently students don't have admin access
  return false;
}

/**
 * Get all permissions for a user (sync check based on role string).
 * Used for UI rendering (sidebar visibility, etc.)
 */
export function getPermissionsForRole(
  role: string
): Record<AdminPermission, boolean> {
  if (FULL_ACCESS_ROLES.includes(role)) {
    return {
      courses: true,
      students: true,
      classes: true,
      settings: true,
      community: true,
      moderation: true,
    };
  }

  if (role === "moderator") {
    return {
      courses: true,
      students: true,
      classes: false,
      settings: false,
      community: true,
      moderation: true,
    };
  }

  return {
    courses: false,
    students: false,
    classes: false,
    settings: false,
    community: false,
    moderation: false,
  };
}
