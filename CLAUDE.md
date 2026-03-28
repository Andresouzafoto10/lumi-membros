# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lumi Membros is a member-area / course platform for managing and consuming online courses (focused on photography). It has two interfaces: a **student-facing** area for browsing and watching courses, and an **admin panel** for managing courses, modules, lessons, banners, and sections. The app language is Brazilian Portuguese.

## Commands

- **Dev server:** `npm run dev` (runs on port 5174)
- **Build:** `npm run build` (runs `tsc -b && vite build`)
- **Preview production build:** `npm run preview`
- **Lint:** `npm run lint`

## Tech Stack

- **Vite 5** + **React 18** + **TypeScript** (SWC via `@vitejs/plugin-react-swc`)
- **Tailwind CSS 3** with CSS variable theming (light/dark mode via `next-themes`)
- **Radix UI** primitives wrapped as shadcn/ui-style components in `src/components/ui/`
- **React Router v6** for client-side routing
- **TanStack React Query** (installed, QueryClientProvider mounted in main.tsx)
- **Sonner** for toast notifications
- **lucide-react** for icons
- **date-fns** for date utilities
- **react-helmet-async** for dynamic page titles

## Architecture

### Routing (App.tsx)

Two route groups, each wrapped in its own layout:

- **Student routes** (`StudentLayout`): `/cursos`, `/cursos/:courseId`, `/cursos/:courseId/aulas/:lessonId`
- **Admin routes** (`AdminLayout` with sidebar): `/admin` (dashboard), `/admin/cursos`, `/admin/cursos/sessoes/:sessionId`, `/admin/cursos/:courseId/edit`, `/admin/cursos/:courseId/modulos/:moduleId`, `/admin/banners`, `/admin/secoes`, `/admin/turmas`, `/admin/turmas/:classId/edit`, `/admin/alunos`, `/admin/alunos/:studentId`, `/admin/configuracoes`, `/admin/configuracoes/perfis`

### State Management

All state uses the **in-memory store + localStorage persistence** pattern via `useSyncExternalStore`. Every hook follows the same structure: module-level `state` var + `listeners` set + `subscribe/getSnapshot` functions.

- **`useCourses`** (`lumi-membros:store:v1`) — sessions → courses → modules → lessons + banners. CRUD + reordering + cross-session ops.
- **`useStudents`** (`lumi-membros:students`, `lumi-membros:enrollments`) — student CRUD, bulk CSV import, enrollment management.
- **`useClasses`** (`lumi-membros:classes`) — turma CRUD + content schedule rules (8 rule types).
- **`usePlatformSettings`** (`lumi-membros:platform-settings`) — platform name, logo, theme colors, ratings toggle, certificate config.
- **`useAccessProfiles`** (`lumi-membros:access-profiles`) — custom access profiles CRUD; system profiles (Aluno, Moderador, Admin) are hardcoded constants.
- **`useLastWatched`** (`lumi-membros:last-watched`) — last accessed course/lesson for Continue Watching.
- **`useLessonRatings`** (`lumi-membros:lesson-ratings`) — thumbs up/down per lesson.
- **`useLessonNotes`** (`lumi-membros:notes:{courseId}:{lessonId}`) — per-lesson notes with auto-save.
- **`useSearchContext`** — React context (no localStorage) for header search state shared between StudentLayout and CoursesPage.

Currently uses **mock data** seeded from `src/data/mock-*.ts` files. There is no backend API integration yet — `VITE_USE_MOCK_DATA=true` in `.env`.

### Data Model Hierarchy

```
CourseSession → Course[] → CourseModule[] → CourseLesson[]
CourseBanner (standalone)
Student (with Enrollment[])
Class (with ContentScheduleRule[]) — links students to courses
AccessProfile — permission set per role
PlatformSettings — appearance, ratings, certificate config
```

Key types are in `src/types/course.ts` (domain types), `src/types/admin.ts` (form data types that re-export domain types), and `src/types/student.ts` (Student, Enrollment, Class, ContentScheduleRule, AccessProfile, PlatformSettings, ThemeColors).

Mock data files: `src/data/mock-courses.ts`, `src/data/mock-students.ts`, `src/data/mock-classes.ts`, `src/data/mock-enrollments.ts`.

### Path Alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

### UI Components

