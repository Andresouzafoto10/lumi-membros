import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { deleteFromR2 } from "@/lib/r2Upload";
import type {
  Course,
  CourseBanner,
  CourseLesson,
  CourseModule,
  CourseSession,
  CourseAccess,
  CourseVideoType,
} from "@/types/course";

// ---------------------------------------------------------------------------
// Query key
// ---------------------------------------------------------------------------
const QK_COURSES = ["courses"] as const;
const QK_BANNERS = ["banners"] as const;

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

async function fetchCourseTree(): Promise<CourseSession[]> {
  const [sessionsRes, coursesRes, modulesRes, lessonsRes] = await Promise.all([
    supabase
      .from("course_sessions")
      .select("*")
      .order("order"),
    supabase
      .from("courses")
      .select("*")
      .order("order"),
    supabase
      .from("course_modules")
      .select("*")
      .order("order"),
    supabase
      .from("course_lessons")
      .select("*")
      .order("order"),
  ]);

  if (sessionsRes.error) throw sessionsRes.error;
  if (coursesRes.error) throw coursesRes.error;
  if (modulesRes.error) throw modulesRes.error;
  if (lessonsRes.error) throw lessonsRes.error;

  const lessons: CourseLesson[] = (lessonsRes.data ?? []).map((l) => ({
    id: l.id,
    title: l.title,
    order: l.order,
    isActive: l.is_active,
    videoType: l.video_type as CourseVideoType,
    videoUrl: l.video_url,
    description: l.description,
    materials: (l.materials as CourseLesson["materials"]) ?? [],
    quiz: (l.quiz as CourseLesson["quiz"]) ?? undefined,
    quizPassingScore: l.quiz_passing_score ?? undefined,
    quizRequiredToAdvance: l.quiz_required_to_advance,
    ratingsEnabled: l.ratings_enabled ?? true,
    commentsEnabled: l.comments_enabled ?? true,
  }));

  const modules: CourseModule[] = (modulesRes.data ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    order: m.order,
    isActive: m.is_active,
    lessons: lessons
      .filter((l) => {
        // Need to know module_id per lesson — stored in the raw row
        return (lessonsRes.data ?? []).find(
          (r) => r.id === l.id && r.module_id === m.id
        );
      })
      .sort((a, b) => a.order - b.order),
  }));

  const courses: Course[] = (coursesRes.data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    bannerUrl: c.banner_url,
    order: c.order,
    isActive: c.is_active,
    access: c.access as CourseAccess,
    commentsEnabled: c.comments_enabled ?? true,
    launchAt: (c.launch_at as string | null) ?? null,
    launchStatus: (c.launch_status as Course["launchStatus"]) ?? "released",
    certificateConfig: c.certificate_config
      ? (c.certificate_config as Course["certificateConfig"])
      : undefined,
    modules: modules
      .filter((m) => {
        return (modulesRes.data ?? []).find(
          (r) => r.id === m.id && r.course_id === c.id
        );
      })
      .sort((a, b) => a.order - b.order),
  }));

  return (sessionsRes.data ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description ?? undefined,
    isActive: s.is_active,
    order: s.order,
    courses: courses
      .filter((c) => {
        return (coursesRes.data ?? []).find(
          (r) => r.id === c.id && r.session_id === s.id
        );
      })
      .sort((a, b) => a.order - b.order),
  }));
}

