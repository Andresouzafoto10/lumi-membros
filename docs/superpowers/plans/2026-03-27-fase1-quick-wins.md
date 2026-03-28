# Fase 1: Quick Wins — Melhorias UX/UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polir a experiência existente do lumi-membros com busca, estados vazios, notas, navegação por breadcrumbs, micro-interacoes e responsividade aprimorada.

**Architecture:** Todas as melhorias sao frontend-only, usando o mesmo padrao de estado com localStorage. Novos componentes seguem o padrao shadcn/ui existente em `src/components/ui/`. Hooks customizados em `src/hooks/` para logica de estado reutilizavel.

**Tech Stack:** React 18, React Router v6, Tailwind CSS 3, Radix UI, lucide-react, react-helmet-async (nova dep), sonner (toasts)

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/courses/CourseSearch.tsx` | Barra de busca + filtro por sessao |
| `src/components/courses/EmptyState.tsx` | Componente reutilizavel de estado vazio |
| `src/components/courses/SkeletonCourseCard.tsx` | Skeleton loader para cards de curso |
| `src/components/courses/LessonNotes.tsx` | Textarea de anotacoes por aula |
| `src/components/courses/CourseProgressTopBar.tsx` | Barra fina de progresso no topo |
| `src/components/courses/ContinueWatching.tsx` | Card "Continue de onde parou" |
| `src/components/ui/breadcrumb.tsx` | Componente Breadcrumb reutilizavel |
| `src/hooks/useLastWatched.ts` | Rastreia ultimo curso/aula acessado |
| `src/hooks/useLessonNotes.ts` | Gerencia notas de aula no localStorage |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/student/CoursesPage.tsx` | Integrar busca, filtros, continue watching, empty states |
| `src/pages/student/CourseDetailPage.tsx` | Breadcrumb, progress bar, notas, botao concluir melhorado |
| `src/components/courses/CourseCard.tsx` | Hover effects, badge "Novo" |
| `src/components/courses/CourseSidebar.tsx` | Transicoes de expand/collapse |
| `src/components/layout/AdminLayout.tsx` | Breadcrumbs no admin |
| `src/App.tsx` | Sem mudancas nesta fase |
| `package.json` | Adicionar react-helmet-async |
| `index.html` | Adicionar favicon |

---

## Task 1: Instalar dependencia e configurar meta tags dinamicas

**Files:**
- Modify: `package.json`
- Modify: `index.html`
- Modify: `src/main.tsx`
- Modify: `src/pages/student/CoursesPage.tsx`
- Modify: `src/pages/student/CourseDetailPage.tsx`

- [ ] **Step 1: Instalar react-helmet-async**

```bash
cd "/Users/andresouzam3pro/Desktop/01 - app andre/lumi-membros"
npm install react-helmet-async
```

- [ ] **Step 2: Adicionar favicon no index.html**

Em `index.html`, substituir o `<head>` existente. Adicionar um favicon SVG inline com a cor teal da marca:

```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect rx='20' width='100' height='100' fill='%2300C2CB'/><text x='50' y='68' font-size='50' text-anchor='middle' fill='white' font-family='system-ui' font-weight='bold'>L</text></svg>" />
```

- [ ] **Step 3: Envolver app com HelmetProvider em main.tsx**

Importar `HelmetProvider` de `react-helmet-async` e envolver o `<App />`:

```tsx
import { HelmetProvider } from "react-helmet-async";

// Dentro do render, envolver tudo:
<HelmetProvider>
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    {/* ...resto */}
  </ThemeProvider>
</HelmetProvider>
```

- [ ] **Step 4: Adicionar Helmet na CoursesPage**

No topo do return de `CoursesPage`, adicionar:

```tsx
import { Helmet } from "react-helmet-async";

// Dentro do return, antes do primeiro elemento:
<Helmet>
  <title>Cursos | Lumi Membros</title>
</Helmet>
```

- [ ] **Step 5: Adicionar Helmet na CourseDetailPage**

