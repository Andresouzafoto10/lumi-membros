import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Plus,
  Upload,
  Search,
  Eye,
  Trash2,
  UserCheck,
  UserX,
  X,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useRestrictions } from "@/hooks/useRestrictions";
import type { StudentRole, StudentStatus } from "@/types/student";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/courses/EmptyState";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  expired: "Expirado",
};

const STATUS_VARIANTS: Record<
  StudentStatus,
  "default" | "secondary" | "destructive"
> = {
  active: "default",
  inactive: "secondary",
  expired: "destructive",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  support: "Atendimento",
  moderator: "Moderador",
  student: "Aluno",
};

// ---------------------------------------------------------------------------
// Skeleton rows
// ---------------------------------------------------------------------------
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="space-y-1.5">
              <div className="h-3.5 w-36 bg-muted animate-pulse rounded" />
              <div className="h-3 w-48 bg-muted animate-pulse rounded" />
            </div>
          </TableCell>
          <TableCell>
            <div className="h-3.5 w-20 bg-muted animate-pulse rounded" />
          </TableCell>
          <TableCell>
            <div className="h-5 w-14 bg-muted animate-pulse rounded-full" />
          </TableCell>
          <TableCell>
            <div className="h-3.5 w-20 bg-muted animate-pulse rounded" />
          </TableCell>
          <TableCell>
            <div className="h-3.5 w-6 bg-muted animate-pulse rounded" />
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              <div className="h-8 w-8 bg-muted animate-pulse rounded" />
              <div className="h-8 w-8 bg-muted animate-pulse rounded" />
              <div className="h-8 w-8 bg-muted animate-pulse rounded" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// New student form state
// ---------------------------------------------------------------------------
type NewStudentForm = {
  name: string;
  email: string;
  tempPassword: string;
  role: StudentRole;
  classIds: string[];
};

const EMPTY_FORM: NewStudentForm = {
  name: "",
  email: "",
  tempPassword: "",
  role: "student",
  classIds: [],
};

