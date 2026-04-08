# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lumi Membros is a member-area / course platform for managing and consuming online courses (focused on photography). It has three interfaces: **auth pages** (login/register/reset), a **student-facing** area for browsing courses, community, ranking, certificates and profiles, and an **admin panel** for managing all platform content and settings. The app language is Brazilian Portuguese. The backend is **fully active on Supabase** with 30+ tables, RLS policies, Edge Functions, and Supabase Auth.

## Supabase Project (ALWAYS USE THIS)

- **Project ID:** `gdbkbeurjjtjgmrmfngk`
- **URL:** `https://gdbkbeurjjtjgmrmfngk.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/gdbkbeurjjtjgmrmfngk
- **SQL Editor:** https://supabase.com/dashboard/project/gdbkbeurjjtjgmrmfngk/sql
- **Auth Users:** https://supabase.com/dashboard/project/gdbkbeurjjtjgmrmfngk/auth/users
- **Owner account:** `fotografoandresouza@gmail.com` / role: `owner`
- **NEVER use project `zowcnbpzojesyvmcjtri`** — that is a different product (Lumi Fotos)
- MCP Supabase tools are connected to a different account and **cannot access `gdbkbeurjjtjgmrmfngk`**. For DDL/SQL operations, use the SQL Editor in the dashboard or use `curl` with the service role key from `.env` (`SUPABASE_SERVICE_ROLE_KEY`).
- After any schema change, always update `supabase/migrations/001_initial_schema.sql` to keep the local file in sync.

## Commands

- **Dev server:** `npm run dev` (runs on port 5174)
- **Build:** `npm run build` (runs `tsc -b && vite build`)
- **Preview production build:** `npm run preview`
- **Lint:** `npm run lint`

## Tech Stack

- **Vite 5** + **React 18** + **TypeScript** (SWC via `@vitejs/plugin-react-swc`)
- **Supabase** (`@supabase/supabase-js`) — Auth, PostgreSQL database, Edge Functions
- **Cloudflare R2** (`@aws-sdk/client-s3`) — Primary file/image storage (all uploads go to R2, not Supabase Storage)
- **TanStack React Query** — primary async state management (22/27 hooks use it)
- **Tailwind CSS 3** with CSS variable theming (light/dark mode via `next-themes`)
- **Radix UI** primitives wrapped as shadcn/ui-style components in `src/components/ui/`
- **React Router v6** for client-side routing
- **react-easy-crop** for avatar/cover image cropping before upload
- **react-markdown** with `@tailwindcss/typography` for community post rendering
- **html2canvas** for certificate PNG generation
- **Sonner** for toast notifications
- **lucide-react** for icons
- **date-fns** for date utilities
- **react-helmet-async** for dynamic page titles

## Architecture

### Authentication (AuthContext.tsx)

Real Supabase Auth with session persistence. `AuthProvider` wraps the entire app in `main.tsx`.

- **Auth state:** `session`, `user` (id, email, name, role, status, avatarUrl), `loading`
- **Auth methods:** `signIn`, `signUp`, `signOut`, `resetPassword`, `sendMagicLink`, `updatePassword`
- **Role check:** `isAdmin` — true if role is `owner`, `admin`, `support`, or `moderator`
- **Auto-profile:** `handle_new_user()` trigger creates a `profiles` row on auth.users INSERT
- **Error translation:** Supabase errors are translated to Portuguese for the UI
- **Route protection:** `ProtectedRoute` component wraps authenticated routes; supports `requireAdmin` prop for admin-only access

### Provider Stack (main.tsx)

```
React.StrictMode
  └─ ErrorBoundary
     └─ HelmetProvider
        └─ ThemeProvider (next-themes, defaultTheme="dark")
           └─ QueryClientProvider (React Query)
              └─ BrowserRouter
                 └─ AuthProvider
                    ├─ App (Routes)
                    └─ Toaster (sonner, bottom-right, richColors)
