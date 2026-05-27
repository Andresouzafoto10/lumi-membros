import { useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Plus,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Rows3,
  TimerReset,
} from "lucide-react";
import { toast } from "sonner";

import { useCourses } from "@/hooks/useCourses";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import type {
  CourseBanner,
  CourseBannerMediaType,
  CourseBannerTargetType,
  CourseCardOrientation,
} from "@/types/course";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FileUpload } from "@/components/ui/FileUpload";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Session create/edit dialog state
// ---------------------------------------------------------------------------
type SessionFormState = {
  title: string;
  description: string;
  isActive: boolean;
  cardOrientation: CourseCardOrientation;
};

const emptySessionForm: SessionFormState = {
  title: "",
  description: "",
  isActive: true,
  cardOrientation: "horizontal",
};

// ---------------------------------------------------------------------------
// Banner create/edit dialog state
// ---------------------------------------------------------------------------
type BannerFormState = {
  imageUrl: string;
  mediaType: CourseBannerMediaType;
  title: string;
  subtitle: string;
  buttonLabel: string;
  targetType: CourseBannerTargetType;
  targetCourseId: string;
  targetUrl: string;
  isActive: boolean;
};

const emptyBannerForm: BannerFormState = {
  imageUrl: "",
  mediaType: "image",
  title: "",
  subtitle: "",
  buttonLabel: "",
  targetType: "none",
  targetCourseId: "",
  targetUrl: "",
  isActive: true,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminCoursesPage() {
  const {
    sessions,
    allCourses,
    banners,
    createSession,
    updateSession,
    deleteSession,
    moveSession,
    createBanner,
    updateBanner,
    deleteBanner,
    moveBanner,
  } = useCourses();
  const { settings, updateSettings } = usePlatformSettings();

  // Session dialog
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionForm, setSessionForm] =
    useState<SessionFormState>(emptySessionForm);

  // Banner dialog
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [bannerForm, setBannerForm] =
    useState<BannerFormState>(emptyBannerForm);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [displaySettingsSaving, setDisplaySettingsSaving] = useState(false);

  // ---------- Summary counts ----------
  const totalSessions = sessions.length;
  const totalCourses = allCourses.length;
  const activeCourses = allCourses.filter((c) => c.isActive).length;
  const isCarouselMode = (settings.coursesDisplayMode ?? "grid") === "carousel";
  const carouselAutoplay = settings.coursesCarouselAutoplay ?? false;

  async function handleDisplayModeChange(checked: boolean) {
    setDisplaySettingsSaving(true);
    try {
      await updateSettings({
        coursesDisplayMode: checked ? "carousel" : "grid",
      });
      toast.success(checked ? "Modo carrossel ativado." : "Modo padrao ativado.");
    } catch {
      toast.error("Nao foi possivel salvar o modo da vitrine.");
    } finally {
      setDisplaySettingsSaving(false);
    }
  }

  async function handleAutoplayChange(checked: boolean) {
    setDisplaySettingsSaving(true);
    try {
      await updateSettings({ coursesCarouselAutoplay: checked });
      toast.success(
        checked
          ? "Passagem automatica ativada."
          : "Passagem automatica desativada."
      );
    } catch {
      toast.error("Nao foi possivel salvar a passagem automatica.");
    } finally {
      setDisplaySettingsSaving(false);
    }
  }

  // ---------- Session handlers ----------
  function handleCreateSession() {
    if (!sessionForm.title.trim()) {
      toast.error("Informe o titulo da sessao.");
      return;
    }
    createSession({
      title: sessionForm.title.trim(),
      description: sessionForm.description.trim() || undefined,
      isActive: sessionForm.isActive,
      cardOrientation: sessionForm.cardOrientation,
    });
    toast.success("Sessao criada com sucesso.");
    setSessionForm(emptySessionForm);
    setSessionDialogOpen(false);
  }

  function handleToggleSession(id: string, current: boolean) {
    updateSession(id, { isActive: !current });
    toast.success(!current ? "Sessao ativada." : "Sessao desativada.");
  }

  function handleDeleteSession(id: string) {
    deleteSession(id);
    toast.success("Sessao removida.");
  }

  // ---------- Banner handlers ----------
  function openBannerCreate() {
    setEditingBannerId(null);
    setBannerForm(emptyBannerForm);
    setBannerDialogOpen(true);
  }

  function openBannerEdit(banner: CourseBanner) {
    setEditingBannerId(banner.id);
    setBannerForm({
      imageUrl: banner.imageUrl,
      mediaType: banner.mediaType ?? "image",
      title: banner.title ?? "",
      subtitle: banner.subtitle ?? "",
      buttonLabel: banner.buttonLabel ?? "",
      targetType: banner.targetType,
      targetCourseId: banner.targetCourseId ?? "",
      targetUrl: banner.targetUrl ?? "",
      isActive: banner.isActive,
    });
    setBannerDialogOpen(true);
  }

  function handleSaveBanner() {
    if (!bannerForm.imageUrl.trim()) {
      toast.error("Informe a URL da imagem.");
      return;
    }
    const payload = {
      imageUrl: bannerForm.imageUrl.trim(),
      mediaType: bannerForm.mediaType,
      title: bannerForm.title.trim() || null,
      subtitle: bannerForm.subtitle.trim() || null,
      buttonLabel: bannerForm.buttonLabel.trim() || null,
      targetType: bannerForm.targetType,
      targetCourseId:
        bannerForm.targetType === "course"
          ? bannerForm.targetCourseId || null
          : null,
      targetUrl:
        bannerForm.targetType === "url"
          ? bannerForm.targetUrl.trim() || null
          : null,
      isActive: bannerForm.isActive,
    };

    if (editingBannerId) {
      updateBanner(editingBannerId, payload);
      toast.success("Banner atualizado.");
    } else {
      createBanner(payload);
      toast.success("Banner criado com sucesso.");
    }
    setBannerDialogOpen(false);
  }

  function handleToggleBanner(id: string, current: boolean) {
    updateBanner(id, { isActive: !current });
    toast.success(!current ? "Banner ativado." : "Banner desativado.");
  }

  function handleDeleteBanner(id: string) {
    deleteBanner(id);
    toast.success("Banner removido.");
  }

  // ---------- Render ----------
  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[{ label: "Admin", to: "/admin" }, { label: "Cursos" }]}
      />
      {/* ====== Header ====== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cursos</h1>
            <p className="text-sm text-muted-foreground">
              Sessoes: {totalSessions} / Cursos: {totalCourses} / Ativos:{" "}
              {activeCourses}
            </p>
          </div>
        </div>

        {/* New session dialog */}
        <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setSessionForm(emptySessionForm);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Nova sessao
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova sessao</DialogTitle>
              <DialogDescription>
                Crie uma nova sessao para agrupar cursos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-title">Titulo</Label>
                <Input
                  id="session-title"
                  placeholder="Nome da sessao"
                  value={sessionForm.title}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-desc">Descricao</Label>
                <Textarea
                  id="session-desc"
                  placeholder="Descricao opcional"
                  value={sessionForm.description}
                  onChange={(e) =>
                    setSessionForm({
                      ...sessionForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="session-active"
                  checked={sessionForm.isActive}
                  onCheckedChange={(v) =>
                    setSessionForm({ ...sessionForm, isActive: v })
                  }
                />
                <Label htmlFor="session-active">Ativa</Label>
              </div>
              <div className="space-y-2">
                <Label>Formato dos cursos nesta sessao</Label>
                <Select
                  value={sessionForm.cardOrientation}
                  onValueChange={(v) =>
                    setSessionForm({
                      ...sessionForm,
                      cardOrientation: v as CourseCardOrientation,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">Horizontal (16:9)</SelectItem>
                    <SelectItem value="vertical">Vertical (9:16)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateSession}>Criar sessao</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ====== Student courses display mode ====== */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {isCarouselMode ? <Rows3 className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="font-semibold">Vitrine dos cursos</h2>
              <p className="text-sm text-muted-foreground">
                Escolha entre a grade atual ou fileiras em carrossel por sessao.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:min-w-[390px]">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                {isCarouselMode ? (
                  <Rows3 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="courses-carousel-mode" className="cursor-pointer text-sm">
                  Modo carrossel
                </Label>
              </div>
              <div className="flex items-center gap-2">
                {displaySettingsSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Switch
                  id="courses-carousel-mode"
                  checked={isCarouselMode}
                  onCheckedChange={handleDisplayModeChange}
                  disabled={displaySettingsSaving}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <TimerReset className="h-4 w-4 text-muted-foreground" />
                <Label
                  htmlFor="courses-carousel-autoplay"
                  className="cursor-pointer text-sm"
                >
                  Passar a cada 5 segundos
                </Label>
              </div>
              <Switch
                id="courses-carousel-autoplay"
                checked={carouselAutoplay}
                onCheckedChange={handleAutoplayChange}
                disabled={!isCarouselMode || displaySettingsSaving}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== Banners Section ====== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Banners</h2>
          <Button size="sm" variant="outline" onClick={openBannerCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Novo banner
          </Button>
        </div>

        {banners.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum banner cadastrado.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {banners.map((banner) => (
            <Card key={banner.id} className="overflow-hidden">
              {/* Media preview */}
              {banner.imageUrl ? (
                banner.mediaType === "video" ? (
                  <video
                    // Direct R2 URL (not proxy) so mobile gets HTTP Range -> plays.
                    src={banner.imageUrl}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="h-[180px] w-full object-cover bg-black"
                  />
                ) : banner.mediaType === "embed" ? (
                  <iframe
                    src={banner.imageUrl}
                    title={banner.title ?? "Banner"}
                    className="h-[180px] w-full pointer-events-none"
                    sandbox="allow-scripts allow-same-origin"
                    loading="lazy"
                  />
                ) : (
                  <img
                    src={getProxiedImageUrl(banner.imageUrl)}
                    alt={banner.title ?? "Banner"}
                    className="h-[180px] w-full object-cover"
                  />
                )
              ) : (
                <div className="flex h-[180px] items-center justify-center bg-muted">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                </div>
              )}

              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <Badge variant={banner.isActive ? "default" : "secondary"}>
                    {banner.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                  <Badge variant="outline">#{banner.displayOrder}</Badge>
                </div>
                {banner.title && (
                  <p className="font-medium leading-tight">{banner.title}</p>
                )}
                {banner.subtitle && (
                  <p className="text-sm text-muted-foreground">
                    {banner.subtitle}
                  </p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-1 pt-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveBanner(banner.id, "up")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveBanner(banner.id, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openBannerEdit(banner)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleToggleBanner(banner.id, banner.isActive)
                    }
                  >
                    {banner.isActive ? "Desativar" : "Ativar"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover banner?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acao nao pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteBanner(banner.id)}
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

        {/* Banner create/edit dialog */}
        <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingBannerId ? "Editar banner" : "Novo banner"}
              </DialogTitle>
              <DialogDescription>
                {editingBannerId
                  ? "Atualize as informacoes do banner."
                  : "Preencha os dados do novo banner."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Image upload + preview */}
              <div className="space-y-2">
                <Label>Imagem do banner</Label>
                <FileUpload
                  value={bannerForm.imageUrl}
                  mediaType={bannerForm.mediaType}
                  onChange={(url, mediaType) =>
                    setBannerForm({
                      ...bannerForm,
                      imageUrl: url,
                      mediaType: mediaType ?? "image",
                    })
                  }
                  folder="banners"
                  imagePreset="banner"
                  allowUrl={true}
                  aspectRatio="21/9"
                  maxSizeMB={50}
                  placeholder="Arraste imagem/video ou cole URL do Canva"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="banner-title">Titulo</Label>
                <Input
                  id="banner-title"
                  value={bannerForm.title}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="banner-subtitle">Subtitulo</Label>
                <Input
                  id="banner-subtitle"
                  value={bannerForm.subtitle}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, subtitle: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="banner-btn">Label do botao</Label>
                <Input
                  id="banner-btn"
                  value={bannerForm.buttonLabel}
                  onChange={(e) =>
                    setBannerForm({
                      ...bannerForm,
                      buttonLabel: e.target.value,
                    })
                  }
                />
              </div>

              {/* Target type */}
              <div className="space-y-2">
                <Label>Tipo de destino</Label>
                <Select
                  value={bannerForm.targetType}
                  onValueChange={(v) =>
                    setBannerForm({
                      ...bannerForm,
                      targetType: v as CourseBannerTargetType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="course">Curso</SelectItem>
                    <SelectItem value="url">URL externa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bannerForm.targetType === "course" && (
                <div className="space-y-2">
                  <Label>Curso de destino</Label>
                  <Select
                    value={bannerForm.targetCourseId}
                    onValueChange={(v) =>
                      setBannerForm({ ...bannerForm, targetCourseId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um curso" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCourses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {bannerForm.targetType === "url" && (
                <div className="space-y-2">
                  <Label htmlFor="banner-url">URL de destino</Label>
                  <Input
                    id="banner-url"
                    placeholder="https://..."
                    value={bannerForm.targetUrl}
                    onChange={(e) =>
                      setBannerForm({ ...bannerForm, targetUrl: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  id="banner-active"
                  checked={bannerForm.isActive}
                  onCheckedChange={(v) =>
                    setBannerForm({ ...bannerForm, isActive: v })
                  }
                />
                <Label htmlFor="banner-active">Ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleSaveBanner}>
                {editingBannerId ? "Salvar" : "Criar banner"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* ====== Sessions Section ====== */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Sessoes</h2>

        {sessions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma sessao cadastrada.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => {
            const courseCount = session.courses.length;
            const activeCount = session.courses.filter(
              (c) => c.isActive
            ).length;

            return (
              <Card key={session.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{session.title}</CardTitle>
                    <Badge
                      variant={session.isActive ? "default" : "secondary"}
                    >
                      {session.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {session.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {session.description}
                    </p>
                  )}
                  <p className="text-sm">
                    {courseCount} curso{courseCount !== 1 ? "s" : ""} &middot;{" "}
                    {activeCount} ativo{activeCount !== 1 ? "s" : ""}
                  </p>
                  <Badge variant="outline">
                    {session.cardOrientation === "vertical" ? "Vertical" : "Horizontal"}
                  </Badge>

                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => moveSession(session.id, "up")}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => moveSession(session.id, "down")}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/admin/cursos/sessoes/${session.id}`}>
                        <Pencil className="mr-1 h-4 w-4" />
                        Editar
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleToggleSession(session.id, session.isActive)
                      }
                    >
                      {session.isActive ? "Desativar" : "Ativar"}
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
                            Remover sessao?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Todos os cursos desta sessao serao removidos. Esta
                            acao nao pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteSession(session.id)}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