```tsx
import { Helmet } from "react-helmet-async";

// Dentro do return, usar titulo dinamico:
<Helmet>
  <title>{course ? `${course.title} | Lumi Membros` : "Curso | Lumi Membros"}</title>
</Helmet>
```

- [ ] **Step 6: Verificar visualmente**

Run: `npm run dev`
Verificar: favicon aparece na aba do navegador, titulo muda ao navegar entre paginas.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json index.html src/main.tsx src/pages/student/CoursesPage.tsx src/pages/student/CourseDetailPage.tsx
git commit -m "feat: add dynamic page titles and favicon with react-helmet-async"
```

---

## Task 2: Componente EmptyState reutilizavel

**Files:**
- Create: `src/components/courses/EmptyState.tsx`

- [ ] **Step 1: Criar o componente EmptyState**

```tsx
// src/components/courses/EmptyState.tsx
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/courses/EmptyState.tsx
git commit -m "feat: add reusable EmptyState component"
```

---

## Task 3: Componente SkeletonCourseCard

**Files:**
- Create: `src/components/courses/SkeletonCourseCard.tsx`

- [ ] **Step 1: Criar o componente skeleton**

```tsx
// src/components/courses/SkeletonCourseCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export function SkeletonCourseCard() {
  return (
    <Card className="overflow-hidden border-none shadow-md">
      <AspectRatio ratio={16 / 9}>
        <div className="h-full w-full bg-muted animate-pulse" />
      </AspectRatio>
      <CardContent className="p-5 space-y-3">
        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-muted animate-pulse rounded" />
          <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-2 w-full bg-muted animate-pulse rounded mt-3" />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/courses/SkeletonCourseCard.tsx
git commit -m "feat: add SkeletonCourseCard loading placeholder"
```

---

## Task 4: Busca e filtros de cursos

**Files:**
- Create: `src/components/courses/CourseSearch.tsx`
- Modify: `src/pages/student/CoursesPage.tsx`

- [ ] **Step 1: Criar componente CourseSearch**

```tsx
// src/components/courses/CourseSearch.tsx
import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CourseSession } from "@/types/course";