```

### Routing (App.tsx)

Three route groups plus auth pages:

- **Auth routes** (public): `/login` (LoginPage), `/cadastro` (RegisterPage), `/redefinir-senha` (ResetPasswordPage)
- **Root:** `/` redirects to `/cursos`
- **Student routes** (`ProtectedRoute` → `StudentLayout`): `/cursos`, `/cursos/:courseId`, `/cursos/:courseId/aulas/:lessonId`, `/ranking`, `/meu-perfil`, `/meus-certificados`, `/perfil/:id`
- **Community routes** (`StudentLayout` → `CommunityLayout`): `/comunidade` (redirects to `/comunidade/feed`), `/comunidade/feed`, `/comunidade/:slug`
- **Admin routes** (`ProtectedRoute requireAdmin` → `AdminLayout`): `/admin`, `/admin/cursos`, `/admin/cursos/sessoes/:sessionId`, `/admin/cursos/:courseId/edit`, `/admin/cursos/:courseId/modulos/:moduleId`, `/admin/banners` (redirects to `/admin/cursos`), `/admin/secoes` (redirects to `/admin/cursos`), `/admin/turmas`, `/admin/turmas/:classId/edit`, `/admin/alunos`, `/admin/alunos/:studentId`, `/admin/comunidade`, `/admin/comunidade/:id/edit`, `/admin/comentarios`, `/admin/emails`, `/admin/gamificacao`, `/admin/configuracoes`, `/admin/configuracoes/perfis`

### State Management

Almost all state uses **React Query + Supabase**. Each hook fetches from Supabase tables and uses `useQueryClient` for invalidation. Only `useCommunityLastSeen` still uses `useSyncExternalStore` with localStorage.

- **`useAccessProfiles`** — System + custom access profiles with permission toggles. React Query. Supabase table: `access_profiles`.
- **`useAdminDashboard`** — Dashboard metrics (students, enrollments, courses, certificates, posts, badges, recent activity). React Query. Aggregates multiple Supabase queries.
- **`useCertificates`** — Certificate templates CRUD + earned certificates. React Query (dual queries). Supabase tables: `certificate_templates`, `earned_certificates`. Award logic with completion/quiz requirements.
- **`useClasses`** — Class CRUD with enrollment types, access duration, content schedule rules. React Query. Supabase table: `classes`.
- **`useComments`** — Post comment CRUD with likes, nested replies. React Query. Supabase table: `post_comments`. Triggers gamification + notifications.
- **`useCommunities`** — Community CRUD with settings, class associations, pinned posts. React Query (dual queries for enrolled classes). Supabase table: `communities`.
- **`useCommunityLastSeen`** — Last-seen timestamp per community for unread badges. **useSyncExternalStore + localStorage** (`lumi-membros:community-last-seen`). The only hook still using the old pattern.
- **`useCourses`** — Full CRUD for sessions/courses/modules/lessons + banners + duplication + reorder. React Query (dual queries). Supabase tables: `course_sessions`, `courses`, `course_modules`, `course_lessons`, `course_banners`.
- **`useCurrentUser`** — Compatibility shim wrapping `AuthContext`. Returns `{ currentUserId }`.
- **`useEmailAutomations`** — Admin CRUD for email automation configs + log history (paginated). React Query. Supabase tables: `email_automations`, `email_notification_log`. Exports `useEmailAutomations()`, `useEmailLogs()`, `useSchedulerTrigger()`.
- **`useNotificationPreferences`** — Per-user notification preferences (email + in-app). React Query with optimistic updates. Supabase table: `notification_preferences`. Accepts optional `userId` param (admin can edit any user). Exports `useNotificationPreferences()` with `preferences`, `updatePreference`, `disableAllEmail`, `enableAllEmail`, `disableAllNotif`, counts.
- **`useEmailNotifications`** — Invokes `notify-email` and `resend-access-email` Edge Functions. 14 notification functions (comment, like, follow, mention, mission, welcome, newCourse, newLesson, certificateEarned, postReply, followerMilestone, commentMilestone, communityPost, resendAccessEmail).
- **`useGamification`** — Player points/badges, missions, student mission progress. React Query (triple queries). Supabase tables: `gamification`, `missions`, `student_missions`. Legacy badge compatibility.
- **`useGamificationConfig`** — Admin CRUD for points config, levels, missions, ranking data. React Query (quad queries). Supabase tables: `points_config`, `levels`, `missions`, `gamification`.
- **`useLastWatched`** — Last watched course/lesson with timestamp. useState + useEffect. Supabase table: `last_watched`.
- **`useLessonMaterials`** — Lesson materials list with file metadata. React Query + useMutation. File upload to Cloudflare R2 via `uploadToR2()`. DRM flag for PDFs. Supabase table: `lesson_materials`. `file_path` stores full R2 public URL.
- **`useLessonNotes`** — Per-lesson notes with debounced auto-save. useState + useEffect + useRef. Supabase table: `lesson_notes`. Awards gamification points.
- **`useLessonProgress`** — Lesson completion, watch time, last position. React Query with debounce. Supabase table: `lesson_progress`. Exports `useLessonProgress()` + `useStudentProgress()`.
- **`useLessonComments`** — Lesson comments with replies, likes, author join. React Query. Supabase table: `lesson_comments`. Builds reply tree (1 level). Mutations: `addComment`, `deleteComment`, `toggleLike`. Awards gamification points (`lesson_comment`). Exports `useLessonComments(lessonId)`.
- **`useLessonRatings`** — Lesson ratings (like/dislike). React Query. Supabase table: `lesson_ratings`. Exports `useLessonRatings()` + `useAdminLessonRatings()`.
- **`useNotifications`** — In-app notifications with grouping, delete, bulk actions. React Query (limit 50). Supabase table: `notifications`. Groups same-type notifications on same target within 24h (e.g. "Maria e +2 curtiram"). Exports `useNotifications()` with `getGroupedForUser()`, `markGroupAsRead()`, `deleteNotification()`, `deleteAllRead()`, `clearAll()`, `markAllAsRead()`, `addNotification()`.
- **`usePlatformSettings`** — Platform name, logo, theme colors, certificate config, ratings toggle. React Query. Supabase table: `platform_settings`.
- **`usePosts`** — Community posts CRUD with likes, saves, polls, hashtags, approval workflow. React Query. Supabase table: `community_posts`. Triggers gamification. `deletePost` cleans up R2 images and attachments.
- **`useProfiles`** — Student profiles CRUD (bio, avatar, cover, coverPosition, followers). React Query + direct accessor cache. Supabase table: `profiles`. `updateProfile` accepts `avatarUrl`, `coverUrl`, `coverPosition`, etc. Exports `useProfiles()`, `findProfileDirect()`, `findProfileByUsernameDirect()`.
- **`useQuizAttempts`** — Quiz attempt submission with auto-scoring. React Query. Supabase table: `quiz_attempts`. Best attempt + course average score.
- **`useRestrictions`** — Student restriction CRUD with duration-based expiry. React Query. Supabase table: `restrictions`. Triggers notifications.
- **`useSearchContext`** — React Context (SearchProvider + useContext) for header search state. No Supabase.
- **`useSidebarConfig`** — Community sidebar items CRUD with reorder, emoji, visibility. React Query. Supabase table: `sidebar_config`.
- **`useStudents`** — Students + enrollments (dual fetch). React Query. Supabase tables: `profiles`, `enrollments`. Bulk creation, enrollment management.
- **`useUpload`** — File upload to Cloudflare R2 via `uploadToR2()`. Accepts `folder`, `previousUrl` (auto-deletes old file), `preset` (image optimization). Backward-compatible `bucket` prop maps to folder. useState.

### Data Model Hierarchy

```
CourseSession → Course[] → CourseModule[] → CourseLesson[]
  └─ CertificateConfig (templateId, completionThreshold, requirementType, quizThreshold, hoursLoad)
  └─ CourseLesson has: quiz (QuizQuestion[]), quizPassingScore, quizRequiredToAdvance, ratingsEnabled
  └─ LessonMaterial (file_path, file_type, drm_enabled)

CourseBanner (standalone, display ordering)
Student (profiles table — name, email, role, status, cpf, followers/following)
Enrollment (studentId → classId, type, status, expiresAt)
Class (courseIds[], enrollmentType, accessDurationDays, contentSchedule rules)
AccessProfile (permissions: courses, students, classes, settings, community)
PlatformSettings (name, logo, theme, ratings, certificates, emailNotifications)

StudentProfile = profiles table (displayName, username, avatarUrl, coverUrl, coverPosition, bio, link, location, cpf, followers[], following[])
Community (slug, classIds[], settings: allowStudentPosts/requireApproval/allowImages, pinnedPostId)
CommunityPost (authorId, type user/system, title, body, images[], attachments[], poll?, hashtags[], mentions[], likedBy[], savedBy[], status published/pending/rejected)
PostComment (postId, parentCommentId for nesting, body, likedBy[])
CommunitySidebarItem (communityId, emoji, order, visible, salesPageUrl)

AppNotification (recipientId, type like/comment/follow/mention/system, targetId, targetType post/comment/profile, read)
StudentRestriction (reason, duration via startsAt/endsAt, appliedBy, active)

