import { useState, useMemo } from "react";
import { Video, Plus, Pencil, Trash2, Calendar, Clock, Radio, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useLiveLessons, getComputedStatus } from "@/hooks/useLiveLessons";
import type { LiveLesson, LiveLessonStatus } from "@/hooks/useLiveLessons";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { useClasses } from "@/hooks/useClasses";
import { useCourses } from "@/hooks/useCourses";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileUpload } from "@/components/ui/FileUpload";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<LiveLessonStatus, { label: string; variant: "default" | "destructive" | "secondary" | "outline"; icon: typeof Radio }> = {
  scheduled: { label: "Agendada", variant: "outline", icon: Calendar },
  live: { label: "Ao vivo", variant: "destructive", icon: Radio },
  ended: { label: "Encerrada", variant: "secondary", icon: CheckCircle2 },
  recorded: { label: "Gravada", variant: "default", icon: Video },
  cancelled: { label: "Cancelada", variant: "outline", icon: XCircle },
};

const EMPTY_FORM = {
  title: "",
  description: "",
  coverUrl: "",
  instructorName: "",
  scheduledAt: "",
  durationMinutes: 60,
  meetingUrl: "",
  salesUrl: "",
  recordingUrl: "",
  courseId: "",
  classIds: [] as string[],
  accessMode: "all" as "all" | "classes" | "open",
  status: "scheduled" as LiveLessonStatus,
};

