import { useCallback, useMemo, useSyncExternalStore } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CertificateTemplate, EarnedCertificate } from "@/types/student";
import {
  mockCertificateTemplates,
  mockEarnedCertificates,
} from "@/data/mock-certificates";

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

const TEMPLATES_KEY = "lumi-membros:certificate-templates";
const EARNED_KEY = "lumi-membros:earned-certificates";

type CertificatesState = {
  templates: CertificateTemplate[];
  earned: EarnedCertificate[];
};

let state: CertificatesState = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): CertificatesState {
  try {
    const rawTemplates = localStorage.getItem(TEMPLATES_KEY);
    const rawEarned = localStorage.getItem(EARNED_KEY);
    const templates = rawTemplates
      ? (JSON.parse(rawTemplates) as CertificateTemplate[])
      : null;
    const earned = rawEarned
      ? (JSON.parse(rawEarned) as EarnedCertificate[])
      : null;
    if (templates && earned) return { templates, earned };
  } catch {
    // ignore
  }
  return {
    templates: [...mockCertificateTemplates],
    earned: [...mockEarnedCertificates],
  };
}

function persist() {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(state.templates));
    localStorage.setItem(EARNED_KEY, JSON.stringify(state.earned));
  } catch {
    // ignore
  }
}

function setState(next: CertificatesState) {
  state = next;
  persist();
  listeners.forEach((fn) => fn());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function uuid(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCertificates() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const templates = useMemo(() => store.templates, [store.templates]);
  const earned = useMemo(() => store.earned, [store.earned]);

  // ---- Template CRUD (admin) ----

  const createTemplate = useCallback(
    (
      data: Omit<CertificateTemplate, "id" | "createdAt" | "updatedAt">
    ): string => {
      const now = new Date().toISOString();
      const id = uuid();
      const template: CertificateTemplate = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      };
      setState({
        ...state,
        templates: [...state.templates, template],
      });
      return id;
    },
    []
  );

  const updateTemplate = useCallback(
    (id: string, data: Partial<CertificateTemplate>) => {
      setState({
        ...state,
        templates: state.templates.map((t) =>
          t.id === id
            ? { ...t, ...data, updatedAt: new Date().toISOString() }
            : t
        ),
      });
    },
    []
  );

  const deleteTemplate = useCallback((id: string) => {
    setState({
      ...state,
      templates: state.templates.filter((t) => t.id !== id),
    });
  }, []);

  const getTemplates = useCallback(() => store.templates, [store.templates]);

  const getTemplateById = useCallback(
    (id: string): CertificateTemplate | null =>
      store.templates.find((t) => t.id === id) ?? null,
    [store.templates]
  );

  // ---- Earned certificates ----

  const getEarnedCertificates = useCallback(
    (studentId: string): EarnedCertificate[] =>
      store.earned.filter((e) => e.studentId === studentId),
    [store.earned]
  );

  const hasEarnedCertificate = useCallback(
    (studentId: string, courseId: string): boolean =>
      store.earned.some(
        (e) => e.studentId === studentId && e.courseId === courseId
      ),
    [store.earned]
  );

  const getEarnedCertificate = useCallback(
    (studentId: string, courseId: string): EarnedCertificate | null =>
      store.earned.find(
        (e) => e.studentId === studentId && e.courseId === courseId
      ) ?? null,
    [store.earned]
  );

  const markDownloaded = useCallback((certificateId: string) => {
    setState({
      ...state,
      earned: state.earned.map((e) =>
        e.id === certificateId
          ? { ...e, downloadedAt: new Date().toISOString() }
          : e
      ),
    });
  }, []);

  /**
   * Check if a student qualifies for a certificate and award it if so.
   * Returns true if a new certificate was awarded.
   *
   * Requires course data and progress to be passed in (avoids circular hook deps).
   */
  const checkAndAwardCertificate = useCallback(
    (
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
    ): boolean => {
      if (!course.certificateConfig?.templateId) return false;

      if (
        state.earned.some(
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

      // Check completion
      let completionMet = true;
      if (reqType === "completion" || reqType === "completion_and_quiz") {
        const completedCount = allLessonIds.filter(
          (id) => completedLessons[id]
        ).length;
        const pct = (completedCount / allLessonIds.length) * 100;
        completionMet = pct >= course.certificateConfig.completionThreshold;
      }

      // Check quiz
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
      if (reqType === "completion_and_quiz" && (!completionMet || !quizMet)) return false;

      const cert: EarnedCertificate = {
        id: uuid(),
        studentId,
        courseId,
        templateId: course.certificateConfig.templateId,
        earnedAt: new Date().toISOString(),
      };
      setState({
        ...state,
        earned: [...state.earned, cert],
      });
      return true;
    },
    []
  );

  /**
   * Generate certificate display data for rendering.
   */
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
      const template = store.templates.find((t) => t.id === templateId);
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
    [store.templates]
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