Gamification:
  GamificationData (studentId, points, currentLevel, badges[])
  PointsConfig (actionType, actionLabel, points, maxTimes, category, enabled)
  PointsLog (studentId, actionType, points, referenceId — transaction history)
  Level (levelNumber, name, pointsRequired, iconType/iconName/iconColor)
  Achievement (title, description, iconEmoji, badgeColor, pointsRequired, triggerType/triggerValue)
  UserAchievement (studentId, achievementId, earnedAt)
  Mission (name, description, icon, conditionType, conditionAction, conditionThreshold, pointsReward, isSecret, isDefault)
  StudentMission (missionId, studentId, progress, completed, completedAt, grantedBy)

Certificate:
  CertificateTemplate (name, backgroundUrl, blocks: CertificateBlock[])
  CertificateBlock (type, content, fontSize, fontWeight, color, textAlign, top/left/width)
  EarnedCertificate (studentId, courseId, templateId, earnedAt, downloadedAt)

QuizAttempt (studentId, lessonId, answers, score, passed, attemptedAt)
```

Key types are in `src/types/course.ts` (course domain types + LessonMaterial + Quiz types), `src/types/student.ts` (Student, Enrollment, Class, Community, Post, Comment, Gamification, Certificate, Mission, Restriction, Notification types), and `src/types/admin.ts` (form data types that re-export domain types).

Mock data files (legacy, used for seeding reference): `src/data/mock-banners.ts`, `src/data/mock-certificates.ts`, `src/data/mock-classes.ts`, `src/data/mock-comments.ts`, `src/data/mock-communities.ts`, `src/data/mock-courses.ts`, `src/data/mock-enrollments.ts`, `src/data/mock-gamification.ts`, `src/data/mock-notifications.ts`, `src/data/mock-posts.ts`, `src/data/mock-profiles.ts`, `src/data/mock-restrictions.ts`, `src/data/mock-sections.ts`, `src/data/mock-sidebar-config.ts`, `src/data/mock-students.ts`.

### Path Alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

### Lib Modules

- `src/lib/supabase.ts` — Supabase client singleton (`createClient` with auto-refresh, session persistence). Uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- `src/lib/database.types.ts` — Auto-generated TypeScript types for the full Supabase schema (Row/Insert/Update types for all tables).
- `src/lib/accessControl.ts` — Lesson/module access control engine. Evaluates enrollment validity, applies content schedule rules (free/blocked/hidden/scheduled_date/days_after_enrollment/prerequisite-based), builds course access maps. Exports: `canAccessLesson()`, `canAccessModule()`, `buildCourseAccessMap()`, `isStudentEnrolled()`, `blockReasonMessage()`.
- `src/lib/permissions.ts` — RBAC for admin features. Type `AdminPermission` = "courses" | "students" | "classes" | "settings" | "community" | "moderation". Exports: `checkPermission()`, `getPermissionsForRole()`. Roles: owner/admin/support (full), moderator (limited), student (none).
- `src/lib/gamificationEngine.ts` — Unified point/mission engine. Awards points with configurable daily limits, auto-checks missions, updates levels, sends notifications. Exports: `awardPoints()`, `onLessonCompleted()`, `onPostCreated()`, `onCommentCreated()`, `onDailyLogin()`, `onProfileComplete()`, `onStreak7Days()`, `onStreak30Days()`, etc.
- `src/lib/notificationTriggers.ts` — Creates in-app notifications for community interactions, moderation events, certificates. Checks `notification_preferences.notif_*` before creating (via `shouldNotify()` helper — system notifications always pass). Exports: `notifyPostLiked()`, `notifyPostCommented()`, `notifyCommentReply()`, `notifyPostApproved()`, `notifyPostRejected()`, `notifyStudentRestricted()`, `notifyMentions()`, `notifyCertificateEarned()`.
- `src/lib/downloadMaterial.ts` — Fetches material via Edge Function with JWT auth, triggers browser download. Exports: `downloadMaterial()`.
- `src/lib/generateCertificate.ts` — Converts DOM element to PNG via `html2canvas` for certificate download. Exports: `downloadCertificateAsPng()`.
- `src/lib/applyTheme.ts` — Injects custom theme CSS variables (hex→HSL conversion) into `:root` and `.dark`. Exports: `applyThemeToCss()`.
- `src/lib/roleBadges.ts` — Generates role + gamification badges for community display (admin/moderator/support badges, "Destaque" for 500+ points, "Veterano" for 5+ missions). Exports: `getMemberBadges()`.
- `src/lib/streakTracker.ts` — localStorage-based daily login streak tracker. Records consecutive login days, flags 7-day and 30-day milestones. Exports: `recordLoginStreak()`.
- `src/lib/r2Upload.ts` — Cloudflare R2 upload/delete engine via `@aws-sdk/client-s3`. `uploadToR2(file, folder, {oldUrl, preset})` optimizes images to WebP via OffscreenCanvas before upload. 4 presets: avatar (400px/0.9), thumbnail (800px/0.85), banner (1920px/0.85), cover (1920px/0.85). `deleteFromR2(url)` silently removes files. `isR2Url(url)` checks if URL belongs to R2 bucket. `optimizeImage(file, preset)` does Canvas-based resize+WebP conversion.
- `src/lib/communityIcon.tsx` — Community icon rendering engine. Detects icon type from `icon_url` value: emoji string → renders as text, `"icon:Name"` → renders Lucide icon component, `"http..."` → renders `<img>`, fallback → `MessageSquare`. Exports: `renderCommunityIcon(iconUrl, size)`, `detectIconType()`, `getLucideIcon()`, `AVAILABLE_EMOJIS` (30 emojis), `AVAILABLE_LUCIDE_ICONS` (24 icon names).
- `src/lib/utils.ts` — `cn()` utility combining clsx + tailwind-merge.

### UI Components

- `src/components/ui/` — shadcn/ui primitives: alert-dialog, aspect-ratio, badge, breadcrumb, button, card, checkbox, collapsible, dialog, dropdown-menu, input, label, progress, radio-group, scroll-area, select, separator, switch, table, tabs, textarea, tooltip, ImageUpload, FileUpload, ImageCropDialog. `DialogContent` supports `hideCloseButton` prop.
  - **FileUpload** — Reusable R2 upload component with drag-and-drop, preview, progress bar, URL fallback toggle, confirm-before-delete (AlertDialog + `deleteFromR2`). Props: `folder`, `imagePreset`, `allowUrl`, `aspectRatio`, `accept`, `maxSizeMB`.
  - **ImageCropDialog** — Image crop modal using `react-easy-crop`. Supports circular (avatar) and rectangular (cover) crops, zoom slider (1x-3x), Canvas-based WebP output. Props: `aspect`, `shape`, `imageSrc`, `onConfirm(croppedFile)`.
  - **ImageUpload** — Legacy component, now uses R2 via `useUpload` hook. Confirm-before-delete with AlertDialog.
- `src/components/courses/` — CourseCard, CourseSidebar, LessonPlayer, LessonQuiz, LessonMaterials, LessonNotes, LessonRating, LessonComments, ProgressRing, CourseBannersCarousel, ContinueWatching, CourseProgressTopBar, EmptyState, SkeletonCourseCard, CourseSearch
- `src/components/community/` — PostCard (markdown rendering, smart image grid, poll display, like animation), PostComments (nested replies, most-liked sorting with flame badge), CreatePostDialog (slash command dropdown, toolbar, image preview), ImageLightbox (fullscreen viewer with keyboard nav), GamificationRanking (compact leaderboard)
- `src/components/certificates/` — CertificateCard (preview + PNG download), CertificateRenderer (dynamic text blocks with ResizeObserver font scaling)
- `src/components/gamification/` — GamificationGuide (3-tab guide: Levels/Points/Missions), LevelBadge (compact level indicator with dynamic color)
- `src/components/admin/` — CertificateTemplateDialog (template CRUD with block editor), LessonMaterialsManager (file upload with DRM toggle)
- `src/components/layout/` — StudentLayout, AdminLayout, CommunityLayout, ProtectedRoute, ThemeToggle, NotificationBell (grouped notifications with filter tabs, per-item mark-read/delete, bulk actions)
- `src/components/ErrorBoundary.tsx` — Global error boundary with retry/reload UI
- `src/contexts/AuthContext.tsx` — Supabase Auth provider

### Layouts

**StudentLayout** — Fixed header (`backdrop-blur-sm`) with: logo link, desktop nav (Inicio, Comunidade, Ranking, Certificados), search input, NotificationBell, profile dropdown (Meu Perfil, Painel Admin if admin, Sair), ThemeToggle. **Mobile:** fixed bottom nav bar with icons for Home, Community, Ranking, Certificates. Includes `DailyLoginTracker` for streak gamification. Wraps content in `SearchProvider`.

**AdminLayout** — Fixed desktop sidebar (64rem width) with 8 nav links filtered by permissions:
| Path | Label | Icon | Permission |
|------|-------|------|-----------|
| `/admin` | Dashboard | LayoutDashboard | (none) |
| `/admin/cursos` | Cursos | GraduationCap | courses |
| `/admin/turmas` | Turmas | UsersRound | classes |
| `/admin/alunos` | Alunos | Users | students |
| `/admin/comunidade` | Comunidade | MessageSquare | community |
| `/admin/comentarios` | Moderacao | Shield | moderation |
| `/admin/emails` | Emails | Mail | settings |
| `/admin/gamificacao` | Gamificacao | Trophy | settings |
| `/admin/configuracoes` | Configuracoes | Settings | settings |

Plus "Area do Aluno" exit link to `/cursos`. Mobile: hamburger menu with overlay.

**CommunityLayout** — Forced dark mode (`className="dark"`). 3-column layout: left sidebar 260px (community icons rendered via `renderCommunityIcon()` from `communityIcon.tsx` with fallback to sidebar emoji, unread badges from `useCommunityLastSeen`, locked items with lock icon + salesPageUrl), center feed scroll, right sidebar 260px on xl+ (top posts by likes, trending hashtags with Semana/Mes toggle, GamificationRanking top 5). Mobile: left sidebar as drawer, right sidebar hidden.

### Theming

Brand color is **Lumi teal** (`#00C2CB`, HSL `183 100% 40%`) used as `--primary`. Custom `lumi` color scale (50-900) in Tailwind config. Dark mode is the default theme. Font: Plus Jakarta Sans (400/500/600/700). Community area forces dark mode independently.

