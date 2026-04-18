import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Route, Save, Plus, X, GripVertical, ChevronUp, ChevronDown, Award, Users, UserCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useLearningPaths } from "@/hooks/useLearningPaths";
import { useCourses } from "@/hooks/useCourses";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useCertificates } from "@/hooks/useCertificates";
import { getProxiedImageUrl } from "@/lib/imageProxy";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/ui/FileUpload";
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

export default function AdminLearningPathEditPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();

  const { paths, accessRows, updatePath, setPathCourses, addAccess, removeAccess } = useLearningPaths();
  const { allCourses } = useCourses();
  const { classes } = useClasses();
  const { students } = useStudents();
  const { templates } = useCertificates();

  const path = paths.find((p) => p.id === pathId);

  // Form state — Tab 1
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [sequential, setSequential] = useState(true);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [addCourseDialogOpen, setAddCourseDialogOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Tab 2 — Access
  const [selectedClassId, setSelectedClassId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [individualExpiresAt, setIndividualExpiresAt] = useState("");

  // Tab 3 — Certificate
  const [certEnabled, setCertEnabled] = useState(false);
  const [certTemplateId, setCertTemplateId] = useState("");

  useEffect(() => {
    if (path) {
      setTitle(path.title);
      setDescription(path.description ?? "");
      setBannerUrl(path.bannerUrl ?? "");
      setSequential(path.sequential);
      setCourseIds(path.courseIds);
      setCertEnabled(path.certificateEnabled);
      setCertTemplateId(path.certificateTemplateId ?? "");
    }
  }, [path]);

  const courseMap = useMemo(() => new Map(allCourses.map((c) => [c.id, c])), [allCourses]);

  const availableCourses = useMemo(() => {
    return allCourses.filter(
      (c) => !courseIds.includes(c.id) && c.title.toLowerCase().includes(courseSearch.toLowerCase())
    );
  }, [allCourses, courseIds, courseSearch]);

  const pathAccess = useMemo(() => {
    return accessRows.filter((a) => a.pathId === pathId);
  }, [accessRows, pathId]);

  const classAccessRows = pathAccess.filter((a) => a.classId);
  const studentAccessRows = pathAccess.filter((a) => a.studentId);

  const filteredStudents = useMemo(() => {
    const term = studentSearch.toLowerCase().trim();
    if (!term) return [];
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [students, studentSearch]);

  // ---- Handlers ----

  const handleAddCourse = (courseId: string) => {
    setCourseIds([...courseIds, courseId]);
    setAddCourseDialogOpen(false);
    setCourseSearch("");
  };

  const handleRemoveCourse = (courseId: string) => {
    setCourseIds(courseIds.filter((id) => id !== courseId));
  };

  const handleMoveCourse = (index: number, direction: -1 | 1) => {
    const newIds = [...courseIds];
    const target = index + direction;
    if (target < 0 || target >= newIds.length) return;
    [newIds[index], newIds[target]] = [newIds[target], newIds[index]];
    setCourseIds(newIds);
  };

  const handleSave = async () => {
    if (!pathId) return;
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (courseIds.length < 2) {
      toast.error("Adicione pelo menos 2 cursos à trilha");
      return;
    }
    setSaving(true);
    try {
      await updatePath(pathId, {
        title: title.trim(),
        description: description.trim() || null,
        bannerUrl: bannerUrl || null,
        sequential,
        certificateEnabled: certEnabled,
        certificateTemplateId: certEnabled && certTemplateId ? certTemplateId : null,
      });
      await setPathCourses(pathId, courseIds);
      toast.success("Trilha salva");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleAddClassAccess = async () => {
    if (!pathId || !selectedClassId) return;
    try {
      await addAccess({ pathId, classId: selectedClassId });
      toast.success("Turma vinculada");
      setSelectedClassId("");
    } catch {
      toast.error("Erro ao vincular turma");
    }
  };

  const handleAddStudentAccess = async (studentId: string) => {
    if (!pathId) return;
    try {
      await addAccess({
        pathId,
        studentId,
        expiresAt: individualExpiresAt ? new Date(individualExpiresAt).toISOString() : undefined,
      });
      toast.success("Aluno vinculado");
      setStudentDialogOpen(false);
      setStudentSearch("");
      setIndividualExpiresAt("");
    } catch {
      toast.error("Erro ao vincular aluno");
    }
  };

  const handleRemoveAccess = async (accessId: string) => {
    try {
      await removeAccess(accessId);
      toast.success("Acesso removido");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  if (!path) {
    return (
      <div className="p-6 max-w-3xl">
        <Card>
          <CardContent className="py-12 text-center">
            <Route className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Trilha não encontrada</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/trilhas")}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Breadcrumb
        items={[
          { label: "Trilhas", to: "/admin/trilhas" },
          { label: path.title },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            Editar Trilha
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Conteudo</TabsTrigger>
          <TabsTrigger value="access">Acesso</TabsTrigger>
          <TabsTrigger value="certificate">Certificado</TabsTrigger>
        </TabsList>

        {/* ---- TAB 1: CONTEÚDO ---- */}
        <TabsContent value="content" className="space-y-6 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informações da trilha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Fotografia Completa" />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="O que o aluno vai aprender"
                  className="h-20 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Banner (16:9)</Label>
                <FileUpload
                  value={bannerUrl}
                  onChange={(url) => setBannerUrl(url)}
                  folder="learning-paths/banners"
                  imagePreset="banner"
                  aspectRatio="16 / 9"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <div className="space-y-0.5">
                  <Label>Sequência obrigatória</Label>
                  <p className="text-xs text-muted-foreground">
                    Aluno precisa concluir o curso anterior para desbloquear o próximo
                  </p>
                </div>
                <Switch checked={sequential} onCheckedChange={setSequential} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Cursos da trilha</CardTitle>
                <Button size="sm" onClick={() => setAddCourseDialogOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Adicionar curso
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {courseIds.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum curso adicionado. Clique em "Adicionar curso" para começar.
                </p>
              ) : (
                <div className="space-y-2">
                  {courseIds.map((courseId, idx) => {
                    const course = courseMap.get(courseId);
                    return (
                      <div key={courseId} className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/40 border border-border/40">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            disabled={idx === 0}
                            onClick={() => handleMoveCourse(idx, -1)}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            disabled={idx === courseIds.length - 1}
                            onClick={() => handleMoveCourse(idx, 1)}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground font-mono shrink-0">{idx + 1}.</span>
                        {course?.bannerUrl && (
                          <img
                            src={getProxiedImageUrl(course.bannerUrl)}
                            alt={course.title}
                            loading="lazy"
                            className="h-9 w-14 rounded object-cover shrink-0"
                            crossOrigin="anonymous"
                          />
                        )}
                        <p className="flex-1 text-sm truncate">{course?.title ?? "Curso removido"}</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleRemoveCourse(courseId)}
                        >
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- TAB 2: ACESSO ---- */}
        <TabsContent value="access" className="space-y-6 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Liberar por turma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes
                      .filter((c) => !classAccessRows.some((a) => a.classId === c.id))
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddClassAccess} disabled={!selectedClassId}>
                  Adicionar
                </Button>
              </div>

              {classAccessRows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma turma vinculada
                </p>
              ) : (
                <div className="space-y-2">
                  {classAccessRows.map((access) => {
                    const cls = classes.find((c) => c.id === access.classId);
                    return (
                      <div key={access.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/40">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{cls?.name ?? "Turma removida"}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleRemoveAccess(access.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Liberar por aluno (individual)
                </CardTitle>
                <Button size="sm" onClick={() => setStudentDialogOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Adicionar aluno
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {studentAccessRows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum aluno com acesso individual
                </p>
              ) : (
                <div className="space-y-2">
                  {studentAccessRows.map((access) => {
                    const student = students.find((s) => s.id === access.studentId);
                    return (
                      <div key={access.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/40">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{student?.name ?? "Aluno removido"}</span>
                          <span className="text-xs text-muted-foreground">{student?.email ?? "—"}</span>
                          {access.expiresAt && (
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              Expira: {new Date(access.expiresAt).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleRemoveAccess(access.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- TAB 3: CERTIFICADO ---- */}
        <TabsContent value="certificate" className="space-y-6 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                Certificado da trilha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Emitir certificado ao concluir trilha</Label>
                  <p className="text-xs text-muted-foreground">
                    O aluno recebe automaticamente quando todos os cursos forem 100% concluídos
                  </p>
                </div>
                <Switch checked={certEnabled} onCheckedChange={setCertEnabled} />
              </div>

              {certEnabled && (
                <div className="space-y-1.5 pt-2 border-t border-border/30">
                  <Label>Template do certificado</Label>
                  <Select value={certTemplateId} onValueChange={setCertTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templates.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum template criado. Crie templates em Configurações → Certificados.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---- ADD COURSE DIALOG ---- */}
      <Dialog open={addCourseDialogOpen} onOpenChange={setAddCourseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar curso à trilha</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Buscar curso..."
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto space-y-1 border border-border/40 rounded-md p-2">
              {availableCourses.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum curso disponivel</p>
              ) : (
                availableCourses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleAddCourse(c.id)}
                    className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    {c.bannerUrl && (
                      <img src={c.bannerUrl} alt="" loading="lazy" className="h-8 w-12 rounded object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    )}
                    <span className="text-sm flex-1 truncate">{c.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- ADD STUDENT DIALOG ---- */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar aluno individual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Buscar aluno (nome ou email)</Label>
              <Input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Digite para buscar..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data de expiração (opcional)</Label>
              <Input
                type="date"
                value={individualExpiresAt}
                onChange={(e) => setIndividualExpiresAt(e.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 border border-border/40 rounded-md p-2">
              {filteredStudents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {studentSearch ? "Nenhum aluno encontrado" : "Digite para buscar"}
                </p>
              ) : (
                filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleAddStudentAccess(s.id)}
                    className="flex flex-col w-full text-left p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.email}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