export default function AdminLiveLessonsPage() {
  const { lessons, loading, createLesson, updateLesson, deleteLesson } = useLiveLessons();
  const { classes } = useClasses();
  const { allCourses } = useCourses();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const courseMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of allCourses) m[c.id] = c.title;
    return m;
  }, [allCourses]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (l: LiveLesson) => {
    setEditingId(l.id);
    setForm({
      title: l.title,
      description: l.description ?? "",
      coverUrl: l.coverUrl ?? "",
      instructorName: l.instructorName ?? "",
      scheduledAt: l.scheduledAt.slice(0, 16),
      durationMinutes: l.durationMinutes,
      meetingUrl: l.meetingUrl ?? "",
      salesUrl: l.salesUrl ?? "",
      recordingUrl: l.recordingUrl ?? "",
      courseId: l.courseId ?? "",
      classIds: l.classIds,
      accessMode: l.accessMode,
      status: l.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.scheduledAt) {
      toast.error("Título e data/hora são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        coverUrl: form.coverUrl || null,
        instructorName: form.instructorName.trim() || null,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: form.durationMinutes,
        meetingUrl: form.meetingUrl.trim() || null,
        salesUrl: form.salesUrl.trim() || null,
        recordingUrl: form.recordingUrl.trim() || null,
        courseId: form.courseId || null,
        classIds: form.classIds,
        accessMode: form.accessMode,
        status: form.status,
      };
      if (editingId) {
        await updateLesson(editingId, payload);
        toast.success("Aula atualizada");
      } else {
        await createLesson(payload);
        toast.success("Aula criada");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteLesson(deleteId);
      toast.success("Aula removida");
    } catch {
      toast.error("Erro ao remover");
    }
    setDeleteId(null);
  };

  const toggleClassId = (id: string) => {
    setForm((f) => ({
      ...f,
      classIds: f.classIds.includes(id) ? f.classIds.filter((c) => c !== id) : [...f.classIds, id],
    }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <Breadcrumb items={[{ label: "Aulas ao Vivo" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Aulas ao Vivo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Agende aulas ao vivo via Zoom, Google Meet ou Mux. Gravações podem ser arquivadas depois.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Nova aula
        </Button>
      </div>

      {lessons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma aula ao vivo agendada. Clique em "Nova aula" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => {
            const cs = getComputedStatus(lesson);
            const statusCfg = STATUS_CONFIG[cs];
            const StatusIcon = statusCfg.icon;
            return (
              <Card key={lesson.id} className={cn("border-border/50 hover:border-border transition-all", cs === "live" && "border-red-500/30")}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {lesson.coverUrl ? (
                      <img
                        src={lesson.coverUrl}
                        alt={lesson.title}
                        loading="lazy"
                        className="h-20 w-32 rounded-md object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-20 w-32 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Video className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium">{lesson.title}</p>
                        {cs === "live" ? (
                          <LiveBadge />
                        ) : (
                          <Badge variant={statusCfg.variant} className="text-[10px] gap-1">
                            <StatusIcon className="h-2.5 w-2.5" />
                            {statusCfg.label}
                          </Badge>
                        )}
                        {lesson.courseId && courseMap[lesson.courseId] && (
                          <Badge variant="outline" className="text-[10px]">
                            {courseMap[lesson.courseId]}
                          </Badge>
                        )}
                      </div>
                      {lesson.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                          {lesson.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(lesson.scheduledAt), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {lesson.durationMinutes} min
                        </span>
                        {lesson.instructorName && (
                          <span>por {lesson.instructorName}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(lesson)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(lesson.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ---- Dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar aula ao vivo" : "Nova aula ao vivo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Masterclass de Iluminação em Retrato"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="O que será abordado na aula"
                className="h-20 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Capa</Label>
              <FileUpload
                value={form.coverUrl}
                onChange={(url) => setForm({ ...form, coverUrl: url })}
                folder="live-lessons/covers"
                imagePreset="banner"
                aspectRatio="16 / 9"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data e hora *</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duração (minutos)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) || 60 })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Instrutor</Label>
              <Input
                value={form.instructorName}
                onChange={(e) => setForm({ ...form, instructorName: e.target.value })}
                placeholder="Nome do instrutor (opcional)"
              />
            </div>

            <div className="space-y-1.5">
              <Label>URL da reunião (Zoom, Meet, Mux)</Label>
              <Input
                value={form.meetingUrl}
                onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })}
                placeholder="https://zoom.us/j/..."
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Cole o link gerado na sua plataforma de videoconferência.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>URL para nao matriculados (venda / landing page)</Label>
              <Input
                value={form.salesUrl}
                onChange={(e) => setForm({ ...form, salesUrl: e.target.value })}
                placeholder="https://... (link de checkout, pagina de vendas)"
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Este link aparece para visitantes sem matricula ativa.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>URL da gravação (preenche depois)</Label>
              <Input
                value={form.recordingUrl}
                onChange={(e) => setForm({ ...form, recordingUrl: e.target.value })}
                placeholder="https://... (YouTube, Vimeo, Mux)"
                type="url"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Curso vinculado (opcional)</Label>
                <Select value={form.courseId || "none"} onValueChange={(v) => setForm({ ...form, courseId: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {allCourses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as LiveLessonStatus })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendada</SelectItem>
                    <SelectItem value="live">Ao vivo</SelectItem>
                    <SelectItem value="ended">Encerrada</SelectItem>
                    <SelectItem value="recorded">Gravada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Acesso</Label>
              <Select value={form.accessMode} onValueChange={(v) => setForm({ ...form, accessMode: v as "all" | "classes" | "open" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os alunos matriculados</SelectItem>
                  <SelectItem value="classes">Turmas específicas</SelectItem>
                  <SelectItem value="open">Aberto (sem autenticação)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.accessMode === "classes" && (
              <div className="space-y-1.5">
                <Label>Turmas com acesso</Label>
                <div className="space-y-1 rounded-md border border-border/40 p-2 max-h-40 overflow-y-auto">
                  {classes.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Nenhuma turma cadastrada
                    </p>
                  )}
                  {classes.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={form.classIds.includes(c.id)}
                        onChange={() => toggleClassId(c.id)}
                      />
                      <span className="text-sm">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.scheduledAt}>
              {saving ? "Salvando..." : editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete confirm ---- */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover aula ao vivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os alunos perderão o acesso à gravação se já tiver sido arquivada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
