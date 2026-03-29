# Certificates Fix + Quiz System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix certificate text overlapping, build a quiz system for lessons, and expand certificate requirements to support quiz-based awarding.

**Architecture:** Three sequential sprints. Sprint A fixes the certificate renderer (proportional font scaling + mock data). Sprint B adds quiz types, a quiz attempts hook, admin quiz editor, and student-facing quiz component. Sprint C expands `CertificateConfig` with `requirementType` to support quiz-based and combined certificate requirements.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + localStorage via useSyncExternalStore

---

## Sprint A — Fix Certificate Text Overlapping

### Task 1: Fix CertificateRenderer proportional font scaling

**Files:**
- Modify: `src/components/certificates/CertificateRenderer.tsx`

- [ ] **Step 1: Rewrite CertificateRenderer with ResizeObserver-based scaling**

Replace the entire file with:

```tsx
import { useRef, useState, useEffect } from "react";
import type { CertificateTemplate, CertificateBlock } from "@/types/student";
import { cn } from "@/lib/utils";

const REFERENCE_WIDTH = 1920;

export type CertificateData = {
  studentName: string;
  courseName: string;
  completionDate: string;
  courseHours: number;
  platformName: string;
};

type CertificateRendererProps = {
  template: CertificateTemplate;
  data: CertificateData;
  containerId?: string;
  className?: string;
  scale?: number;
};

function resolveBlockContent(
  block: CertificateBlock,
  data: CertificateData
): string {
  switch (block.type) {
    case "certificate_title":
      return "Certificado de Conclusão";
    case "platform_name":
      return data.platformName;
    case "student_name":
      return data.studentName;
    case "course_name":
      return data.courseName;
    case "completion_date":
      return data.completionDate;
    case "course_hours":
      return `${data.courseHours} horas`;
    case "custom_text":
      return block.content || "";
    default:
      return "";
  }
}

export function CertificateRenderer({
  template,
  data,
  containerId,
  className,
  scale,
}: CertificateRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontScale, setFontScale] = useState(1);
  const hasBackground = !!template.backgroundUrl;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setFontScale(width / REFERENCE_WIDTH);
      }
    });
    observer.observe(el);

    // Initial measurement
    setFontScale(el.offsetWidth / REFERENCE_WIDTH);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      id={containerId}
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{
        aspectRatio: "16 / 9",
        ...(scale
          ? { transform: `scale(${scale})`, transformOrigin: "top left" }
          : {}),
      }}
    >
      {hasBackground ? (
        <img
          src={template.backgroundUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          crossOrigin="anonymous"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
      )}

      {template.blocks.map((block) => (
        <div
          key={block.id}
          style={{
            position: "absolute",
            top: `${block.top}%`,
            left: `${block.left}%`,
            width: `${block.width}%`,
            fontSize: `${Math.max(block.fontSize * fontScale, 1)}px`,
            fontWeight: block.fontWeight,
            color: block.color,
            textAlign: block.textAlign,
            lineHeight: 1.3,
          }}
        >
          {resolveBlockContent(block, data)}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx vite build 2>&1 | tail -5`
Expected: `✓ built in` with no errors in CertificateRenderer

### Task 2: Fix mock certificate template spacing

**Files:**
- Modify: `src/data/mock-certificates.ts`

- [ ] **Step 1: Update mock template block positions**

Replace the `blocks` array of the "Certificado Clássico" template (id `tpl-classico`) with properly spaced values:

```typescript
blocks: [
  {
    id: "blk-1",
    type: "certificate_title",
    fontSize: 36,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    top: 15,
    left: 10,
    width: 80,
  },
  {
    id: "blk-2",
    type: "platform_name",
    fontSize: 14,
    fontWeight: "normal",
    color: "#cccccc",
    textAlign: "center",
    top: 28,
    left: 10,
    width: 80,
  },
  {
    id: "blk-3",
    type: "student_name",
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    top: 40,
    left: 10,
    width: 80,
  },
  {
    id: "blk-4",
    type: "custom_text",
    content: "concluiu com êxito o curso",
    fontSize: 16,
    fontWeight: "normal",
    color: "#cccccc",
    textAlign: "center",
    top: 53,
    left: 10,
    width: 80,
  },
  {
    id: "blk-5",
    type: "course_name",
    fontSize: 24,
    fontWeight: "bold",
    color: "#00C2CB",
    textAlign: "center",
    top: 62,
    left: 10,
    width: 80,
  },
  {
    id: "blk-6",
    type: "completion_date",
    fontSize: 14,
    fontWeight: "normal",
    color: "#aaaaaa",
    textAlign: "center",
    top: 80,
    left: 10,
    width: 40,
  },
  {
    id: "blk-7",
    type: "course_hours",
    fontSize: 14,
    fontWeight: "normal",
    color: "#aaaaaa",
    textAlign: "center",
    top: 80,
    left: 50,
    width: 40,
  },
],
```

