import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  UsersRound,
  Save,
  ChevronDown,
  ChevronRight,
  BookOpen,
  PlayCircle,
  Search,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { useClasses } from "@/hooks/useClasses";
import { useCourses } from "@/hooks/useCourses";
import type { ContentScheduleRule, EnrollmentType } from "@/types/student";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types / constants
// ---------------------------------------------------------------------------
const ENROLLMENT_TYPE_LABELS: Record<EnrollmentType, string> = {
  individual: "Curso individual",
  subscription: "Assinatura",
  unlimited: "Acesso ilimitado",
};

type ScheduleRuleType = ContentScheduleRule["rule"];

const RULE_LABELS: Record<ScheduleRuleType, string> = {
  free: "Acesso livre",
  scheduled_date: "Data programada",
  days_after_enrollment: "Dias após matrícula",
  blocked: "Bloqueado (visível com cadeado)",
  hidden: "Oculto",
  course_complete: "Ao concluir um curso",
  module_complete: "Ao concluir um módulo",
  lesson_complete: "Ao concluir uma aula",
};

// ---------------------------------------------------------------------------
// Inline schedule rule editor
// ---------------------------------------------------------------------------
type RuleEditorProps = {
  rule: ContentScheduleRule;
  onChange: (r: ContentScheduleRule) => void;
  allCourses: ReturnType<typeof useCourses>["allCourses"];
  allModules: { id: string; title: string }[];
  allLessons: { id: string; title: string; moduleTitle: string }[];
};

