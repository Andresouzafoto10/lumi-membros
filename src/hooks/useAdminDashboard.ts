import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DashboardMetrics = {
  totalStudents: number;
  activeStudents: number;
  totalEnrollments: number;
  activeEnrollments: number;
  activeCourses: number;
  activeClasses: number;
  totalCertificates: number;
  totalPosts: number;
  postsThisWeek: number;
  badgesAwarded: number;
  recentStudents: { id: string; name: string; email: string; createdAt: string }[];
  recentEnrollments: { id: string; studentName: string; className: string; enrolledAt: string }[];
};

const QK = ["admin-dashboard"] as const;

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    studentsRes,
    enrollmentsRes,
    coursesRes,
    classesRes,
    certsRes,
    postsRes,
    postsWeekRes,
    gamRes,
    recentStudentsRes,
    recentEnrollmentsRes,
  ] = await Promise.all([
    // Total + active students
    supabase
      .from("profiles")
      .select("id, status", { count: "exact" })
      .eq("role", "student"),
    // Total + active enrollments
    supabase
      .from("enrollments")
      .select("id, status", { count: "exact" }),
    // Active courses
    supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    // Active classes
    supabase
      .from("classes")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    // Total certificates
    supabase
      .from("earned_certificates")
      .select("*", { count: "exact", head: true }),
    // Total published posts
    supabase
      .from("community_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    // Posts this week
    supabase
      .from("community_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .gte("created_at", weekAgo),
    // Total missions completed
    supabase.from("student_missions").select("*", { count: "exact", head: true }).eq("completed", true),
    // Recent students (last 5)
    supabase
      .from("profiles")
      .select("id, name, email, created_at")
      .eq("role", "student")
      .order("created_at", { ascending: false })
      .limit(5),
    // Recent enrollments (last 5)
    supabase
      .from("enrollments")
      .select("id, student_id, class_id, enrolled_at")
      .order("enrolled_at", { ascending: false })
      .limit(5),
  ]);

  const students = studentsRes.data ?? [];
  const activeStudents = students.filter((s) => s.status === "active").length;

  const enrollments = enrollmentsRes.data ?? [];
  const activeEnrollments = enrollments.filter((e) => e.status === "active").length;

  const totalMissionsCompleted = gamRes.count ?? 0;

  // Map recent enrollments to include names
  const recentEnrollments: DashboardMetrics["recentEnrollments"] = [];
  for (const e of recentEnrollmentsRes.data ?? []) {
    const { data: sp } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", e.student_id)
      .single();
    const { data: cl } = await supabase
      .from("classes")
      .select("name")
      .eq("id", e.class_id)
      .single();
    recentEnrollments.push({
      id: e.id as string,
      studentName: (sp?.name as string) ?? "—",
      className: (cl?.name as string) ?? "—",
      enrolledAt: e.enrolled_at as string,
    });
  }

  return {
    totalStudents: studentsRes.count ?? students.length,
    activeStudents,
    totalEnrollments: enrollmentsRes.count ?? enrollments.length,
    activeEnrollments,
    activeCourses: coursesRes.count ?? 0,
    activeClasses: classesRes.count ?? 0,
    totalCertificates: certsRes.count ?? 0,
    totalPosts: postsRes.count ?? 0,
    postsThisWeek: postsWeekRes.count ?? 0,
    badgesAwarded: totalMissionsCompleted,
    recentStudents: (recentStudentsRes.data ?? []).map((s) => ({
      id: s.id as string,
      name: s.name as string,
      email: s.email as string,
      createdAt: s.created_at as string,
    })),
    recentEnrollments,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchDashboardMetrics,
    staleTime: 1000 * 60 * 2,
  });

  const metrics = useMemo(
    () =>
      data ?? {
        totalStudents: 0,
        activeStudents: 0,
        totalEnrollments: 0,
        activeEnrollments: 0,
        activeCourses: 0,
        activeClasses: 0,
        totalCertificates: 0,
        totalPosts: 0,
        postsThisWeek: 0,
        badgesAwarded: 0,
        recentStudents: [],
        recentEnrollments: [],
      },
    [data]
  );

  return { metrics, loading: isLoading };
}
