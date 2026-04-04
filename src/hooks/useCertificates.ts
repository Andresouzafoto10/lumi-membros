import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import type {
  CertificateTemplate,
  CertificateBlock,
  EarnedCertificate,
} from "@/types/student";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const QK_TEMPLATES = ["certificate-templates"] as const;
const QK_EARNED = ["earned-certificates"] as const;

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapTemplate(r: Record<string, unknown>): CertificateTemplate {
  return {
    id: r.id as string,
    name: r.name as string,
    backgroundUrl: (r.background_url as string) ?? "",
    blocks: (r.blocks as CertificateBlock[]) ?? [],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function mapEarned(r: Record<string, unknown>): EarnedCertificate {
  return {
    id: r.id as string,
    studentId: r.student_id as string,
    courseId: r.course_id as string,
    templateId: r.template_id as string,
    earnedAt: r.earned_at as string,
    downloadedAt: (r.downloaded_at as string | null) ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchTemplates(): Promise<CertificateTemplate[]> {
  const { data, error } = await supabase
    .from("certificate_templates")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map(mapTemplate);
}

async function fetchEarned(): Promise<EarnedCertificate[]> {
  const { data, error } = await supabase
    .from("earned_certificates")
    .select("*")
    .order("earned_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapEarned);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCertificates() {
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: QK_TEMPLATES,
    queryFn: fetchTemplates,
    staleTime: 1000 * 60 * 10,
  });

  const { data: earned = [] } = useQuery({
    queryKey: QK_EARNED,
    queryFn: fetchEarned,
    staleTime: 1000 * 60 * 5,
  });

  const invalidateTemplates = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK_TEMPLATES });
  }, [queryClient]);

  const invalidateEarned = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK_EARNED });
  }, [queryClient]);

  // ---- Template CRUD (admin) ----

  const createTemplate = useCallback(
    async (
      data: Omit<CertificateTemplate, "id" | "createdAt" | "updatedAt">
    ): Promise<string> => {
      const { data: row, error } = await supabase
        .from("certificate_templates")
        .insert({
          name: data.name,
          background_url: data.backgroundUrl,
          blocks: data.blocks,
        })
        .select()
        .single();
      if (error) throw error;
      invalidateTemplates();
      return row.id as string;
    },
    [invalidateTemplates]
  );

  const updateTemplate = useCallback(
    async (id: string, data: Partial<CertificateTemplate>) => {
      const { error } = await supabase
        .from("certificate_templates")
        .update({
          ...(data.name !== undefined && { name: data.name }),
          ...(data.backgroundUrl !== undefined && {
            background_url: data.backgroundUrl,
          }),
          ...(data.blocks !== undefined && { blocks: data.blocks }),
        })
        .eq("id", id);
      if (error) throw error;
      invalidateTemplates();
    },
    [invalidateTemplates]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("certificate_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
      invalidateTemplates();
    },
    [invalidateTemplates]
  );

  const getTemplates = useCallback(() => templates, [templates]);

  const getTemplateById = useCallback(
    (id: string): CertificateTemplate | null =>
      templates.find((t) => t.id === id) ?? null,
    [templates]
  );

  // ---- Earned certificates ----

  const getEarnedCertificates = useCallback(
    (studentId: string): EarnedCertificate[] =>
      earned.filter((e) => e.studentId === studentId),
    [earned]
  );

  const hasEarnedCertificate = useCallback(
    (studentId: string, courseId: string): boolean =>
      earned.some(
        (e) => e.studentId === studentId && e.courseId === courseId
      ),
    [earned]
  );

  const getEarnedCertificate = useCallback(
    (studentId: string, courseId: string): EarnedCertificate | null =>
      earned.find(
        (e) => e.studentId === studentId && e.courseId === courseId
      ) ?? null,
    [earned]
  );

  const markDownloaded = useCallback(
    async (certificateId: string) => {
      const { error } = await supabase
        .from("earned_certificates")
        .update({ downloaded_at: new Date().toISOString() })
        .eq("id", certificateId);
      if (error) throw error;
      invalidateEarned();
    },
    [invalidateEarned]
  );

  const checkAndAwardCertificate = useCallback(
    async (
      studentId: string,
      courseId: string,
      course: {
        certificateConfig?: {
          templateId: string | null;
          completionThreshold: number;
          requirementType?: string;
          quizThreshold?: number;
        };
        modules: {
          isActive: boolean;
          lessons: { id: string; isActive: boolean; quiz?: unknown[] }[];
        }[];
      },
      completedLessons: Record<string, boolean>,
      quizScoreGetter?: (lessonIds: string[]) => number
    ): Promise<boolean> => {
      if (!course.certificateConfig?.templateId) return false;

      if (
        earned.some(
          (e) => e.studentId === studentId && e.courseId === courseId
        )
      )
        return false;

      const allLessons = course.modules
        .filter((m) => m.isActive)
        .flatMap((m) => m.lessons.filter((l) => l.isActive));

      const allLessonIds = allLessons.map((l) => l.id);
      if (allLessonIds.length === 0) return false;

      const reqType = course.certificateConfig.requirementType ?? "completion";

      let completionMet = true;
      if (reqType === "completion" || reqType === "completion_and_quiz") {
        const completedCount = allLessonIds.filter(
          (id) => completedLessons[id]
        ).length;
        const pct = (completedCount / allLessonIds.length) * 100;
        completionMet = pct >= course.certificateConfig.completionThreshold;
      }

      let quizMet = true;
      if (reqType === "quiz" || reqType === "completion_and_quiz") {
        const quizLessonIds = allLessons
          .filter((l) => l.quiz && l.quiz.length > 0)
          .map((l) => l.id);
        if (quizLessonIds.length === 0) {
          quizMet = true;
        } else if (quizScoreGetter) {
          const avgScore = quizScoreGetter(quizLessonIds);
          quizMet = avgScore >= (course.certificateConfig.quizThreshold ?? 70);
        } else {
          quizMet = false;
        }
      }

      if (reqType === "completion" && !completionMet) return false;
      if (reqType === "quiz" && !quizMet) return false;
      if (reqType === "completion_and_quiz" && (!completionMet || !quizMet))
        return false;

      const { error } = await supabase.from("earned_certificates").insert({
        student_id: studentId,
        course_id: courseId,
        template_id: course.certificateConfig.templateId,
      });
      if (error) throw error;
      invalidateEarned();
      return true;
    },
    [earned, invalidateEarned]
  );

  const generateCertificateData = useCallback(
    (
      studentName: string,
      courseName: string,
      courseHours: number,
      platformName: string,
      templateId: string,
      earnedAt: string
    ): {
      studentName: string;
      courseName: string;
      completionDate: string;
      courseHours: number;
      platformName: string;
      template: CertificateTemplate;
    } | null => {
      const template = templates.find((t) => t.id === templateId);
      if (!template) return null;

      const completionDate = format(
        new Date(earnedAt),
        "dd 'de' MMMM 'de' yyyy",
        { locale: ptBR }
      );

      return {
        studentName,
        courseName,
        completionDate,
        courseHours,
        platformName,
        template,
      };
    },
    [templates]
  );

  return {
    templates,
    earned,
    // Template CRUD
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplates,
    getTemplateById,
    // Earned
    getEarnedCertificates,
    hasEarnedCertificate,
    getEarnedCertificate,
    markDownloaded,
    checkAndAwardCertificate,
    generateCertificateData,
  };
}
