# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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
- **Admin routes** (`AdminLayout` with sidebar): `/admin/cursos`, `/admin/cursos/sessoes/:sessionId`, `/admin/cursos/:courseId/edit`, `/admin/cursos/:courseId/modulos/:moduleId`, `/admin/banners`, `/admin/secoes`

### State Management (src/hooks/useCourses.ts)

Course/session/banner data is managed by `useCourses()` using **TanStack React Query + Supabase** as the primary source of truth.

The hook returns two top-level collections: `sessions` (with nested `courses → modules → lessons`) and `banners`. It exposes selectors and CRUD actions for sessions, courses, modules, lessons, and banners, including reorder/move operations.

Some other domains in the app still use mock/localStorage during migration, but courses/banners are no longer an in-memory `useSyncExternalStore` localStorage store.

### Data Model Hierarchy

```
CourseSession → Course[] → CourseModule[] → CourseLesson[]
CourseBanner (standalone)
```

Key types are in `src/types/course.ts` (domain types) and `src/types/admin.ts` (form data types that re-export domain types).

### Path Alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

### UI Components

- `src/components/ui/` — shadcn/ui primitives (button, card, dialog, input, select, tabs, etc.). Use `cn()` from `src/lib/utils.ts` for conditional class merging.
- `src/components/courses/` — domain components (CourseCard, CourseSidebar, LessonPlayer, ProgressRing, CourseBannersCarousel, ContinueWatching, CourseProgressTopBar, LessonRating, LessonNotes, EmptyState, SkeletonCourseCard)
- `src/components/layout/` — StudentLayout (includes header search input), AdminLayout, ThemeToggle

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

### Planned Backend

`.env.example` references Supabase (database/auth), Cloudflare R2 (media uploads), Resend (transactional emails), and payment integrations (Ticto webhooks, Stripe).
