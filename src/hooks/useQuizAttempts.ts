import { useCallback, useSyncExternalStore } from "react";
import type { QuizAttempt } from "@/types/student";
import type { QuizQuestion } from "@/types/course";

const STORAGE_KEY = "lumi-membros:quiz-attempts";

let state: QuizAttempt[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): QuizAttempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as QuizAttempt[];
  } catch {
    // ignore
  }
  return [];
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: QuizAttempt[]) {
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

export function useQuizAttempts() {
  const attempts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const submitAttempt = useCallback(
    (
      studentId: string,
      lessonId: string,
      quiz: QuizQuestion[],
      answers: Record<string, string>,
      passingScore: number
    ): QuizAttempt => {
      let correct = 0;
      for (const q of quiz) {
        if (answers[q.id] === q.correctOptionId) correct++;
      }
      const score = quiz.length > 0 ? Math.round((correct / quiz.length) * 100) : 0;
      const attempt: QuizAttempt = {
        id: crypto.randomUUID(),
        studentId,
        lessonId,
        answers,
        score,
        passed: score >= passingScore,
        attemptedAt: new Date().toISOString(),
      };
      setState([...state, attempt]);
      return attempt;
    },
    []
  );

  const getAttempts = useCallback(
    (studentId: string, lessonId: string): QuizAttempt[] =>
      attempts.filter(
        (a) => a.studentId === studentId && a.lessonId === lessonId
      ),
    [attempts]
  );

  const getBestAttempt = useCallback(
    (studentId: string, lessonId: string): QuizAttempt | null => {
      const lessonAttempts = attempts.filter(
        (a) => a.studentId === studentId && a.lessonId === lessonId
      );
      if (lessonAttempts.length === 0) return null;
      return lessonAttempts.reduce((best, curr) =>
        curr.score > best.score ? curr : best
      );
    },
    [attempts]
  );

  const hasPassedQuiz = useCallback(
    (studentId: string, lessonId: string): boolean =>
      attempts.some(
        (a) => a.studentId === studentId && a.lessonId === lessonId && a.passed
      ),
    [attempts]
  );

  const getQuizScoresForCourse = useCallback(
    (studentId: string, lessonIds: string[]): number => {
      const scores: number[] = [];
      for (const lid of lessonIds) {
        const best = attempts
          .filter((a) => a.studentId === studentId && a.lessonId === lid)
          .reduce<QuizAttempt | null>(
            (b, c) => (!b || c.score > b.score ? c : b),
            null
          );
        if (best) scores.push(best.score);
      }
      if (scores.length === 0) return 0;
      return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    },
    [attempts]
  );

  return {
    attempts,
    submitAttempt,
    getAttempts,
    getBestAttempt,
    hasPassedQuiz,
    getQuizScoresForCourse,
  };
}
