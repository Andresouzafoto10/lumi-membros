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
} from "lucide-react";
import { toast } from "sonner";

import { useCourses } from "@/hooks/useCourses";
import type { CourseBanner, CourseBannerTargetType } from "@/types/course";

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
};

const emptySessionForm: SessionFormState = {
  title: "",
  description: "",
  isActive: true,
};

// ---------------------------------------------------------------------------
// Banner create/edit dialog state
// ---------------------------------------------------------------------------
type BannerFormState = {
  imageUrl: string;
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

  // Session dialog
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionForm, setSessionForm] =
    useState<SessionFormState>(emptySessionForm);

  // Banner dialog
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [bannerForm, setBannerForm] =
    useState<BannerFormState>(emptyBannerForm);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  // ---------- Summary counts ----------
  const totalSessions = sessions.length;
  const totalCourses = allCourses.length;
  const activeCourses = allCourses.filter((c) => c.isActive).length;

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
            </div>
            <DialogFooter>
              <Button onClick={handleCreateSession}>Criar sessao</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
              {/* Image */}
              {banner.imageUrl ? (
                <img
                  src={banner.imageUrl}
                  alt={banner.title ?? "Banner"}
                  className="h-[180px] w-full object-cover"
                />
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
              {/* Image URL + preview */}
              <div className="space-y-2">
                <Label htmlFor="banner-img">URL da imagem</Label>
                <Input
                  id="banner-img"
                  placeholder="https://..."
                  value={bannerForm.imageUrl}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, imageUrl: e.target.value })
                  }
                />
                {bannerForm.imageUrl && (
                  <img
                    src={bannerForm.imageUrl}
                    alt="Preview"
                    className="h-32 w-full rounded-md object-cover"
                  />
                )}
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
