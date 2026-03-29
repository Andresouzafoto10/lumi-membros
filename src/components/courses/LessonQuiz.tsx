import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/types/course";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuizAttempts } from "@/hooks/useQuizAttempts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffleArray<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
  let m = shuffled.length;
  let s = seed;
  while (m) {
    s = (s * 9301 + 49297) % 233280;
    const i = Math.floor((s / 233280) * m--);
    [shuffled[m], shuffled[i]] = [shuffled[i], shuffled[m]];
  }
  return shuffled;
}

function generateSeed(): number {
  return Math.floor(Math.random() * 233280);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LessonQuizProps {
  quiz: QuizQuestion[];
  passingScore: number;
  lessonId: string;
  onPass: () => void;
}

type QuizState = "answering" | "submitted";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LessonQuiz({ quiz, passingScore, lessonId, onPass }: LessonQuizProps) {
  const { currentUserId } = useCurrentUser();
  const { submitAttempt, hasPassedQuiz, getBestAttempt } = useQuizAttempts();

  const alreadyPassed = hasPassedQuiz(currentUserId, lessonId);
  const bestAttempt = getBestAttempt(currentUserId, lessonId);

  const [seed, setSeed] = useState(() => generateSeed());
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizState, setQuizState] = useState<QuizState>("answering");
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastPassed, setLastPassed] = useState<boolean | null>(null);

  // Shuffle questions whenever seed changes
  useEffect(() => {
    setShuffledQuestions(shuffleArray(quiz, seed));
  }, [quiz, seed]);

  // If already passed on mount, fire onPass once
  useEffect(() => {
    if (alreadyPassed) {
      onPass();
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Already passed — compact success card
  // ---------------------------------------------------------------------------

  if (alreadyPassed) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-base text-emerald-600 dark:text-emerald-400">
              Quiz da Aula
            </CardTitle>
            <Badge className="ml-auto bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              Aprovado
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            Você já concluiu este quiz com sucesso.
            {bestAttempt !== null && (
              <> Melhor pontuação:{" "}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {bestAttempt.score}%
                </span>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const allAnswered = shuffledQuestions.length > 0 &&
    shuffledQuestions.every((q) => answers[q.id] !== undefined);

  function handleOptionSelect(questionId: string, optionId: string) {
    if (quizState === "submitted") return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  function handleSubmit() {
    if (!allAnswered) return;
    const attempt = submitAttempt(currentUserId, lessonId, quiz, answers, passingScore);
    setLastScore(attempt.score);
    setLastPassed(attempt.passed);
    setQuizState("submitted");
    if (attempt.passed) {
      onPass();
    }
  }

  function handleRetry() {
    setSeed(generateSeed());
    setAnswers({});
    setQuizState("answering");
    setLastScore(null);
    setLastPassed(null);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Quiz da Aula</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Nota mínima: {passingScore}%
            </p>
          </div>
          {quizState === "submitted" && lastPassed !== null && (
            <Badge
              className={cn(
                "shrink-0",
                lastPassed
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-destructive/20 text-destructive border-destructive/30"
              )}
            >
              {lastPassed ? "Aprovado" : "Reprovado"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Questions */}
        {shuffledQuestions.map((question, qIndex) => {
          const selectedOptionId = answers[question.id];
          const isSubmitted = quizState === "submitted";
          const isCorrect = isSubmitted && selectedOptionId === question.correctOptionId;
          const isWrong = isSubmitted && selectedOptionId !== question.correctOptionId;

          return (
            <div
              key={question.id}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                isSubmitted
                  ? isCorrect
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-destructive/40 bg-destructive/5"
                  : "border-border/60"
              )}
            >
              {/* Question header */}
              <div className="flex items-start gap-2 mb-3">
                <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold mt-0.5">
                  {qIndex + 1}
                </span>
                <p className="text-sm font-medium leading-snug">{question.question}</p>
                {isSubmitted && (
                  <span className="shrink-0 ml-auto">
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </span>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2 pl-8">
                {question.options.map((option) => {
                  const isSelected = selectedOptionId === option.id;
                  const isThisCorrect = option.id === question.correctOptionId;

                  let optionStyle = "border-border/50 hover:border-border hover:bg-accent/30";
                  if (isSubmitted) {
                    if (isThisCorrect) {
                      optionStyle = "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
                    } else if (isSelected && !isThisCorrect) {
                      optionStyle = "border-destructive/60 bg-destructive/10 text-destructive";
                    } else {
                      optionStyle = "border-border/30 opacity-60";
                    }
                  } else if (isSelected) {
                    optionStyle = "border-primary/60 bg-primary/10";
                  }

                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-all duration-150 text-sm",
                        optionStyle,
                        isSubmitted && "cursor-default"
                      )}
                      onClick={() => handleOptionSelect(question.id, option.id)}
                    >
                      {/* Custom radio */}
                      <span
                        className={cn(
                          "shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                          isSubmitted
                            ? isThisCorrect
                              ? "border-emerald-500 bg-emerald-500"
                              : isSelected
                              ? "border-destructive bg-destructive"
                              : "border-border/50"
                            : isSelected
                            ? "border-primary bg-primary"
                            : "border-border"
                        )}
                      >
                        {(isSelected || (isSubmitted && isThisCorrect)) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      <span>{option.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Result banner */}
        {quizState === "submitted" && lastScore !== null && lastPassed !== null && (
          <div
            className={cn(
              "rounded-lg p-4 text-center",
              lastPassed
                ? "bg-emerald-500/10 border border-emerald-500/30"
                : "bg-destructive/10 border border-destructive/30"
            )}
          >
            <p className={cn("font-semibold text-base", lastPassed ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
              {lastPassed ? "Parabéns! Você foi aprovado." : "Você não atingiu a nota mínima."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Sua pontuação:{" "}
              <span className={cn("font-bold", lastPassed ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                {lastScore}%
              </span>
              {" "}— mínimo necessário: {passingScore}%
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-1">
          {quizState === "answering" ? (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="shadow-sm shadow-primary/15"
            >
              Enviar respostas
            </Button>
          ) : !lastPassed ? (
            <Button
              variant="outline"
              onClick={handleRetry}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Tentar novamente
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