### Student Features

- **Auth:** Login (email/password), Register (name/email/password with confirmation), Reset Password (token-based), Magic Link login. Error messages in Portuguese.
- **Course Browsing:** Session filtering, deep search (course title/description/lesson content), progress percentage per course, "Novo" badge for courses < 7 days old.
- **Continue Watching:** Compact banner showing last accessed course/lesson with resume link.
- **Course Detail:** Multi-module accordion sidebar, video player (YouTube/Vimeo/embed), lesson notes with auto-save, lesson rating (thumbs up/down), quiz system (multiple-choice/true-false with shuffled options, pass/fail, retry), progress tracking (Supabase-backed completion + watch position), lesson materials download (with DRM watermarking for PDFs), certificate progress display, access control (enrollment gates, prerequisite rules, scheduling), prev/next lesson navigation.
- **Certificates:** Earned certificates grid, certificate preview with dynamic text blocks, download as PNG via html2canvas.
- **Ranking:** Global leaderboard with top 3 podium (Crown/Medal icons), level progress bars, "my rank" highlight, GamificationGuide sidebar with Levels/Points/Missions tabs.
- **Profile (My):** Cover + avatar upload to R2 with crop dialog (react-easy-crop: circular for avatar, 16:9 for cover), cover reposition via drag (saves `cover_position` as CSS object-position), hover action buttons (upload/reposition/delete with confirmation), loading overlays. displayName, @username, bio (160 chars), link, location, CPF, password change dialog, followers/following counts, gamification level + next level progress, missions (completed/in-progress/locked), 5 tabs (Publicacoes, Salvos, Sobre, Certificados, Notificacoes).
- **Profile (Public):** Same structure without edit, cover rendered with `coverPosition` via CSS `objectPosition`, follow/unfollow button, secret missions hidden unless completed.
- **Community Feed:** Global feed with header (titulo + filter dropdown + "Nova publicacao" pill button), inline creation input, filter by hashtag via `?tag=`, post filtering (recent/popular/following).
- **Community Page:** Cover image banner at top (200px desktop / 120px mobile, `rounded-xl`, `object-cover`, hidden when `coverUrl` empty), community header with icon rendered via `renderCommunityIcon()` (supports emoji, Lucide icons, and image URLs), member count badge (calculated from enrollments), pinned post, approval requirement display, access verification.
- **Notifications:** Bell icon with unread count badge (animated pulse, capped at 9+). Dropdown (w-96) with 3 filter tabs (Todas/Nao lidas/Mencoes), grouped notifications (same type+target within 24h with count badge), per-item hover actions (check mark-as-read + trash delete), bulk actions (Ler todas + Limpar todas), footer with count. Max 50 notifications per user (auto-pruned via DB trigger `enforce_notification_limit`). Old read notifications auto-cleaned after 30 days via `cleanup_old_notifications()` called by email-scheduler.
- **Notification Preferences:** Tab "Notificacoes" in profile with per-type email + in-app toggles (13 email types, 11 in-app types). Auto-save checkboxes, "Desativar todas" button. Admin can also edit via AdminStudentProfilePage.
- **Daily Login Streak:** Automatic point awards + streak milestone tracking (7/30 days).
- **Mobile:** Fixed bottom nav, responsive layouts, drawer-based community sidebar.

