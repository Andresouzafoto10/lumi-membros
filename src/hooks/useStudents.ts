import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Student, Enrollment, StudentStatus, StudentRole } from "@/types/student";

const QK = ["students"] as const;

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchStudents(): Promise<{ students: Student[]; enrollments: Enrollment[] }> {
  const [studentsRes, enrollmentsRes] = await Promise.all([
    supabase.from("profiles").select("*").order("name"),
    supabase.from("enrollments").select("*"),
  ]);
  if (studentsRes.error) throw studentsRes.error;
  if (enrollmentsRes.error) throw enrollmentsRes.error;

  const enrollments: Enrollment[] = (enrollmentsRes.data ?? []).map((e) => ({
    id: e.id,
    studentId: e.student_id,
    classId: e.class_id,
    type: e.type as Enrollment["type"],
    expiresAt: e.expires_at,
    status: e.status as Enrollment["status"],
    enrolledAt: e.enrolled_at,
  }));

  const students: Student[] = (studentsRes.data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role as StudentRole,
    status: p.status as StudentStatus,
    createdAt: p.created_at,
    enrollments: enrollments.filter((e) => e.studentId === p.id),
    signupSource: p.signup_source ?? null,
    inviteLinkId: p.invite_link_id ?? null,
  }));

  return { students, enrollments };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStudents() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchStudents,
    enabled: isAdmin,
    staleTime: 1000 * 60 * 2,
  });

  const students = useMemo(() => data?.students ?? [], [data]);
  const enrollments = useMemo(() => data?.enrollments ?? [], [data]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  const findStudent = useCallback(
    (id: string | undefined) =>
      id ? students.find((s) => s.id === id) ?? null : null,
    [students]
  );

  const getStudentEnrollments = useCallback(
    (studentId: string) => enrollments.filter((e) => e.studentId === studentId),
    [enrollments]
  );

  // Admin creates a student record (invites via Supabase Admin API or just creates profile)
  const createStudent = useCallback(
    async (data: {
      name: string;
      email: string;
      role: StudentRole;
      status: StudentStatus;
      classIds?: string[];
    }) => {
      // For admin-created students, use Supabase Admin API via Edge Function.
      // Here we create a profile entry directly (assumes user will be invited separately).
      const tempId = crypto.randomUUID();
      const { error: pe } = await supabase.from("profiles").insert({
        id: tempId,
        email: data.email,
        name: data.name,
        role: data.role,
        status: data.status,
        display_name: data.name,
        username: data.email.split("@")[0],
        avatar_url: "",
        cover_url: "",
        bio: "",
        link: "",
        location: "",
        followers: [],
        following: [],
      });
      if (pe) throw pe;
      // Create enrollments
      for (const classId of data.classIds ?? []) {
        const { error: enrollError } = await supabase.from("enrollments").insert({
          student_id: tempId,
          class_id: classId,
          type: "individual",
          status: "active",
        });
        if (enrollError) console.error("[enrollments] insert:", enrollError.message);
      }
      invalidate();
      return tempId;
    },
    [invalidate]
  );

  const createStudentsBulk = useCallback(
    async (items: Array<{ name: string; email: string }>, classIds: string[]) => {
      for (const item of items) {
        const tempId = crypto.randomUUID();
        await supabase.from("profiles").insert({
          id: tempId,
          email: item.email,
          name: item.name,
          role: "student",
          status: "active",
          display_name: item.name,
          username: item.email.split("@")[0],
          avatar_url: "",
          cover_url: "",
          bio: "",
          link: "",
          location: "",
          followers: [],
          following: [],
        });
        for (const classId of classIds) {
          const { error: enrollError } = await supabase.from("enrollments").insert({
            student_id: tempId,
            class_id: classId,
            type: "individual",
            status: "active",
          });
          if (enrollError) console.error("[enrollments] insert:", enrollError.message);
        }
      }
      invalidate();
      return items.length;
    },
    [invalidate]
  );

  const updateStudent = useCallback(
    async (
      studentId: string,
      patch: Partial<Pick<Student, "name" | "email" | "role" | "status">>
    ) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.email !== undefined && { email: patch.email }),
          ...(patch.role !== undefined && { role: patch.role }),
          ...(patch.status !== undefined && { status: patch.status }),
        })
        .eq("id", studentId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const deleteStudent = useCallback(
    async (studentId: string) => {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", studentId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const addEnrollment = useCallback(
    async (data: Omit<Enrollment, "id" | "enrolledAt">) => {
      const { error } = await supabase.from("enrollments").insert({
        student_id: data.studentId,
        class_id: data.classId,
        type: data.type,
        expires_at: data.expiresAt,
        status: data.status,
      });
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const updateEnrollment = useCallback(
    async (
      enrollmentId: string,
      patch: Partial<Pick<Enrollment, "type" | "expiresAt" | "status">>
    ) => {
      const { error } = await supabase
        .from("enrollments")
        .update({
          ...(patch.type !== undefined && { type: patch.type }),
          ...(patch.expiresAt !== undefined && { expires_at: patch.expiresAt }),
          ...(patch.status !== undefined && { status: patch.status }),
        })
        .eq("id", enrollmentId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const revokeEnrollment = useCallback(
    async (enrollmentId: string) => {
      const { error } = await supabase
        .from("enrollments")
        .update({ status: "cancelled" })
        .eq("id", enrollmentId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  return {
    students,
    enrollments,
    loading: isLoading,
    findStudent,
    getStudentEnrollments,
    createStudent,
    createStudentsBulk,
    updateStudent,
    deleteStudent,
    addEnrollment,
    updateEnrollment,
    revokeEnrollment,
  };
}
