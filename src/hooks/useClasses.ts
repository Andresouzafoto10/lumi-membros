import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Class, ContentScheduleRule, EnrollmentType } from "@/types/student";
import { mockClasses } from "@/data/mock-classes";

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:classes";

let state: Class[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): Class[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Class[];
  } catch {
    // ignore
  }
  return [...mockClasses];
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: Class[]) {
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

export function useClasses() {
  const classes = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const activeClasses = useMemo(
    () => classes.filter((c) => c.status === "active"),
    [classes]
  );

  const findClass = useCallback(
    (id: string | undefined) =>
      id ? classes.find((c) => c.id === id) ?? null : null,
    [classes]
  );

  const getClassesByCourse = useCallback(
    (courseId: string) => classes.filter((c) => c.courseIds.includes(courseId)),
    [classes]
  );

  const createClass = useCallback(
    (data: {
      name: string;
      courseIds: string[];
      enrollmentType: EnrollmentType;
      accessDurationDays: number | null;
    }) => {
      const newClass: Class = {
        id: uuid(),
        name: data.name,
        courseIds: data.courseIds,
        enrollmentType: data.enrollmentType,
        accessDurationDays: data.accessDurationDays,
        status: "active",
        contentSchedule: [],
      };
      setState([...state, newClass]);
      return newClass.id;
    },
    []
  );

  const updateClass = useCallback(
    (
      classId: string,
      patch: Partial<
        Pick<
          Class,
          | "name"
          | "courseIds"
          | "enrollmentType"
          | "accessDurationDays"
          | "status"
          | "contentSchedule"
        >
      >
    ) => {
      setState(
        state.map((c) => (c.id === classId ? { ...c, ...patch } : c))
      );
    },
    []
  );

  const deleteClass = useCallback((classId: string) => {
    setState(state.filter((c) => c.id !== classId));
  }, []);

  const updateScheduleRule = useCallback(
    (classId: string, rule: ContentScheduleRule) => {
      setState(
        state.map((c) => {
          if (c.id !== classId) return c;
          const existing = c.contentSchedule.findIndex(
            (r) => r.targetId === rule.targetId && r.targetType === rule.targetType
          );
          if (existing >= 0) {
            const updated = [...c.contentSchedule];
            updated[existing] = rule;
            return { ...c, contentSchedule: updated };
          }
          return { ...c, contentSchedule: [...c.contentSchedule, rule] };
        })
      );
    },
    []
  );

  const removeScheduleRule = useCallback(
    (classId: string, targetId: string, targetType: "module" | "lesson") => {
      setState(
        state.map((c) => {
          if (c.id !== classId) return c;
          return {
            ...c,
            contentSchedule: c.contentSchedule.filter(
              (r) => !(r.targetId === targetId && r.targetType === targetType)
            ),
          };
        })
      );
    },
    []
  );

  return {
    classes,
    activeClasses,
    findClass,
    getClassesByCourse,
    createClass,
    updateClass,
    deleteClass,
    updateScheduleRule,
    removeScheduleRule,
  };
}