Replace the `blocks` array of the "Certificado Moderno" template (id `tpl-moderno`) with:

```typescript
blocks: [
  {
    id: "blk-m1",
    type: "platform_name",
    fontSize: 12,
    fontWeight: "bold",
    color: "#00C2CB",
    textAlign: "left",
    top: 10,
    left: 8,
    width: 40,
  },
  {
    id: "blk-m2",
    type: "certificate_title",
    fontSize: 40,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "left",
    top: 20,
    left: 8,
    width: 60,
  },
  {
    id: "blk-m3",
    type: "student_name",
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "left",
    top: 40,
    left: 8,
    width: 60,
  },
  {
    id: "blk-m4",
    type: "course_name",
    fontSize: 20,
    fontWeight: "normal",
    color: "#00C2CB",
    textAlign: "left",
    top: 55,
    left: 8,
    width: 60,
  },
  {
    id: "blk-m5",
    type: "completion_date",
    fontSize: 14,
    fontWeight: "normal",
    color: "#999999",
    textAlign: "left",
    top: 72,
    left: 8,
    width: 35,
  },
  {
    id: "blk-m6",
    type: "course_hours",
    fontSize: 14,
    fontWeight: "normal",
    color: "#999999",
    textAlign: "left",
    top: 80,
    left: 8,
    width: 35,
  },
],
```

Note: The only changes from original are `top` values — Clássico title moved from 18→15, platform from 30→28, student from 42→40, custom from 55→53, and Moderno title from 22→20, completion from 75→72. These create consistent gaps.

- [ ] **Step 2: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: `✓ built in`

- [ ] **Step 3: Commit Sprint A**

```bash
git add src/components/certificates/CertificateRenderer.tsx src/data/mock-certificates.ts
git commit -m "fix: scale certificate text proportionally and fix mock template spacing"
```

---

## Sprint B — Quiz System

### Task 3: Add quiz types

**Files:**
- Modify: `src/types/course.ts`
- Modify: `src/types/student.ts`

- [ ] **Step 1: Add quiz types to course.ts**

Add before the `CourseLesson` type definition:

```typescript
export type QuizQuestionType = "multiple_choice" | "true_false";

export type QuizOption = {
  id: string;
  text: string;
};

export type QuizQuestion = {
  id: string;
  type: QuizQuestionType;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
};
```

Add optional quiz fields to the existing `CourseLesson` type:

```typescript
export type CourseLesson = {
  id: string;
  title: string;
  order: number;
  isActive: boolean;
  videoType: CourseVideoType;
  videoUrl: string | null;
  description: string;
  materials?: CourseLessonMaterial[];
  links?: CourseLessonLink[];
  files?: CourseLessonFile[];
  quiz?: QuizQuestion[];
  quizPassingScore?: number;
  quizRequiredToAdvance?: boolean;
};
```

- [ ] **Step 2: Add QuizAttempt type to student.ts**

Add at the end of the file:

```typescript
// ---------------------------------------------------------------------------
// Quiz Attempts
// ---------------------------------------------------------------------------

export type QuizAttempt = {
  id: string;
  studentId: string;
  lessonId: string;
  answers: Record<string, string>;
  score: number;
  passed: boolean;
  attemptedAt: string;
};
```

- [ ] **Step 3: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: `✓ built in`

### Task 4: Add mock quiz data to courses

**Files:**
- Modify: `src/data/mock-courses.ts`

- [ ] **Step 1: Add quiz to aula-1-3 ("Modos de disparo")**

Add `quiz`, `quizPassingScore`, and `quizRequiredToAdvance` fields to the lesson with id `"aula-1-3"`:

```typescript
{
  id: "aula-1-3",
  title: "Modos de disparo",
  order: 3,
  isActive: true,
  videoType: "youtube",
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  description:
    "Auto, Prioridade de Abertura, Prioridade de Velocidade e Manual — quando usar cada um.",
  quiz: [
    {
      id: "q1-1-3-a",
      type: "multiple_choice",
      question: "Qual modo de disparo dá controle total sobre abertura e velocidade?",
      options: [
        { id: "q1a", text: "Auto" },
        { id: "q1b", text: "Prioridade de Abertura" },
        { id: "q1c", text: "Manual" },
        { id: "q1d", text: "Prioridade de Velocidade" },
      ],
      correctOptionId: "q1c",
    },
    {
      id: "q1-1-3-b",
      type: "multiple_choice",
      question: "No modo Prioridade de Abertura, o que o fotógrafo controla?",
      options: [
        { id: "q2a", text: "Velocidade do obturador" },
        { id: "q2b", text: "Abertura do diafragma" },
        { id: "q2c", text: "ISO automático" },
      ],
      correctOptionId: "q2b",
    },
    {
      id: "q1-1-3-c",
      type: "true_false",
      question: "O modo Auto é recomendado para situações de iluminação complexa.",
      options: [
        { id: "q3a", text: "Verdadeiro" },
        { id: "q3b", text: "Falso" },
      ],
      correctOptionId: "q3b",
    },
  ],
  quizPassingScore: 70,
  quizRequiredToAdvance: true,
},
```