interface CourseSearchProps {
  sessions: CourseSession[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSessionId: string;
  onSessionChange: (sessionId: string) => void;
}

export function CourseSearch({
  sessions,
  searchQuery,
  onSearchChange,
  selectedSessionId,
  onSessionChange,
}: CourseSearchProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cursos..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onSearchChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <Select value={selectedSessionId} onValueChange={onSessionChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Todas as sessoes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as sessoes</SelectItem>
          {sessions
            .filter((s) => s.isActive)
            .map((session) => (
              <SelectItem key={session.id} value={session.id}>
                {session.title}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 2: Integrar busca e filtros na CoursesPage**

Reescrever `src/pages/student/CoursesPage.tsx` para adicionar estado de busca/filtro, importar `CourseSearch`, `EmptyState` e `SkeletonCourseCard`:

```tsx
// src/pages/student/CoursesPage.tsx
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BookOpen, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseBannersCarousel } from "@/components/courses/CourseBannersCarousel";
import { CourseSearch } from "@/components/courses/CourseSearch";
import { EmptyState } from "@/components/courses/EmptyState";
import { useCourses } from "@/hooks/useCourses";

export default function CoursesPage() {
  const { sessions, activeBanners } = useCourses();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("all");

  // Read progress from localStorage for each course
  const courseProgress = useMemo(() => {
    const progress: Record<string, number> = {};
    const allCourses = sessions.flatMap((s) => s.courses);

    for (const course of allCourses) {
      try {
        const raw = localStorage.getItem(
          `lumi-membros:progress:${course.id}`
        );
        if (raw) {
          const completed: Record<string, boolean> = JSON.parse(raw);
          const totalLessons = course.modules
            .filter((m) => m.isActive)
            .flatMap((m) => m.lessons.filter((l) => l.isActive));
          const completedCount = totalLessons.filter(
            (l) => completed[l.id]
          ).length;
          progress[course.id] =
            totalLessons.length > 0
              ? (completedCount / totalLessons.length) * 100
              : 0;
        } else {
          progress[course.id] = 0;
        }
      } catch {
        progress[course.id] = 0;
      }
    }

    return progress;
  }, [sessions]);

  const activeSessions = useMemo(() => {
    let filtered = sessions.filter(
      (s) => s.isActive && s.courses.some((c) => c.isActive)
    );

    if (selectedSessionId !== "all") {
      filtered = filtered.filter((s) => s.id === selectedSessionId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered
        .map((session) => ({
          ...session,
          courses: session.courses.filter(
            (c) =>
              c.isActive &&
              (c.title.toLowerCase().includes(query) ||
                c.description.toLowerCase().includes(query))
          ),
        }))
        .filter((s) => s.courses.length > 0);
    }

    return filtered;
  }, [sessions, selectedSessionId, searchQuery]);

  const isFiltering = searchQuery.trim() !== "" || selectedSessionId !== "all";

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-10">
      <Helmet>
        <title>Cursos | Lumi Membros</title>
      </Helmet>

      {/* Banner carousel */}
      {activeBanners.length > 0 && (
        <CourseBannersCarousel banners={activeBanners} />
      )}

      {/* Search and filters */}
      <CourseSearch
        sessions={sessions}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSessionId={selectedSessionId}
        onSessionChange={setSelectedSessionId}
      />

      {/* No courses at all */}
      {!isFiltering && activeSessions.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="Nenhum curso disponivel"
          description="Novos cursos estao sendo preparados. Volte em breve!"
        />
      )}

      {/* No results from search/filter */}
      {isFiltering && activeSessions.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="Nenhum curso encontrado"
          description="Tente buscar com outros termos ou limpe os filtros."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedSessionId("all");
              }}
            >
              Limpar filtros
            </Button>
          }
        />
      )}

      {/* Sessions with courses */}
      {activeSessions.map((session) => {
        const activeCourses = session.courses
          .filter((c) => c.isActive)
          .sort((a, b) => a.order - b.order);

        if (activeCourses.length === 0) return null;

        return (
          <section key={session.id}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">{session.title}</h2>
                {session.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {session.description}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {activeCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  to={`/cursos/${course.id}`}
                  title={course.title}
                  description={course.description}
                  bannerUrl={course.bannerUrl}
                  progressPercent={courseProgress[course.id]}
                  isDisabled={!course.isActive}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev`
Verificar: barra de busca aparece, filtro por sessao funciona, buscar texto filtra cursos, "Nenhum curso encontrado" aparece com filtro ativo sem resultados, botao "Limpar filtros" reseta tudo.

- [ ] **Step 4: Commit**

```bash
git add src/components/courses/CourseSearch.tsx src/pages/student/CoursesPage.tsx
git commit -m "feat: add course search bar and session filter with empty states"
```

---

## Task 5: "Continue de onde parou" e hook useLastWatched

**Files:**
- Create: `src/hooks/useLastWatched.ts`
- Create: `src/components/courses/ContinueWatching.tsx`
- Modify: `src/pages/student/CoursesPage.tsx`
- Modify: `src/pages/student/CourseDetailPage.tsx`

- [ ] **Step 1: Criar hook useLastWatched**

```tsx
// src/hooks/useLastWatched.ts
import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "lumi-membros:last-watched";

type LastWatched = {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  timestamp: number;
} | null;

let cached: LastWatched = load();
const listeners = new Set<() => void>();

function load(): LastWatched {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(value: LastWatched) {
  cached = value;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return cached;
}

export function useLastWatched() {
  const lastWatched = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setLastWatched = useCallback(
    (data: {
      courseId: string;
      courseTitle: string;
      lessonId: string;
      lessonTitle: string;
    }) => {
      save({ ...data, timestamp: Date.now() });
    },
    []
  );

  return { lastWatched, setLastWatched };
}
```

- [ ] **Step 2: Criar componente ContinueWatching**

```tsx
// src/components/courses/ContinueWatching.tsx
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ContinueWatchingProps {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
}

export function ContinueWatching({
  courseId,
  courseTitle,
  lessonId,
  lessonTitle,
}: ContinueWatchingProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
            Continue de onde parou
          </p>
          <p className="text-sm font-semibold truncate">{courseTitle}</p>
          <p className="text-xs text-muted-foreground truncate">
            {lessonTitle}
          </p>
        </div>
        <Button size="sm" className="shrink-0 gap-1.5" asChild>
          <Link to={`/cursos/${courseId}?lesson=${lessonId}`}>
            <Play className="h-3.5 w-3.5" />
            Continuar
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Integrar na CoursesPage**

No `CoursesPage.tsx`, importar e adicionar acima da busca:

```tsx
import { ContinueWatching } from "@/components/courses/ContinueWatching";
import { useLastWatched } from "@/hooks/useLastWatched";

// Dentro do componente:
const { lastWatched } = useLastWatched();

// No JSX, entre o carousel e o CourseSearch:
{lastWatched && (
  <ContinueWatching
    courseId={lastWatched.courseId}
    courseTitle={lastWatched.courseTitle}
    lessonId={lastWatched.lessonId}
    lessonTitle={lastWatched.lessonTitle}
  />
)}
```

- [ ] **Step 4: Salvar progresso no CourseDetailPage**

No `CourseDetailPage.tsx`, importar o hook e salvar quando uma aula e selecionada:

```tsx
import { useLastWatched } from "@/hooks/useLastWatched";

// Dentro do componente:
const { setLastWatched } = useLastWatched();

// Dentro de handleSelectLesson, apos setActiveLessonId:
const handleSelectLesson = useCallback(
  (lessonId: string) => {
    setActiveLessonId(lessonId);
    if (course) {
      const lesson = allLessons.find((l) => l.id === lessonId);
      if (lesson) {
        setLastWatched({
          courseId: course.id,
          courseTitle: course.title,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
        });
      }
    }
  },
  [course, allLessons, setLastWatched]
);
```

Tambem salvar quando `handleStartCourse` e chamado:

```tsx
const handleStartCourse = useCallback(() => {
  if (allLessons.length > 0 && course) {
    setActiveLessonId(allLessons[0].id);
    setLastWatched({
      courseId: course.id,
      courseTitle: course.title,
      lessonId: allLessons[0].id,
      lessonTitle: allLessons[0].title,
    });
  }
}, [allLessons, course, setLastWatched]);
```

- [ ] **Step 5: Verificar visualmente**

Run: `npm run dev`
Verificar: abrir um curso, selecionar uma aula, voltar para /cursos — card "Continue de onde parou" aparece com o curso/aula corretos. Clicar "Continuar" abre o curso na aula certa.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useLastWatched.ts src/components/courses/ContinueWatching.tsx src/pages/student/CoursesPage.tsx src/pages/student/CourseDetailPage.tsx
git commit -m "feat: add 'continue where you left off' card with last watched tracking"
```

---

## Task 6: Breadcrumb component e integracao

**Files:**
- Create: `src/components/ui/breadcrumb.tsx`
- Modify: `src/pages/student/CourseDetailPage.tsx`
- Modify: `src/components/layout/AdminLayout.tsx`

- [ ] **Step 1: Criar componente Breadcrumb**

```tsx
// src/components/ui/breadcrumb.tsx
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1.5 text-sm", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "truncate max-w-[200px]",
                  isLast
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Integrar breadcrumb na CourseDetailPage**

Em `CourseDetailPage.tsx`, substituir o link "Voltar" pelo breadcrumb:

```tsx
import { Breadcrumb } from "@/components/ui/breadcrumb";

// Substituir o bloco <Link to="/cursos"> ... </Link> por:
<Breadcrumb
  items={[
    { label: "Cursos", to: "/cursos" },
    { label: course.title },
    ...(activeLesson ? [{ label: activeLesson.title }] : []),
  ]}
  className="mb-6"
/>
```

Para o caso de curso nao encontrado, manter o link simples para `/cursos`.

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev`
Verificar: breadcrumb aparece na pagina do curso com "Cursos > Nome do Curso". Ao selecionar aula, aparece "Cursos > Nome do Curso > Nome da Aula". "Cursos" e clicavel e navega para /cursos.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/breadcrumb.tsx src/pages/student/CourseDetailPage.tsx
git commit -m "feat: add breadcrumb navigation to course detail page"
```

---

## Task 7: Barra de progresso no topo e botao de conclusao melhorado

**Files:**
- Create: `src/components/courses/CourseProgressTopBar.tsx`
- Modify: `src/pages/student/CourseDetailPage.tsx`

- [ ] **Step 1: Criar CourseProgressTopBar**

```tsx
// src/components/courses/CourseProgressTopBar.tsx
import { cn } from "@/lib/utils";

interface CourseProgressTopBarProps {
  percent: number;
  className?: string;
}

export function CourseProgressTopBar({
  percent,
  className,
}: CourseProgressTopBarProps) {
  return (
    <div className={cn("w-full h-1 bg-muted rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-primary rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Integrar progress bar e melhorar botao de conclusao na CourseDetailPage**

Em `CourseDetailPage.tsx`:

Importar o componente:
```tsx
import { CourseProgressTopBar } from "@/components/courses/CourseProgressTopBar";
import { toast } from "sonner";
```

Adicionar a progress bar logo apos o breadcrumb:
```tsx
<CourseProgressTopBar percent={percentCompleted} className="mb-6" />
```

Melhorar o `handleCompleteLesson` para mostrar toast e avancar para proxima aula:
```tsx
const handleCompleteLesson = useCallback(() => {
  if (!activeLessonId) return;
  const wasAlreadyCompleted = completedLessons[activeLessonId];
  setCompletedLessons((prev) => ({
    ...prev,
    [activeLessonId]: true,
  }));
  if (!wasAlreadyCompleted) {
    toast.success("Aula concluida!", {
      description: nextLesson
        ? "Avancando para a proxima aula..."
        : "Parabens pelo progresso!",
    });
    // Auto-advance to next lesson after a short delay
    if (nextLesson) {
      setTimeout(() => handleSelectLesson(nextLesson.id), 1200);
    }
  }
}, [activeLessonId, completedLessons, nextLesson, handleSelectLesson]);
```

Nota: `handleSelectLesson` precisa ser definido antes de `handleCompleteLesson` para que a referencia funcione. Reordenar se necessario.

- [ ] **Step 3: Verificar visualmente**

Run: `npm run dev`
Verificar: barra fina de progresso aparece abaixo do breadcrumb. Ao concluir aula, toast aparece e apos 1.2s avanca para proxima aula automaticamente.

- [ ] **Step 4: Commit**

```bash
git add src/components/courses/CourseProgressTopBar.tsx src/pages/student/CourseDetailPage.tsx
git commit -m "feat: add course progress top bar, toast on completion, and auto-advance"
```

---

## Task 8: Notas do aluno por aula

**Files:**
- Create: `src/hooks/useLessonNotes.ts`
- Create: `src/components/courses/LessonNotes.tsx`
- Modify: `src/pages/student/CourseDetailPage.tsx`

- [ ] **Step 1: Criar hook useLessonNotes**

```tsx
// src/hooks/useLessonNotes.ts
import { useState, useCallback, useEffect } from "react";

const STORAGE_PREFIX = "lumi-membros:notes:";

export function useLessonNotes(courseId: string | undefined, lessonId: string | null) {
  const key = courseId && lessonId ? `${STORAGE_PREFIX}${courseId}:${lessonId}` : null;

  const [content, setContent] = useState(() => {
    if (!key) return "";
    try {
      return localStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  });

  // Reload when lesson changes
  useEffect(() => {
    if (!key) {
      setContent("");
      return;
    }
    try {
      setContent(localStorage.getItem(key) ?? "");
    } catch {
      setContent("");
    }
  }, [key]);

  const saveNote = useCallback(
    (text: string) => {
      setContent(text);
      if (key) {
        try {
          if (text.trim()) {
            localStorage.setItem(key, text);
          } else {
            localStorage.removeItem(key);
          }
        } catch {
          // ignore
        }
      }
    },
    [key]
  );

  return { content, saveNote };
}
```

- [ ] **Step 2: Criar componente LessonNotes**

```tsx
// src/components/courses/LessonNotes.tsx
import { useRef, useEffect } from "react";
import { StickyNote } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface LessonNotesProps {
  content: string;
  onChange: (text: string) => void;
}

export function LessonNotes({ content, onChange }: LessonNotesProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = (value: string) => {
    // Debounce save by 500ms
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onChange(value), 500);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <StickyNote className="h-4 w-4" />
          Minhas anotacoes
          {content.trim() && (
            <span className="h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <Textarea
          placeholder="Escreva suas anotacoes sobre esta aula..."
          defaultValue={content}
          onChange={(e) => handleChange(e.target.value)}
          className="min-h-[120px] resize-y"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Salvo automaticamente
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

- [ ] **Step 3: Integrar na CourseDetailPage**

Em `CourseDetailPage.tsx`, importar e adicionar apos a descricao da aula:

```tsx
import { useLessonNotes } from "@/hooks/useLessonNotes";
import { LessonNotes } from "@/components/courses/LessonNotes";

// Dentro do componente:
const { content: noteContent, saveNote } = useLessonNotes(courseId, activeLessonId);

// No JSX, apos o bloco de descricao da aula (dentro do activeLesson && block):
<LessonNotes content={noteContent} onChange={saveNote} />
```

- [ ] **Step 4: Verificar visualmente**

Run: `npm run dev`
Verificar: botao "Minhas anotacoes" aparece abaixo da descricao. Expandir mostra textarea. Digitar texto e trocar de aula — ao voltar, nota persiste. Dot azul aparece quando tem nota salva.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useLessonNotes.ts src/components/courses/LessonNotes.tsx src/pages/student/CourseDetailPage.tsx
git commit -m "feat: add per-lesson notes with auto-save to localStorage"
```

---

## Task 9: Hover effects no CourseCard e badge "Novo"

**Files:**
- Modify: `src/components/courses/CourseCard.tsx`

- [ ] **Step 1: Atualizar CourseCard com hover effects e badge**

Reescrever `src/components/courses/CourseCard.tsx`:

```tsx
// src/components/courses/CourseCard.tsx
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  to: string;
  title: string;
  description: string;
  bannerUrl: string;
  progressPercent?: number;
  isDisabled?: boolean;
  createdAt?: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function CourseCard({
  to,
  title,
  description,
  bannerUrl,
  progressPercent,
  isDisabled,
  createdAt,
}: CourseCardProps) {
  const isNew =
    createdAt != null &&
    Date.now() - new Date(createdAt).getTime() < SEVEN_DAYS_MS;

  return (
    <Link
      to={to}
      className={cn(
        "block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group",
        isDisabled && "opacity-60 pointer-events-none"
      )}
      tabIndex={isDisabled ? -1 : undefined}
      aria-disabled={isDisabled}
    >
      <Card className="overflow-hidden border-none shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
        <div className="relative">
          <AspectRatio ratio={16 / 9}>
            <img
              src={bannerUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </AspectRatio>
          {isNew && (
            <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
              Novo
            </Badge>
          )}
        </div>

        <CardContent className="p-5">
          <h3 className="text-base font-semibold leading-snug">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>

          {progressPercent != null && (
            <div className="mt-3 space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {Math.round(progressPercent)}% concluido
              </span>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

Nota: a prop `createdAt` e opcional e sera passada quando disponivel. Como os mock courses nao tem `createdAt`, o badge nao aparecera por padrao — o que e correto. Quando cursos novos forem criados pelo admin (que ja gera timestamps), o badge aparecera.

- [ ] **Step 2: Verificar visualmente**

Run: `npm run dev`
Verificar: hover nos cards mostra elevacao (-translate-y-1), sombra maior, e imagem faz scale sutil. Transicao e suave (300ms).

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/CourseCard.tsx
git commit -m "feat: add hover effects and 'Novo' badge to CourseCard"
```

---

## Task 10: Transicoes no CourseSidebar

**Files:**
- Modify: `src/components/courses/CourseSidebar.tsx`

- [ ] **Step 1: Adicionar transicoes ao expand/collapse e scroll suave**

Em `src/components/courses/CourseSidebar.tsx`, adicionar classes de transicao ao `CollapsibleContent` e scroll suave ao selecionar aula:

No `CollapsibleContent`, envolver com classes de animacao:

```tsx
<CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
```

No botao de cada lesson, adicionar `scroll-mt-4` para scroll suave e a prop `id`:

```tsx
<button
  key={lesson.id}
  id={`lesson-${lesson.id}`}
  onClick={() => onSelectLesson(lesson.id)}
  className={cn(
    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent scroll-mt-4",
    isActive && "bg-sidebar-accent"
  )}
>
```

Adicionar contagem de aulas completadas por modulo. Apos o `<span className="text-sm font-medium truncate">{mod.title}</span>`:

```tsx
<span className="text-xs text-muted-foreground ml-auto mr-2">
  {sortedLessons.filter((l) => completedLessons[l.id]).length}/{sortedLessons.length}
</span>
```

Nota: `completedLessons` precisa ser adicionado como prop. Atualizar a interface:

```tsx
interface CourseSidebarProps {
  course: Course;
  activeLessonId: string | null;
  completedLessons: Record<string, boolean>;
  openModules: Record<string, boolean>;
  onToggleModule: (moduleId: string) => void;
  onSelectLesson: (lessonId: string) => void;
  percentCompleted: number;
}
```

`completedLessons` ja e passado como prop, entao so precisa usar dentro do map de modulos.

- [ ] **Step 2: Verificar visualmente**

Run: `npm run dev`
Verificar: expandir/colapsar modulos tem animacao suave. Contador "2/6" aparece em cada modulo. Aula ativa tem highlight visual.

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/CourseSidebar.tsx
git commit -m "feat: add sidebar transitions, module lesson count, and scroll improvements"
```

---

## Task 11: Responsividade aprimorada

**Files:**
- Modify: `src/pages/student/CourseDetailPage.tsx`
- Modify: `src/components/courses/CourseBannersCarousel.tsx`

- [ ] **Step 1: Melhorar layout mobile da CourseDetailPage**

Em `CourseDetailPage.tsx`, tornar o sidebar visivel abaixo do conteudo em mobile com um botao toggle:

No grid principal, inverter a ordem em mobile — sidebar primeiro em telas pequenas (como accordion) e sidebar sticky no desktop:

Adicionar estado para controlar visibilidade do sidebar em mobile:

```tsx
const [sidebarOpen, setSidebarOpen] = useState(false);
```

Adicionar botao toggle para mobile antes do grid:

```tsx
{/* Mobile sidebar toggle */}
<div className="lg:hidden mb-4">
  <Button
    variant="outline"
    size="sm"
    onClick={() => setSidebarOpen(!sidebarOpen)}
    className="w-full justify-between"
  >
    <span className="flex items-center gap-2">
      <BookOpen className="h-4 w-4" />
      Conteudo do curso
    </span>
    <span className="text-xs text-muted-foreground">
      {Math.round(percentCompleted)}% concluido
    </span>
  </Button>
</div>
```

Alterar o bloco do sidebar para:

```tsx
{/* Right column - Sidebar */}
<div className={cn(
  "lg:sticky lg:top-6 lg:self-start",
  sidebarOpen ? "block" : "hidden lg:block"
)}>
  <CourseSidebar
    course={course}
    activeLessonId={activeLessonId}
    completedLessons={completedLessons}
    openModules={openModules}
    onToggleModule={handleToggleModule}
    onSelectLesson={(lessonId) => {
      handleSelectLesson(lessonId);
      setSidebarOpen(false); // Fechar sidebar ao selecionar aula em mobile
    }}
    percentCompleted={percentCompleted}
  />
</div>
```

Importar `cn` se ainda nao importado:
```tsx
import { cn } from "@/lib/utils";
```

- [ ] **Step 2: Verificar visualmente**

Run: `npm run dev`
Verificar em viewport mobile (< 1024px): sidebar nao aparece por padrao, botao "Conteudo do curso" mostra/esconde. Selecionar aula fecha o sidebar automaticamente. Em desktop, sidebar permanece sticky normalmente.

- [ ] **Step 3: Commit**

```bash
git add src/pages/student/CourseDetailPage.tsx
git commit -m "feat: add collapsible mobile sidebar toggle for course detail"
```

---

## Task 12: Build final e verificacao

**Files:**
- Nenhum arquivo novo

- [ ] **Step 1: Verificar build**

```bash
cd "/Users/andresouzam3pro/Desktop/01 - app andre/lumi-membros"
npm run build
```

Expected: build completa sem erros TypeScript ou Vite.

- [ ] **Step 2: Verificar lint**

```bash
npm run lint
```

Corrigir quaisquer erros de lint encontrados.

- [ ] **Step 3: Teste funcional completo**

Checklist de verificacao manual:

1. `/cursos` — Busca filtra por titulo/descricao
2. `/cursos` — Filtro por sessao funciona
3. `/cursos` — "Nenhum curso encontrado" com botao "Limpar filtros"
4. `/cursos` — "Continue de onde parou" aparece apos visitar aula
5. `/cursos/:id` — Breadcrumb mostra caminho correto
6. `/cursos/:id` — Barra de progresso no topo atualiza ao concluir
7. `/cursos/:id` — Toast ao concluir aula + auto-avancar
8. `/cursos/:id` — Notas expandem, salvam, persistem entre aulas
9. `/cursos/:id` — Sidebar mobile toggle funciona
10. Cards — Hover effect (elevacao + sombra)
11. Sidebar — Animacao expand/collapse + contagem por modulo
12. Titulo — Muda dinamicamente na aba do navegador
13. Favicon — Aparece na aba

- [ ] **Step 4: Commit final (se houve fixes)**

```bash
git add -A
git commit -m "fix: address lint and build issues from Phase 1 quick wins"
```

---

## Itens Deferidos para Fase 2 (Admin Completo)

Os seguintes itens do spec da Fase 1 serao implementados na Fase 2 por se encaixarem melhor no escopo do admin:
- **Breadcrumbs no admin** — sera adicionado junto com o dashboard e novas rotas admin
- **Empty states no admin** (sessao sem cursos, modulo sem aulas) — junto com melhorias de forms
- **Admin dialogs full-screen em mobile** — junto com melhorias de responsividade admin
- **Fade-in animation nos cards** — pode ser adicionado como CSS utility no Tailwind config

---

## Resumo de Tasks

| Task | Descricao | Complexidade |
|------|-----------|-------------|
| 1 | Meta tags dinamicas + favicon | P |
| 2 | Componente EmptyState | P |
| 3 | SkeletonCourseCard | P |
| 4 | Busca e filtros de cursos | P |
| 5 | Continue de onde parou | P |
| 6 | Breadcrumb navigation | P |
| 7 | Progress bar + botao conclusao melhorado | P |
| 8 | Notas do aluno por aula | P |
| 9 | Hover effects + badge "Novo" | P |
| 10 | Transicoes sidebar + contagem | P |
| 11 | Responsividade mobile sidebar | P |
| 12 | Build + verificacao final | P |
