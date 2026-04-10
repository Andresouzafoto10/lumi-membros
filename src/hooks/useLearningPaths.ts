import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LearningPath = {
  id: string;
  title: string;
  description: string | null;
  bannerUrl: string | null;
  isActive: boolean;
  sequential: boolean;
  certificateEnabled: boolean;
  certificateTemplateId: string | null;
  createdAt: string;
  courseIds: string[]; // ordered
};

export type LearningPathAccess = {
  id: string;
  pathId: string;
  classId: string | null;
  studentId: string | null;
  expiresAt: string | null;
  grantedBy: string | null;
  createdAt: string;
};

export type LearningPathCertificate = {
  id: string;
  pathId: string;
  studentId: string;
  templateId: string | null;
  earnedAt: string;
  downloadedAt: string | null;
};

// ---------------------------------------------------------------------------
// Query keys & helpers
// ---------------------------------------------------------------------------

const QK_PATHS = ["learning-paths"] as const;
const QK_ACCESS = ["learning-path-access"] as const;
const QK_PATH_CERTS = ["learning-path-certificates"] as const;

function mapPath(r: Record<string, unknown>, courseIds: string[] = []): LearningPath {
  return {
    id: r.id as string,
    title: r.title as string,
    description: r.description as string | null,
    bannerUrl: r.banner_url as string | null,
    isActive: r.is_active as boolean,
    sequential: r.sequential as boolean,
    certificateEnabled: (r.certificate_enabled as boolean) ?? false,
    certificateTemplateId: r.certificate_template_id as string | null,
    createdAt: r.created_at as string,
    courseIds,
  };
}

// ---------------------------------------------------------------------------
// Fetcher: returns all paths with their ordered courses
// ---------------------------------------------------------------------------

async function fetchPaths(): Promise<LearningPath[]> {
  const [{ data: paths, error: pErr }, { data: pathCourses, error: cErr }] = await Promise.all([
    supabase.from("learning_paths").select("*").order("created_at", { ascending: false }),
    supabase.from("learning_path_courses").select("path_id, course_id, order_index").order("order_index"),
  ]);
  if (pErr) throw pErr;
  if (cErr) throw cErr;

  const courseIdsByPath = new Map<string, string[]>();
  for (const pc of pathCourses ?? []) {
    const list = courseIdsByPath.get(pc.path_id as string) ?? [];
    list.push(pc.course_id as string);
    courseIdsByPath.set(pc.path_id as string, list);
  }

  return (paths ?? []).map((p) => mapPath(p, courseIdsByPath.get(p.id as string) ?? []));
}

async function fetchPathAccess(): Promise<LearningPathAccess[]> {
  const { data, error } = await supabase
    .from("learning_path_access")
    .select("*");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    pathId: r.path_id as string,
    classId: r.class_id as string | null,
    studentId: r.student_id as string | null,
    expiresAt: r.expires_at as string | null,
    grantedBy: r.granted_by as string | null,
    createdAt: r.created_at as string,
  }));
}