- [ ] **Step 2: Add quiz to aula-2-3 ("Exercício prático")**

Replace the lesson with id `"aula-2-3"`:

```typescript
{
  id: "aula-2-3",
  title: "Exercício prático",
  order: 3,
  isActive: true,
  videoType: "none",
  videoUrl: null,
  description:
    "Saia com sua câmera e pratique as técnicas de composição aprendidas. Tire 10 fotos usando regra dos terços e 10 usando linhas guia.",
  files: [
    { name: "checklist-composicao.pdf", sizeLabel: "245 KB" },
  ],
  quiz: [
    {
      id: "q2-2-3-a",
      type: "true_false",
      question: "A regra dos terços divide a imagem em 9 partes iguais.",
      options: [
        { id: "q4a", text: "Verdadeiro" },
        { id: "q4b", text: "Falso" },
      ],
      correctOptionId: "q4a",
    },
    {
      id: "q2-2-3-b",
      type: "true_false",
      question: "Linhas guia devem sempre ser horizontais para ter efeito.",
      options: [
        { id: "q5a", text: "Verdadeiro" },
        { id: "q5b", text: "Falso" },
      ],
      correctOptionId: "q5b",
    },
  ],
  quizPassingScore: 70,
  quizRequiredToAdvance: false,
},
```

- [ ] **Step 3: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: `✓ built in`

### Task 5: Create useQuizAttempts hook

**Files:**
- Create: `src/hooks/useQuizAttempts.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useCallback, useSyncExternalStore } from "react";
import type { QuizAttempt } from "@/types/student";
import type { QuizQuestion } from "@/types/course";

// ---------------------------------------------------------------------------
// In-memory store with localStorage persistence
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

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
        (a) =>
          a.studentId === studentId &&
          a.lessonId === lessonId &&
          a.passed
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
```

- [ ] **Step 2: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: `✓ built in`

### Task 6: Create LessonQuiz student component

