import { useCallback, useMemo, useSyncExternalStore } from "react";
import type {
  Course,
  CourseBanner,
  CourseLesson,
  CourseModule,
  CourseSession,
  CourseAccess,
  CourseVideoType,
} from "@/types/course";
import { mockCourses } from "@/data/mock-courses";
import { mockBanners } from "@/data/mock-banners";
import { mockSessions } from "@/data/mock-sections";

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:store:v1";

type StoreState = {
  sessions: CourseSession[];
  banners: CourseBanner[];
};

let state: StoreState = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreState;
      if (parsed.sessions && parsed.banners) return parsed;
    }
  } catch {
    // ignore
  }
  return {
    sessions: mockSessions.map((s) => ({
      ...s,
      courses: s.courses.map((c) => ({ ...c })),
    })),
    banners: [...mockBanners],
  };
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: StoreState) {
  state = next;
  persist();
  listeners.forEach((fn) => fn());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

function uuid(): string {
  return crypto.randomUUID();
}

function nextOrder(items: { order: number }[]): number {
  return items.length === 0 ? 1 : Math.max(...items.map((i) => i.order)) + 1;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCourses() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // ---- Selectors ----
  const sessions = useMemo(
    () => [...store.sessions].sort((a, b) => a.order - b.order),
    [store.sessions]
  );

  const allCourses = useMemo(
    () => sessions.flatMap((s) => s.courses).sort((a, b) => a.order - b.order),
    [sessions]
  );

  const banners = useMemo(
    () => [...store.banners].sort((a, b) => a.displayOrder - b.displayOrder),
    [store.banners]
  );

  const activeBanners = useMemo(
    () => banners.filter((b) => b.isActive),
    [banners]
  );

  const findCourse = useCallback(
    (courseId: string | undefined) =>
      courseId
        ? store.sessions
            .flatMap((s) => s.courses)
            .find((c) => c.id === courseId) ?? null
        : null,
    [store.sessions]
  );

  const findModule = useCallback(
    (courseId: string | undefined, moduleId: string | undefined) => {
      if (!courseId || !moduleId) return null;
      const course = findCourse(courseId);
      return course?.modules.find((m) => m.id === moduleId) ?? null;
    },
    [findCourse]
  );

  const findSession = useCallback(
    (sessionId: string | undefined) =>
      sessionId
        ? store.sessions.find((s) => s.id === sessionId) ?? null
        : null,
    [store.sessions]
  );

  const findSessionForCourse = useCallback(
    (courseId: string | undefined) => {
      if (!courseId) return null;
      return (
        store.sessions.find((s) =>
          s.courses.some((c) => c.id === courseId)
        ) ?? null
      );
    },
    [store.sessions]
  );

  // ---- Session Actions ----
  const createSession = useCallback(
    (data: { title: string; description?: string; isActive: boolean }) => {
      const session: CourseSession = {
        id: uuid(),
        title: data.title,
        description: data.description,
        isActive: data.isActive,
        order: nextOrder(state.sessions),
        courses: [],
      };
      setState({ ...state, sessions: [...state.sessions, session] });
    },
    []
  );

  const updateSession = useCallback(
    (
      sessionId: string,
      patch: Partial<Pick<CourseSession, "title" | "description" | "isActive">>
    ) => {
      setState({
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, ...patch } : s
        ),
      });
    },
    []
  );

  const deleteSession = useCallback((sessionId: string) => {
    setState({
      ...state,
      sessions: state.sessions.filter((s) => s.id !== sessionId),
    });
  }, []);

  const moveSession = useCallback(
    (sessionId: string, direction: "up" | "down") => {
      const sorted = [...state.sessions].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((s) => s.id === sessionId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const tmpOrder = sorted[idx].order;
      sorted[idx] = { ...sorted[idx], order: sorted[swapIdx].order };
      sorted[swapIdx] = { ...sorted[swapIdx], order: tmpOrder };
      setState({ ...state, sessions: sorted });
    },
    []
  );

  // ---- Course Actions ----
  const createCourse = useCallback(
    (
      sessionId: string,
      data: {
        title: string;
        description: string;
        isActive: boolean;
        access: CourseAccess;
      }
    ) => {
      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) return;
      const course: Course = {
        id: uuid(),
        title: data.title,
        description: data.description,
        bannerUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
        order: nextOrder(session.courses),
        isActive: data.isActive,
        access: data.access,
        modules: [],
      };
      setState({
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === sessionId
            ? { ...s, courses: [...s.courses, course] }
            : s
        ),
      });
    },
    []
  );

  const updateCourse = useCallback(
    (
      courseId: string,
      patch: Partial<
        Pick<
          Course,
          "title" | "description" | "isActive" | "bannerUrl" | "access"
        >
      >
    ) => {
      setState({
        ...state,
        sessions: state.sessions.map((s) => ({
          ...s,
          courses: s.courses.map((c) =>
            c.id === courseId ? { ...c, ...patch } : c
          ),
        })),
      });
    },
    []
  );

  const deleteCourse = useCallback((courseId: string) => {
    setState({
      ...state,
      sessions: state.sessions.map((s) => ({
        ...s,
        courses: s.courses.filter((c) => c.id !== courseId),
      })),
    });
  }, []);

  const moveCourse = useCallback(
    (courseId: string, direction: "up" | "down") => {
      setState({
        ...state,
        sessions: state.sessions.map((s) => {
          const sorted = [...s.courses].sort((a, b) => a.order - b.order);
          const idx = sorted.findIndex((c) => c.id === courseId);
          if (idx < 0) return s;
          const swapIdx = direction === "up" ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= sorted.length) return s;
          const tmpOrder = sorted[idx].order;
          sorted[idx] = { ...sorted[idx], order: sorted[swapIdx].order };
          sorted[swapIdx] = { ...sorted[swapIdx], order: tmpOrder };
          return { ...s, courses: sorted };
        }),
      });
    },
    []
  );

  const moveCourseToSession = useCallback(
    (courseId: string, targetSessionId: string) => {
      const sourceSession = state.sessions.find((s) =>
        s.courses.some((c) => c.id === courseId)
      );
      if (!sourceSession) return;
      const course = sourceSession.courses.find((c) => c.id === courseId);
      if (!course) return;
      const targetSession = state.sessions.find(
        (s) => s.id === targetSessionId
      );
      if (!targetSession) return;

      const movedCourse: Course = {
        ...course,
        order: nextOrder(targetSession.courses),
      };

      setState({
        ...state,
        sessions: state.sessions.map((s) => {
          if (s.id === sourceSession.id) {
            return { ...s, courses: s.courses.filter((c) => c.id !== courseId) };
          }
          if (s.id === targetSessionId) {
            return { ...s, courses: [...s.courses, movedCourse] };
          }
          return s;
        }),
      });
    },
    []
  );

  const duplicateCourseToSession = useCallback(
    (courseId: string, targetSessionId: string) => {
      const sourceCourse = state.sessions
        .flatMap((s) => s.courses)
        .find((c) => c.id === courseId);
      if (!sourceCourse) return;
      const targetSession = state.sessions.find(
        (s) => s.id === targetSessionId
      );
      if (!targetSession) return;

      const duplicatedCourse: Course = {
        ...sourceCourse,
        id: uuid(),
        order: nextOrder(targetSession.courses),
        modules: sourceCourse.modules.map((m) => ({
          ...m,
          id: uuid(),
          lessons: m.lessons.map((l) => ({
            ...l,
            id: uuid(),
          })),
        })),
      };

      setState({
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === targetSessionId
            ? { ...s, courses: [...s.courses, duplicatedCourse] }
            : s
        ),
      });
    },
    []
  );

  // ---- Module Actions ----
  const createModule = useCallback(
    (
      courseId: string,
      data: { title: string; isActive: boolean }
    ) => {
      setState({
        ...state,
        sessions: state.sessions.map((s) => ({
          ...s,
          courses: s.courses.map((c) => {
            if (c.id !== courseId) return c;
            const mod: CourseModule = {
              id: uuid(),
              title: data.title,
              order: nextOrder(c.modules),
              isActive: data.isActive,
              lessons: [],
            };
            return { ...c, modules: [...c.modules, mod] };
          }),
        })),
      });
    },
    []
  );

  const updateModule = useCallback(
    (
      courseId: string,
      moduleId: string,
      patch: Partial<Pick<CourseModule, "title" | "isActive">>
    ) => {
      setState({
        ...state,
        sessions: state.sessions.map((s) => ({
          ...s,
          courses: s.courses.map((c) =>
            c.id !== courseId
              ? c
              : {
                  ...c,
                  modules: c.modules.map((m) =>
                    m.id === moduleId ? { ...m, ...patch } : m
                  ),
                }
          ),
        })),
      });
    },
    []
  );

  const deleteModule = useCallback(
    (courseId: string, moduleId: string) => {
      setState({
        ...state,
        sessions: state.sessions.map((s) => ({
          ...s,
          courses: s.courses.map((c) =>
            c.id !== courseId
              ? c
              : {
                  ...c,
                  modules: c.modules.filter((m) => m.id !== moduleId),
                }
          ),
        })),
      });
    },
    []
  );

  const moveModule = useCallback(
    (courseId: string, moduleId: string, direction: "up" | "down") => {
      setState({
        ...state,
        sessions: state.sessions.map((s) => ({
          ...s,
          courses: s.courses.map((c) => {
            if (c.id !== courseId) return c;
            const sorted = [...c.modules].sort((a, b) => a.order - b.order);
            const idx = sorted.findIndex((m) => m.id === moduleId);
            if (idx < 0) return c;
            const swapIdx = direction === "up" ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= sorted.length) return c;
            const tmpOrder = sorted[idx].order;
            sorted[idx] = { ...sorted[idx], order: sorted[swapIdx].order };
            sorted[swapIdx] = { ...sorted[swapIdx], order: tmpOrder };
            return { ...c, modules: sorted };
          }),
        })),
      });
    },
    []
  );

  // ---- Lesson Actions ----
  const createLesson = useCallback(
    (
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
      }
    ) => {
      setState({
        ...state,
        sessions: state.sessions.map((s) => ({
          ...s,
          courses: s.courses.map((c) => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map((m) => {
                if (m.id !== moduleId) return m;
                const lesson: CourseLesson = {
                  id: data.id ?? uuid(),
                  title: data.title,
                  order: nextOrder(m.lessons),
                  isActive: data.isActive,
                  videoType: data.videoType,
                  videoUrl: data.videoUrl,
                  description: data.description,
                  materials: data.materials,
                  links: data.links,
                  files: data.files,
                };
                return { ...m, lessons: [...m.lessons, lesson] };
              }),
            };
          }),
        })),
      });
    },
    []
  );

  const updateLesson = useCallback(
    (
      courseId: string,
      moduleId: string,
      lessonId: string,
      patch: Partial<Omit<CourseLesson, "id" | "order">>
    ) => {
      setState({
        ...state,
        sessions: state.sessions.map((s) => ({
          ...s,
          courses: s.courses.map((c) =>
            c.id !== courseId
              ? c
              : {
                  ...c,
                  modules: c.modules.map((m) =>
                    m.id !== moduleId
                      ? m
                      : {
                          ...m,
                          lessons: m.lessons.map((l) =>
                            l.id === lessonId ? { ...l, ...patch } : l
                          ),
                        }
                  ),
                }
          ),
        })),
      });
    },
    []
  );

  const deleteLesson = useCallback(
    (courseId: string, moduleId: string, lessonId: string) => {
      setState({
        ...state,
        sessions: state.sessions.map((s) => ({
          ...s,
          courses: s.courses.map((c) =>
            c.id !== courseId
              ? c
              : {
                  ...c,
                  modules: c.modules.map((m) =>
                    m.id !== moduleId
                      ? m
                      : {
                          ...m,
                          lessons: m.lessons.filter((l) => l.id !== lessonId),
                        }
                  ),
                }
          ),
        })),
      });
    },
    []
  );

  const moveLesson = useCallback(
    (
      courseId: string,
      moduleId: string,
      lessonId: string,
      direction: "up" | "down"
    ) => {
      setState({
        ...state,
        sessions: state.sessions.map((s) => ({
          ...s,
          courses: s.courses.map((c) => {
            if (c.id !== courseId) return c;
            return {
              ...c,
              modules: c.modules.map((m) => {
                if (m.id !== moduleId) return m;
                const sorted = [...m.lessons].sort(
                  (a, b) => a.order - b.order
                );
                const idx = sorted.findIndex((l) => l.id === lessonId);
                if (idx < 0) return m;
                const swapIdx = direction === "up" ? idx - 1 : idx + 1;
                if (swapIdx < 0 || swapIdx >= sorted.length) return m;
                const tmpOrder = sorted[idx].order;
                sorted[idx] = {
                  ...sorted[idx],
                  order: sorted[swapIdx].order,
                };
                sorted[swapIdx] = { ...sorted[swapIdx], order: tmpOrder };
                return { ...m, lessons: sorted };
              }),
            };
          }),
        })),
      });
    },
    []
  );

  // ---- Banner Actions ----
  const createBanner = useCallback(
    (
      data: Omit<CourseBanner, "id" | "displayOrder" | "createdAt" | "updatedAt">
    ) => {
      const banner: CourseBanner = {
        ...data,
        id: uuid(),
        displayOrder: nextOrder(
          state.banners.map((b) => ({ order: b.displayOrder }))
        ),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setState({ ...state, banners: [...state.banners, banner] });
    },
    []
  );

  const updateBanner = useCallback(
    (
      bannerId: string,
      patch: Partial<
        Omit<CourseBanner, "id" | "createdAt" | "updatedAt">
      >
    ) => {
      setState({
        ...state,
        banners: state.banners.map((b) =>
          b.id === bannerId
            ? { ...b, ...patch, updatedAt: new Date().toISOString() }
            : b
        ),
      });
    },
    []
  );

  const deleteBanner = useCallback((bannerId: string) => {
    setState({
      ...state,
      banners: state.banners.filter((b) => b.id !== bannerId),
    });
  }, []);

  const moveBanner = useCallback(
    (bannerId: string, direction: "up" | "down") => {
      const sorted = [...state.banners].sort(
        (a, b) => a.displayOrder - b.displayOrder
      );
      const idx = sorted.findIndex((b) => b.id === bannerId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const tmpOrder = sorted[idx].displayOrder;
      sorted[idx] = {
        ...sorted[idx],
        displayOrder: sorted[swapIdx].displayOrder,
      };
      sorted[swapIdx] = { ...sorted[swapIdx], displayOrder: tmpOrder };
      setState({ ...state, banners: sorted });
    },
    []
  );

  const resetToMockData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(loadFromStorage());
  }, []);

  return {
    // state
    sessions,
    allCourses,
    banners,
    activeBanners,
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
