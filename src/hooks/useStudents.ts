import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Student, Enrollment, StudentStatus, StudentRole } from "@/types/student";
import { mockStudents } from "@/data/mock-students";
import { mockEnrollments } from "@/data/mock-enrollments";

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "lumi-membros:students";
const ENROLLMENTS_KEY = "lumi-membros:enrollments";

type StudentsState = {
  students: Student[];
  enrollments: Enrollment[];
};

let state: StudentsState = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): StudentsState {
  try {
    const rawStudents = localStorage.getItem(STORAGE_KEY);
    const rawEnrollments = localStorage.getItem(ENROLLMENTS_KEY);
    const students = rawStudents ? (JSON.parse(rawStudents) as Student[]) : null;
    const enrollments = rawEnrollments
      ? (JSON.parse(rawEnrollments) as Enrollment[])
      : null;
    if (students && enrollments) return { students, enrollments };
  } catch {
    // ignore
  }
  return {
    students: mockStudents.map((s) => ({ ...s, enrollments: [] })),
    enrollments: [...mockEnrollments],
  };
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.students));
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(state.enrollments));
  } catch {
    // ignore
  }
}

function setState(next: StudentsState) {
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

export function useStudents() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const students = useMemo(
    () => [...store.students].sort((a, b) => a.name.localeCompare(b.name)),
    [store.students]
  );

  const enrollments = useMemo(() => store.enrollments, [store.enrollments]);

  const findStudent = useCallback(
    (id: string | undefined) =>
      id ? store.students.find((s) => s.id === id) ?? null : null,
    [store.students]
  );

  const getStudentEnrollments = useCallback(
    (studentId: string) =>
      store.enrollments.filter((e) => e.studentId === studentId),
    [store.enrollments]
  );

  const createStudent = useCallback(
    (data: {
      name: string;
      email: string;
      role: StudentRole;
      status: StudentStatus;
      classIds?: string[];
    }) => {
      const now = new Date().toISOString();
      const studentId = uuid();
      const newEnrollments: Enrollment[] = (data.classIds ?? []).map(
        (classId) => ({
          id: uuid(),
          studentId,
          classId,
          type: "individual" as const,
          expiresAt: null,
          status: "active" as const,
          enrolledAt: now,
        })
      );
      const student: Student = {
        id: studentId,
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
        createdAt: now,
        enrollments: [],
      };
      setState({
        students: [...state.students, student],
        enrollments: [...state.enrollments, ...newEnrollments],
      });
      return studentId;
    },
    []
  );

  const createStudentsBulk = useCallback(
    (
      items: Array<{ name: string; email: string }>,
      classIds: string[]
    ) => {
      const now = new Date().toISOString();
      const newStudents: Student[] = [];
      const newEnrollments: Enrollment[] = [];

      for (const item of items) {
        const studentId = uuid();
        newStudents.push({
          id: studentId,
          name: item.name,
          email: item.email,
          role: "student",
          status: "active",
          createdAt: now,
          enrollments: [],
        });
        for (const classId of classIds) {
          newEnrollments.push({
            id: uuid(),
            studentId,
            classId,
            type: "individual",
            expiresAt: null,
            status: "active",
            enrolledAt: now,
          });
        }
      }

      setState({
        students: [...state.students, ...newStudents],
        enrollments: [...state.enrollments, ...newEnrollments],
      });
      return newStudents.length;
    },
    []
  );

  const updateStudent = useCallback(
    (
      studentId: string,
      patch: Partial<Pick<Student, "name" | "email" | "role" | "status">>
    ) => {
      setState({
        ...state,
        students: state.students.map((s) =>
          s.id === studentId ? { ...s, ...patch } : s
        ),
      });
    },
    []
  );

  const deleteStudent = useCallback((studentId: string) => {
    setState({
      students: state.students.filter((s) => s.id !== studentId),
      enrollments: state.enrollments.filter((e) => e.studentId !== studentId),
    });
  }, []);

  const addEnrollment = useCallback(
    (data: Omit<Enrollment, "id" | "enrolledAt">) => {
      const enrollment: Enrollment = {
        ...data,
        id: uuid(),
        enrolledAt: new Date().toISOString(),
      };
      setState({
        ...state,
        enrollments: [...state.enrollments, enrollment],
      });
    },
    []
  );

  const revokeEnrollment = useCallback((enrollmentId: string) => {
    setState({
      ...state,
      enrollments: state.enrollments.map((e) =>
        e.id === enrollmentId ? { ...e, status: "cancelled" as const } : e
      ),
    });
  }, []);

  return {
    students,
    enrollments,
    findStudent,
    getStudentEnrollments,
    createStudent,
    createStudentsBulk,
    updateStudent,
    deleteStudent,
    addEnrollment,
    revokeEnrollment,
  };
}