### Admin Panel Features

- **Dashboard** (`/admin`) — 9 metric cards: active/inactive/expired students, active courses, active classes, new students (30d), issued certificates, community posts (weekly breakdown), completed missions/badges. Recent activity: last 5 students + last 5 enrollments.
- **Cursos** (`/admin/cursos`) — Two sections: Banners (CRUD with FileUpload component for image upload to R2, title/subtitle/button/target, display order, active toggle) + Sessions (CRUD with title/description/status, course count, reorder).
- **Session Detail** (`/admin/cursos/sessoes/:sessionId`) — Session settings (title/description/active). Course cards with reorder, toggle, edit, delete. Transfer/duplicate course to another session dialog.
- **Course Edit** (`/admin/cursos/:courseId/edit`) — 2 tabs: Modulos (list with lesson count, reorder, toggle, edit/delete) + Configuracoes (title, description, active, banner upload via FileUpload to R2, access control all/plans/admin, certificate config with template selection + requirement type completion/quiz/both + thresholds + hours + preview via CertificateRenderer).
- **Module Edit** (`/admin/cursos/:courseId/modulos/:moduleId`) — Module title + active toggle. Lesson CRUD: mode selection (video/text/quiz/video+quiz), video type (youtube/vimeo/embed), video URL, description, quiz editor (question type multiple_choice/true_false, options with correct answer selection, passing score slider 50-100%, required to advance toggle), per-lesson ratings toggle (with global disable warning), lesson materials manager (file upload with DRM toggle), like/dislike counts display, reorder/toggle/delete.
- **Turmas** (`/admin/turmas`) — Class cards with filters (by course, by status), enrollment type + access duration + student count display, status toggle, edit/delete.
- **Turma Edit** (`/admin/turmas/:classId/edit`) — Name, enrollment type (individual/subscription/unlimited), access duration, multi-course selection with search. Content scheduling per module/lesson with rule engine: free, scheduled_date (release/close), days_after_enrollment, blocked, hidden, course_complete, module_complete, lesson_complete. Linked communities display (read-only).
- **Alunos** (`/admin/alunos`) — Table with search + filters (status, role). New student dialog (name/email/password/role/class selection). CSV bulk import (FileReader + preview + validation). Status toggle, delete with confirmation.
- **Aluno Profile** (`/admin/alunos/:studentId`) — Student info card (status/role/contact). Role selector. Enrollments table with progress bars + add/revoke. Course progress display. Earned certificates. Community posts (last 5). Gamification data (points/level/missions) with manual points adjustment (plus/minus with reason). Notification preferences card (email + in-app checkboxes per type, summary badges Email: X/Y + Plataforma: X/Y). Restrictions section (active + history, add/remove). Password reset via email. Community silence toggle.
- **Comunidade** (`/admin/comunidade`) — 2 tabs: Comunidades (cards with status/access filters, post count, approval indicator, edit/toggle/delete) + Organizar Sidebar (reorder with up/down buttons, emoji input, visibility toggle Eye/EyeOff, sales page URL, remove, add from dropdown).
- **Community Edit** (`/admin/comunidade/:id/edit`) — Name, slug (auto-generated), description, cover upload via FileUpload to R2. Icon selector with 3 tabs: Emoji (30 preset emojis grid, saves raw emoji string to `icon_url`), Icone (24 Lucide icons grid, saves as `"icon:Name"` to `icon_url`), Upload (FileUpload to R2, saves URL to `icon_url`). Default tab auto-detected from saved value. Preview of selected icon. Class access selection (add/remove), type display (Public/Restrita), 3 settings switches (allowStudentPosts, requireApproval, allowImages), status selector.
- **Moderacao** (`/admin/comentarios`) — 2 tabs: Posts (search by text/author, filter by status pending/published/rejected + community, post cards with status-colored left border, actions: approve/delete/restrict author with duration dialog 1/3/7/30 days or permanent + reason) + Restricoes (active restrictions list with student info, reason, dates, remove action).
- **Gamificacao** (`/admin/gamificacao`) — 4 tabs: Ranking (student table with points, inline point adjustment +-), Pontos (grouped by category Aprendizado/Comunidade/Engajamento, points value + enable/disable + max times, create/delete actions), Niveis (level management), Missoes (mission configuration).
- **Configuracoes** (`/admin/configuracoes`) — 4 tabs: Aparencia (platform name, logo URL with preview, default theme dark/light, dark + light theme color pickers for primary/background/card/foreground), Avaliacoes (global ratings toggle with preview), Certificados (template grid with preview, create/edit/delete via CertificateTemplateDialog + CertificateRenderer), Perfis (link to `/admin/configuracoes/perfis`).
- **Perfis de Acesso** (`/admin/configuracoes/perfis`) — System profiles read-only (Aluno, Moderador, Admin) + custom profiles CRUD with 5 permission toggles (courses, students, classes, settings, community).
- **Emails** (`/admin/emails`) — 4 tabs: Automacoes (12 email automations grouped by category onboarding/engagement/community/content/gamification, toggle is_active per automation, delay badge), Historico (paginated email_notification_log table with recipient name resolution, filter by type/status, CSV export), Reenviar Acesso (student search + resend magic link access email via Edge Function), Configuracoes (sender display, global email toggle, manual scheduler trigger with results).

### Visual Design System

#### Animations (tailwind.config.ts)

- `accordion-down/up`: height animation, 0.2s ease-out
- `fade-in`: opacity + translateY(10px→0), 0.3s ease-out
- `fade-in-up`: opacity + translateY(16px→0), 0.4s ease-out (staggered card/post entry)
- `slide-in`: translateX(-100%→0), 0.3s ease-out (mobile drawers)
- `shimmer`: translateX(-100%→100%), 1.5s ease-in-out infinite (skeleton loaders)
- `pulse-soft`: opacity 1→0.7→1, 2s ease-in-out infinite (badges, indicators)

#### CSS Utilities (src/index.css)

- `.shimmer-overlay`: pseudo-element gradient animation for skeleton loading states

#### Consistent Visual Patterns

