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
} from "lucide-react";
import { toast } from "sonner";

import { useCourses } from "@/hooks/useCourses";
import type { CourseLesson, CourseVideoType } from "@/types/course";

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
  mode: "video" | "text";
  videoType: CourseVideoType;
  videoUrl: string;
  description: string;
};

const emptyLessonForm: LessonFormState = {
  title: "",
  isActive: true,
  mode: "video",
  videoType: "youtube",
  videoUrl: "",
  description: "",
};

function lessonToForm(lesson: CourseLesson): LessonFormState {
  const isText =
    lesson.videoType === "none" ||
    (!lesson.videoUrl && lesson.videoType === "none");
  return {
    title: lesson.title,
    isActive: lesson.isActive,
    mode: isText ? "text" : "video",
    videoType: lesson.videoType === "none" ? "youtube" : lesson.videoType,
    videoUrl: lesson.videoUrl ?? "",
    description: lesson.description,
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

    const videoType: CourseVideoType =
      lessonForm.mode === "text" ? "none" : lessonForm.videoType;
    const videoUrl =
      lessonForm.mode === "text" ? null : lessonForm.videoUrl.trim() || null;

    if (editingLessonId) {
      updateLesson(courseId!, moduleId!, editingLessonId, {
        title: lessonForm.title.trim(),
        isActive: lessonForm.isActive,
        videoType,
        videoUrl,
        description: lessonForm.description.trim(),
      });
      toast.success("Aula atualizada.");
    } else {
      createLesson(courseId!, moduleId!, {
        title: lessonForm.title.trim(),
        isActive: lessonForm.isActive,
        videoType,
        videoUrl,
        description: lessonForm.description.trim(),
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

  // ---------- Render ----------
  return (
    <div className="space-y-8">
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
                </p>

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
                  updateLessonField("mode", v as "video" | "text")
                }
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="video" id="mode-video" />
                  <Label htmlFor="mode-video" className="flex items-center gap-1">
                    <Video className="h-4 w-4" />
                    Video
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="text" id="mode-text" />
                  <Label htmlFor="mode-text" className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Texto
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Video fields */}
            {lessonForm.mode === "video" && (
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
