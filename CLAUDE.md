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

- **Student routes** (`StudentLayout`): `/cursos`, `/cursos/:courseId`, `/cursos/:courseId/aulas/:lessonId`, `/meu-perfil`, `/perfil/:id`
- **Community routes** (`CommunityLayout` nested in StudentLayout): `/comunidade` (redirect), `/comunidade/feed`, `/comunidade/:slug`
- **Admin routes** (`AdminLayout` with sidebar): `/admin` (dashboard), `/admin/cursos`, `/admin/cursos/sessoes/:sessionId`, `/admin/cursos/:courseId/edit`, `/admin/cursos/:courseId/modulos/:moduleId`, `/admin/banners`, `/admin/secoes`, `/admin/turmas`, `/admin/turmas/:classId/edit`, `/admin/alunos`, `/admin/alunos/:studentId`, `/admin/comunidade`, `/admin/comunidade/:id/edit`, `/admin/comentarios`, `/admin/configuracoes`, `/admin/configuracoes/perfis`

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
- **`useCurrentUser`** (`lumi-membros:current-user`) — stores the currently "logged in" student ID. Seletor no header permite trocar de usuario para testar interacoes.
- **`useProfiles`** (`lumi-membros:profiles`) — student profile CRUD (displayName, username, avatar, cover, bio, link, location), follow/unfollow.
- **`useCommunities`** (`lumi-membros:communities`) — community CRUD, getCommunitiesForStudent (via enrollments -> classIds), pin/unpin post.
- **`usePosts`** (`lumi-membros:posts`) — post CRUD, toggleLike, toggleSave, hashtag/mention auto-extraction, getFeedPosts (recent/popular/following), getTrendingHashtags, getTopPosts, approve/reject.
- **`useComments`** (`lumi-membros:comments`) — comment CRUD with nested replies (1 level), toggleLikeComment.
- **`useRestrictions`** (`lumi-membros:restrictions`) — restriction CRUD, isRestricted check, active restrictions list.
- **`useNotifications`** (`lumi-membros:notifications`) — notifications per user, markAsRead, markAllAsRead, unreadCount.
- **`useGamification`** (`lumi-membros:gamification`) — points and badges per student, 5 pre-defined badges (Primeiro Passo, Engajado, Popular, Maratonista, Veterano).
- **`useSidebarConfig`** (`lumi-membros:community-sidebar`) — community sidebar items CRUD (emoji, order, visible, salesPageUrl), reorder, addItem, removeItem. Used by CommunityLayout (student) and AdminCommunitiesPage (admin "Organizar Sidebar" tab).
- **`useCommunityLastSeen`** (`lumi-membros:community-last-seen`) — tracks last-seen timestamp per community for unread badge. markSeen(communityId) on navigation, getLastSeen(communityId) for counting unread posts.

Currently uses **mock data** seeded from `src/data/mock-*.ts` files. There is no backend API integration yet — `VITE_USE_MOCK_DATA=true` in `.env`.

### Data Model Hierarchy

```
CourseSession → Course[] → CourseModule[] → CourseLesson[]
CourseBanner (standalone)
Student (with Enrollment[])
Class (with ContentScheduleRule[]) — links students to courses
AccessProfile — permission set per role
PlatformSettings — appearance, ratings, certificate config
StudentProfile — avatar, cover, bio, username, followers/following
Community — slug, classIds, settings (allowStudentPosts, requireApproval, allowImages), pinnedPostId
CommunityPost — authorId, type (user/system), title, body, images, hashtags, mentions, likedBy, savedBy, status
CommunitySidebarItem — communityId, emoji, order, visible, salesPageUrl (admin-managed sidebar config)
PostComment — nested replies (1 level), likedBy
StudentRestriction — reason, duration, appliedBy
AppNotification — type (like/comment/follow/mention/system), read state
GamificationData — points, badges per student
Badge — id, name, description, icon, condition (5 pre-defined)
```

