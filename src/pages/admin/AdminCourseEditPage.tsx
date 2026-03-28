import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  GraduationCap,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Loader2,
  Save,
  BookOpen,
  Upload,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AspectRatio } from "@/components/ui/aspect-ratio";
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

// ---------------------------------------------------------------------------
const PLANS = [
  { value: "start", label: "Start" },
  { value: "pro", label: "Pro" },
  { value: "max", label: "Max" },
] as const;

type ModuleFormState = {
  title: string;
  isActive: boolean;
};

const emptyModuleForm: ModuleFormState = { title: "", isActive: true };

// ---------------------------------------------------------------------------
export default function AdminCourseEditPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const {
    findCourse,
    findSessionForCourse,
    updateCourse,
    createModule,
    updateModule,
    deleteModule,
    moveModule,
  } = useCourses();

  const course = findCourse(courseId);
  const session = findSessionForCourse(courseId);

  // Settings form
  const [title, setTitle] = useState(course?.title ?? "");
  const [isActive, setIsActive] = useState(course?.isActive ?? true);
  const [description, setDescription] = useState(course?.description ?? "");
  const [bannerPreview, setBannerPreview] = useState(course?.bannerUrl ?? "");
  const [accessMode, setAccessMode] = useState<"all" | "plans" | "admin">(
    course?.access.mode ?? "all"
  );
  const [accessPlans, setAccessPlans] = useState<string[]>(
    course?.access.mode === "plans" ? course.access.plans : []
  );
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Module dialog
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleForm, setModuleForm] =
    useState<ModuleFormState>(emptyModuleForm);

  if (!course || !courseId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20">
        <p className="text-muted-foreground">Curso nao encontrado.</p>
        <Button variant="outline" asChild>
          <Link to="/admin/cursos">Voltar</Link>
        </Button>
      </div>
    );
  }

  const sortedModules = [...course.modules].sort(
    (a, b) => a.order - b.order
  );

  // ---------- Save ----------
  function handleSave() {
    if (!title.trim()) {
      toast.error("Informe o titulo do curso.");
      return;
    }
    setSaving(true);

    const access: CourseAccess =
      accessMode === "plans"
        ? { mode: "plans", plans: accessPlans }
        : { mode: accessMode };

    updateCourse(courseId!, {
      title: title.trim(),
      description: description.trim(),
      isActive,
      bannerUrl: bannerPreview || course!.bannerUrl,
      access,
    });
    toast.success("Curso salvo.");
    setTimeout(() => setSaving(false), 400);
  }

  // ---------- Banner file preview ----------
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBannerPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  // ---------- Module handlers ----------
  function handleCreateModule() {
    if (!moduleForm.title.trim()) {
      toast.error("Informe o titulo do modulo.");
      return;
    }
    createModule(courseId!, {
      title: moduleForm.title.trim(),
      isActive: moduleForm.isActive,
    });
    toast.success("Modulo criado.");
    setModuleForm(emptyModuleForm);
    setModuleDialogOpen(false);
  }

  function handleToggleModule(moduleId: string, current: boolean) {
    updateModule(courseId!, moduleId, { isActive: !current });
    toast.success(!current ? "Modulo ativado." : "Modulo desativado.");
  }

  function handleDeleteModule(moduleId: string) {
    deleteModule(courseId!, moduleId);
    toast.success("Modulo removido.");
  }

  function togglePlan(plan: string) {
    setAccessPlans((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan]
    );
  }

  // ---------- Render ----------
  return (
    <div className="space-y-8">
      {/* ====== Header ====== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <GraduationCap className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Editar curso</h1>
          <Badge variant={course.isActive ? "default" : "secondary"}>
            {course.isActive ? "Ativo" : "Inativo"}
          </Badge>
          {session && <Badge variant="outline">{session.title}</Badge>}
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

      {/* ====== Tabs ====== */}
      <Tabs defaultValue="modulos">
        <TabsList>
          <TabsTrigger value="modulos">Modulos</TabsTrigger>
          <TabsTrigger value="config">Configuracoes</TabsTrigger>
        </TabsList>

        {/* ---------- Configuracoes ---------- */}
        <TabsContent value="config" className="space-y-6 pt-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="course-title">Titulo</Label>
                <Input
                  id="course-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="course-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="course-active">Ativo</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="course-desc">Descricao</Label>
                <Textarea
                  id="course-desc"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Banner */}
              <div className="space-y-2">
                <Label>Banner</Label>
                <div className="relative group">
                  <AspectRatio ratio={16 / 9}>
                    {bannerPreview ? (
                      <img
                        src={bannerPreview}
                        alt="Banner do curso"
                        className="h-full w-full rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-md bg-muted">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-1 h-4 w-4" />
                        Alterar
                      </Button>
                    </div>
                  </AspectRatio>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Access control */}
              <div className="space-y-3">
                <Label>Controle de acesso</Label>
                <RadioGroup
                  value={accessMode}
                  onValueChange={(v) =>
                    setAccessMode(v as "all" | "plans" | "admin")
                  }
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="all" id="acc-all" />
                    <Label htmlFor="acc-all">Todos</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="plans" id="acc-plans" />
                    <Label htmlFor="acc-plans">Por planos</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="admin" id="acc-admin" />
                    <Label htmlFor="acc-admin">Somente admin</Label>
                  </div>
                </RadioGroup>

                {accessMode === "plans" && (
                  <div className="grid grid-cols-3 gap-3 pl-6">
                    {PLANS.map((plan) => (
                      <div
                        key={plan.value}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          id={`eplan-${plan.value}`}
                          checked={accessPlans.includes(plan.value)}
                          onCheckedChange={() => togglePlan(plan.value)}
                        />
                        <Label htmlFor={`eplan-${plan.value}`}>
                          {plan.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Modulos ---------- */}
        <TabsContent value="modulos" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Modulos</h2>
            <Dialog
              open={moduleDialogOpen}
              onOpenChange={setModuleDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => setModuleForm(emptyModuleForm)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Novo modulo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo modulo</DialogTitle>
                  <DialogDescription>
                    Adicione um novo modulo ao curso.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mod-title">Titulo</Label>
                    <Input
                      id="mod-title"
                      value={moduleForm.title}
                      onChange={(e) =>
                        setModuleForm({
                          ...moduleForm,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="mod-active"
                      checked={moduleForm.isActive}
                      onCheckedChange={(v) =>
                        setModuleForm({ ...moduleForm, isActive: v })
                      }
                    />
                    <Label htmlFor="mod-active">Ativo</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateModule}>Criar modulo</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {sortedModules.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum modulo cadastrado.
            </p>
          )}

          <div className="space-y-3">
            {sortedModules.map((mod) => (
              <Card key={mod.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{mod.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={mod.isActive ? "default" : "secondary"}
                      >
                        {mod.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {mod.lessons.length} aula
                    {mod.lessons.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => moveModule(courseId!, mod.id, "up")}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => moveModule(courseId!, mod.id, "down")}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        to={`/admin/cursos/${courseId}/modulos/${mod.id}`}
                      >
                        <BookOpen className="mr-1 h-4 w-4" />
                        Aulas
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleToggleModule(mod.id, mod.isActive)
                      }
                    >
                      {mod.isActive ? "Desativar" : "Ativar"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Remover modulo?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Todas as aulas deste modulo serao removidas. Esta
                            acao nao pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteModule(mod.id)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
