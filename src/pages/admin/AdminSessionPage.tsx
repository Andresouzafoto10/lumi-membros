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
  ArrowRightLeft,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

import { useCourses } from "@/hooks/useCourses";
import type { CourseAccess } from "@/types/course";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
const PLANS = [
  { value: "start", label: "Start" },
  { value: "pro", label: "Pro" },
  { value: "max", label: "Max" },
] as const;

function accessLabel(access: CourseAccess): string {
  if (access.mode === "all") return "Todos";
  if (access.mode === "admin") return "Somente admin";
  return `Planos: ${access.plans.join(", ")}`;
}

// ---------------------------------------------------------------------------
type CourseFormState = {
  title: string;
  description: string;
  isActive: boolean;
  accessMode: "all" | "plans" | "admin";
  accessPlans: string[];
};

const emptyCourseForm: CourseFormState = {
  title: "",
  description: "",
  isActive: true,
  accessMode: "all",
  accessPlans: [],
};

// ---------------------------------------------------------------------------
export default function AdminSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const {
    sessions,
    findSession,
    updateSession,
    createCourse,
    updateCourse,
    deleteCourse,
    moveCourse,
    moveCourseToSession,
    duplicateCourseToSession,
  } = useCourses();

  const session = findSession(sessionId);

  // Session form state
  const [title, setTitle] = useState(session?.title ?? "");
  const [description, setDescription] = useState(session?.description ?? "");
  const [isActive, setIsActive] = useState(session?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  // Course create dialog
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [courseForm, setCourseForm] =
    useState<CourseFormState>(emptyCourseForm);

  // Move / Duplicate dialog
  const [transferDialog, setTransferDialog] = useState<{
    open: boolean;
    mode: "move" | "duplicate";
    courseId: string;
    courseTitle: string;
  }>({ open: false, mode: "move", courseId: "", courseTitle: "" });
  const [targetSessionId, setTargetSessionId] = useState("");

  const otherSessions = sessions.filter((s) => s.id !== sessionId);

  if (!session || !sessionId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20">
        <p className="text-muted-foreground">Sessao nao encontrada.</p>
        <Button variant="outline" asChild>
          <Link to="/admin/cursos">Voltar</Link>
        </Button>
      </div>
    );
  }

  const sortedCourses = [...session.courses].sort(
    (a, b) => a.order - b.order
  );

  // ---------- Save session ----------
  function handleSave() {
    if (!title.trim()) {
      toast.error("Informe o titulo da sessao.");
      return;
    }
    setSaving(true);
    updateSession(sessionId!, {
      title: title.trim(),
      description: description.trim() || undefined,
      isActive,
    });
    toast.success("Sessao salva.");
    setTimeout(() => setSaving(false), 400);
  }

  // ---------- Course handlers ----------
  function handleCreateCourse() {
    if (!courseForm.title.trim()) {
      toast.error("Informe o titulo do curso.");
      return;
    }
    const access: CourseAccess =
      courseForm.accessMode === "plans"
        ? { mode: "plans", plans: courseForm.accessPlans }
        : { mode: courseForm.accessMode };

    createCourse(sessionId!, {
      title: courseForm.title.trim(),
      description: courseForm.description.trim(),
      isActive: courseForm.isActive,
      access,
    });
    toast.success("Curso criado com sucesso.");
    setCourseForm(emptyCourseForm);
    setCourseDialogOpen(false);
  }

  function handleToggleCourse(id: string, current: boolean) {
    updateCourse(id, { isActive: !current });
    toast.success(!current ? "Curso ativado." : "Curso desativado.");
  }

  function handleDeleteCourse(id: string) {
    deleteCourse(id);
    toast.success("Curso removido.");
  }

  function togglePlan(plan: string) {
    setCourseForm((prev) => ({
      ...prev,
      accessPlans: prev.accessPlans.includes(plan)
        ? prev.accessPlans.filter((p) => p !== plan)
        : [...prev.accessPlans, plan],
    }));
  }

  function openTransferDialog(
    mode: "move" | "duplicate",
    courseId: string,
    courseTitle: string
  ) {
    setTargetSessionId("");
    setTransferDialog({ open: true, mode, courseId, courseTitle });
  }

  function handleTransferConfirm() {
    if (!targetSessionId) {
      toast.error("Selecione a sessao de destino.");
      return;
    }
    if (transferDialog.mode === "move") {
      moveCourseToSession(transferDialog.courseId, targetSessionId);
      toast.success("Curso movido com sucesso.");
    } else {
      duplicateCourseToSession(transferDialog.courseId, targetSessionId);
      toast.success("Curso duplicado com sucesso.");
    }
    setTransferDialog({ ...transferDialog, open: false });
  }

  // ---------- Render ----------
  return (
    <div className="space-y-8">
      {/* ====== Header ====== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Sessao</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1 h-4 w-4" />
          )}
          Salvar
        </Button>
      </div>

      {/* ====== Session fields ====== */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="sess-title">Titulo</Label>
            <Input
              id="sess-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sess-desc">Descricao</Label>
            <Textarea
              id="sess-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="sess-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="sess-active">Ativa</Label>
          </div>
        </CardContent>
      </Card>

      {/* ====== Courses list ====== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Cursos da sessao</h2>
          <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                onClick={() => setCourseForm(emptyCourseForm)}
              >
                <Plus className="mr-1 h-4 w-4" />
                Novo curso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo curso</DialogTitle>
                <DialogDescription>
                  Adicione um novo curso a esta sessao.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label htmlFor="course-title">Titulo</Label>
                  <Input
                    id="course-title"
                    value={courseForm.title}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-desc">Descricao</Label>
                  <Textarea
                    id="course-desc"
                    value={courseForm.description}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="course-active"
                    checked={courseForm.isActive}
                    onCheckedChange={(v) =>
                      setCourseForm({ ...courseForm, isActive: v })
                    }
                  />
                  <Label htmlFor="course-active">Ativo</Label>
                </div>

                {/* Access control */}
                <div className="space-y-3">
                  <Label>Controle de acesso</Label>
                  <RadioGroup
                    value={courseForm.accessMode}
                    onValueChange={(v) =>
                      setCourseForm({
                        ...courseForm,
                        accessMode: v as CourseFormState["accessMode"],
                      })
                    }
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="all" id="access-all" />
                      <Label htmlFor="access-all">Todos</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="plans" id="access-plans" />
                      <Label htmlFor="access-plans">Por planos</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="admin" id="access-admin" />
                      <Label htmlFor="access-admin">Somente admin</Label>
                    </div>
                  </RadioGroup>

                  {courseForm.accessMode === "plans" && (
                    <div className="grid grid-cols-3 gap-3 pl-6">
                      {PLANS.map((plan) => (
                        <div
                          key={plan.value}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={`plan-${plan.value}`}
                            checked={courseForm.accessPlans.includes(
                              plan.value
                            )}
                            onCheckedChange={() => togglePlan(plan.value)}
                          />
                          <Label htmlFor={`plan-${plan.value}`}>
                            {plan.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateCourse}>Criar curso</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {sortedCourses.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum curso nesta sessao.
          </p>
        )}

        <div className="space-y-3">
          {sortedCourses.map((course) => (
            <Card key={course.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{course.title}</CardTitle>
                  <Badge
                    variant={course.isActive ? "default" : "secondary"}
                  >
                    {course.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {course.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Acesso: {accessLabel(course.access)}
                </p>

                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveCourse(course.id, "up")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveCourse(course.id, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/admin/cursos/${course.id}/edit`}>
                      <Pencil className="mr-1 h-4 w-4" />
                      Editar
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleToggleCourse(course.id, course.isActive)
                    }
                  >
                    {course.isActive ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      openTransferDialog("move", course.id, course.title)
                    }
                  >
                    <ArrowRightLeft className="mr-1 h-4 w-4" />
                    Mover
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      openTransferDialog("duplicate", course.id, course.title)
                    }
                  >
                    <Copy className="mr-1 h-4 w-4" />
                    Duplicar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover curso?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Todos os modulos e aulas deste curso serao removidos.
                          Esta acao nao pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteCourse(course.id)}
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

      {/* ====== Move / Duplicate dialog ====== */}
      <Dialog
        open={transferDialog.open}
        onOpenChange={(open) =>
          setTransferDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transferDialog.mode === "move"
                ? "Mover para sessao"
                : "Duplicar para sessao"}
            </DialogTitle>
            <DialogDescription>
              {transferDialog.mode === "move"
                ? `Mover "${transferDialog.courseTitle}" para outra sessao.`
                : `Duplicar "${transferDialog.courseTitle}" (com modulos e aulas) para outra sessao.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sessao de destino</Label>
              <Select value={targetSessionId} onValueChange={setTargetSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma sessao" />
                </SelectTrigger>
                <SelectContent>
                  {otherSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setTransferDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Cancelar
            </Button>
            <Button onClick={handleTransferConfirm}>
              {transferDialog.mode === "move" ? "Mover" : "Duplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