**Files:**
- Create: `src/components/courses/LessonQuiz.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useMemo, useCallback } from "react";
import { CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";

import type { QuizQuestion } from "@/types/course";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuizAttempts } from "@/hooks/useQuizAttempts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type LessonQuizProps = {
  quiz: QuizQuestion[];
  passingScore: number;
  lessonId: string;
  onPass: () => void;
};

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

export function LessonQuiz({
  quiz,
  passingScore,
  lessonId,
  onPass,
}: LessonQuizProps) {
  const { currentUserId } = useCurrentUser();
  const { submitAttempt, hasPassedQuiz, getBestAttempt, getAttempts } =
    useQuizAttempts();

  const alreadyPassed = hasPassedQuiz(currentUserId, lessonId);
  const bestAttempt = getBestAttempt(currentUserId, lessonId);
  const attemptCount = getAttempts(currentUserId, lessonId).length;

  const [attemptSeed, setAttemptSeed] = useState(() => Date.now());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    correctMap: Record<string, boolean>;
  } | null>(null);

  const shuffledQuiz = useMemo(
    () => shuffleArray(quiz, attemptSeed),
    [quiz, attemptSeed]
  );

  const allAnswered = shuffledQuiz.every((q) => answers[q.id]);

  const handleSelect = useCallback((questionId: string, optionId: string) => {
    if (result) return; // locked after submit
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }, [result]);

  function handleSubmit() {
    const attempt = submitAttempt(
      currentUserId,
      lessonId,
      quiz,
      answers,
      passingScore
    );
    const correctMap: Record<string, boolean> = {};
    for (const q of quiz) {
      correctMap[q.id] = answers[q.id] === q.correctOptionId;
    }
    setResult({ score: attempt.score, passed: attempt.passed, correctMap });
    if (attempt.passed) {
      onPass();
    }
  }

  function handleRetry() {
    setAnswers({});
    setResult(null);
    setAttemptSeed(Date.now());
  }

  // Already passed — show summary
  if (alreadyPassed && !result) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Quiz aprovado!
            </p>
            <p className="text-xs text-muted-foreground">
              Melhor nota: {bestAttempt?.score ?? 0}% · {attemptCount} tentativa
              {attemptCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
            Aprovado
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Quiz da Aula</CardTitle>
          <span className="text-xs text-muted-foreground">
            Nota mínima: {passingScore}%
          </span>
        </div>
        {result && (
          <div
            className={cn(
              "rounded-lg p-3 mt-2 text-sm font-medium",
              result.passed
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {result.passed
              ? `Aprovado! Nota: ${result.score}%`
              : `Reprovado. Nota: ${result.score}% (mínimo: ${passingScore}%)`}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {shuffledQuiz.map((q, idx) => {
          const questionResult = result?.correctMap[q.id];
          return (
            <div
              key={q.id}
              className={cn(
                "rounded-lg border p-4 space-y-2.5 transition-colors",
                result && questionResult === true && "border-emerald-500/30 bg-emerald-500/5",
                result && questionResult === false && "border-destructive/30 bg-destructive/5"
              )}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-muted-foreground mt-0.5">
                  {idx + 1}.
                </span>
                <p className="text-sm font-medium flex-1">{q.question}</p>
                {result && questionResult === true && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                )}
                {result && questionResult === false && (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
              </div>
              <div className="space-y-1.5 pl-5">
                {q.options.map((opt) => {
                  const isSelected = answers[q.id] === opt.id;
                  const isCorrect = result && opt.id === q.correctOptionId;
                  const isWrong = result && isSelected && !isCorrect;
                  return (
                    <label
                      key={opt.id}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors",
                        !result && isSelected && "border-primary bg-primary/5",
                        !result && !isSelected && "border-border/50 hover:border-border",
                        isCorrect && "border-emerald-500/50 bg-emerald-500/10",
                        isWrong && "border-destructive/50 bg-destructive/10",
                        result && "cursor-default"
                      )}
                    >
                      <input
                        type="radio"
                        name={`quiz-${q.id}`}
                        value={opt.id}
                        checked={isSelected}
                        onChange={() => handleSelect(q.id, opt.id)}
                        disabled={!!result}
                        className="accent-primary"
                      />
                      <span>{opt.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {!result ? (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="gap-1.5"
            >
              Enviar respostas
            </Button>
          ) : !result.passed ? (
            <Button onClick={handleRetry} variant="outline" className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Tentar novamente
            </Button>
          ) : null}
          {attemptCount > 0 && !result && (
            <span className="text-xs text-muted-foreground">
              {attemptCount} tentativa{attemptCount !== 1 ? "s" : ""} anterior
              {attemptCount !== 1 ? "es" : ""}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: `✓ built in`

### Task 7: Add quiz editor to AdminModuleEditPage

**Files:**
- Modify: `src/pages/admin/AdminModuleEditPage.tsx`

- [ ] **Step 1: Extend LessonFormState and conversion functions**

Replace the `LessonFormState` type, `emptyLessonForm`, and `lessonToForm` with:

```typescript
type LessonFormState = {
  title: string;
  isActive: boolean;
  mode: "video" | "text" | "quiz" | "video_quiz";
  videoType: CourseVideoType;
  videoUrl: string;
  description: string;
  quiz: QuizQuestion[];
  quizPassingScore: number;
  quizRequiredToAdvance: boolean;
};

const emptyLessonForm: LessonFormState = {
  title: "",
  isActive: true,
  mode: "video",
  videoType: "youtube",
  videoUrl: "",
  description: "",
  quiz: [],
  quizPassingScore: 70,
  quizRequiredToAdvance: false,
};

function lessonToForm(lesson: CourseLesson): LessonFormState {
  const hasQuiz = lesson.quiz && lesson.quiz.length > 0;
  const isText = lesson.videoType === "none";
  let mode: LessonFormState["mode"] = "video";
  if (isText && hasQuiz) mode = "quiz";
  else if (isText && !hasQuiz) mode = "text";
  else if (!isText && hasQuiz) mode = "video_quiz";
  return {
    title: lesson.title,
    isActive: lesson.isActive,
    mode,
    videoType: lesson.videoType === "none" ? "youtube" : lesson.videoType,
    videoUrl: lesson.videoUrl ?? "",
    description: lesson.description,
    quiz: lesson.quiz ?? [],
    quizPassingScore: lesson.quizPassingScore ?? 70,
    quizRequiredToAdvance: lesson.quizRequiredToAdvance ?? false,
  };
}
```

Also add the import for `QuizQuestion` at the top:

```typescript
import type { CourseLesson, CourseVideoType, QuizQuestion } from "@/types/course";
```

And add the `ClipboardCheck` icon to the lucide import:

```typescript
import { ..., ClipboardCheck } from "lucide-react";
```

- [ ] **Step 2: Update handleSaveLesson to persist quiz data**

In `handleSaveLesson`, update the videoType logic and add quiz fields:

```typescript
function handleSaveLesson() {
  if (!lessonForm.title.trim()) {
    toast.error("Informe o titulo da aula.");
    return;
  }

  const isQuizMode = lessonForm.mode === "quiz" || lessonForm.mode === "video_quiz";
  const isVideoMode = lessonForm.mode === "video" || lessonForm.mode === "video_quiz";

  const videoType: CourseVideoType = isVideoMode ? lessonForm.videoType : "none";
  const videoUrl = isVideoMode ? lessonForm.videoUrl.trim() || null : null;
  const quiz = isQuizMode ? lessonForm.quiz : undefined;
  const quizPassingScore = isQuizMode ? lessonForm.quizPassingScore : undefined;
  const quizRequiredToAdvance = isQuizMode ? lessonForm.quizRequiredToAdvance : undefined;

  if (editingLessonId) {
    updateLesson(courseId!, moduleId!, editingLessonId, {
      title: lessonForm.title.trim(),
      isActive: lessonForm.isActive,
      videoType,
      videoUrl,
      description: lessonForm.description.trim(),
      quiz,
      quizPassingScore,
      quizRequiredToAdvance,
    });
    toast.success("Aula atualizada.");
  } else {
    createLesson(courseId!, moduleId!, {
      title: lessonForm.title.trim(),
      isActive: lessonForm.isActive,
      videoType,
      videoUrl,
      description: lessonForm.description.trim(),
      quiz,
      quizPassingScore,
      quizRequiredToAdvance,
    });
    toast.success("Aula criada.");
  }
  setLessonDialogOpen(false);
}
```

- [ ] **Step 3: Add quiz mode to RadioGroup and quiz editor UI in the dialog**

In the dialog's content area, replace the `RadioGroup` for mode with 4 options:

```tsx
<RadioGroup
  value={lessonForm.mode}
  onValueChange={(v) =>
    updateLessonField("mode", v as LessonFormState["mode"])
  }
  className="flex flex-wrap gap-4"