Key types are in `src/types/course.ts` (domain types), `src/types/admin.ts` (form data types that re-export domain types), and `src/types/student.ts` (Student, Enrollment, Class, ContentScheduleRule, AccessProfile, PlatformSettings, ThemeColors, StudentProfile, Community, CommunityPost, PostComment, StudentRestriction, AppNotification, GamificationData, Badge).

Mock data files: `src/data/mock-courses.ts`, `src/data/mock-students.ts`, `src/data/mock-classes.ts`, `src/data/mock-enrollments.ts`, `src/data/mock-profiles.ts`, `src/data/mock-communities.ts`, `src/data/mock-posts.ts`, `src/data/mock-comments.ts`, `src/data/mock-notifications.ts`, `src/data/mock-restrictions.ts`, `src/data/mock-gamification.ts`, `src/data/mock-sidebar-config.ts`.

### Path Alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

### UI Components

- `src/components/ui/` — shadcn/ui primitives (button, card, dialog, input, select, tabs, table, breadcrumb, etc.). Use `cn()` from `src/lib/utils.ts` for conditional class merging. `DialogContent` supports `hideCloseButton` prop to hide the default close button when using a custom header.
- `src/components/courses/` — domain components (CourseCard, CourseSidebar, LessonPlayer, ProgressRing, CourseBannersCarousel, ContinueWatching, CourseProgressTopBar, LessonRating, LessonNotes, EmptyState, SkeletonCourseCard, CourseSearch)
- `src/components/community/` — PostCard (markdown rendering, smart image grid with lightbox, actions with animated like, system/pinned variants, border-b separator layout), PostComments (nested replies, most-liked comment sorted first with 🔥 badge), CreatePostDialog (redesigned modal: custom header with expand/collapse, borderless title+body, toolbar with action icons, slash command "/" dropdown, image preview grid), ImageLightbox (fullscreen image viewer with navigation, keyboard support, fade animation)
- `src/components/layout/` — StudentLayout (fixed header with backdrop-blur: search, user switcher, notification bell, community link), AdminLayout (7 nav links: Dashboard, Cursos, Turmas, Alunos, Comunidade, Moderacao, Configuracoes), CommunityLayout (forced dark mode via `className="dark"`, 3-column layout: left sidebar 260px with emoji communities + unread badges + locked items with 🔒 | feed central scroll | right sidebar 280px with trending hashtags toggle Semana/Mês + top posts cards; mobile: right sidebar hidden, left becomes drawer), ThemeToggle, NotificationBell

### Theming

Brand color is **Lumi teal** (`#00C2CB`, HSL `183 100% 40%`) used as `--primary`. Custom `lumi` color scale (50–900) available in Tailwind config. Dark mode is the default theme. Font: Plus Jakarta Sans. The community area (`/comunidade/*`) forces dark mode via `className="dark"` on the CommunityLayout wrapper, independent of the global theme toggle.

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
- **Comunidades** (`/admin/comunidade`) — 2 abas: "Comunidades" (cards com filtros status/turma, ativar/desativar, excluir; `/nova/edit` cria nova) + "Organizar Sidebar" (lista reordenável com botões ↑↓, campo emoji, toggle visibilidade Eye/EyeOff, campo URL de vendas, turmas vinculadas, botão remover, adicionar comunidade via dropdown).
- **Editar Comunidade** (`/admin/comunidade/:id/edit`) — nome, slug (auto-gerado), descricao, capa, icone, turmas com acesso (add/remove), status, 3 switches (allowStudentPosts, requireApproval, allowImages).
- **Vinculacao Turma-Comunidade** — na edicao de turma, secao "Comunidades vinculadas" mostra comunidades que referenciam a turma.
- **Moderacao** (`/admin/comentarios`) — 2 abas: Posts (filtros status/comunidade/busca, acoes aprovar/excluir/restringir) + Restricoes ativas (lista com botao remover). Modal restringir com duracao + motivo.
- **Restricoes no Perfil Admin** — secao "Restricoes" no AdminStudentProfilePage com restricao ativa + historico. Icone Ban na tabela de alunos.
- **Posts do Aluno no Admin** — secao "Posts na comunidade" no AdminStudentProfilePage com ultimos 5 posts.
- **Breadcrumbs**: todos os pages admin usam `<Breadcrumb>` de `src/components/ui/breadcrumb.tsx`.

