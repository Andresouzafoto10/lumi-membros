import type {
  Enrollment,
  Class,
  ContentScheduleRule,
} from "@/types/student";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LessonAccessStatus =
  | { allowed: true }
  | { allowed: false; reason: LessonBlockReason; detail?: string };

export type LessonBlockReason =
  | "not_enrolled"
  | "enrollment_expired"
  | "blocked"
  | "hidden"
  | "scheduled_date"
  | "days_after_enrollment"
  | "course_complete"
  | "module_complete"
  | "lesson_complete";

export type ModuleAccessInfo = {
  moduleId: string;
  visible: boolean; // false only if ALL lessons are "hidden"
  lessons: Record<string, LessonAccessStatus>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the active enrollment(s) that grant the student access to a given
 * course via the Class → courseIds mapping.
 */
export function getEnrollmentsForCourse(
  studentId: string,
  courseId: string,
  enrollments: Enrollment[],
  classes: Class[]
): Enrollment[] {
  // Find classes that include this course
  const classIdsForCourse = new Set(
    classes.filter((c) => c.courseIds.includes(courseId)).map((c) => c.id)
  );

  return enrollments.filter(
    (e) =>
      e.studentId === studentId &&
      classIdsForCourse.has(e.classId)
  );
}

/**
 * Is the enrollment currently valid (active + not expired)?
 */
export function isEnrollmentValid(enrollment: Enrollment): boolean {
  if (enrollment.status !== "active") return false;
  if (enrollment.expiresAt && new Date(enrollment.expiresAt) < new Date()) {
    return false;
  }
  return true;
}

/**
 * Does the student have at least one valid enrollment for this course?
 */
export function isStudentEnrolled(
  studentId: string,
  courseId: string,
  enrollments: Enrollment[],
  classes: Class[]
): boolean {
  const relevant = getEnrollmentsForCourse(
    studentId,
    courseId,
    enrollments,
    classes
  );
  return relevant.some(isEnrollmentValid);
}

// ---------------------------------------------------------------------------
// Rule Evaluation
// ---------------------------------------------------------------------------

/**
 * Find the schedule rule that applies to a specific target (module or lesson)
 * within the classes the student is enrolled in for this course.
 */
function findApplicableRule(
  targetId: string,
  targetType: "module" | "lesson",
  studentId: string,
  courseId: string,
  enrollments: Enrollment[],
  classes: Class[]
): { rule: ContentScheduleRule; enrollment: Enrollment } | null {
  const relevant = getEnrollmentsForCourse(
    studentId,
    courseId,
    enrollments,
    classes
  );

  for (const enrollment of relevant) {
    if (!isEnrollmentValid(enrollment)) continue;
    const cls = classes.find((c) => c.id === enrollment.classId);
    if (!cls) continue;

    const rule = cls.contentSchedule.find(
      (r) => r.targetId === targetId && r.targetType === targetType
    );
    if (rule) return { rule, enrollment };
  }

  return null;
}

/**
 * Evaluate a single content schedule rule.
 *
 * @param completedLessons  Record<lessonId, true> for the current user+course
 * @param allLessonIds      All lesson IDs in the course (for course_complete)
 * @param moduleLessonMap   Map<moduleId, lessonId[]> for module_complete check
 */
export function evaluateRule(
  rule: ContentScheduleRule,
  enrollment: Enrollment,
  completedLessons: Record<string, boolean>,
  allLessonIds: string[],
  moduleLessonMap: Record<string, string[]>
): LessonAccessStatus {
  switch (rule.rule) {
    case "free":
      return { allowed: true };

    case "blocked":
      return { allowed: false, reason: "blocked" };

    case "hidden":
      return { allowed: false, reason: "hidden" };

    case "scheduled_date": {
      if (!rule.releaseDate) return { allowed: true };
      const release = new Date(rule.releaseDate);
      if (new Date() < release) {
        return {
          allowed: false,
          reason: "scheduled_date",
          detail: rule.releaseDate,
        };
      }
      // Also check closeDate if set
      if (rule.closeDate && new Date() > new Date(rule.closeDate)) {
        return {
          allowed: false,
          reason: "scheduled_date",
          detail: `Encerrado em ${rule.closeDate}`,
        };
      }
      return { allowed: true };
    }

    case "days_after_enrollment": {
      if (rule.daysAfter == null) return { allowed: true };
      const enrolledAt = new Date(enrollment.enrolledAt);
      const unlockDate = new Date(enrolledAt);
      unlockDate.setDate(unlockDate.getDate() + rule.daysAfter);
      if (new Date() < unlockDate) {
        return {
          allowed: false,
          reason: "days_after_enrollment",
          detail: unlockDate.toISOString(),
        };
      }
      return { allowed: true };
    }

    case "course_complete": {
      if (!rule.referenceId) return { allowed: true };
      // Check if all lessons in the referenced course are completed.
      // For simplicity, we check against a separate progress key.
      // The caller must supply completions for the *reference* course if
      // it differs from the current one.  In most cases, referenceId
      // refers to the current course, so we use `allLessonIds`.
      const allDone = allLessonIds.every((id) => completedLessons[id]);
      if (!allDone) {
        return { allowed: false, reason: "course_complete" };
      }
      return { allowed: true };
    }

    case "module_complete": {
      if (!rule.referenceId) return { allowed: true };
      const lessonsInModule = moduleLessonMap[rule.referenceId] ?? [];
      const allDone = lessonsInModule.length > 0 && lessonsInModule.every((id) => completedLessons[id]);
      if (!allDone) {
        return { allowed: false, reason: "module_complete" };
      }
      return { allowed: true };
    }

    case "lesson_complete": {
      if (!rule.referenceId) return { allowed: true };
      if (!completedLessons[rule.referenceId]) {
        return { allowed: false, reason: "lesson_complete" };
      }
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}

// ---------------------------------------------------------------------------
// High-Level API
// ---------------------------------------------------------------------------

/**
 * Check if a student can access a specific lesson within a course.
 */
export function canAccessLesson(
  studentId: string,
  courseId: string,
  lessonId: string,
  enrollments: Enrollment[],
  classes: Class[],
  completedLessons: Record<string, boolean>,
  allLessonIds: string[],
  moduleLessonMap: Record<string, string[]>
): LessonAccessStatus {
  // 1. Check enrollment
  const relevantEnrollments = getEnrollmentsForCourse(
    studentId,
    courseId,
    enrollments,
    classes
  );

  const validEnrollment = relevantEnrollments.find(isEnrollmentValid);

  if (relevantEnrollments.length === 0) {
    return { allowed: false, reason: "not_enrolled" };
  }
  if (!validEnrollment) {
    return { allowed: false, reason: "enrollment_expired" };
  }

  // 2. Check lesson-level rules
  const lessonResult = findApplicableRule(
    lessonId,
    "lesson",
    studentId,
    courseId,
    enrollments,
    classes
  );

  if (lessonResult) {
    const status = evaluateRule(
      lessonResult.rule,
      lessonResult.enrollment,
      completedLessons,
      allLessonIds,
      moduleLessonMap
    );
    if (!status.allowed) return status;
  }

  return { allowed: true };
}

/**
 * Check if a module is visible (not hidden by a "hidden" rule on all its lessons).
 * Also returns whether the module itself has a blocking rule.
 */
export function canAccessModule(
  studentId: string,
  courseId: string,
  moduleId: string,
  enrollments: Enrollment[],
  classes: Class[],
  completedLessons: Record<string, boolean>,
  allLessonIds: string[],
  moduleLessonMap: Record<string, string[]>
): LessonAccessStatus {
  const relevantEnrollments = getEnrollmentsForCourse(
    studentId,
    courseId,
    enrollments,
    classes
  );
  const validEnrollment = relevantEnrollments.find(isEnrollmentValid);

  if (!validEnrollment) {
    return relevantEnrollments.length === 0
      ? { allowed: false, reason: "not_enrolled" }
      : { allowed: false, reason: "enrollment_expired" };
  }

  // Check module-level rule
  const moduleResult = findApplicableRule(
    moduleId,
    "module",
    studentId,
    courseId,
    enrollments,
    classes
  );

  if (moduleResult) {
    const status = evaluateRule(
      moduleResult.rule,
      moduleResult.enrollment,
      completedLessons,
      allLessonIds,
      moduleLessonMap
    );
    if (!status.allowed) return status;
  }

  return { allowed: true };
}

/**
 * Build a full access map for all modules and lessons in a course.
 * Useful for rendering the sidebar with lock/hidden indicators.
 */
export function buildCourseAccessMap(
  studentId: string,
  courseId: string,
  modules: { id: string; lessons: { id: string }[] }[],
  enrollments: Enrollment[],
  classes: Class[]
): {
  enrolled: boolean;
  expired: boolean;
  moduleAccess: Record<string, LessonAccessStatus>;
  lessonAccess: Record<string, LessonAccessStatus>;
} {
  const relevantEnrollments = getEnrollmentsForCourse(
    studentId,
    courseId,
    enrollments,
    classes
  );
  const validEnrollment = relevantEnrollments.find(isEnrollmentValid);
  const enrolled = relevantEnrollments.length > 0;
  const expired = enrolled && !validEnrollment;

  if (!validEnrollment) {
    const reason: LessonBlockReason = expired
      ? "enrollment_expired"
      : "not_enrolled";
    const blocked: LessonAccessStatus = { allowed: false, reason };
    const moduleAccess: Record<string, LessonAccessStatus> = {};
    const lessonAccess: Record<string, LessonAccessStatus> = {};
    for (const m of modules) {
      moduleAccess[m.id] = blocked;
      for (const l of m.lessons) {
        lessonAccess[l.id] = blocked;
      }
    }
    return { enrolled, expired, moduleAccess, lessonAccess };
  }

  // Build helper maps
  const allLessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const moduleLessonMap: Record<string, string[]> = {};
  for (const m of modules) {
    moduleLessonMap[m.id] = m.lessons.map((l) => l.id);
  }

  // Read completed lessons from localStorage for this user+course
  const completedLessons = loadCompletedLessons(studentId, courseId);

  const moduleAccess: Record<string, LessonAccessStatus> = {};
  const lessonAccess: Record<string, LessonAccessStatus> = {};

  for (const m of modules) {
    moduleAccess[m.id] = canAccessModule(
      studentId,
      courseId,
      m.id,
      enrollments,
      classes,
      completedLessons,
      allLessonIds,
      moduleLessonMap
    );

    for (const l of m.lessons) {
      // If module is blocked/hidden, all its lessons inherit that status
      if (!moduleAccess[m.id].allowed) {
        lessonAccess[l.id] = moduleAccess[m.id];
        continue;
      }

      lessonAccess[l.id] = canAccessLesson(
        studentId,
        courseId,
        l.id,
        enrollments,
        classes,
        completedLessons,
        allLessonIds,
        moduleLessonMap
      );
    }
  }

  return { enrolled, expired, moduleAccess, lessonAccess };
}

// ---------------------------------------------------------------------------
// Progress helpers (user-scoped)
// ---------------------------------------------------------------------------

const PROGRESS_PREFIX = "lumi-membros:progress";

export function progressKey(userId: string, courseId: string): string {
  return `${PROGRESS_PREFIX}:${userId}:${courseId}`;
}

export function loadCompletedLessons(
  userId: string,
  courseId: string
): Record<string, boolean> {
  try {
    // Try new per-user key first
    const newKey = progressKey(userId, courseId);
    const raw = localStorage.getItem(newKey);
    if (raw) return JSON.parse(raw);

    // Fall back to legacy key (without userId) for migration
    const legacyKey = `${PROGRESS_PREFIX}:${courseId}`;
    const legacyRaw = localStorage.getItem(legacyKey);
    if (legacyRaw) {
      const data = JSON.parse(legacyRaw);
      // Migrate: save under new key and remove legacy
      localStorage.setItem(newKey, legacyRaw);
      localStorage.removeItem(legacyKey);
      return data;
    }
  } catch {
    // ignore
  }
  return {};
}

export function saveCompletedLessons(
  userId: string,
  courseId: string,
  completed: Record<string, boolean>
): void {
  try {
    localStorage.setItem(progressKey(userId, courseId), JSON.stringify(completed));
  } catch {
    // ignore
  }
}

/**
 * Compute progress percentage for a student on a course.
 * Returns 0–100.
 */
export function computeProgress(
  userId: string,
  courseId: string,
  totalActiveLessonIds: string[]
): number {
  if (totalActiveLessonIds.length === 0) return 0;
  const completed = loadCompletedLessons(userId, courseId);
  const count = totalActiveLessonIds.filter((id) => completed[id]).length;
  return Math.round((count / totalActiveLessonIds.length) * 100);
}

// ---------------------------------------------------------------------------
// Human-readable messages (pt-BR)
// ---------------------------------------------------------------------------

export function blockReasonMessage(status: LessonAccessStatus): string {
  if (status.allowed) return "";

  switch (status.reason) {
    case "not_enrolled":
      return "Você não está matriculado neste curso.";
    case "enrollment_expired":
      return "Sua matrícula expirou.";
    case "blocked":
      return "Este conteúdo está bloqueado.";
    case "hidden":
      return "Conteúdo indisponível.";
    case "scheduled_date": {
      if (status.detail && !status.detail.startsWith("Encerrado")) {
        const d = new Date(status.detail);
        return `Disponível a partir de ${d.toLocaleDateString("pt-BR")}.`;
      }
      return status.detail ?? "Conteúdo ainda não disponível.";
    }
    case "days_after_enrollment": {
      if (status.detail) {
        const d = new Date(status.detail);
        return `Liberado em ${d.toLocaleDateString("pt-BR")}.`;
      }
      return "Conteúdo será liberado em breve.";
    }
    case "course_complete":
      return "Complete o curso de pré-requisito primeiro.";
    case "module_complete":
      return "Complete o módulo anterior primeiro.";
    case "lesson_complete":
      return "Complete a aula anterior primeiro.";
    default:
      return "Conteúdo indisponível.";
  }
}
