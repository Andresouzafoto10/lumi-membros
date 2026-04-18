import { useState, useCallback, useRef, lazy, Suspense } from "react";
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
  Award,
  Image,
  Shield,
  Lock,
  ExternalLink,
  MessageCircle,
  Info,
  Upload,
  ImageIcon,
  Link as LinkIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useCourses } from "@/hooks/useCourses";
import { useCertificates } from "@/hooks/useCertificates";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useR2Upload } from "@/hooks/useR2Upload";
import type { CourseAccess } from "@/types/course";
import { deleteFromR2, isR2Url } from "@/lib/r2Upload";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import { CertificateRenderer } from "@/components/certificates/CertificateRenderer";

// Lazy-load ImageCropDialog (pulls in react-easy-crop, only needed when cropping)
const ImageCropDialog = lazy(() =>
  import("@/components/ui/ImageCropDialog").then((m) => ({ default: m.ImageCropDialog }))
);

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const { templates } = useCertificates();
  const { settings: platformSettings } = usePlatformSettings();

  const course = findCourse(courseId);
  const session = findSessionForCourse(courseId);

  // Settings form
  const [title, setTitle] = useState(course?.title ?? "");
  const [isActive, setIsActive] = useState(course?.isActive ?? true);
  const [description, setDescription] = useState(course?.description ?? "");
  const [bannerPreview, setBannerPreview] = useState(course?.bannerUrl ?? "");
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [bannerCropSrc, setBannerCropSrc] = useState<string>("");
  const [bannerCropOpen, setBannerCropOpen] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerDeleting, setBannerDeleting] = useState(false);
  const [bannerShowUrl, setBannerShowUrl] = useState(false);
  const [bannerUrlDraft, setBannerUrlDraft] = useState("");
  const [bannerConfirmRemove, setBannerConfirmRemove] = useState(false);
  const [accessMode, setAccessMode] = useState<"all" | "plans" | "admin">(
    course?.access.mode ?? "all"
  );
  const [accessPlans, setAccessPlans] = useState<string[]>(
    course?.access.mode === "plans" ? course.access.plans : []
  );
  const [saving, setSaving] = useState(false);

  // No-access behavior
  const [noAccessAction, setNoAccessAction] = useState<"nothing" | "redirect">(
    course?.access.no_access_action ?? "nothing"
  );
  const [noAccessRedirectUrl, setNoAccessRedirectUrl] = useState(
    course?.access.no_access_redirect_url ?? ""
  );
  const [noAccessSupportUrl, setNoAccessSupportUrl] = useState(
    course?.access.no_access_support_url ?? ""
  );

  // Comments config
  const [commentsEnabled, setCommentsEnabled] = useState(
    course?.commentsEnabled ?? true
  );

  // Launch config
  const [launchStatus, setLaunchStatus] = useState<"upcoming" | "released">(
    course?.launchStatus ?? "released"
  );
  const [launchAt, setLaunchAt] = useState<string>(
    course?.launchAt ? course.launchAt.slice(0, 16) : ""
  );

  // Certificate config
  const [certTemplateId, setCertTemplateId] = useState<string>(
    course?.certificateConfig?.templateId ?? ""
  );
  const [certThreshold, setCertThreshold] = useState(
    course?.certificateConfig?.completionThreshold ?? 100
  );
  const [certHours, setCertHours] = useState(
    course?.certificateConfig?.hoursLoad ?? 0
  );
  const [certRequirementType, setCertRequirementType] = useState<string>(
    course?.certificateConfig?.requirementType ?? "completion"
  );
  const [certQuizThreshold, setCertQuizThreshold] = useState(
    course?.certificateConfig?.quizThreshold ?? 70
  );

  // Module dialog
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleForm, setModuleForm] =
    useState<ModuleFormState>(emptyModuleForm);
  const { uploadFile: uploadBannerFile } = useR2Upload();

  const bannerUrl = bannerPreview || course?.bannerUrl || "";
  const bannerPreviewSrc = getProxiedImageUrl(bannerUrl);

  // ---------- Banner handlers ----------
  const handleBannerFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Maximo: 5MB");
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setBannerCropSrc(objectUrl);
      setBannerCropOpen(true);
    },
    []
  );

  const handleBannerCropConfirm = useCallback(
    async (croppedFile: File) => {
      setBannerCropOpen(false);
      if (bannerCropSrc) URL.revokeObjectURL(bannerCropSrc);
      setBannerCropSrc("");
      setBannerUploading(true);
      try {
        const url = await uploadBannerFile({
          file: croppedFile,
          folder: "courses/banners",
          previousUrl: bannerUrl,
          preset: "banner",
          errorMessage: "Erro no upload. Tente novamente.",
        });
        setBannerPreview(url);
        toast.success("Banner atualizado!");
      } catch (err) {
        console.error("[BannerUpload]", err);
      } finally {
        setBannerUploading(false);
      }
    },
    [bannerCropSrc, bannerUrl, uploadBannerFile]
  );

  const handleBannerCropCancel = useCallback(() => {
    setBannerCropOpen(false);
    if (bannerCropSrc) URL.revokeObjectURL(bannerCropSrc);
    setBannerCropSrc("");
  }, [bannerCropSrc]);

  const handleBannerRemove = useCallback(async () => {
    setBannerConfirmRemove(false);
    if (bannerUrl && isR2Url(bannerUrl)) {
      setBannerDeleting(true);
      try {
        await deleteFromR2(bannerUrl);
      } catch {
        // silent
      } finally {
        setBannerDeleting(false);
      }
    }
    setBannerPreview("");
    toast.success("Banner removido.");
  }, [bannerUrl]);

  const handleBannerUrlConfirm = useCallback(() => {
    const trimmed = bannerUrlDraft.trim();
    if (!trimmed) return;
    if (bannerUrl && isR2Url(bannerUrl)) {
      deleteFromR2(bannerUrl).catch(() => {});
    }
    setBannerPreview(trimmed);
    setBannerUrlDraft("");
    setBannerShowUrl(false);
  }, [bannerUrlDraft, bannerUrl]);

  // Early return AFTER all hooks are declared (preserves Rules of Hooks ordering)
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

    const noAccessFields = {
      no_access_action: noAccessAction,
      no_access_redirect_url: noAccessRedirectUrl,
      no_access_support_url: noAccessSupportUrl,
    };

    const access: CourseAccess =
      accessMode === "plans"
        ? { mode: "plans", plans: accessPlans, ...noAccessFields }
        : { mode: accessMode, ...noAccessFields };

    updateCourse(courseId!, {
      title: title.trim(),
      description: description.trim(),
      isActive,
      bannerUrl: bannerUrl,
      access,
      commentsEnabled,
      launchStatus,
      launchAt: launchStatus === "upcoming" && launchAt ? new Date(launchAt).toISOString() : null,
      certificateConfig: {
        templateId: certTemplateId || null,
        completionThreshold: certThreshold,
        hoursLoad: certHours,
        requirementType: certRequirementType as "completion" | "quiz" | "completion_and_quiz",
        quizThreshold: certQuizThreshold,
      },
    });
    toast.success("Curso salvo.");
    setTimeout(() => setSaving(false), 400);
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
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Admin", to: "/admin" },
          { label: "Cursos", to: "/admin/cursos" },
          { label: session?.title ?? "Sessao", to: session ? `/admin/cursos/sessoes/${session.id}` : undefined },
          { label: course.title },
        ]}
      />

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
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar alteracoes
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

          {/* ── Row 1: Informacoes gerais + Banner ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Left: Informacoes gerais (3 cols) */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Informacoes gerais
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="course-active-switch" className="text-sm text-muted-foreground">
                      {isActive ? "Ativo" : "Inativo"}
                    </Label>
                    <Switch
                      id="course-active-switch"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="course-title">Titulo do curso</Label>
                  <Input
                    id="course-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Fotografia para iniciantes"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="course-desc">Descricao</Label>
                  <Textarea
                    id="course-desc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o conteudo do curso..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Right: Banner (2 cols) */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Image className="h-4 w-4 text-primary" />
                  Banner
                </CardTitle>
                <CardDescription>
                  Imagem de capa do curso (16:9)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerFileSelect}
                />

                {/* 16:9 preview — pixel-perfect match with CourseCard */}
                {bannerUrl ? (
                  <div className="relative group">
                    <div className="aspect-video rounded-xl overflow-hidden border border-border/50 bg-muted">
                      <img
                        src={bannerPreviewSrc}
                        alt="Banner preview"
                        className="h-full w-full object-cover"
                        crossOrigin="anonymous"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    </div>
                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/40 transition-colors">
                      <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-full shadow-md"
                          onClick={() => bannerInputRef.current?.click()}
                          disabled={bannerUploading || bannerDeleting}
                        >
                          {bannerUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8 rounded-full shadow-md"
                          onClick={() => setBannerConfirmRemove(true)}
                          disabled={bannerUploading || bannerDeleting}
                        >
                          {bannerDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Pre-visualizacao — exatamente como o aluno vera
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={bannerUploading}
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-border/60 bg-muted/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition-colors"
                  >
                    {bannerUploading ? (
                      <>
                        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                        <span className="text-xs text-muted-foreground">Enviando...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Clique para enviar</span>
                        <span className="text-xs text-muted-foreground/60">Max 5MB</span>
                      </>
                    )}
                  </button>
                )}

                {/* URL externa toggle */}
                {!bannerUploading && (
                  <>
                    {bannerShowUrl ? (
                      <div className="flex gap-2">
                        <Input
                          value={bannerUrlDraft}
                          onChange={(e) => setBannerUrlDraft(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleBannerUrlConfirm();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={handleBannerUrlConfirm}
                          disabled={!bannerUrlDraft.trim()}
                        >
                          OK
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => { setBannerShowUrl(false); setBannerUrlDraft(""); }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setBannerShowUrl(true)}
                      >
                        <LinkIcon className="h-3 w-3" />
                        Usar URL externa
                      </button>
                    )}
                  </>
                )}

                {/* Crop dialog (lazy) */}
                <Suspense fallback={null}>
                  <ImageCropDialog
                    open={bannerCropOpen}
                    onClose={handleBannerCropCancel}
                    onConfirm={handleBannerCropConfirm}
                    imageSrc={bannerCropSrc}
                    aspect={16 / 9}
                    shape="rect"
                    title="Recortar banner do curso"
                    cropObjectFit="horizontal-cover"
                  />
                </Suspense>

                {/* Confirm remove dialog */}
                <AlertDialog open={bannerConfirmRemove} onOpenChange={setBannerConfirmRemove}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover banner</AlertDialogTitle>
                      <AlertDialogDescription>
                        {isR2Url(bannerUrl)
                          ? "A imagem sera excluida permanentemente do servidor. Deseja continuar?"
                          : "A referencia da imagem sera removida. Deseja continuar?"}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBannerRemove}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>

          {/* ── Row 2: Acesso + Comportamento sem acesso ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Controle de acesso */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Controle de acesso
                </CardTitle>
                <CardDescription>
                  Quem pode acessar este curso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={accessMode}
                  onValueChange={(v) =>
                    setAccessMode(v as "all" | "plans" | "admin")
                  }
                  className="space-y-3"
                >
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem value="all" id="acc-all" className="mt-0.5" />
                    <div>
                      <span className="text-sm font-medium">Todos os matriculados</span>
                      <p className="text-xs text-muted-foreground mt-0.5">Qualquer aluno matriculado em uma turma com este curso</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem value="plans" id="acc-plans" className="mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">Por planos</span>
                      <p className="text-xs text-muted-foreground mt-0.5">Somente alunos de planos especificos</p>
                      {accessMode === "plans" && (
                        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border/30">
                          {PLANS.map((plan) => (
                            <div key={plan.value} className="flex items-center gap-2">
                              <Checkbox
                                id={`eplan-${plan.value}`}
                                checked={accessPlans.includes(plan.value)}
                                onCheckedChange={() => togglePlan(plan.value)}
                              />
                              <Label htmlFor={`eplan-${plan.value}`} className="text-sm">{plan.label}</Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem value="admin" id="acc-admin" className="mt-0.5" />
                    <div>
                      <span className="text-sm font-medium">Somente admin</span>
                      <p className="text-xs text-muted-foreground mt-0.5">Visivel apenas para administradores</p>
                    </div>
                  </label>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Right: Comportamento sem acesso */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Sem acesso
                </CardTitle>
                <CardDescription>
                  O que acontece quando um aluno sem permissao clica no curso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={noAccessAction}
                  onValueChange={(v) => setNoAccessAction(v as "nothing" | "redirect")}
                  className="space-y-3"
                >
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem value="nothing" id="noacc-nothing" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">Mensagem de suporte</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Exibe um modal com opcao de falar com o suporte</p>
                      {noAccessAction === "nothing" && (
                        <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
                          <Label htmlFor="support-url" className="text-xs">Link do suporte (opcional)</Label>
                          <Input
                            id="support-url"
                            value={noAccessSupportUrl}
                            onChange={(e) => setNoAccessSupportUrl(e.target.value)}
                            placeholder="https://wa.me/5511999999999"
                            className="text-sm h-8"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem value="redirect" id="noacc-redirect" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">Redirecionar</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Abre uma URL externa ao clicar no curso</p>
                      {noAccessAction === "redirect" && (
                        <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
                          <Label htmlFor="redirect-url" className="text-xs">URL de redirecionamento *</Label>
                          <Input
                            id="redirect-url"
                            value={noAccessRedirectUrl}
                            onChange={(e) => setNoAccessRedirectUrl(e.target.value)}
                            placeholder="https://exemplo.com/planos"
                            className="text-sm h-8"
                            required
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* ── Row 3: Comentários nas aulas ── */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Comentarios nas aulas
              </CardTitle>
              <CardDescription>
                Controle se os alunos podem comentar nas aulas deste curso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="comments-toggle">Habilitar comentarios neste curso</Label>
                  <p className="text-xs text-muted-foreground">
                    Quando desativado, nenhuma aula deste curso exibira comentarios, independente da configuracao individual.
                  </p>
                </div>
                <Switch
                  id="comments-toggle"
                  checked={commentsEnabled}
                  onCheckedChange={setCommentsEnabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Row 3.5: Lancamento ── */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Lançamento</CardTitle>
              <CardDescription>
                Marque como "Em breve" para exibir contador e botão "Me notifique" aos alunos antes do lançamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="upcoming-toggle">Curso em lançamento (Em breve)</Label>
                  <p className="text-xs text-muted-foreground">
                    Ao ativar, o curso aparecerá na listagem com overlay "Em breve" e botão de notificação.
                  </p>
                </div>
                <Switch
                  id="upcoming-toggle"
                  checked={launchStatus === "upcoming"}
                  onCheckedChange={(v) => setLaunchStatus(v ? "upcoming" : "released")}
                />
              </div>
              {launchStatus === "upcoming" && (
                <div className="space-y-1.5">
                  <Label htmlFor="launch-date">Data e hora do lançamento</Label>
                  <Input
                    id="launch-date"
                    type="datetime-local"
                    value={launchAt}
                    onChange={(e) => setLaunchAt(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Row 4: Certificado ── */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" />
                Certificado
              </CardTitle>
              <CardDescription>
                Configure a emissao automatica de certificado ao concluir o curso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Modelo de certificado</Label>
                <select
                  value={certTemplateId}
                  onChange={(e) => setCertTemplateId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Nenhum (sem certificado)</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Gerencie modelos em Configuracoes &gt; Certificados.
                </p>
              </div>

              {certTemplateId && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  {/* Left: settings */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Tipo de requisito</Label>
                      <RadioGroup
                        value={certRequirementType}
                        onValueChange={(v) => setCertRequirementType(v)}
                        className="space-y-2"
                      >
                        {[
                          { value: "completion", label: "Conclusao de aulas" },
                          { value: "quiz", label: "Aprovacao nos quizzes" },
                          { value: "completion_and_quiz", label: "Conclusao + Quizzes" },
                        ].map((opt) => (
                          <div key={opt.value} className="flex items-center gap-2">
                            <RadioGroupItem value={opt.value} id={`cert-${opt.value}`} />
                            <Label htmlFor={`cert-${opt.value}`} className="text-sm">{opt.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    {(certRequirementType === "completion" || certRequirementType === "completion_and_quiz") && (
                      <div className="space-y-1.5">
                        <Label>Conclusao minima — {certThreshold}%</Label>
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
                        <Label>Nota minima nos quizzes — {certQuizThreshold}%</Label>
                        <input
                          type="range"
                          min={50}
                          max={100}
                          value={certQuizThreshold}
                          onChange={(e) => setCertQuizThreshold(Number(e.target.value))}
                          className="w-full h-2 accent-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                          Media dos melhores scores do aluno nos quizzes.
                        </p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="cert-hours">Carga horaria (horas)</Label>
                      <Input
                        id="cert-hours"
                        type="number"
                        min={0}
                        value={certHours}
                        onChange={(e) => setCertHours(Number(e.target.value))}
                        className="w-32"
                      />
                    </div>
                  </div>

                  {/* Right: preview */}
                  {(() => {
                    const tpl = templates.find((t) => t.id === certTemplateId);
                    if (!tpl) return null;
                    return (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Preview</Label>
                        <div className="rounded-lg border overflow-hidden">
                          <CertificateRenderer
                            template={tpl}
                            data={{
                              studentName: "Ana Paula Ferreira",
                              courseName: title || "Nome do curso",
                              completionDate: "29 de marco de 2026",
                              courseHours: certHours,
                              platformName: platformSettings.name || "Master Membros",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
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