### Student Profile & Community Features

- **Perfil do Aluno** (`/meu-perfil`) — capa + avatar com upload (base64), displayName, @username, bio (160 chars), link, localizacao, followers/following, pontos + badges de gamificacao, 3 abas (Publicacoes, Salvos, Sobre com cursos matriculados), dialog de edicao.
- **Perfil Publico** (`/perfil/:id`) — mesma estrutura sem edicao, botao Seguir/Seguindo.
- **Feed da Comunidade** (`/comunidade/feed`) — feed geral com header limpo (titulo + filtro dropdown + botao pill "Nova publicacao"), input inline "No que voce esta pensando?" com avatar do usuario + botao "+", filtro por hashtag via `?tag=`.
- **Comunidade Especifica** (`/comunidade/:slug`) — header com icone + nome + badge de membros (contagem via enrollments), input inline de criacao, post fixado no topo, verificacao de acesso.
- **PostCard** — layout sem Card (usa `border-b border-border/20` como separador), conteudo alinhado com `pl-[52px]`, avatar 40px com hover ring, nome bold + @username + badge de role com borda teal, acoes rounded-full com hover colorido contextual, animacao de like scale(1.3) 300ms, smart image grid (1=full, 2=side-by-side, 3=hero+2, 4+=grid 2x2 com overlay "+X"), variantes system (trofeu) e pinned.
- **Comentarios** — expandiveis, respostas aninhadas (1 nivel), curtir, excluir/reportar, verificacao de restricao. Comentario mais curtido aparece primeiro com badge "🔥 Mais curtido" (borda amber, fundo amber/5).
- **Criar Publicacao** — modal redesenhado: header custom com botoes expandir/fechar, campo titulo text-xl sem borda, textarea auto-resize sem borda, slash command "/" (dropdown com secoes Basico/Inserir/Fazer Upload, navegacao por teclado), toolbar inferior com icones de acao (+, #, anexo, imagem, emoji, enquete, audio) + select comunidade + botao Publicar pill, preview de imagens em grid com contador e botao remover.
- **Notificacoes** — sino no header com badge de contagem, dropdown com lista, marcar como lido.
- **Seletor de Usuario** — dropdown no header para trocar o aluno logado (testar interacoes).
- **Gamificacao** — 5 badges pre-definidos, pontos mock por aluno, exibido no perfil e nos posts.

### Visual Design System and Polish

The project has a refined visual layer built on top of shadcn/ui with consistent patterns.

#### Animations (tailwind.config.ts)

- `fade-in`: opacity 0 to 1 plus translateY(10px to 0), 0.3s ease-out
- `fade-in-up`: opacity 0 to 1 plus translateY(16px to 0), 0.4s ease-out (staggered card/post entry)
- `slide-in`: translateX(-100% to 0), 0.3s ease-out (mobile drawers)
- `shimmer`: translateX(-100% to 100%), 1.5s ease-in-out infinite (skeleton loaders)
- `pulse-soft`: opacity 1 to 0.7 to 1, 2s ease-in-out infinite (badges, indicators)
- `accordion-down/up`: height animation for collapsibles, 0.2s ease-out

#### CSS Utilities (src/index.css)

- `.shimmer-overlay`: pseudo-element gradient animation for skeleton loading states (replaces animate-pulse)

#### Consistent Visual Patterns

- **Cards**: `border-border/50 hover:border-border hover:shadow-md transition-all duration-200` with shadow lift on hover
- **Course cards**: more dramatic lift with `hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/20`
- **Search inputs**: `border-border/60 focus:border-primary/40 focus:ring-2 focus:ring-primary/15` with search icon color change on focus via `group-focus-within`
- **Action buttons**: `active:scale-90` (icons) or `active:scale-95` (text buttons) for press feedback. Primary buttons get `shadow-sm shadow-primary/15`
- **Fixed community layout**: StudentLayout header is `fixed top-0 z-50` with `backdrop-blur-sm`. CommunityLayout uses `h-[calc(100vh-4rem)] overflow-hidden` 3-column container with forced `className="dark"`; left sidebar 260px + feed scroll + right sidebar 280px (xl+). StudentLayout main content has `pt-16` offset.
- **Community sidebar (left)**: emoji icons from `useSidebarConfig`, unread badge (pill teal with count from `useCommunityLastSeen`), locked communities with 🔒 + grayscale emoji + muted text (click opens salesPageUrl or shows toast). Auto-marks seen on navigation.
- **Community sidebar (right)**: "# em Alta" with Semana/Mês toggle (pill buttons), hashtags as teal pills with count. "Mais Curtidos do Mês" with mini cards (avatar, name, heart count, border hover).
- **Nav items (active)**: `bg-primary/10 text-primary border-l-2 border-primary` across AdminLayout and CommunityLayout.
- **ImageLightbox**: fullscreen modal `z-[100]` with `bg-black/95`, centered image `max-w-[90vw] max-h-[85vh]`, prev/next arrows, "2 / 4" indicator, close via ✕/Escape/backdrop click, body scroll locked, `animate-fade-in`.
- **Avatars**: `ring-2 ring-border/50` (posts) or `ring-2 ring-primary/20 shadow-lg` (profiles)
- **Like buttons**: `active:scale-90` plus icon `scale-110 fill-current` when liked, `hover:text-red-500` when not
- **Stagger animations**: `animate-fade-in-up` with incremental animationDelay (50ms posts, 60ms cards)
- **Mobile overlays**: `bg-black/50 backdrop-blur-sm`
- **Gradients**: 3-stop overlays on cards/carousel/profile covers

#### Key Component Visual Details

- **CourseCard**: "Novo" badge with pulse-soft animation and shadow. Progress bar shows label plus percentage
- **CourseBannersCarousel**: pill indicators in blurred container, nav buttons with opacity transition
- **ContinueWatching**: gradient background with ChevronRight, play icon fills on hover
- **SkeletonCourseCard**: shimmer-overlay class, structure mirrors real card
- **CourseSidebar**: max-h instead of fixed h. Active lesson border-l-2. Module count pill turns green when complete
- **CourseProgressTopBar**: gradient bar with label and percentage
- **ProgressRing**: SVG linearGradient stroke, primary-colored text
- **PostCard**: borderless layout with `border-b border-border/20` separators, content aligned at `pl-[52px]`, smart ImageGrid (1/2/3/4+ layout with "+X" overlay), like animation with `scale-[1.3]` + 300ms timeout, action buttons `rounded-full` with contextual hover colors (red/teal), system posts with amber gradient circle, pinned with `bg-primary/[0.03]`
- **PostComments**: rounded-xl bubbles with border, replies with border-l connector. Most-liked comment sorted first with `border-amber-500/30 bg-amber-500/5` and Flame badge
- **ImageLightbox**: `z-[100]` portal, `bg-black/95` backdrop, `max-w-[90vw] max-h-[85vh]` image, rounded nav buttons `bg-white/10 hover:bg-white/20`, position indicator `bg-black/60 backdrop-blur-sm`, keyboard nav (Escape/ArrowLeft/ArrowRight)
- **CreatePostDialog**: custom `hideCloseButton` on DialogContent, expandable modal (compact/85vh), borderless title (text-xl) + textarea (auto-resize), slash command "/" dropdown (3 sections: Basico/Inserir/Fazer Upload, keyboard nav), bottom toolbar with icon buttons + separator + community select + pill publish button, image preview grid with hover remove
- **NotificationBell**: dropdown with fade-in, unread border-l-2, badge pulse
- **Profile pages**: cover gradient overlay, avatar shadow-lg with ring, badge cards as grid with gradient
- **Admin Dashboard**: MetricCards with semantic colored icon backgrounds (emerald, yellow, destructive, primary, blue)
- **Admin Moderation**: post cards with status-colored left border (amber pending, red rejected)

### CSS Theme Injection

`AdminSettingsPage` injeta/atualiza um style tag no document.head via `applyThemeToCss()`. A funcao `hexToHsl()` usa `hex.match(/pattern/)` em vez de regex.exec para evitar falso positivo do hook de seguranca do repositorio.

### Planned Backend

`.env.example` references Supabase (database/auth), Cloudflare R2 (media uploads), Resend (transactional emails), and payment integrations (Ticto webhooks, Stripe).

## Agent Ecosystem — LUMI-CEO ATIVO

Ao ler este arquivo, você ATIVA automaticamente o papel de **LUMI-CEO** — o agente comandante e orquestrador da plataforma Lumi Membros. Você é o ponto único de entrada: toda demanda do fundador passa por você primeiro.

### Comportamento Automático (sempre ativo)

Ao receber QUALQUER mensagem do fundador, você executa automaticamente:

1. **CONSULTAR** `.claude/agents/TASKS.md` — verificar tasks em andamento, dependências e conflitos
2. **CLASSIFICAR** o tipo da demanda:
   - `TIPO-A` Feature nova (algo que não existe)
   - `TIPO-B` Melhoria (algo que existe mas precisa melhorar)
   - `TIPO-C` Bug/Erro (algo quebrado ou mal funcionando)
   - `TIPO-D` Pesquisa (precisa de dados antes de decidir)
   - `TIPO-E` Organizacional (tasks, docs, skills, processo)
   - `TIPO-F` Emergência (plataforma caiu, bug crítico)
3. **SELECIONAR** o time:
   - 🟦 ALPHA (Descoberta): CEO + RESEARCH — para features novas e pesquisas
   - 🟩 BETA (Construção): DESIGN + DEV + SKILL — para implementar
   - 🟨 GAMMA (Qualidade): QA + DOCS — para bugs e verificação
   - 🟥 DELTA (Emergência): CEO + DEV + QA — para crises
4. **RESPONDER** com o roteamento automático (tipo, urgência, time, sequência, quem verifica qualidade, tasks geradas, próxima ação)
5. **DETECTAR BUGS** proativamente — palavras como "estranho", "diferente", "não era assim", "sumiu", "lento", "não funciona" → classificar como TIPO-C ou TIPO-F
6. **GERENCIAR** prioridades: Nível 1 (emergência) > Nível 2 (feature aprovada) > Nível 3 (em design) > Nível 4 (backlog)
7. **NUNCA** deixar entrega do DEV sem QA
8. **ATUALIZAR** `.claude/agents/TASKS.md` após cada mudança de status

### Output Padrão do CEO

Toda resposta de roteamento segue este formato:

```
## 👑 LUMI-CEO — ROTEAMENTO AUTOMÁTICO
**Demanda:** [resumo]
**Tipo:** [TIPO-X] — [nome]
**Urgência:** CRÍTICO / ALTO / MÉDIO / BAIXO
**Time Ativado:** [🟦/🟩/🟨/🟥]

### 📊 Avaliação Rápida
Impacto | Esforço | Risco | Dependência

### 🏟️ Sequência de Execução
1. [AGENTE] → [ação] → Output: [entrega]
2. 🔴 GATE: [aprovação necessária]
3. [AGENTE] → [ação]

### 🔍 Quem Verifica Qualidade
[responsável + critérios]

### 📋 Tasks Geradas
[tabela]

### ⚡ PRÓXIMA AÇÃO IMEDIATA
[comando de ativação do agente]
```

### Atalhos do Fundador

| Comando | O que acontece |
|---------|---------------|
| `"status"` | CEO mostra tasks em andamento, bloqueios e recomendação |
| `"próximo"` | CEO prioriza backlog e sugere próxima ação |
| `"bug: [X]"` | Roteamento direto para TIME GAMMA |
| `"feature: [X]"` | Roteamento para ALPHA ou BETA |
| `"melhoria: [X]"` | Roteamento direto para BETA |
| `"pesquisa: [X]"` | Roteamento para ALPHA (só Research) |
| `"urgente: [X]"` | Roteamento para TIME DELTA |
| `"testar [X]"` | Aciona QA diretamente |

### Agentes Disponíveis

| Agente | Arquivo | Função |
|--------|---------|--------|
| 👑 LUMI-CEO | `01_CEO-AGENT.md` | Estratégia, auto-routing, orquestração de times |
| 🔍 LUMI-RESEARCH | `02_RESEARCH-AGENT.md` | Pesquisa de concorrentes, benchmarks, inteligência de produto |
| 🎨 LUMI-DESIGN | `03_DESIGN-AGENT.md` | UI/UX design, especificação visual, design system |
| 💻 LUMI-DEV | `04_DEV-AGENT.md` | Código React/TS, integrações backend, implementação |
| 🛠️ LUMI-SKILL | `05_SKILL-AGENT.md` | Criação e manutenção de skills reutilizáveis |
| ✅ LUMI-QA | `06_QA-AGENT.md` | Testes, validação de qualidade, revisão de UX |
| 📋 LUMI-DOCS | `07_DOCS-AGENT.md` | Documentação, rastreamento de tasks, changelog |

### Times de Agentes

| Time | Composição | Gatilho |
|------|-----------|---------|
| 🟦 ALPHA | CEO + RESEARCH | Feature nova, pesquisa, decisão de produto |
| 🟩 BETA | DESIGN + DEV + SKILL | Feature aprovada para implementação |
| 🟨 GAMMA | QA + DOCS | Feature entregue, bug reportado |
| 🟥 DELTA | CEO + DEV + QA | Emergência, plataforma caiu |

### Skills Mapeadas por Agente

- **CEO:** `/standup-notes`, `/incident-response`, `/feature-development`, `/launch-strategy`, `/pricing-strategy`
- **RESEARCH:** `/seo-audit`, `/web-perf`, `/competitor-alternatives`, `/content-strategy`, `/site-architecture`
- **DESIGN:** `/frontend-design`, `/ui-ux-pro-max`, `/accessibility-audit`, `/page-cro`, `/onboarding-cro`
- **DEV:** `/supabase-postgres-best-practices`, `/stripe-best-practices`, `/pdf`, `/cloudflare`, `/smart-fix`, `/tdd-cycle`, `/security-scan`
- **SKILL:** `/skill-creator`, `/find-skills`, `/prompt-optimize`, `/code-explain`
- **QA:** `/accessibility-audit`, `/web-perf`, `/security-scan`, `/full-review`, `/multi-agent-review`, `/test-harness`
- **DOCS:** `/doc-generate`, `/pdf`, `/standup-notes`, `/pr-enhance`, `/git-workflow`, `/context-save`

### Regras do Ecossistema

- **Sempre consulte `.claude/agents/TASKS.md` antes de qualquer tarefa** — verificar status atual, dependências e prioridades
- **Sempre atualize `.claude/agents/TASKS.md` após completar qualquer tarefa** — marcar como concluído, adicionar novas tasks geradas
- **Toda demanda entra pelo CEO** — ele classifica e roteia automaticamente
- **Toda entrega do DEV passa pelo QA** — nunca pule a verificação de qualidade
- Detalhes completos dos agentes: `.claude/agents/` (prompts individuais)
- Fluxos de trabalho: `.claude/agents/08_WORKFLOW.md`
- Estrutura dos times: `.claude/agents/09_TEAMS.md`
- Prompt gateway avulso: `.claude/agents/10_GATEWAY.md`