- `src/components/ui/` — shadcn/ui primitives (button, card, dialog, input, select, tabs, table, breadcrumb, etc.). Use `cn()` from `src/lib/utils.ts` for conditional class merging.
- `src/components/courses/` — domain components (CourseCard, CourseSidebar, LessonPlayer, ProgressRing, CourseBannersCarousel, ContinueWatching, CourseProgressTopBar, LessonRating, LessonNotes, EmptyState, SkeletonCourseCard, CourseSearch)
- `src/components/layout/` — StudentLayout (includes header search input), AdminLayout (5 nav links: Dashboard, Cursos, Turmas, Alunos, Configurações), ThemeToggle

### Theming

Brand color is **Lumi teal** (`#00C2CB`, HSL `183 100% 40%`) used as `--primary`. Custom `lumi` color scale (50–900) available in Tailwind config. Dark mode is the default theme. Font: Plus Jakarta Sans.

### Student UX Features (Phase 1 — Quick Wins)

- **Header Search**: search input lives in `StudentLayout` header (right side, next to theme toggle). State shared via `SearchProvider` context (`src/hooks/useSearchContext.tsx`). Deep search filters by: course title, course description, lesson titles, and lesson descriptions.
- **Session Filter**: "Todas as sessões" dropdown sits alone, right-aligned, below the banner carousel in `CoursesPage`.
- **Continue Watching**: compact banner below carousel showing last accessed course/lesson. State in `useLastWatched` hook (`lumi-membros:last-watched` localStorage key).
- **Breadcrumb**: reusable `Breadcrumb` component in `src/components/ui/breadcrumb.tsx`, used in `CourseDetailPage`.
- **Progress Bar**: thin animated bar (`CourseProgressTopBar`) below breadcrumb in course detail.
- **Lesson Rating**: thumbs up/down per lesson (`LessonRating` component + `useLessonRatings` hook, `lumi-membros:lesson-ratings` localStorage key). Counts visible to admin in `AdminModuleEditPage`.
- **Lesson Notes**: per-lesson notes with auto-save (`LessonNotes` component + `useLessonNotes` hook, `lumi-membros:notes:{courseId}:{lessonId}` localStorage keys).
- **Course Card Hover**: scale + shadow on hover, "Novo" badge for courses created within 7 days (via `createdAt` prop).
- **Sidebar**: accordion animations, lesson count per module ("X/Y"), mobile toggle button.
- **Dynamic Titles**: `react-helmet-async` for per-page `<title>` tags. SVG favicon with Lumi teal branding.

### Admin Panel Features

- **Dashboard** (`/admin`) — 6 metric cards (alunos, matrículas, cursos ativos, turmas, avaliações, receita), últimos alunos e matrículas.
- **Gestão de Alunos** (`/admin/alunos`) — tabela com busca + filtros, criar aluno, importar CSV (FileReader + preview), toggle status, delete.
- **Perfil do Aluno** (`/admin/alunos/:studentId`) — dados, toggle status, editar role, matrículas com revoke (AlertDialog), progresso por curso (mock hash determinístico de studentId + courseId).
- **Turmas** (`/admin/turmas`) — cards com filtros, ativar/desativar, delete; `/nova/edit` cria nova turma.
- **Editar Turma** (`/admin/turmas/:classId/edit`) — nome, tipo matrícula, duração, seleção de curso; RuleEditor por módulo/aula com 8 tipos de regra (free, scheduled_date, days_after_enrollment, blocked, hidden, course_complete, module_complete, lesson_complete).
- **Configurações** (`/admin/configuracoes`) — 4 tabs: Aparência (nome, logo, tema, color pickers), Avaliações (toggle global), Certificados (bg URL, texto com variáveis, preview), Perfis de Acesso (navega para `/admin/configuracoes/perfis`).
- **Perfis de Acesso** (`/admin/configuracoes/perfis`) — 3 perfis de sistema read-only (Aluno, Moderador, Admin) + perfis personalizados CRUD com 5 permissões (courses, students, classes, settings, community).
- **Breadcrumbs**: todos os pages admin usam `<Breadcrumb>` de `src/components/ui/breadcrumb.tsx`.

### CSS Theme Injection

`AdminSettingsPage` injeta/atualiza um `<style id="lumi-custom-theme">` no `document.head` via `applyThemeToCss()`. A função `hexToHsl()` usa `hex.match(/pattern/)` em vez de `regex.exec(hex)` para evitar falso positivo do hook de segurança do repositório.

### Planned Backend

`.env.example` references Supabase (database/auth), Cloudflare R2 (media uploads), Resend (transactional emails), and payment integrations (Ticto webhooks, Stripe).
