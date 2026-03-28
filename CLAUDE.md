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

## Architecture

### Routing (App.tsx)

Two route groups, each wrapped in its own layout:

- **Student routes** (`StudentLayout`): `/cursos`, `/cursos/:courseId`, `/cursos/:courseId/aulas/:lessonId`
- **Admin routes** (`AdminLayout` with sidebar): `/admin/cursos`, `/admin/cursos/sessoes/:sessionId`, `/admin/cursos/:courseId/edit`, `/admin/cursos/:courseId/modulos/:moduleId`, `/admin/banners`, `/admin/secoes`

### State Management (src/hooks/useCourses.ts)

All app state flows through a single `useCourses()` hook that implements an **in-memory store with localStorage persistence** (`lumi-membros:store:v1` key). It uses `useSyncExternalStore` for React integration.

The store holds two top-level collections: `sessions` (which contain nested `courses → modules → lessons`) and `banners`. The hook exposes selectors and CRUD actions for every entity level (sessions, courses, modules, lessons, banners), plus reordering (`move*`) and cross-session operations (`moveCourseToSession`, `duplicateCourseToSession`).

Currently uses **mock data** seeded from `src/data/mock-*.ts` files. There is no backend API integration yet — `VITE_USE_MOCK_DATA=true` in `.env`.

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
- `src/components/courses/` — domain components (CourseCard, CourseSidebar, LessonPlayer, ProgressRing, CourseBannersCarousel)
- `src/components/layout/` — StudentLayout, AdminLayout, ThemeToggle

### Theming

Brand color is **Lumi teal** (`#00C2CB`, HSL `183 100% 40%`) used as `--primary`. Custom `lumi` color scale (50–900) available in Tailwind config. Dark mode is the default theme. Font: Plus Jakarta Sans.

### Planned Backend

`.env.example` references Supabase (database/auth), Cloudflare R2 (media uploads), Resend (transactional emails), and payment integrations (Ticto webhooks, Stripe).