>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="video" id="mode-video" />
    <Label htmlFor="mode-video" className="flex items-center gap-1">
      <Video className="h-4 w-4" /> Video
    </Label>
  </div>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="text" id="mode-text" />
    <Label htmlFor="mode-text" className="flex items-center gap-1">
      <FileText className="h-4 w-4" /> Texto
    </Label>
  </div>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="quiz" id="mode-quiz" />
    <Label htmlFor="mode-quiz" className="flex items-center gap-1">
      <ClipboardCheck className="h-4 w-4" /> Quiz
    </Label>
  </div>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="video_quiz" id="mode-video-quiz" />
    <Label htmlFor="mode-video-quiz" className="flex items-center gap-1">
      <Video className="h-4 w-4" />+<ClipboardCheck className="h-4 w-4" /> Video + Quiz
    </Label>
  </div>
</RadioGroup>
```

Show video fields when mode is `video` or `video_quiz`. Show quiz editor when mode is `quiz` or `video_quiz`.

Add the quiz editor section after the description Textarea (inside the dialog content):

```tsx
{/* Quiz editor */}
{(lessonForm.mode === "quiz" || lessonForm.mode === "video_quiz") && (
  <div className="space-y-3 rounded-lg border border-border/50 p-4">
    <div className="flex items-center justify-between">
      <Label className="text-sm font-semibold">Perguntas do Quiz</Label>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          const newQ: QuizQuestion = {
            id: crypto.randomUUID(),
            type: "multiple_choice",
            question: "",
            options: [
              { id: crypto.randomUUID(), text: "" },
              { id: crypto.randomUUID(), text: "" },
            ],
            correctOptionId: "",
          };
          updateLessonField("quiz", [...lessonForm.quiz, newQ]);
        }}
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar pergunta
      </Button>
    </div>

    {lessonForm.quiz.length === 0 && (
      <p className="text-sm text-muted-foreground">Nenhuma pergunta adicionada.</p>
    )}

    {lessonForm.quiz.map((q, qIdx) => (
      <div key={q.id} className="space-y-2 rounded-md border p-3 bg-card/50">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Pergunta {qIdx + 1}</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => {
              updateLessonField("quiz", lessonForm.quiz.filter((_, i) => i !== qIdx));
            }}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>

        {/* Question type */}
        <Select
          value={q.type}
          onValueChange={(v) => {
            const updated = [...lessonForm.quiz];
            if (v === "true_false") {
              updated[qIdx] = {
                ...q,
                type: "true_false",
                options: [
                  { id: "tf-v", text: "Verdadeiro" },
                  { id: "tf-f", text: "Falso" },
                ],
                correctOptionId: q.correctOptionId === "tf-v" || q.correctOptionId === "tf-f" ? q.correctOptionId : "",
              };
            } else {
              updated[qIdx] = { ...q, type: "multiple_choice" };
            }
            updateLessonField("quiz", updated);
          }}
        >
          <SelectTrigger className="h-8 text-xs w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
            <SelectItem value="true_false">Verdadeiro ou Falso</SelectItem>
          </SelectContent>
        </Select>

        {/* Question text */}
        <Input
          placeholder="Texto da pergunta..."
          value={q.question}
          onChange={(e) => {
            const updated = [...lessonForm.quiz];
            updated[qIdx] = { ...q, question: e.target.value };
            updateLessonField("quiz", updated);
          }}
          className="text-sm"
        />

        {/* Options */}
        <div className="space-y-1.5 pl-2">
          {q.options.map((opt, optIdx) => (
            <div key={opt.id} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${q.id}`}
                checked={q.correctOptionId === opt.id}
                onChange={() => {
                  const updated = [...lessonForm.quiz];
                  updated[qIdx] = { ...q, correctOptionId: opt.id };
                  updateLessonField("quiz", updated);
                }}
                className="accent-primary"
                title="Marcar como correta"
              />
              {q.type === "true_false" ? (
                <span className="text-sm">{opt.text}</span>
              ) : (
                <Input
                  value={opt.text}
                  onChange={(e) => {
                    const updated = [...lessonForm.quiz];
                    const opts = [...q.options];
                    opts[optIdx] = { ...opt, text: e.target.value };
                    updated[qIdx] = { ...q, options: opts };
                    updateLessonField("quiz", updated);
                  }}
                  placeholder={`Opção ${optIdx + 1}`}
                  className="h-8 text-xs flex-1"
                />
              )}
              {q.type === "multiple_choice" && q.options.length > 2 && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  onClick={() => {
                    const updated = [...lessonForm.quiz];
                    const opts = q.options.filter((_, i) => i !== optIdx);
                    updated[qIdx] = {
                      ...q,
                      options: opts,
                      correctOptionId: q.correctOptionId === opt.id ? "" : q.correctOptionId,
                    };
                    updateLessonField("quiz", updated);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
          {q.type === "multiple_choice" && q.options.length < 5 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-xs h-7"
              onClick={() => {
                const updated = [...lessonForm.quiz];
                updated[qIdx] = {
                  ...q,
                  options: [...q.options, { id: crypto.randomUUID(), text: "" }],
                };
                updateLessonField("quiz", updated);
              }}
            >
              <Plus className="mr-1 h-3 w-3" /> Adicionar opção
            </Button>
          )}
        </div>

        {!q.correctOptionId && (
          <p className="text-xs text-destructive">Selecione a resposta correta.</p>
        )}
      </div>
    ))}

    {/* Quiz settings */}
    {lessonForm.quiz.length > 0 && (
      <div className="space-y-3 pt-2 border-t">
        <div className="space-y-1">
          <Label className="text-xs">Nota mínima: {lessonForm.quizPassingScore}%</Label>
          <input
            type="range"
            min={50}
            max={100}
            value={lessonForm.quizPassingScore}
            onChange={(e) => updateLessonField("quizPassingScore", Number(e.target.value))}
            className="w-full h-1.5 accent-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="quiz-required"
            checked={lessonForm.quizRequiredToAdvance}
            onCheckedChange={(v) => updateLessonField("quizRequiredToAdvance", v)}
          />
          <Label htmlFor="quiz-required" className="text-xs">Obrigatório para avançar</Label>
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Update the video fields condition**

Change the condition for showing video fields from `lessonForm.mode === "video"` to:

```tsx
{(lessonForm.mode === "video" || lessonForm.mode === "video_quiz") && (
```

- [ ] **Step 5: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: `✓ built in`

### Task 8: Integrate LessonQuiz into CourseDetailPage

**Files:**
- Modify: `src/pages/student/CourseDetailPage.tsx`

- [ ] **Step 1: Add imports**

Add to the imports:

```typescript
import { useQuizAttempts } from "@/hooks/useQuizAttempts";
import { LessonQuiz } from "@/components/courses/LessonQuiz";
```

Add hook call after the existing hook calls (near the top of the component):

```typescript
const { hasPassedQuiz } = useQuizAttempts();
```

- [ ] **Step 2: Add quiz rendering in the lesson content area**

Find the section where `LessonPlayer` is rendered (inside `{activeLesson && !lessonBlocked && (` block). After `<LessonPlayer lesson={activeLesson} />`, add the quiz:

```tsx
{/* Quiz — below video or replacing video */}
{activeLesson.quiz && activeLesson.quiz.length > 0 && (
  <div className="max-w-[860px]">
    <LessonQuiz
      quiz={activeLesson.quiz}
      passingScore={activeLesson.quizPassingScore ?? 70}
      lessonId={activeLesson.id}
      onPass={() => {
        // Quiz passed — no auto-action, student still clicks "Concluir"
      }}
    />
  </div>
)}
```

For the case where there's no video but has quiz (`videoType === "none"`), the `LessonPlayer` won't render anything meaningful. The quiz will appear below the description.

- [ ] **Step 3: Disable "Concluir aula" button when quiz is required but not passed**

Find the "Concluir aula" button and wrap it with quiz check logic. Replace the Button's `disabled` state by updating the button:

Find the button that calls `handleToggleCompleteLesson` and add disabled logic:

```tsx
const quizRequired = activeLesson.quizRequiredToAdvance && activeLesson.quiz && activeLesson.quiz.length > 0;
const quizBlocked = quizRequired && !hasPassedQuiz(currentUserId, activeLesson.id);
```

Add this above the button, then update the button:

```tsx
<Button
  size="sm"
  variant={completedLessons[activeLesson.id] ? "outline" : "default"}
  onClick={handleToggleCompleteLesson}
  disabled={quizBlocked}
  title={quizBlocked ? "Aprove no quiz para concluir" : undefined}
  className={cn(
    "gap-1.5 transition-all active:scale-[0.97]",
    !completedLessons[activeLesson.id] && !quizBlocked && "shadow-sm shadow-primary/15 hover:shadow-md hover:shadow-primary/20"
  )}
>
```

- [ ] **Step 4: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: `✓ built in`

- [ ] **Step 5: Commit Sprint B**

```bash
git add src/types/course.ts src/types/student.ts src/data/mock-courses.ts src/hooks/useQuizAttempts.ts src/components/courses/LessonQuiz.tsx src/pages/admin/AdminModuleEditPage.tsx src/pages/student/CourseDetailPage.tsx
git commit -m "feat: add quiz system with multiple choice and true/false questions"
```

---

## Sprint C — Expanded Certificate Requirements

### Task 9: Expand CertificateConfig type

**Files:**
- Modify: `src/types/course.ts`

- [ ] **Step 1: Add requirement type and expand CertificateConfig**

Replace the existing `CertificateConfig` type:

```typescript
export type CertificateRequirementType =
  | "completion"
  | "quiz"
  | "completion_and_quiz";

export type CertificateConfig = {
  templateId: string | null;
  completionThreshold: number;
  hoursLoad: number;
  requirementType: CertificateRequirementType;
  quizThreshold: number;
};
```

- [ ] **Step 2: Verify build — expect errors in files that use CertificateConfig**

Run: `npx vite build 2>&1 | grep "error TS"`
Expected: Errors in `useCertificates.ts` and `AdminCourseEditPage.tsx` about missing `requirementType` / `quizThreshold`. These will be fixed in the next tasks.

### Task 10: Update useCertificates with expanded check logic

**Files:**
- Modify: `src/hooks/useCertificates.ts`

- [ ] **Step 1: Update the checkAndAwardCertificate function signature and logic**

Replace the `checkAndAwardCertificate` callback with the expanded version. The course param type needs `requirementType` and `quizThreshold`:

```typescript
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
        quizMet = true; // no quizzes = auto-pass
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
```

- [ ] **Step 2: Verify build**

Run: `npx vite build 2>&1 | tail -5`

### Task 11: Update AdminCourseEditPage with requirement type UI

**Files:**
- Modify: `src/pages/admin/AdminCourseEditPage.tsx`

- [ ] **Step 1: Add state for new fields**

Add after the existing cert state variables:

```typescript
const [certRequirementType, setCertRequirementType] = useState<string>(
  course?.certificateConfig?.requirementType ?? "completion"
);
const [certQuizThreshold, setCertQuizThreshold] = useState(
  course?.certificateConfig?.quizThreshold ?? 70
);
```

- [ ] **Step 2: Update handleSave to include new fields**

Update the `certificateConfig` in the save handler:

```typescript
certificateConfig: {
  templateId: certTemplateId || null,
  completionThreshold: certThreshold,
  hoursLoad: certHours,
  requirementType: certRequirementType as "completion" | "quiz" | "completion_and_quiz",
  quizThreshold: certQuizThreshold,
},
```

- [ ] **Step 3: Replace the certificate section UI**

Replace the certificate Card content (inside `{certTemplateId && (` block) with the expanded version including requirement type radio group:

```tsx
{certTemplateId && (
  <>
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Tipo de requisito</Label>
      <div className="space-y-2">
        {[
          { value: "completion", label: "Conclusão de aulas" },
          { value: "quiz", label: "Aprovação nos quizzes" },
          { value: "completion_and_quiz", label: "Conclusão + Quizzes" },
        ].map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="cert-req-type"
              value={opt.value}
              checked={certRequirementType === opt.value}
              onChange={(e) => setCertRequirementType(e.target.value)}
              className="accent-primary"
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>

    {(certRequirementType === "completion" || certRequirementType === "completion_and_quiz") && (
      <div className="space-y-1.5">
        <Label>
          Percentual de conclusão — {certThreshold}%
        </Label>
        <input
          type="range"
          min={50}
          max={100}
          value={certThreshold}
          onChange={(e) => setCertThreshold(Number(e.target.value))}
          className="w-full h-2 accent-primary"
        />
        <p className="text-xs text-muted-foreground">
          O aluno precisa concluir {certThreshold}% das aulas.
        </p>
      </div>
    )}

    {(certRequirementType === "quiz" || certRequirementType === "completion_and_quiz") && (
      <div className="space-y-1.5">
        <Label>
          Nota mínima média nos quizzes — {certQuizThreshold}%
        </Label>
        <input
          type="range"
          min={50}
          max={100}
          value={certQuizThreshold}
          onChange={(e) => setCertQuizThreshold(Number(e.target.value))}
          className="w-full h-2 accent-primary"
        />
        <p className="text-xs text-muted-foreground">
          Média dos melhores scores do aluno nos quizzes.
        </p>
      </div>
    )}

    <div className="space-y-1.5">
      <Label htmlFor="cert-hours">
        Carga horária do curso (horas)
      </Label>
      <Input
        id="cert-hours"
        type="number"
        min={0}
        value={certHours}
        onChange={(e) => setCertHours(Number(e.target.value))}
        className="w-32"
      />
    </div>

    {/* Preview */}
    {(() => {
      const tpl = templates.find((t) => t.id === certTemplateId);
      if (!tpl) return null;
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Preview do certificado</Label>
          <div className="rounded-lg border overflow-hidden max-w-md">
            <CertificateRenderer
              template={tpl}
              data={{
                studentName: "Ana Paula Ferreira",
                courseName: title || "Nome do curso",
                completionDate: "29 de março de 2026",
                courseHours: certHours,
                platformName: platformSettings.name || "Lumi Membros",
              }}
            />
          </div>
        </div>
      );
    })()}
  </>
)}
```

- [ ] **Step 4: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: `✓ built in`

### Task 12: Update CourseDetailPage certificate indicators and check

**Files:**
- Modify: `src/pages/student/CourseDetailPage.tsx`

- [ ] **Step 1: Pass quizScoreGetter to checkAndAwardCertificate**

Find the `checkAndAwardCertificate` call in `handleToggleCompleteLesson` and add the quiz score getter:

```typescript
// Check certificate award
if (course && courseId) {
  const awarded = checkAndAwardCertificate(
    currentUserId,
    courseId,
    course,
    nextCompleted,
    (lessonIds) => getQuizScoresForCourse(currentUserId, lessonIds)
  );
```

Add `getQuizScoresForCourse` to the `useQuizAttempts` destructuring:

```typescript
const { hasPassedQuiz, getQuizScoresForCourse } = useQuizAttempts();
```

- [ ] **Step 2: Update certificate progress indicator**

Replace the existing certificate progress section with expanded indicators:

```tsx
{/* Certificate progress */}
{courseId &&
  !hasEarnedCertificate(currentUserId, courseId) &&
  course.certificateConfig?.templateId && (() => {
    const reqType = course.certificateConfig.requirementType ?? "completion";
    const showCompletion = reqType === "completion" || reqType === "completion_and_quiz";
    const showQuiz = reqType === "quiz" || reqType === "completion_and_quiz";
    const quizLessonIds = allLessons.filter(l => l.quiz && l.quiz.length > 0).map(l => l.id);
    const quizAvg = showQuiz && quizLessonIds.length > 0
      ? getQuizScoresForCourse(currentUserId, quizLessonIds)
      : 0;
    const quizThreshold = course.certificateConfig.quizThreshold ?? 70;

    return (
      <div className="space-y-2 text-xs text-muted-foreground">
        {showCompletion && (
          <div className="space-y-1">
            <span className="flex items-center gap-1.5">
              {percentCompleted >= course.certificateConfig.completionThreshold ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Award className="h-3.5 w-3.5 text-primary/60" />
              )}
              Complete {course.certificateConfig.completionThreshold}% das aulas
              ({Math.round(percentCompleted)}% atual)
            </span>
            <Progress value={percentCompleted} className="h-1" />
          </div>
        )}
        {showQuiz && quizLessonIds.length > 0 && (
          <div className="space-y-1">
            <span className="flex items-center gap-1.5">
              {quizAvg >= quizThreshold ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Award className="h-3.5 w-3.5 text-primary/60" />
              )}
              Alcance {quizThreshold}% de média nos quizzes
              ({quizAvg}% atual)
            </span>
            <Progress value={quizAvg} className="h-1" />
          </div>
        )}
      </div>
    );
  })()}
```

- [ ] **Step 3: Verify build**

Run: `npx vite build 2>&1 | tail -5`
Expected: `✓ built in`

- [ ] **Step 4: Commit Sprint C**

```bash
git add src/types/course.ts src/hooks/useCertificates.ts src/pages/admin/AdminCourseEditPage.tsx src/pages/student/CourseDetailPage.tsx
git commit -m "feat: expand certificate requirements to support quiz-based awarding"
```

### Task 13: Final build verification

- [ ] **Step 1: Full build**

Run: `npx vite build 2>&1 | tail -10`
Expected: `✓ built in` with no new errors from our changes.