async function fetchBanners(): Promise<CourseBanner[]> {
  const { data, error } = await supabase
    .from("course_banners")
    .select("*")
    .order("display_order");
  if (error) throw error;
  return (data ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    buttonLabel: b.button_label,
    targetType: b.target_type as CourseBanner["targetType"],
    targetCourseId: b.target_course_id,
    targetUrl: b.target_url,
    imageUrl: b.image_url,
    isActive: b.is_active,
    displayOrder: b.display_order,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  }));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCourses() {
  const queryClient = useQueryClient();

  const coursesQuery = useQuery({
    queryKey: QK_COURSES,
    queryFn: fetchCourseTree,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const bannersQuery = useQuery({
    queryKey: QK_BANNERS,
    queryFn: fetchBanners,
    staleTime: 1000 * 60 * 5,
  });

  const sessions = useMemo(
    () => coursesQuery.data ?? [],
    [coursesQuery.data]
  );

  const allCourses = useMemo(
    () => sessions.flatMap((s) => s.courses),
    [sessions]
  );

  const banners = useMemo(
    () => bannersQuery.data ?? [],
    [bannersQuery.data]
  );

  const activeBanners = useMemo(
    () => banners.filter((b) => b.isActive),
    [banners]
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK_COURSES });
  }, [queryClient]);

  const invalidateBanners = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK_BANNERS });
  }, [queryClient]);

  // ---- Selectors ----

  const findCourse = useCallback(
    (courseId: string | undefined) =>
      courseId ? allCourses.find((c) => c.id === courseId) ?? null : null,
    [allCourses]
  );

  const findModule = useCallback(
    (courseId: string | undefined, moduleId: string | undefined) => {
      if (!courseId || !moduleId) return null;
      return (
        findCourse(courseId)?.modules.find((m) => m.id === moduleId) ?? null
      );
    },
    [findCourse]
  );

  const findSession = useCallback(
    (sessionId: string | undefined) =>
      sessionId ? sessions.find((s) => s.id === sessionId) ?? null : null,
    [sessions]
  );

  const findSessionForCourse = useCallback(
    (courseId: string | undefined) => {
      if (!courseId) return null;
      return (
        sessions.find((s) => s.courses.some((c) => c.id === courseId)) ?? null
      );
    },
    [sessions]
  );

  // ---- Session mutations ----

  const createSession = useCallback(
    async (data: { title: string; description?: string; isActive: boolean }) => {
      const maxOrder = sessions.reduce((m, s) => Math.max(m, s.order), 0);
      const { error } = await supabase.from("course_sessions").insert({
        title: data.title,
        description: data.description ?? null,
        is_active: data.isActive,
        order: maxOrder + 1,
      });
      if (error) throw error;
      invalidate();
    },
    [sessions, invalidate]
  );

  const updateSession = useCallback(
    async (
      sessionId: string,
      patch: Partial<Pick<CourseSession, "title" | "description" | "isActive">>
    ) => {
      const { error } = await supabase
        .from("course_sessions")
        .update({
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.description !== undefined && { description: patch.description }),
          ...(patch.isActive !== undefined && { is_active: patch.isActive }),
        })
        .eq("id", sessionId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      const { error } = await supabase
        .from("course_sessions")
        .delete()
        .eq("id", sessionId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const moveSession = useCallback(
    async (sessionId: string, direction: "up" | "down") => {
      const sorted = [...sessions].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((s) => s.id === sessionId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const a = sorted[idx];
      const b = sorted[swapIdx];
      await Promise.all([
        supabase.from("course_sessions").update({ order: b.order }).eq("id", a.id),
        supabase.from("course_sessions").update({ order: a.order }).eq("id", b.id),
      ]);
      invalidate();
    },
    [sessions, invalidate]
  );

  // ---- Course mutations ----

  const createCourse = useCallback(
    async (
      sessionId: string,
      data: {
        title: string;
        description: string;
        isActive: boolean;
        access: CourseAccess;
      }
    ) => {
      const session = findSession(sessionId);
      const maxOrder = (session?.courses ?? []).reduce(
        (m, c) => Math.max(m, c.order),
        0
      );
      const { error } = await supabase.from("courses").insert({
        session_id: sessionId,
        title: data.title,
        description: data.description,
        is_active: data.isActive,
        access: data.access,
        order: maxOrder + 1,
        banner_url:
          "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
      });
      if (error) throw error;
      invalidate();
    },
    [findSession, invalidate]
  );

  const updateCourse = useCallback(
    async (
      courseId: string,
      patch: Partial<
        Pick<
          Course,
          | "title"
          | "description"
          | "isActive"
          | "bannerUrl"
          | "access"
          | "certificateConfig"
          | "commentsEnabled"
          | "launchAt"
          | "launchStatus"
        >
      >
    ) => {
      const { error } = await supabase
        .from("courses")
        .update({
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.description !== undefined && { description: patch.description }),
          ...(patch.isActive !== undefined && { is_active: patch.isActive }),
          ...(patch.bannerUrl !== undefined && { banner_url: patch.bannerUrl }),
          ...(patch.access !== undefined && { access: patch.access }),
          ...(patch.certificateConfig !== undefined && {
            certificate_config: patch.certificateConfig,
          }),
          ...(patch.commentsEnabled !== undefined && {
            comments_enabled: patch.commentsEnabled,
          }),
          ...(patch.launchAt !== undefined && { launch_at: patch.launchAt }),
          ...(patch.launchStatus !== undefined && { launch_status: patch.launchStatus }),
        })
        .eq("id", courseId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const deleteCourse = useCallback(
    async (courseId: string) => {
      // Find course to get banner URL before deleting
      const course = allCourses.find((c) => c.id === courseId);
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);
      if (error) throw error;
      if (course?.bannerUrl) deleteFromR2(course.bannerUrl).catch(() => {});
      invalidate();
    },
    [allCourses, invalidate]
  );

  const moveCourse = useCallback(
    async (courseId: string, direction: "up" | "down") => {
      const session = findSessionForCourse(courseId);
      if (!session) return;
      const sorted = [...session.courses].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((c) => c.id === courseId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      await Promise.all([
        supabase
          .from("courses")
          .update({ order: sorted[swapIdx].order })
          .eq("id", sorted[idx].id),
        supabase
          .from("courses")
          .update({ order: sorted[idx].order })
          .eq("id", sorted[swapIdx].id),
      ]);
      invalidate();
    },
    [findSessionForCourse, invalidate]
  );

  const moveCourseToSession = useCallback(
    async (courseId: string, targetSessionId: string) => {
      const targetSession = findSession(targetSessionId);
      const maxOrder = (targetSession?.courses ?? []).reduce(
        (m, c) => Math.max(m, c.order),
        0
      );
      const { error } = await supabase
        .from("courses")
        .update({ session_id: targetSessionId, order: maxOrder + 1 })
        .eq("id", courseId);
      if (error) throw error;
      invalidate();
    },
    [findSession, invalidate]
  );

  const duplicateCourseToSession = useCallback(
    async (courseId: string, targetSessionId: string) => {
      const sourceCourse = findCourse(courseId);
      if (!sourceCourse) return;
      const targetSession = findSession(targetSessionId);
      const maxOrder = (targetSession?.courses ?? []).reduce(
        (m, c) => Math.max(m, c.order),
        0
      );
      // Insert course
      const { data: newCourse, error: ce } = await supabase
        .from("courses")
        .insert({
          session_id: targetSessionId,
          title: `${sourceCourse.title} (cópia)`,
          description: sourceCourse.description,
          banner_url: sourceCourse.bannerUrl,
          is_active: false,
          access: sourceCourse.access,
          order: maxOrder + 1,
        })
        .select()
        .single();
      if (ce) throw ce;
      // Duplicate modules and lessons
      for (const mod of sourceCourse.modules) {
        const { data: newMod, error: me } = await supabase
          .from("course_modules")
          .insert({
            course_id: newCourse.id,
            title: mod.title,
            order: mod.order,
            is_active: mod.isActive,
          })
          .select()
          .single();
        if (me) throw me;
        for (const lesson of mod.lessons) {
          await supabase.from("course_lessons").insert({
            module_id: newMod.id,
            title: lesson.title,
            order: lesson.order,
            is_active: lesson.isActive,
            video_type: lesson.videoType,
            video_url: lesson.videoUrl,
            description: lesson.description,
            materials: lesson.materials ?? null,
          });
        }
      }
      invalidate();
    },
    [findCourse, findSession, invalidate]
  );

  // ---- Module mutations ----

  const createModule = useCallback(
    async (courseId: string, data: { title: string; isActive: boolean }) => {
      const course = findCourse(courseId);
      const maxOrder = (course?.modules ?? []).reduce(
        (m, mod) => Math.max(m, mod.order),
        0
      );
      const { error } = await supabase.from("course_modules").insert({
        course_id: courseId,
        title: data.title,
        is_active: data.isActive,
        order: maxOrder + 1,
      });
      if (error) throw error;
      invalidate();
    },
    [findCourse, invalidate]
  );

  const updateModule = useCallback(
    async (
      _courseId: string,
      moduleId: string,
      patch: Partial<Pick<CourseModule, "title" | "isActive">>
    ) => {
      const { error } = await supabase
        .from("course_modules")
        .update({
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.isActive !== undefined && { is_active: patch.isActive }),
        })
        .eq("id", moduleId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const deleteModule = useCallback(
    async (_courseId: string, moduleId: string) => {
      const { error } = await supabase
        .from("course_modules")
        .delete()
        .eq("id", moduleId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const moveModule = useCallback(
    async (courseId: string, moduleId: string, direction: "up" | "down") => {
      const course = findCourse(courseId);
      if (!course) return;
      const sorted = [...course.modules].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((m) => m.id === moduleId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      await Promise.all([
        supabase
          .from("course_modules")
          .update({ order: sorted[swapIdx].order })
          .eq("id", sorted[idx].id),
        supabase
          .from("course_modules")
          .update({ order: sorted[idx].order })
          .eq("id", sorted[swapIdx].id),
      ]);
      invalidate();
    },
    [findCourse, invalidate]
  );

  // ---- Lesson mutations ----

  const createLesson = useCallback(
    async (
      courseId: string,
      moduleId: string,
      data: {
        id?: string;
        title: string;
        isActive: boolean;
        videoType: CourseVideoType;
        videoUrl: string | null;
        description: string;
        materials?: CourseLesson["materials"];
        links?: CourseLesson["links"];
        files?: CourseLesson["files"];
        quiz?: CourseLesson["quiz"];
        quizPassingScore?: CourseLesson["quizPassingScore"];
        quizRequiredToAdvance?: CourseLesson["quizRequiredToAdvance"];
        ratingsEnabled?: boolean;
        commentsEnabled?: boolean;
      }
    ) => {
      const mod = findModule(courseId, moduleId);
      const maxOrder = (mod?.lessons ?? []).reduce(
        (m, l) => Math.max(m, l.order),
        0
      );
      const { error } = await supabase.from("course_lessons").insert({
        ...(data.id && { id: data.id }),
        module_id: moduleId,
        title: data.title,
        is_active: data.isActive,
        video_type: data.videoType,
        video_url: data.videoUrl,
        description: data.description,
        materials: data.materials ?? null,
        quiz: data.quiz ?? null,
        quiz_passing_score: data.quizPassingScore ?? null,
        quiz_required_to_advance: data.quizRequiredToAdvance ?? false,
        ratings_enabled: data.ratingsEnabled ?? true,
        comments_enabled: data.commentsEnabled ?? true,
        order: maxOrder + 1,
      });
      if (error) throw error;
      invalidate();
    },
    [findModule, invalidate]
  );

  const updateLesson = useCallback(
    async (
      _courseId: string,
      _moduleId: string,
      lessonId: string,
      patch: Partial<Omit<CourseLesson, "id" | "order">>
    ) => {
      const { error } = await supabase
        .from("course_lessons")
        .update({
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.isActive !== undefined && { is_active: patch.isActive }),
          ...(patch.videoType !== undefined && { video_type: patch.videoType }),
          ...(patch.videoUrl !== undefined && { video_url: patch.videoUrl }),
          ...(patch.description !== undefined && { description: patch.description }),
          ...(patch.materials !== undefined && { materials: patch.materials }),
          ...(patch.quiz !== undefined && { quiz: patch.quiz }),
          ...(patch.quizPassingScore !== undefined && {
            quiz_passing_score: patch.quizPassingScore,
          }),
          ...(patch.quizRequiredToAdvance !== undefined && {
            quiz_required_to_advance: patch.quizRequiredToAdvance,
          }),
          ...(patch.ratingsEnabled !== undefined && {
            ratings_enabled: patch.ratingsEnabled,
          }),
          ...(patch.commentsEnabled !== undefined && {
            comments_enabled: patch.commentsEnabled,
          }),
        })
        .eq("id", lessonId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const deleteLesson = useCallback(
    async (_courseId: string, _moduleId: string, lessonId: string) => {
      const { error } = await supabase
        .from("course_lessons")
        .delete()
        .eq("id", lessonId);
      if (error) throw error;
      invalidate();
    },
    [invalidate]
  );

  const moveLesson = useCallback(
    async (
      courseId: string,
      moduleId: string,
      lessonId: string,
      direction: "up" | "down"
    ) => {
      const mod = findModule(courseId, moduleId);
      if (!mod) return;
      const sorted = [...mod.lessons].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((l) => l.id === lessonId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      await Promise.all([
        supabase
          .from("course_lessons")
          .update({ order: sorted[swapIdx].order })
          .eq("id", sorted[idx].id),
        supabase
          .from("course_lessons")
          .update({ order: sorted[idx].order })
          .eq("id", sorted[swapIdx].id),
      ]);
      invalidate();
    },
    [findModule, invalidate]
  );

  // ---- Banner mutations ----

  const createBanner = useCallback(
    async (data: Omit<CourseBanner, "id" | "displayOrder" | "createdAt" | "updatedAt">) => {
      const maxOrder = banners.reduce((m, b) => Math.max(m, b.displayOrder), 0);
      const { error } = await supabase.from("course_banners").insert({
        title: data.title,
        subtitle: data.subtitle,
        button_label: data.buttonLabel,
        target_type: data.targetType,
        target_course_id: data.targetCourseId,
        target_url: data.targetUrl,
        image_url: data.imageUrl,
        is_active: data.isActive,
        display_order: maxOrder + 1,
      });
      if (error) throw error;
      invalidateBanners();
    },
    [banners, invalidateBanners]
  );

  const updateBanner = useCallback(
    async (
      bannerId: string,
      patch: Partial<Omit<CourseBanner, "id" | "createdAt" | "updatedAt">>
    ) => {
      const { error } = await supabase
        .from("course_banners")
        .update({
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.subtitle !== undefined && { subtitle: patch.subtitle }),
          ...(patch.buttonLabel !== undefined && { button_label: patch.buttonLabel }),
          ...(patch.targetType !== undefined && { target_type: patch.targetType }),
          ...(patch.targetCourseId !== undefined && {
            target_course_id: patch.targetCourseId,
          }),
          ...(patch.targetUrl !== undefined && { target_url: patch.targetUrl }),
          ...(patch.imageUrl !== undefined && { image_url: patch.imageUrl }),
          ...(patch.isActive !== undefined && { is_active: patch.isActive }),
          ...(patch.displayOrder !== undefined && {
            display_order: patch.displayOrder,
          }),
        })
        .eq("id", bannerId);
      if (error) throw error;
      invalidateBanners();
    },
    [invalidateBanners]
  );

  const deleteBanner = useCallback(
    async (bannerId: string) => {
      // Find banner to get image URL before deleting
      const banner = banners.find((b) => b.id === bannerId);
      const { error } = await supabase
        .from("course_banners")
        .delete()
        .eq("id", bannerId);
      if (error) throw error;
      // Clean up R2 file
      if (banner?.imageUrl) deleteFromR2(banner.imageUrl).catch(() => {});
      invalidateBanners();
    },
    [banners, invalidateBanners]
  );

  const moveBanner = useCallback(
    async (bannerId: string, direction: "up" | "down") => {
      const sorted = [...banners].sort((a, b) => a.displayOrder - b.displayOrder);
      const idx = sorted.findIndex((b) => b.id === bannerId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      await Promise.all([
        supabase
          .from("course_banners")
          .update({ display_order: sorted[swapIdx].displayOrder })
          .eq("id", sorted[idx].id),
        supabase
          .from("course_banners")
          .update({ display_order: sorted[idx].displayOrder })
          .eq("id", sorted[swapIdx].id),
      ]);
      invalidateBanners();
    },
    [banners, invalidateBanners]
  );

  // No-op — kept for interface compatibility
  const resetToMockData = useCallback(() => {
    invalidate();
    invalidateBanners();
  }, [invalidate, invalidateBanners]);

  return {
    // state
    sessions,
    allCourses,
    banners,
    activeBanners,
    loading: coursesQuery.isLoading || bannersQuery.isLoading,
    error: coursesQuery.error ?? bannersQuery.error,
    // selectors
    findCourse,
    findModule,
    findSession,
    findSessionForCourse,
    // session actions
    createSession,
    updateSession,
    deleteSession,
    moveSession,
    // course actions
    createCourse,
    updateCourse,
    deleteCourse,
    moveCourse,
    moveCourseToSession,
    duplicateCourseToSession,
    // module actions
    createModule,
    updateModule,
    deleteModule,
    moveModule,
    // lesson actions
    createLesson,
    updateLesson,
    deleteLesson,
    moveLesson,
    // banner actions
    createBanner,
    updateBanner,
    deleteBanner,
    moveBanner,
    // misc
    resetToMockData,
  };
}