async function fetchPathCertificates(studentId: string): Promise<LearningPathCertificate[]> {
  const { data, error } = await supabase
    .from("learning_path_certificates")
    .select("*")
    .eq("student_id", studentId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    pathId: r.path_id as string,
    studentId: r.student_id as string,
    templateId: r.template_id as string | null,
    earnedAt: r.earned_at as string,
    downloadedAt: r.downloaded_at as string | null,
  }));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLearningPaths() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: paths = [], isLoading } = useQuery({
    queryKey: QK_PATHS,
    queryFn: fetchPaths,
    staleTime: 1000 * 60 * 5,
  });

  const { data: accessRows = [] } = useQuery({
    queryKey: QK_ACCESS,
    queryFn: fetchPathAccess,
    staleTime: 1000 * 60 * 5,
  });

  const { data: pathCertificates = [] } = useQuery({
    queryKey: [...QK_PATH_CERTS, user?.id],
    queryFn: () => fetchPathCertificates(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK_PATHS });
    queryClient.invalidateQueries({ queryKey: QK_ACCESS });
  }, [queryClient]);

  // ---- Computed: paths the current user has access to ----
  const accessiblePaths = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return paths.filter((p) => p.isActive);

    // Need student's class IDs — query handled in useStudents but to avoid circular dep,
    // we filter via accessRows that match the user OR their classes (via enrollments later)
    const directAccess = new Set(
      accessRows.filter((a) => a.studentId === user.id).map((a) => a.pathId)
    );
    // Class-based access is added via the page that knows enrollments
    return paths.filter((p) => p.isActive && directAccess.has(p.id));
  }, [user, isAdmin, paths, accessRows]);

  // ---- Helper to check class-based access for a single path ----
  const hasAccessViaClass = useCallback(
    (pathId: string, studentClassIds: string[]) => {
      return accessRows.some(
        (a) =>
          a.pathId === pathId &&
          a.classId !== null &&
          studentClassIds.includes(a.classId)
      );
    },
    [accessRows]
  );

  const hasDirectAccess = useCallback(
    (pathId: string, studentId: string) => {
      return accessRows.some(
        (a) =>
          a.pathId === pathId &&
          a.studentId === studentId &&
          (!a.expiresAt || new Date(a.expiresAt) > new Date())
      );
    },
    [accessRows]
  );

  // ---- Mutations ----

  const createPath = useCallback(
    async (data: { title: string; description?: string; bannerUrl?: string; sequential: boolean }) => {
      if (!isAdmin) throw new Error("Sem permissão");
      const { data: created, error } = await supabase
        .from("learning_paths")
        .insert({
          title: data.title,
          description: data.description ?? null,
          banner_url: data.bannerUrl ?? null,
          sequential: data.sequential,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      invalidate();
      return created.id as string;
    },
    [isAdmin, invalidate]
  );

  const updatePath = useCallback(
    async (
      id: string,
      patch: Partial<{
        title: string;
        description: string | null;
        bannerUrl: string | null;
        sequential: boolean;
        isActive: boolean;
        certificateEnabled: boolean;
        certificateTemplateId: string | null;
      }>
    ) => {
      if (!isAdmin) throw new Error("Sem permissão");
      const payload: Record<string, unknown> = {};
      if (patch.title !== undefined) payload.title = patch.title;
      if (patch.description !== undefined) payload.description = patch.description;
      if (patch.bannerUrl !== undefined) payload.banner_url = patch.bannerUrl;
      if (patch.sequential !== undefined) payload.sequential = patch.sequential;
      if (patch.isActive !== undefined) payload.is_active = patch.isActive;
      if (patch.certificateEnabled !== undefined) payload.certificate_enabled = patch.certificateEnabled;
      if (patch.certificateTemplateId !== undefined) payload.certificate_template_id = patch.certificateTemplateId;

      const { error } = await supabase.from("learning_paths").update(payload).eq("id", id);
      if (error) throw error;
      invalidate();
    },
    [isAdmin, invalidate]
  );

  const deletePath = useCallback(
    async (id: string) => {
      if (!isAdmin) throw new Error("Sem permissão");
      const { error } = await supabase.from("learning_paths").delete().eq("id", id);
      if (error) throw error;
      invalidate();
    },
    [isAdmin, invalidate]
  );

  const setPathCourses = useCallback(
    async (pathId: string, courseIds: string[]) => {
      if (!isAdmin) throw new Error("Sem permissão");
      // Replace all courses for this path
      await supabase.from("learning_path_courses").delete().eq("path_id", pathId);
      if (courseIds.length > 0) {
        const rows = courseIds.map((cid, idx) => ({
          path_id: pathId,
          course_id: cid,
          order_index: idx,
        }));
        const { error } = await supabase.from("learning_path_courses").insert(rows);
        if (error) throw error;
      }
      invalidate();
    },
    [isAdmin, invalidate]
  );

  const addAccess = useCallback(
    async (data: { pathId: string; classId?: string; studentId?: string; expiresAt?: string }) => {
      if (!isAdmin) throw new Error("Sem permissão");
      const { error } = await supabase.from("learning_path_access").insert({
        path_id: data.pathId,
        class_id: data.classId ?? null,
        student_id: data.studentId ?? null,
        expires_at: data.expiresAt ?? null,
        granted_by: user?.id ?? null,
      });
      if (error) throw error;
      invalidate();
    },
    [isAdmin, user, invalidate]
  );

  const removeAccess = useCallback(
    async (accessId: string) => {
      if (!isAdmin) throw new Error("Sem permissão");
      const { error } = await supabase.from("learning_path_access").delete().eq("id", accessId);
      if (error) throw error;
      invalidate();
    },
    [isAdmin, invalidate]
  );

  // Award path certificate
  const awardPathCertificate = useCallback(
    async (pathId: string, templateId: string | null) => {
      if (!user) return;
      const { error } = await supabase.from("learning_path_certificates").upsert(
        {
          path_id: pathId,
          student_id: user.id,
          template_id: templateId,
        },
        { onConflict: "path_id,student_id" }
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: QK_PATH_CERTS });
    },
    [user, queryClient]
  );

  return {
    paths,
    accessRows,
    accessiblePaths,
    pathCertificates,
    loading: isLoading,
    hasAccessViaClass,
    hasDirectAccess,
    createPath,
    updatePath,
    deletePath,
    setPathCourses,
    addAccess,
    removeAccess,
    awardPathCertificate,
  };
}
