import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { QuizAttempt } from "@/types/student";
import type { QuizQuestion } from "@/types/course";

const QK = ["quiz-attempts"] as const;

function mapRow(r: Record<string, unknown>): QuizAttempt {
  return {
    id: r.id as string,
    studentId: r.student_id as string,
    lessonId: r.lesson_id as string,
    answers: (r.answers as Record<string, string>) ?? {},
    score: r.score as number,
    passed: r.passed as boolean,
    attemptedAt: r.attempted_at as string,
  };
}

async function fetchAttempts(studentId: string): Promise<QuizAttempt[]> {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("student_id", studentId)
    .order("attempted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export function useQuizAttempts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: attempts = [] } = useQuery({
    queryKey: [...QK, user?.id],
    queryFn: () => fetchAttempts(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QK });
  }, [queryClient]);

  const submitAttempt = useCallback(
    async (
      studentId: string,
      lessonId: string,
      quiz: QuizQuestion[],
      answers: Record<string, string>,
      passingScore: number
    ): Promise<QuizAttempt> => {
      let correct = 0;
      for (const q of quiz) {
        if (answers[q.id] === q.correctOptionId) correct++;
      }
      const score =
        quiz.length > 0 ? Math.round((correct / quiz.length) * 100) : 0;

      const { data: row, error } = await supabase
        .from("quiz_attempts")
        .insert({
          student_id: studentId,
          lesson_id: lessonId,
          answers,
          score,
          passed: score >= passingScore,
        })
        .select()
        .single();
      if (error) throw error;

      const attempt = mapRow(row as Record<string, unknown>);
      invalidate();
      return attempt;
    },
    [invalidate]
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
        (a) =>
          a.studentId === studentId && a.lessonId === lessonId && a.passed
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