function RuleEditor({
  rule,
  onChange,
  allCourses,
  allModules,
  allLessons,
}: RuleEditorProps) {
  function setRuleType(type: ScheduleRuleType) {
    onChange({ ...rule, rule: type, releaseDate: undefined, closeDate: undefined, daysAfter: undefined, referenceId: undefined });
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <Select value={rule.rule} onValueChange={(v) => setRuleType(v as ScheduleRuleType)}>
        <SelectTrigger className="w-[220px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(RULE_LABELS) as ScheduleRuleType[]).map((r) => (
            <SelectItem key={r} value={r} className="text-xs">
              {RULE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {rule.rule === "scheduled_date" && (
        <>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Libera em</Label>
            <Input
              type="datetime-local"
              className="h-8 text-xs w-[180px]"
              value={rule.releaseDate?.slice(0, 16) ?? ""}
              onChange={(e) => onChange({ ...rule, releaseDate: e.target.value ? e.target.value + ":00Z" : undefined })}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Fecha em</Label>
            <Input
              type="datetime-local"
              className="h-8 text-xs w-[180px]"
              value={rule.closeDate?.slice(0, 16) ?? ""}
              onChange={(e) => onChange({ ...rule, closeDate: e.target.value ? e.target.value + ":00Z" : undefined })}
            />
          </div>
        </>
      )}

      {rule.rule === "days_after_enrollment" && (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={1}
            placeholder="Dias"
            className="h-8 text-xs w-20"
            value={rule.daysAfter ?? ""}
            onChange={(e) => onChange({ ...rule, daysAfter: e.target.value ? Number(e.target.value) : undefined })}
          />
          <Label className="text-xs text-muted-foreground">dias após matrícula</Label>
        </div>
      )}

      {rule.rule === "course_complete" && (
        <Select
          value={rule.referenceId ?? ""}
          onValueChange={(v) => onChange({ ...rule, referenceId: v })}
        >
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Selecione o curso" />
          </SelectTrigger>
          <SelectContent>
            {allCourses.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {rule.rule === "module_complete" && (
        <Select
          value={rule.referenceId ?? ""}
          onValueChange={(v) => onChange({ ...rule, referenceId: v })}
        >
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Selecione o módulo" />
          </SelectTrigger>
          <SelectContent>
            {allModules.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-xs">
                {m.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {rule.rule === "lesson_complete" && (
        <Select
          value={rule.referenceId ?? ""}
          onValueChange={(v) => onChange({ ...rule, referenceId: v })}
        >
          <SelectTrigger className="w-[220px] h-8 text-xs">
            <SelectValue placeholder="Selecione a aula" />
          </SelectTrigger>
          <SelectContent>
            {allLessons.map((l) => (
              <SelectItem key={l.id} value={l.id} className="text-xs">
                {l.moduleTitle} › {l.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Course multi-select with search
// ---------------------------------------------------------------------------
type Course = ReturnType<typeof useCourses>["allCourses"][number];

function CourseMultiSelect({
  selectedIds,
  courses,
  onAdd,
  onRemove,
}: {
  selectedIds: string[];
  courses: Course[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCourses = selectedIds
    .map((id) => courses.find((c) => c.id === id))
    .filter(Boolean) as Course[];

  const suggestions = useMemo(
    () =>
      courses.filter(
        (c) =>
          !selectedIds.includes(c.id) &&
          c.title.toLowerCase().includes(query.toLowerCase())
      ),
    [courses, selectedIds, query]
  );

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Selected chips */}
      {selectedCourses.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCourses.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {c.title}
              <button
                type="button"
                onClick={() => onRemove(c.id)}
                className="ml-0.5 rounded-full hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar e adicionar curso..."
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* Dropdown results */}
      {open && (
        <div className="rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto divide-y">
          {suggestions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              {query
                ? "Nenhum curso encontrado."
                : selectedIds.length === courses.length
                  ? "Todos os cursos já foram adicionados."
                  : "Nenhum curso disponível."}
            </p>
          ) : (
            suggestions.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-muted/40 transition-colors"
                onClick={() => { onAdd(c.id); setQuery(""); }}
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {c.title}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AdminClassEditPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { classes, createClass, updateClass, updateScheduleRule } = useClasses();
  const { allCourses, findCourse } = useCourses();

  const isNew = classId === "nova";
  const existingClass = useMemo(
    () => (!isNew && classId ? classes.find((c) => c.id === classId) ?? null : null),
    [classes, classId, isNew]
  );

  // Form state
  const [name, setName] = useState(existingClass?.name ?? "");
  const [courseIds, setCourseIds] = useState<string[]>(existingClass?.courseIds ?? []);
  const [enrollmentType, setEnrollmentType] = useState<EnrollmentType>(
    existingClass?.enrollmentType ?? "individual"
  );
  const [accessDays, setAccessDays] = useState<string>(
    existingClass?.accessDurationDays?.toString() ?? ""
  );
  const [scheduleRules, setScheduleRules] = useState<ContentScheduleRule[]>(
    existingClass?.contentSchedule ?? []
  );

  // Sync state when existingClass loads (after navigation)
  useEffect(() => {
    if (existingClass) {
      setName(existingClass.name);
      setCourseIds(existingClass.courseIds);
      setEnrollmentType(existingClass.enrollmentType);
      setAccessDays(existingClass.accessDurationDays?.toString() ?? "");
      setScheduleRules(existingClass.contentSchedule);
    }
  }, [existingClass?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Module open/close state
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  const selectedCourses = useMemo(
    () => courseIds.map((id) => findCourse(id)).filter(Boolean) as NonNullable<ReturnType<typeof findCourse>>[],
    [courseIds, findCourse]
  );

  // Flat lists used by RuleEditor (across all selected courses)
  const allSelectedModules = useMemo(
    () =>
      selectedCourses.flatMap((course) =>
        course.modules.map((m) => ({
          id: m.id,
          title: `${course.title} › ${m.title}`,
        }))
      ),
    [selectedCourses]
  );

  const allSelectedLessons = useMemo(
    () =>
      selectedCourses.flatMap((course) =>
        course.modules.flatMap((m) =>
          m.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            moduleTitle: `${course.title} › ${m.title}`,
          }))
        )
      ),
    [selectedCourses]
  );

  // ---------------------------------------------------------------------------
  // Course selection toggle
  // ---------------------------------------------------------------------------
  function toggleCourse(id: string) {
    setCourseIds((prev) => {
      if (prev.includes(id)) {
        // Remove course and its schedule rules
        setScheduleRules((rules) => {
          const courseModuleIds = new Set(
            (findCourse(id)?.modules ?? []).map((m) => m.id)
          );
          const courseLessonIds = new Set(
            (findCourse(id)?.modules ?? []).flatMap((m) => m.lessons.map((l) => l.id))
          );
          return rules.filter(
            (r) =>
              !(
                (r.targetType === "module" && courseModuleIds.has(r.targetId)) ||
                (r.targetType === "lesson" && courseLessonIds.has(r.targetId))
              )
          );
        });
        return prev.filter((c) => c !== id);
      }
      return [...prev, id];
    });
  }

  // ---------------------------------------------------------------------------
  // Schedule helpers
  // ---------------------------------------------------------------------------
  function getRuleFor(targetId: string, targetType: "module" | "lesson"): ContentScheduleRule {
    return (
      scheduleRules.find((r) => r.targetId === targetId && r.targetType === targetType) ?? {
        targetId,
        targetType,
        rule: "free",
      }
    );
  }

  function setRuleFor(rule: ContentScheduleRule) {
    if (rule.rule === "free") {
      setScheduleRules((prev) =>
        prev.filter((r) => !(r.targetId === rule.targetId && r.targetType === rule.targetType))
      );
    } else {
      setScheduleRules((prev) => {
        const idx = prev.findIndex(
          (r) => r.targetId === rule.targetId && r.targetType === rule.targetType
        );
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = rule;
          return updated;
        }
        return [...prev, rule];
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  function handleSave() {
    if (!name.trim()) { toast.error("Informe o nome da turma."); return; }
    if (courseIds.length === 0) { toast.error("Selecione pelo menos um curso."); return; }

    const days = accessDays ? Number(accessDays) : null;

    if (isNew) {
      const newId = createClass({
        name: name.trim(),
        courseIds,
        enrollmentType,
        accessDurationDays: enrollmentType === "unlimited" ? null : days,
      });
      for (const rule of scheduleRules) {
        updateScheduleRule(newId, rule);
      }
      toast.success("Turma criada com sucesso.");
      navigate(`/admin/turmas/${newId}/edit`);
    } else if (existingClass) {
      updateClass(existingClass.id, {
        name: name.trim(),
        courseIds,
        enrollmentType,
        accessDurationDays: enrollmentType === "unlimited" ? null : days,
        contentSchedule: scheduleRules,
      });
      toast.success("Turma atualizada com sucesso.");
    }
  }

  function toggleModule(moduleId: string) {
    setOpenModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  }

  const pageTitle = isNew ? "Nova turma" : (existingClass?.name ?? "Editar turma");

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Admin", to: "/admin" },
          { label: "Turmas", to: "/admin/turmas" },
          { label: pageTitle },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <UsersRound className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-1.5 h-4 w-4" />
          Salvar
        </Button>
      </div>

      {/* Basic info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informações da turma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cls-name">Nome da turma</Label>
            <Input
              id="cls-name"
              placeholder="ex: Pacote Fotografia Completo — Jan/2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Multi-course selection */}
          <div className="space-y-1.5">
            <Label>
              Cursos vinculados
              {courseIds.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {courseIds.length} selecionado{courseIds.length !== 1 ? "s" : ""}
                </span>
              )}
            </Label>
            <CourseMultiSelect
              selectedIds={courseIds}
              courses={allCourses}
              onAdd={(id) => toggleCourse(id)}
              onRemove={(id) => toggleCourse(id)}
            />
            <p className="text-xs text-muted-foreground">
              O aluno matriculado nesta turma terá acesso a todos os cursos selecionados.
            </p>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de matrícula</Label>
              <Select
                value={enrollmentType}
                onValueChange={(v) => {
                  setEnrollmentType(v as EnrollmentType);
                  if (v === "unlimited") setAccessDays("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ENROLLMENT_TYPE_LABELS) as EnrollmentType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {ENROLLMENT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {enrollmentType !== "unlimited" && (
              <div className="space-y-1.5">
                <Label htmlFor="access-days">
                  Prazo de acesso{" "}
                  <span className="text-muted-foreground font-normal">(dias)</span>
                </Label>
                <Input
                  id="access-days"
                  type="number"
                  min={1}
                  placeholder="ex: 365"
                  value={accessDays}
                  onChange={(e) => setAccessDays(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para acesso sem expiração.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content scheduling — per course */}
      {selectedCourses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Agendamento de conteúdo</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Defina quando cada módulo ou aula ficará disponível para os alunos
              desta turma. Padrão: acesso livre.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {selectedCourses.map((course, courseIdx) => (
              <div key={course.id}>
                {/* Course separator header */}
                {selectedCourses.length > 1 && (
                  <div className="px-6 py-2 bg-muted/50 border-y text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {course.title}
                  </div>
                )}
                {course.modules.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-muted-foreground">
                    Este curso não possui módulos cadastrados.
                  </p>
                ) : (
                  <div className={cn("divide-y", courseIdx < selectedCourses.length - 1 && "border-b")}>
                    {course.modules
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((mod) => {
                        const isOpen = openModules[mod.id] ?? false;
                        const modRule = getRuleFor(mod.id, "module");
                        const hasCustomModRule = modRule.rule !== "free";
                        const hasCustomLessonRule = mod.lessons.some(
                          (l) => getRuleFor(l.id, "lesson").rule !== "free"
                        );
                        const hasAnyCustom = hasCustomModRule || hasCustomLessonRule;

                        return (
                          <div key={mod.id}>
                            {/* Module row */}
                            <div
                              className={cn(
                                "px-6 py-3 bg-muted/30",
                                isOpen && "border-b"
                              )}
                            >
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors"
                                    onClick={() => toggleModule(mod.id)}
                                  >
                                    {isOpen ? (
                                      <ChevronDown className="h-4 w-4 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 shrink-0" />
                                    )}
                                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span>{mod.title}</span>
                                    <span className="text-xs font-normal text-muted-foreground">
                                      ({mod.lessons.length} aula{mod.lessons.length !== 1 ? "s" : ""})
                                    </span>
                                    {hasAnyCustom && (
                                      <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                                    )}
                                  </button>
                                </div>
                                <div className="pl-6">
                                  <RuleEditor
                                    rule={modRule}
                                    onChange={setRuleFor}
                                    allCourses={allCourses}
                                    allModules={allSelectedModules}
                                    allLessons={allSelectedLessons}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Lessons */}
                            {isOpen && (
                              <div className="divide-y bg-background">
                                {mod.lessons
                                  .slice()
                                  .sort((a, b) => a.order - b.order)
                                  .map((lesson) => {
                                    const lessonRule = getRuleFor(lesson.id, "lesson");
                                    return (
                                      <div
                                        key={lesson.id}
                                        className="px-6 py-3 pl-14 flex flex-col gap-2"
                                      >
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                          <PlayCircle className="h-3.5 w-3.5 shrink-0" />
                                          <span>{lesson.title}</span>
                                        </div>
                                        <RuleEditor
                                          rule={lessonRule}
                                          onChange={setRuleFor}
                                          allCourses={allCourses}
                                          allModules={allSelectedModules}
                                          allLessons={allSelectedLessons}
                                        />
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Save footer */}
      <div className="flex justify-end pb-6">
        <Button onClick={handleSave}>
          <Save className="mr-1.5 h-4 w-4" />
          {isNew ? "Criar turma" : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