// ---------------------------------------------------------------------------
// CSV preview row
// ---------------------------------------------------------------------------
type CsvRow = { name: string; email: string; valid: boolean };

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminStudentsPage() {
  const { students, enrollments, createStudent, createStudentsBulk, updateStudent, deleteStudent } =
    useStudents();
  const { classes } = useClasses();
  const { isRestricted } = useRestrictions();

  // Loading simulation — real data is immediate via localStorage, but we keep
  // a brief skeleton on first mount for UX consistency.
  const [loading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StudentStatus | "all">("all");
  const [filterRole, setFilterRole] = useState<string>("all");

  // New student dialog
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [form, setForm] = useState<NewStudentForm>(EMPTY_FORM);

  // CSV import dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvClassIds, setCsvClassIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------
  const enrollmentCountByStudent = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of enrollments) {
      if (e.status === "active") {
        map[e.studentId] = (map[e.studentId] ?? 0) + 1;
      }
    }
    return map;
  }, [enrollments]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return students.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q))
        return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (filterRole !== "all" && s.role !== filterRole) return false;
      return true;
    });
  }, [students, search, filterStatus, filterRole]);

  const uniqueRoles = useMemo(
    () => [...new Set(students.map((s) => s.role))],
    [students]
  );

  // ---------------------------------------------------------------------------
  // Handlers — new student
  // ---------------------------------------------------------------------------
  function handleCreateStudent() {
    if (!form.name.trim()) { toast.error("Informe o nome do aluno."); return; }
    if (!form.email.trim()) { toast.error("Informe o e-mail do aluno."); return; }
    if (!form.tempPassword.trim()) { toast.error("Informe a senha temporária."); return; }

    createStudent({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      status: "active",
      classIds: form.classIds,
    });
    toast.success("Aluno cadastrado com sucesso.");
    setForm(EMPTY_FORM);
    setNewDialogOpen(false);
  }

  function toggleClassInForm(classId: string) {
    setForm((prev) => ({
      ...prev,
      classIds: prev.classIds.includes(classId)
        ? prev.classIds.filter((id) => id !== classId)
        : [...prev.classIds, classId],
    }));
  }

  // ---------------------------------------------------------------------------
  // Handlers — CSV import
  // ---------------------------------------------------------------------------
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const rows: CsvRow[] = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        const name = parts[0] ?? "";
        const email = parts[1] ?? "";
        const valid = name.length > 0 && email.includes("@");
        return { name, email, valid };
      });
      setCsvRows(rows);
    };
    reader.readAsText(file);
  }

  async function handleConfirmImport() {
    const valid = csvRows.filter((r) => r.valid);
    if (valid.length === 0) { toast.error("Nenhuma linha válida para importar."); return; }
    const count = await createStudentsBulk(valid, csvClassIds);
    toast.success(`${count} aluno${count !== 1 ? "s" : ""} importado${count !== 1 ? "s" : ""} com sucesso.`);
    setCsvRows([]);
    setCsvClassIds([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setImportDialogOpen(false);
  }

  function toggleCsvClass(classId: string) {
    setCsvClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  }

  // ---------------------------------------------------------------------------
  // Handlers — row actions
  // ---------------------------------------------------------------------------
  function handleToggleStatus(id: string, current: StudentStatus) {
    const next: StudentStatus = current === "active" ? "inactive" : "active";
    updateStudent(id, { status: next });
    toast.success(next === "active" ? "Aluno ativado." : "Aluno desativado.");
  }

  function handleDelete() {
    if (!deleteTargetId) return;
    deleteStudent(deleteTargetId);
    toast.success("Aluno removido.");
    setDeleteTargetId(null);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Alunos</h1>
            <p className="text-sm text-muted-foreground">
              {students.length} membro{students.length !== 1 ? "s" : ""} cadastrado{students.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            Importar CSV
          </Button>
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setNewDialogOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />
            Novo aluno
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs group/search">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within/search:text-primary" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            className="pl-8 border-border/60 transition-all duration-200 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as StudentStatus | "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="expired">Expirado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Perfil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os perfis</SelectItem>
            {uniqueRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role] ?? role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || filterStatus !== "all" || filterRole !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setFilterStatus("all"); setFilterRole("all"); }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Turmas</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows />
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={Users}
                    title={search || filterStatus !== "all" || filterRole !== "all"
                      ? "Nenhum aluno encontrado"
                      : "Nenhum aluno cadastrado"}
                    description={
                      search || filterStatus !== "all" || filterRole !== "all"
                        ? "Tente ajustar os filtros de busca."
                        : "Clique em \"+ Novo aluno\" para cadastrar o primeiro membro."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div>
                        <p className="font-medium leading-none">{student.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {student.email}
                        </p>
                      </div>
                      {isRestricted(student.id) && (
                        <Ban className="h-3.5 w-3.5 text-yellow-500 shrink-0" aria-label="Aluno restrito" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ROLE_LABELS[student.role] ?? student.role}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[student.status]}>
                      {STATUS_LABELS[student.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(parseISO(student.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {enrollmentCountByStudent[student.id] ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" asChild title="Ver perfil">
                        <Link to={`/admin/alunos/${student.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title={student.status === "active" ? "Desativar" : "Ativar"}
                        onClick={() => handleToggleStatus(student.id, student.status)}
                      >
                        {student.status === "active" ? (
                          <UserX className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-emerald-500" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Excluir aluno"
                        onClick={() => setDeleteTargetId(student.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Mostrando {filtered.length} de {students.length} aluno{students.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* ================================================================== */}
      {/* New student dialog                                                  */}
      {/* ================================================================== */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo aluno</DialogTitle>
            <DialogDescription>
              Cadastre um novo membro manualmente na plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="ns-name">Nome completo</Label>
              <Input
                id="ns-name"
                placeholder="Ana Paula Ferreira"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ns-email">E-mail</Label>
              <Input
                id="ns-email"
                type="email"
                placeholder="ana@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ns-pw">Senha temporária</Label>
              <Input
                id="ns-pw"
                type="password"
                placeholder="••••••••"
                value={form.tempPassword}
                onChange={(e) => setForm({ ...form, tempPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil de acesso</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as StudentRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Aluno</SelectItem>
                  <SelectItem value="moderator">Moderador</SelectItem>
                  <SelectItem value="support">Atendimento</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {classes.length > 0 && (
              <div className="space-y-2">
                <Label>Turmas vinculadas</Label>
                <div className="rounded-md border divide-y">
                  {classes.map((cls) => (
                    <label
                      key={cls.id}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={form.classIds.includes(cls.id)}
                        onCheckedChange={() => toggleClassInForm(cls.id)}
                      />
                      <span className="text-sm">{cls.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateStudent}>Cadastrar aluno</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* CSV import dialog                                                   */}
      {/* ================================================================== */}
      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          if (!open) { setCsvRows([]); setCsvClassIds([]); }
          setImportDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar alunos via CSV</DialogTitle>
            <DialogDescription>
              Suba um arquivo CSV com colunas:{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                Nome, Email
              </code>{" "}
              (uma linha por aluno, sem cabeçalho).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Arquivo CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>

            {csvRows.length > 0 && (
              <>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">
                    Preview ({csvRows.filter((r) => r.valid).length} válido
                    {csvRows.filter((r) => r.valid).length !== 1 ? "s" : ""} de{" "}
                    {csvRows.length})
                  </p>
                  <div className="rounded-md border divide-y max-h-40 overflow-y-auto">
                    {csvRows.map((row, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 text-sm"
                      >
                        <span
                          className={
                            row.valid
                              ? "text-emerald-500 font-bold"
                              : "text-destructive font-bold"
                          }
                        >
                          {row.valid ? "✓" : "✗"}
                        </span>
                        <span className="flex-1 truncate">
                          {row.name || <em className="text-muted-foreground">sem nome</em>}
                        </span>
                        <span className="text-muted-foreground truncate">
                          {row.email || <em>sem e-mail</em>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {classes.length > 0 && (
                  <div className="space-y-2">
                    <Label>Vincular às turmas</Label>
                    <div className="rounded-md border divide-y">
                      {classes.map((cls) => (
                        <label
                          key={cls.id}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={csvClassIds.includes(cls.id)}
                            onCheckedChange={() => toggleCsvClass(cls.id)}
                          />
                          <span className="text-sm">{cls.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={csvRows.filter((r) => r.valid).length === 0}
            >
              Importar {csvRows.filter((r) => r.valid).length > 0
                ? `(${csvRows.filter((r) => r.valid).length})`
                : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* Delete confirmation                                                 */}
      {/* ================================================================== */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aluno?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as matrículas deste aluno também serão removidas. Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