- **Cards**: `border-border/50 hover:border-border hover:shadow-md transition-all duration-200`
- **Course cards**: `hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/20`
- **Search inputs**: `border-border/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/15` with `group-focus-within` icon color
- **Action buttons**: `active:scale-90` (icons) / `active:scale-95` (text), primary buttons get `shadow-sm shadow-primary/15`
- **Nav items (active)**: `bg-primary/10 text-primary border-l-2 border-primary`
- **PostCard**: borderless layout with `border-b border-border/20`, content at `pl-[52px]`, smart ImageGrid (1/2/3/4+ with "+X" overlay), like animation `scale-[1.3]` 300ms, action buttons `rounded-full` with contextual hover colors
- **PostComments**: Most-liked comment sorted first with `border-amber-500/30 bg-amber-500/5` and Flame badge
- **CreatePostDialog**: `hideCloseButton`, expandable modal, borderless title/textarea, slash command "/" dropdown (Basico/Inserir/Upload sections, keyboard nav), bottom toolbar with icon buttons + community select + pill publish
- **ImageLightbox**: `z-[100]`, `bg-black/95`, `max-w-[90vw] max-h-[85vh]`, keyboard nav (Escape/ArrowLeft/ArrowRight)
- **Avatars**: `ring-2 ring-border/50` (posts) / `ring-2 ring-primary/20 shadow-lg` (profiles)
- **Stagger animations**: `animate-fade-in-up` with incremental animationDelay (50ms posts, 60ms cards)
- **Mobile overlays**: `bg-black/50 backdrop-blur-sm`
- **Gradients**: 3-stop overlays on cards/carousel/profile covers

### CSS Theme Injection

`AdminSettingsPage` injects/updates a style tag on document.head via `applyThemeToCss()`. Uses `hex.match(/pattern/)` (not `regex.exec`) to avoid false positives from repository security hooks.

## Database Schema (Active — Supabase PostgreSQL)

### Tables

**Core User Management:**
- `profiles` — id (uuid, FK auth.users), email, name, display_name, username (unique), role, status, avatar_url, cover_url, cover_position (default '50% 50%'), bio, link, location, cpf, email_notifications, followers[], following[], created_at, updated_at

**Course Management:**
- `course_sessions` — id, title, description, is_active, order
- `courses` — id, session_id (FK), title, description, banner_url, order, is_active, access (jsonb), certificate_config (jsonb), comments_enabled
- `course_modules` — id, course_id (FK), title, order, is_active
- `course_lessons` — id, module_id (FK), title, description, order, is_active, video_type, video_url, materials (jsonb), quiz (jsonb), quiz_passing_score, quiz_required_to_advance, ratings_enabled, comments_enabled
- `lesson_materials` — id, lesson_id (FK), title, file_path, file_type (pdf/zip/mp3/image/other), file_size_bytes, drm_enabled
- `lesson_progress` — id, student_id, lesson_id, course_id, module_id, completed, watch_time_seconds, last_position_seconds, completed_at. UNIQUE(student_id, lesson_id)
- `lesson_ratings` — id, lesson_id, student_id, rating (like/dislike). UNIQUE(lesson_id, student_id)
- `lesson_comments` — id, lesson_id (FK), course_id (FK), author_id (FK), parent_comment_id (FK self), body, likes_count, liked_by[], created_at, updated_at
- `lesson_notes` — id, lesson_id, student_id, course_id, content. UNIQUE(lesson_id, student_id)
- `quiz_attempts` — id, student_id, lesson_id, answers (jsonb), score, passed, attempted_at
- `course_banners` — id, title, subtitle, button_label, target_type (none/course/url), target_course_id, target_url, image_url, is_active, display_order
- `last_watched` — id, student_id, course_id, lesson_id, course_title, lesson_title, updated_at. UNIQUE(student_id)

**Classes & Enrollment:**
- `classes` — id, name, course_ids[], enrollment_type (individual/subscription/unlimited), access_duration_days, status, content_schedule (jsonb)
- `enrollments` — id, student_id (FK), class_id (FK), type, expires_at, status (active/expired/cancelled), enrolled_at. UNIQUE(student_id, class_id)

**Community:**
- `communities` — id, slug (unique), name, description, cover_url, icon_url, class_ids[], pinned_post_id, settings (jsonb), status
- `community_posts` — id, community_id (FK), author_id (FK), type (user/system), system_event (jsonb), title, body, images[], attachments (jsonb), poll (jsonb), hashtags[], mentions[], likes_count, comments_count, liked_by[], saved_by[], status (published/pending/rejected)
- `post_comments` — id, post_id (FK), author_id (FK), parent_comment_id (FK self), body, likes_count, liked_by[]
- `sidebar_config` — id, community_id (FK), emoji, order, visible, sales_page_url

**Notifications:**
- `notifications` — id, recipient_id (FK), actor_id (FK), type (like/comment/follow/mention/system), target_id, target_type (post/comment/profile), message, read. Max 50 per user (enforced by `enforce_notification_limit` trigger). Users can DELETE own notifications. Old read notifications cleaned after 30 days by `cleanup_old_notifications()`.
- `email_notification_log` — id, recipient_id, type, sent_at, status, metadata (jsonb), automation_type, subject, opened_at, clicked_at

**Gamification:**
- `gamification` — id, student_id (unique FK), points, current_level, badges[]
- `points_config` — id, action_type (unique), action_label, points, max_times, is_system, enabled, category (learning/community/engagement), description, icon
- `points_log` — id, student_id (FK), action_type, points, reference_id (transaction history)
- `levels` — id, level_number (unique), name, points_required, icon_type, icon_name, icon_color. 9 levels: Iniciante(0) → Lenda(10000)
- `achievements` — id, title, description, icon_emoji, badge_color, points_required, trigger_type (points/lessons/courses), trigger_value, is_active
- `user_achievements` — id, student_id, achievement_id, earned_at. UNIQUE(student_id, achievement_id)
- `missions` — id, name, description, icon, condition_type (action_count/streak_days/points_total/lesson_complete/course_complete), condition_action, condition_threshold, points_reward, enabled, is_secret, is_default, sort_order. 16 default missions.
- `student_missions` — id, mission_id, student_id, progress, completed, completed_at, granted_by. UNIQUE(mission_id, student_id)

**Certificates:**
- `certificate_templates` — id, name, background_url, blocks (jsonb)
- `earned_certificates` — id, student_id, course_id, template_id, earned_at, downloaded_at. UNIQUE(student_id, course_id)

**Platform Administration:**
- `platform_settings` — id ('default'), name, logo_url, default_theme, ratings_enabled, certificate_background_url, certificate_default_text, theme (jsonb), email_notifications_enabled
- `access_profiles` — id, name, description, permissions (jsonb)
- `restrictions` — id, student_id (FK), applied_by (FK), reason, starts_at, ends_at, active
- `email_automations` — id, type (unique), name, description, category (onboarding/engagement/community/content/gamification), is_active, delay_hours, subject_template, preview_text. 12 default automations seeded.
- `notification_preferences` — id, user_id (unique FK profiles), 14 email_* boolean fields (comments, comment_replies, mentions, likes, follows, new_course, new_lesson, certificate, mission_complete, badge_earned, post_reply, follower_milestone, weekly_digest, marketing), 11 notif_* boolean fields (in-app). Auto-created for new users via `handle_new_user_preferences()` trigger.

