import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  GraduationCap,
  Plus,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Loader2,
  Save,
  Video,
  FileText,
  ThumbsUp,
  ThumbsDown,
  ClipboardCheck,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useCourses } from "@/hooks/useCourses";
import { useAdminLessonRatings } from "@/hooks/useLessonRatings";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import type { CourseLesson, CourseVideoType, QuizQuestion } from "@/types/course";
import { LessonMaterialsManager } from "@/components/admin/LessonMaterialsManager";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// ---------------------------------------------------------------------------
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
  ratingsEnabled: boolean;
  commentsEnabled: boolean;
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
  ratingsEnabled: true,
  commentsEnabled: true,
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
    ratingsEnabled: lesson.ratingsEnabled,
    commentsEnabled: lesson.commentsEnabled ?? true,
  };
}

function videoTypeLabel(vt: CourseVideoType): string {
  switch (vt) {
    case "youtube":
      return "YouTube";
    case "vimeo":
      return "Vimeo";
    case "embed":
      return "Embed";
    case "none":
      return "Sem video";
  }
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
export default function AdminModuleEditPage() {
  const { courseId, moduleId } = useParams<{
    courseId: string;
    moduleId: string;
  }>();
  const {
    findCourse,
    findModule,
    updateModule,
    createLesson,
    updateLesson,
    deleteLesson,
    moveLesson,
  } = useCourses();
  const { getCounts: getLessonRatingCounts } = useAdminLessonRatings();
  const { settings: platformSettings } = usePlatformSettings();

  const course = findCourse(courseId);
  const mod = findModule(courseId, moduleId);

  // Module form
  const [title, setTitle] = useState(mod?.title ?? "");
  const [isActive, setIsActive] = useState(mod?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  // Lesson dialog
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] =
    useState<LessonFormState>(emptyLessonForm);
  const [lessonDirty, setLessonDirty] = useState(false);

  if (!course || !mod || !courseId || !moduleId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20">
        <p className="text-muted-foreground">Modulo nao encontrado.</p>
        <Button variant="outline" asChild>
          <Link to="/admin/cursos">Voltar</Link>
        </Button>
      </div>
    );
  }

  const sortedLessons = [...mod.lessons].sort((a, b) => a.order - b.order);

  // ---------- Save module ----------
  function handleSaveModule() {
    if (!title.trim()) {
      toast.error("Informe o titulo do modulo.");
      return;
    }
    setSaving(true);
    updateModule(courseId!, moduleId!, {
      title: title.trim(),
      isActive,
    });
    toast.success("Modulo salvo.");
    setTimeout(() => setSaving(false), 400);
  }

  // ---------- Lesson dialog ----------
  function openCreateLesson() {
    setEditingLessonId(null);
    setLessonForm(emptyLessonForm);
    setLessonDirty(false);
    setLessonDialogOpen(true);
  }

  function openEditLesson(lesson: CourseLesson) {
    setEditingLessonId(lesson.id);
    setLessonForm(lessonToForm(lesson));
    setLessonDirty(false);
    setLessonDialogOpen(true);
  }

  function updateLessonField<K extends keyof LessonFormState>(
    key: K,
    value: LessonFormState[K]
  ) {
    setLessonForm((prev) => ({ ...prev, [key]: value }));
    setLessonDirty(true);
  }

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
        ratingsEnabled: lessonForm.ratingsEnabled,
        commentsEnabled: lessonForm.commentsEnabled,
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
        ratingsEnabled: lessonForm.ratingsEnabled,
        commentsEnabled: lessonForm.commentsEnabled,
      });
      toast.success("Aula criada.");
    }
    setLessonDialogOpen(false);
  }

  function handleToggleLesson(lessonId: string, current: boolean) {
    updateLesson(courseId!, moduleId!, lessonId, { isActive: !current });
    toast.success(!current ? "Aula ativada." : "Aula desativada.");
  }

  function handleDeleteLesson(lessonId: string) {
    deleteLesson(courseId!, moduleId!, lessonId);
    toast.success("Aula removida.");
  }

  // ---------- Quiz helpers ----------
  function addQuestion() {
    const newQuestion: QuizQuestion = {
      id: generateId(),
      type: "multiple_choice",
      question: "",
      options: [
        { id: generateId(), text: "" },
        { id: generateId(), text: "" },
      ],
      correctOptionId: "",
    };
    updateLessonField("quiz", [...lessonForm.quiz, newQuestion]);
  }

  function removeQuestion(questionId: string) {
    updateLessonField(
      "quiz",
      lessonForm.quiz.filter((q) => q.id !== questionId)
    );
  }

  function updateQuestion(questionId: string, patch: Partial<QuizQuestion>) {
    updateLessonField(
      "quiz",
      lessonForm.quiz.map((q) => (q.id === questionId ? { ...q, ...patch } : q))
    );
  }

  function changeQuestionType(questionId: string, type: QuizQuestion["type"]) {
    const trueFalseOptions = [
      { id: generateId(), text: "Verdadeiro" },
      { id: generateId(), text: "Falso" },
    ];
    const multiChoiceOptions = [
      { id: generateId(), text: "" },
      { id: generateId(), text: "" },
    ];
    updateLessonField(
      "quiz",
      lessonForm.quiz.map((q) =>
        q.id === questionId
          ? {
              ...q,
              type,
              options: type === "true_false" ? trueFalseOptions : multiChoiceOptions,
              correctOptionId: "",
            }
          : q
      )
    );
  }

  function addOption(questionId: string) {
    updateLessonField(
      "quiz",
      lessonForm.quiz.map((q) => {
        if (q.id !== questionId) return q;
        if (q.options.length >= 5) return q;
        return { ...q, options: [...q.options, { id: generateId(), text: "" }] };
      })
    );
  }

  function removeOption(questionId: string, optionId: string) {
    updateLessonField(
      "quiz",
      lessonForm.quiz.map((q) => {
        if (q.id !== questionId) return q;
        if (q.options.length <= 2) return q;
        const newOptions = q.options.filter((o) => o.id !== optionId);
        return {
          ...q,
          options: newOptions,
          correctOptionId: q.correctOptionId === optionId ? "" : q.correctOptionId,
        };
      })
    );
  }

  function updateOptionText(questionId: string, optionId: string, text: string) {
    updateLessonField(
      "quiz",
      lessonForm.quiz.map((q) => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          options: q.options.map((o) =>
            o.id === optionId ? { ...o, text } : o
          ),
        };
      })
    );
  }

  // ---------- Render ----------
  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "Admin", to: "/admin" },
          { label: "Cursos", to: "/admin/cursos" },
          { label: course.title, to: `/admin/cursos/${courseId}/edit` },
          { label: mod.title },
        ]}
      />
      {/* ====== Header ====== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <GraduationCap className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Editar modulo</h1>
          <Badge variant={mod.isActive ? "default" : "secondary"}>
            {mod.isActive ? "Ativo" : "Inativo"}
          </Badge>
          <Badge variant="outline">{course.title}</Badge>
        </div>
        <Button onClick={handleSaveModule} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1 h-4 w-4" />
          )}
          Salvar
        </Button>
      </div>

      {/* ====== Module fields ====== */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="mod-title">Titulo</Label>
            <Input
              id="mod-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="mod-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="mod-active">Ativo</Label>
          </div>
        </CardContent>
      </Card>

      {/* ====== Lessons ====== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Aulas</h2>
          <Button size="sm" onClick={openCreateLesson}>
            <Plus className="mr-1 h-4 w-4" />
            Nova aula
          </Button>
        </div>

        {sortedLessons.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma aula cadastrada.
          </p>
        )}

        <div className="space-y-3">
          {sortedLessons.map((lesson) => (
            <Card key={lesson.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{lesson.title}</CardTitle>
                  <Badge
                    variant={lesson.isActive ? "default" : "secondary"}
                  >
                    {lesson.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  {lesson.videoType !== "none" ? (
                    <>
                      <Video className="h-3.5 w-3.5" />
                      {videoTypeLabel(lesson.videoType)}
                      {lesson.videoUrl && (
                        <span className="truncate max-w-[200px]">
                          {" "}
                          - {lesson.videoUrl}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5" />
                      Somente texto
                    </>
                  )}
                  {lesson.quiz && lesson.quiz.length > 0 && (
                    <span className="ml-2 flex items-center gap-1">
                      <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                      {lesson.quiz.length} {lesson.quiz.length === 1 ? "pergunta" : "perguntas"}
                    </span>
                  )}
                </p>

                {(() => {
                  const counts = getLessonRatingCounts(lesson.id);
                  return (counts.likes > 0 || counts.dislikes > 0) ? (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3.5 w-3.5 text-primary" />
                        {counts.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="h-3.5 w-3.5 text-destructive" />
                        {counts.dislikes}
                      </span>
                    </div>
                  ) : null;
                })()}

                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      moveLesson(courseId!, moduleId!, lesson.id, "up")
                    }
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      moveLesson(courseId!, moduleId!, lesson.id, "down")
                    }
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditLesson(lesson)}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleToggleLesson(lesson.id, lesson.isActive)
                    }
                  >
                    {lesson.isActive ? "Desativar" : "Ativar"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover aula?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acao nao pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteLesson(lesson.id)}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Materiais da aula */}
                <LessonMaterialsManager lessonId={lesson.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ====== Lesson create/edit dialog ====== */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingLessonId ? "Editar aula" : "Nova aula"}
            </DialogTitle>
            <DialogDescription>
              {editingLessonId
                ? "Atualize as informacoes da aula."
                : "Preencha os dados da nova aula."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="lesson-title">Titulo</Label>
              <Input
                id="lesson-title"
                value={lessonForm.title}
                onChange={(e) => updateLessonField("title", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="lesson-active"
                checked={lessonForm.isActive}
                onCheckedChange={(v) => updateLessonField("isActive", v)}
              />
              <Label htmlFor="lesson-active">Ativa</Label>
            </div>

            {/* Mode toggle */}
            <div className="space-y-2">
              <Label>Tipo de conteudo</Label>
              <RadioGroup
                value={lessonForm.mode}
                onValueChange={(v) =>
                  updateLessonField("mode", v as LessonFormState["mode"])
                }
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="video" id="mode-video" />
                  <Label htmlFor="mode-video" className="flex items-center gap-1 cursor-pointer">
                    <Video className="h-4 w-4" />
                    Video
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="text" id="mode-text" />
                  <Label htmlFor="mode-text" className="flex items-center gap-1 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    Texto
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="quiz" id="mode-quiz" />
                  <Label htmlFor="mode-quiz" className="flex items-center gap-1 cursor-pointer">
                    <ClipboardCheck className="h-4 w-4" />
                    Quiz
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="video_quiz" id="mode-video_quiz" />
                  <Label htmlFor="mode-video_quiz" className="flex items-center gap-1 cursor-pointer">
                    <ClipboardCheck className="h-4 w-4" />
                    Video + Quiz
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Video fields */}
            {(lessonForm.mode === "video" || lessonForm.mode === "video_quiz") && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de video</Label>
                  <Select
                    value={lessonForm.videoType}
                    onValueChange={(v) =>
                      updateLessonField("videoType", v as CourseVideoType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="vimeo">Vimeo</SelectItem>
                      <SelectItem value="embed">Embed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson-video-url">URL do video</Label>
                  <Input
                    id="lesson-video-url"
                    placeholder="https://..."
                    value={lessonForm.videoUrl}
                    onChange={(e) =>
                      updateLessonField("videoUrl", e.target.value)
                    }
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="lesson-desc">Descricao</Label>
              <Textarea
                id="lesson-desc"
                rows={6}
                value={lessonForm.description}
                onChange={(e) =>
                  updateLessonField("description", e.target.value)
                }
              />
            </div>

            {/* Ratings toggle */}
            <div className="space-y-3 rounded-lg border border-border/60 p-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-primary" />
                Avaliacoes
              </h3>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="lesson-ratings-toggle">
                    Permitir avaliacao nesta aula
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Quando desativado, os botoes de curtir/descurtir ficam ocultos apenas nesta aula.
                  </p>
                </div>
                <Switch
                  id="lesson-ratings-toggle"
                  checked={lessonForm.ratingsEnabled}
                  onCheckedChange={(v) => updateLessonField("ratingsEnabled", v)}
                />
              </div>
              {!platformSettings.ratingsEnabled && (
                <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Avaliacoes desativadas globalmente em Configuracoes
                </div>
              )}
            </div>

            {/* Comments toggle */}
            <div className="space-y-2 rounded-lg border border-border/60 p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Comentarios
              </h3>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="lesson-comments-toggle">
                    Permitir comentarios nesta aula
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Quando desativado, os comentarios ficam ocultos apenas nesta aula (se o curso tiver comentarios habilitados).
                  </p>
                </div>
                <Switch
                  id="lesson-comments-toggle"
                  checked={lessonForm.commentsEnabled}
                  onCheckedChange={(v) => updateLessonField("commentsEnabled", v)}
                />
              </div>
            </div>

            {/* Quiz editor */}
            {(lessonForm.mode === "quiz" || lessonForm.mode === "video_quiz") && (
              <div className="space-y-4 rounded-lg border border-border/60 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    Perguntas do Quiz
                  </h3>
                  <Button size="sm" variant="outline" onClick={addQuestion}>
                    <Plus className="mr-1 h-4 w-4" />
                    Adicionar pergunta
                  </Button>
                </div>

                {lessonForm.quiz.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma pergunta adicionada. Clique em "Adicionar pergunta" para comecar.
                  </p>
                )}

                <div className="space-y-4">
                  {lessonForm.quiz.map((question, qIndex) => (
                    <div
                      key={question.id}
                      className="rounded-md border border-border/50 p-4 space-y-3 bg-muted/20"
                    >
                      {/* Question header */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Pergunta {qIndex + 1}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => removeQuestion(question.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>

                      {/* Question type selector */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Tipo</Label>
                        <Select
                          value={question.type}
                          onValueChange={(v) =>
                            changeQuestionType(question.id, v as QuizQuestion["type"])
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple_choice">Multipla escolha</SelectItem>
                            <SelectItem value="true_false">Verdadeiro / Falso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Question text */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Enunciado</Label>
                        <Input
                          placeholder="Digite a pergunta..."
                          value={question.question}
                          onChange={(e) =>
                            updateQuestion(question.id, { question: e.target.value })
                          }
                        />
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Opcoes — selecione a correta
                        </Label>
                        <div className="space-y-2">
                          {question.options.map((option) => (
                            <div key={option.id} className="flex items-center gap-2">
                              {/* Radio to mark correct */}
                              <input
                                type="radio"
                                name={`correct-${question.id}`}
                                checked={question.correctOptionId === option.id}
                                onChange={() =>
                                  updateQuestion(question.id, { correctOptionId: option.id })
                                }
                                className="h-4 w-4 accent-primary shrink-0"
                              />
                              {question.type === "true_false" ? (
                                /* Fixed labels for true/false */
                                <span className="text-sm flex-1 py-1 px-2 rounded border border-border/40 bg-background">
                                  {option.text}
                                </span>
                              ) : (
                                /* Editable option text for multiple_choice */
                                <Input
                                  className="h-8 text-sm flex-1"
                                  placeholder={`Opcao ${question.options.indexOf(option) + 1}...`}
                                  value={option.text}
                                  onChange={(e) =>
                                    updateOptionText(question.id, option.id, e.target.value)
                                  }
                                />
                              )}
                              {/* Remove option button (multiple_choice only, min 2) */}
                              {question.type === "multiple_choice" && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 shrink-0"
                                  disabled={question.options.length <= 2}
                                  onClick={() => removeOption(question.id, option.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Add option (multiple_choice only, max 5) */}
                        {question.type === "multiple_choice" && question.options.length < 5 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => addOption(question.id)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Adicionar opcao
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quiz settings */}
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="passing-score" className="text-sm">
                        Nota minima para aprovacao
                      </Label>
                      <span className="text-sm font-semibold text-primary">
                        {lessonForm.quizPassingScore}%
                      </span>
                    </div>
                    <input
                      id="passing-score"
                      type="range"
                      min={50}
                      max={100}
                      step={5}
                      value={lessonForm.quizPassingScore}
                      onChange={(e) =>
                        updateLessonField("quizPassingScore", Number(e.target.value))
                      }
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="quiz-required"
                      checked={lessonForm.quizRequiredToAdvance}
                      onCheckedChange={(v) =>
                        updateLessonField("quizRequiredToAdvance", v)
                      }
                    />
                    <Label htmlFor="quiz-required" className="text-sm cursor-pointer">
                      Obrigatorio para avancar
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setLessonDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveLesson} disabled={!lessonDirty && !!editingLessonId}>
              {editingLessonId ? "Salvar" : "Criar aula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