### Key Database Functions

- `handle_updated_at()` — Trigger function setting `updated_at = now()` on UPDATE. Applied to 18+ tables.
- `handle_new_user()` — SECURITY DEFINER trigger. Auto-creates `profiles` row when `auth.users` entry is created.
- `handle_new_user_preferences()` — SECURITY DEFINER trigger on profiles INSERT. Auto-creates `notification_preferences` row with defaults.
- `is_admin_user()` — SECURITY DEFINER function. Returns boolean checking if `auth.uid()` has role IN ('owner', 'admin', 'support'). Used in RLS policies to prevent infinite recursion.
- `enforce_notification_limit()` — AFTER INSERT trigger on notifications. Deletes oldest notifications when user exceeds 50. Prevents unbounded growth.
- `cleanup_old_notifications()` — SECURITY DEFINER function. Deletes notifications where `read = true AND created_at < now() - 30 days`. Called by email-scheduler. Returns count of deleted rows.

### RLS Policies

All tables have RLS enabled. Key patterns:
- **Public read:** `profiles` (all authenticated users can read all profiles)
- **Self-managed:** lesson_progress, lesson_notes, lesson_ratings, quiz_attempts, last_watched (student manages own data)
- **Admin full access:** Most tables grant ALL to `is_admin_user()` or role check
- **Moderator access:** community_posts, post_comments (update/delete for moderation)
- **Enrollment-gated:** classes (read via active enrollment), lesson_materials (read via enrollment in class containing course)
- **Author-owned:** community_posts (author can edit/delete own), post_comments (author can edit/delete own)
- **Deletable by owner:** notifications (users can DELETE own notifications), notification_preferences (users manage own row)

### Storage

- **Cloudflare R2** (primary) — Bucket `lumi-membros`. All file/image uploads go here via `@aws-sdk/client-s3` in `src/lib/r2Upload.ts`. Public URL: `VITE_R2_PUBLIC_URL`. Folders: `banners/`, `courses/banners/`, `materials/`, `certificates/backgrounds/`, `communities/covers/`, `communities/icons/`, `profiles/avatars/`, `profiles/covers/`, `posts/images/`, `posts/attachments/`. Images auto-optimized to WebP before upload. Old files deleted on replacement. CORS configured in `r2-cors.json`.
- **Supabase Storage** (legacy) — Bucket `lesson-materials` still referenced by Edge Function `download-material` for DRM PDF watermarking. New material uploads go to R2 (`file_path` stores full R2 URL).

## Edge Functions

- **`download-material`** — Secure PDF download with social DRM watermarking. Validates JWT, checks enrollment (admin bypass), injects watermark (name + email + CPF) on PDF pages via pdf-lib. Returns signed URL for non-DRM files (60s expiry).
- **`notify-email`** — Unified email notification system via Resend. 18 email types (comment, like, follow, mention, welcome, access_reminder_7d, community_post, community_inactive_30d, new_course, new_lesson, certificate_earned, mention_community, follower_milestone_10, post_reply, mission_complete, comment_milestone, new_post, badge_earned). 4-tier check before sending: (1) `profiles.email_notifications` global user toggle, (2) `platform_settings.email_notifications_enabled` global platform toggle, (3) `email_automations.is_active` per-type toggle, (4) `notification_preferences.email_*` per-user per-type preference. Uses shared HTML template from `_shared/email-template.ts` with Master brand palette (#ff7b00 orange, transparent body background). Logs all attempts to `email_notification_log` (including skipped with reason). From: `enviar@membrosmaster.com.br`.
- **`notify-digest`** — Weekly email digest for students with `email_notifications` enabled. Summarizes recent posts, badges earned, mentions. Uses shared HTML template. Logs to `email_notification_log`.
- **`email-scheduler`** — Scheduled email dispatcher for delayed automations. Handles: `access_reminder_7d` (students inactive 7+ days, max 1x per student) and `community_inactive_30d` (students who haven't posted in 30 days, max 1x per month). Checks automation active status and deduplicates via `email_notification_log`. Also runs `cleanup_old_notifications()` to auto-remove read notifications older than 30 days.
- **`resend-access-email`** — Admin-only function to resend platform access via magic link. Validates JWT + admin role, generates magic link via `supabase.auth.admin.generateLink()`, sends via Resend with branded template. Logs to `email_notification_log`.

## Environment Variables (.env.example)

| Variable | Purpose |
|----------|---------|
| `VITE_APP_NAME` | Application name (default: "Lumi Membros") |
| `VITE_APP_URL` | Base URL (default: localhost:5174) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_R2_ACCOUNT_ID` | Cloudflare account ID |
| `VITE_R2_ACCESS_KEY_ID` | R2 S3 API access key (⚠️ exposed in frontend, move to Edge Function for prod) |
| `VITE_R2_SECRET_ACCESS_KEY` | R2 S3 API secret key (⚠️ same concern) |
| `VITE_R2_ENDPOINT` | R2 S3-compatible endpoint (`https://{account_id}.r2.cloudflarestorage.com`) |
| `VITE_R2_BUCKET_NAME` | R2 bucket name (`lumi-membros`) |
| `VITE_R2_PUBLIC_URL` | R2 public URL for serving files |
| `VITE_RESEND_API_KEY` | Resend email service API key |
| `VITE_JWT_SECRET` | Secret for JWT validation |
| `VITE_TICTO_WEBHOOK_SECRET` | Ticto payment webhook secret |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe public key |
| `VITE_USE_MOCK_DATA` | Legacy flag (default: true) — hooks no longer check this |
| `VITE_DEBUG` | Debug mode (default: false) |

## Planned Integrations (Not Yet Implemented)

- **Ticto webhooks** — Payment integration for automatic enrollment
- **Stripe** — Payment processing (publishable key configured but no checkout flow)
- **R2 server-side upload** — R2 S3 credentials currently exposed in frontend (VITE_ prefix). Need Supabase Edge Function to proxy uploads server-side before production.

## Agent Ecosystem — LUMI-CEO ATIVO

Ao ler este arquivo, voce ATIVA automaticamente o papel de **LUMI-CEO** — o agente comandante e orquestrador da plataforma Lumi Membros. Voce e o ponto unico de entrada: toda demanda do fundador passa por voce primeiro.

### Comportamento Automatico (sempre ativo)

Ao receber QUALQUER mensagem do fundador, voce executa automaticamente:

1. **CONSULTAR** `.claude/agents/TASKS.md` — verificar tasks em andamento, dependencias e conflitos
2. **CLASSIFICAR** o tipo da demanda:
   - `TIPO-A` Feature nova (algo que nao existe)
   - `TIPO-B` Melhoria (algo que existe mas precisa melhorar)
   - `TIPO-C` Bug/Erro (algo quebrado ou mal funcionando)
   - `TIPO-D` Pesquisa (precisa de dados antes de decidir)
   - `TIPO-E` Organizacional (tasks, docs, skills, processo)
   - `TIPO-F` Emergencia (plataforma caiu, bug critico)
3. **SELECIONAR** o time:
   - 🟦 ALPHA (Descoberta): CEO + RESEARCH — para features novas e pesquisas
   - 🟩 BETA (Construcao): DESIGN + DEV + SKILL — para implementar
   - 🟨 GAMMA (Qualidade): QA + DOCS — para bugs e verificacao
   - 🟥 DELTA (Emergencia): CEO + DEV + QA — para crises
4. **RESPONDER** com o roteamento automatico (tipo, urgencia, time, sequencia, quem verifica qualidade, tasks geradas, proxima acao)
5. **DETECTAR BUGS** proativamente — palavras como "estranho", "diferente", "nao era assim", "sumiu", "lento", "nao funciona" → classificar como TIPO-C ou TIPO-F
6. **GERENCIAR** prioridades: Nivel 1 (emergencia) > Nivel 2 (feature aprovada) > Nivel 3 (em design) > Nivel 4 (backlog)
7. **NUNCA** deixar entrega do DEV sem QA
8. **ATUALIZAR** `.claude/agents/TASKS.md` apos cada mudanca de status

### Output Padrao do CEO

Toda resposta de roteamento segue este formato:

```
## 👑 LUMI-CEO — ROTEAMENTO AUTOMATICO
**Demanda:** [resumo]
**Tipo:** [TIPO-X] — [nome]
**Urgencia:** CRITICO / ALTO / MEDIO / BAIXO
**Time Ativado:** [🟦/🟩/🟨/🟥]

### 📊 Avaliacao Rapida
Impacto | Esforco | Risco | Dependencia

### 🏟️ Sequencia de Execucao
1. [AGENTE] → [acao] → Output: [entrega]
2. 🔴 GATE: [aprovacao necessaria]
3. [AGENTE] → [acao]

### 🔍 Quem Verifica Qualidade
[responsavel + criterios]

### 📋 Tasks Geradas
[tabela]

### ⚡ PROXIMA ACAO IMEDIATA
[comando de ativacao do agente]
```

### Atalhos do Fundador

| Comando | O que acontece |
|---------|---------------|
| `"status"` | CEO mostra tasks em andamento, bloqueios e recomendacao |
| `"proximo"` | CEO prioriza backlog e sugere proxima acao |
| `"bug: [X]"` | Roteamento direto para TIME GAMMA |
| `"feature: [X]"` | Roteamento para ALPHA ou BETA |
| `"melhoria: [X]"` | Roteamento direto para BETA |
| `"pesquisa: [X]"` | Roteamento para ALPHA (so Research) |
| `"urgente: [X]"` | Roteamento para TIME DELTA |
| `"testar [X]"` | Aciona QA diretamente |

### Agentes Disponiveis

| Agente | Arquivo | Funcao |
|--------|---------|--------|
| 👑 LUMI-CEO | `01_CEO-AGENT.md` | Estrategia, auto-routing, orquestracao de times |
| 🔍 LUMI-RESEARCH | `02_RESEARCH-AGENT.md` | Pesquisa de concorrentes, benchmarks, inteligencia de produto |
| 🎨 LUMI-DESIGN | `03_DESIGN-AGENT.md` | UI/UX design, especificacao visual, design system |
| 💻 LUMI-DEV | `04_DEV-AGENT.md` | Codigo React/TS, integracoes backend, implementacao |
| 🛠️ LUMI-SKILL | `05_SKILL-AGENT.md` | Criacao e manutencao de skills reutilizaveis |
| ✅ LUMI-QA | `06_QA-AGENT.md` | Testes, validacao de qualidade, revisao de UX |
| 📋 LUMI-DOCS | `07_DOCS-AGENT.md` | Documentacao, rastreamento de tasks, changelog |

### Times de Agentes

| Time | Composicao | Gatilho |
|------|-----------|---------|
| 🟦 ALPHA | CEO + RESEARCH | Feature nova, pesquisa, decisao de produto |
| 🟩 BETA | DESIGN + DEV + SKILL | Feature aprovada para implementacao |
| 🟨 GAMMA | QA + DOCS | Feature entregue, bug reportado |
| 🟥 DELTA | CEO + DEV + QA | Emergencia, plataforma caiu |

### Skills e Ferramentas por Agente (Atualizado 2026-04-04)

- **CEO:** `superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:executing-plans`, `superpowers:dispatching-parallel-agents`, `feature-dev:feature-dev`, `task-management`, `memory-management`
- **RESEARCH:** `superpowers:brainstorming`, **Playwright MCP** (browser navigation), **Context7 MCP** (docs lookup)
- **DESIGN:** `frontend-design`, `theme-factory`, `superpowers:brainstorming`, **Playwright MCP** (screenshots)
- **DEV:** `superpowers:test-driven-development`, `superpowers:systematic-debugging`, `superpowers:writing-plans`, `superpowers:verification-before-completion`, `superpowers:using-git-worktrees`, `feature-dev:feature-dev`, `claude-api`, `pdf`, **Supabase MCP**, **Cloudflare MCP**, **Vercel MCP**, **Context7 MCP**
- **SKILL:** `skill-creator`, `skill-development`, `claude-automation-recommender`, **Context7 MCP**
- **QA:** `superpowers:verification-before-completion`, `superpowers:systematic-debugging`, `code-review:code-review`, `superpowers:requesting-code-review`, **Playwright MCP**, **Supabase MCP**, **Vercel MCP**
- **DOCS:** `claude-md-management:revise-claude-md`, `claude-md-management:claude-md-improver`, `task-management`, `memory-management`, `pdf`

### Regras do Ecossistema

- **Sempre consulte `.claude/agents/TASKS.md` antes de qualquer tarefa** — verificar status atual, dependencias e prioridades
- **Sempre atualize `.claude/agents/TASKS.md` apos completar qualquer tarefa** — marcar como concluido, adicionar novas tasks geradas
- **Toda demanda entra pelo CEO** — ele classifica e roteia automaticamente
- **Toda entrega do DEV passa pelo QA** — nunca pule a verificacao de qualidade
- Detalhes completos dos agentes: `.claude/agents/` (prompts individuais)
- Fluxos de trabalho: `.claude/agents/08_WORKFLOW.md`
- Estrutura dos times: `.claude/agents/09_TEAMS.md`
- Prompt gateway avulso: `.claude/agents/10_GATEWAY.md`
