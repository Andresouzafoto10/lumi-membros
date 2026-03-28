# Lumi Membros — Design de Melhorias e Novas Funcionalidades

**Data:** 2026-03-27
**Status:** Aprovado
**Abordagem:** Foundation First (polir core → admin → engajamento → certificados → comunidade)
**Escopo:** Frontend-only com mock data (localStorage). Sem integração backend nesta fase.

---

## Contexto

Lumi Membros é uma plataforma de área de membros para cursos online (multi-nicho: fotografia, edição, marketing, etc.). Atende do iniciante ao avançado. Atualmente roda como SPA React + Vite com estado em localStorage e dados mock.

### Estado Atual
- **Implementado:** área do aluno (cursos, player, progresso), admin (CRUD de sessões, cursos, módulos, aulas, banners), dark/light mode, carousel de banners, sidebar colapsável
- **Stubs:** AdminBannersPage e AdminSectionsPage redirecionam para /admin/cursos
- **Não implementado:** backend, auth, pagamentos, uploads, analytics reais, busca, gamificação, certificados, comunidade

### Decisões de Design
- Mock data com localStorage até integração com Supabase
- Abordagem "Foundation First": melhorar o que existe antes de adicionar features novas
- Todas as features novas usam a mesma arquitetura (useSyncExternalStore + localStorage)
- Novas entidades de dados ficam no mesmo store central (useCourses expandido ou hooks dedicados)

---

## Fase 1: Quick Wins — Melhorias UX/UI no Core

**Objetivo:** Polir tudo que já existe. Custo baixo, impacto alto.

### 1.1 Busca e Filtros de Cursos (P)
- Barra de busca na CoursesPage — filtra cursos por título/descrição em tempo real
- Filtro por sessão (dropdown ou tabs horizontais)
- Estado vazio elegante quando busca não retorna resultados ("Nenhum curso encontrado")

### 1.2 Estados Vazios e Feedback Visual (P)
- Tela de "nenhum curso disponível" com ilustração/ícone e CTA
- Skeleton loaders nos cards de curso (preparação para backend futuro)
- Empty states no admin: sessão sem cursos, módulo sem aulas, curso sem módulos
- Animações de transição suaves (fade-in nos cards, slide nos dialogs)

### 1.3 Melhorias no Player de Aulas (P)
- Anotações/notas do aluno por aula (textarea com save no localStorage)
- Botão "Marcar como concluída" mais proeminente com feedback visual (checkmark animado)
- Indicador de progresso linear no topo da página (barra fina mostrando % do curso)
- Breadcrumb: Sessão > Curso > Módulo > Aula

### 1.4 Navegação e Layout (P)
- Breadcrumbs em todas as páginas admin
- Student sidebar colapsável em mobile (drawer com swipe)
- "Continue de onde parou" — card destacado na CoursesPage com último curso/aula acessado
- Favicon e meta tags (título dinâmico por página)

### 1.5 Micro-interações e Polish (P)
- Hover effects nos CourseCards (scale sutil + sombra)
- Transições ao expandir/colapsar módulos no sidebar
- Toast de confirmação ao marcar aula como concluída
- Indicador visual de aulas novas (badge "Novo" nos primeiros 7 dias)
- Scroll suave ao navegar entre aulas

### 1.6 Responsividade Aprimorada (P)
- Ajustar todas as páginas para breakpoints: mobile (< 640px), tablet (640-1024px), desktop (> 1024px)
- Admin dialogs: full-screen em mobile, modal em desktop
- Carousel de banners otimizado para touch

---

## Fase 2: Admin Completo

**Objetivo:** Transformar o admin em ferramenta poderosa de criação de conteúdo.

### 2.1 Dashboard com Métricas (M)
- Página /admin com cards de resumo: total de cursos, módulos, aulas, banners ativos
- Gráficos mock com Recharts: alunos ativos por dia (line chart), cursos mais acessados (bar chart), taxa de conclusão por curso (donut chart)
- Tabela de "atividade recente" (últimas aulas concluídas, últimos acessos — mock)
- Cards clicáveis que navegam para a seção correspondente

### 2.2 Editor Rico de Conteúdo (M)
- Substituir textarea de descrição de aulas por editor Markdown com preview
- Biblioteca: TipTap (headless, ProseMirror) ou MDXEditor
- Toolbar: bold, italic, headings, listas, código, links, imagens (URL)
- Preview lado a lado (split view) ou toggle (edit/preview)
- Descrição de cursos e módulos também com editor rico
- Renderização na área do aluno com react-markdown ou similar

### 2.3 Preview "Visão do Aluno" (M)
- Botão "Visualizar como aluno" no editor de curso/aula
- Modal full-screen ou rota /admin/preview/:courseId renderizando componentes da área do aluno
- Badge flutuante "Modo Preview" para diferenciar
- Navegação completa (player, sidebar) sem sair do admin

### 2.4 Gestão de Usuários Mock (M)
- Nova rota /admin/usuarios
- Tabela com usuários fictícios: nome, email, plano, cursos inscritos, % progresso, último acesso
- Filtros: por plano, por curso, por status (ativo/inativo)
- Detalhes do usuário: lista de cursos com progresso individual
- Mock data: 15-20 usuários com nomes brasileiros realistas
- Sidebar admin: novo item "Usuários" com ícone Users

### 2.5 Melhorias nos Formulários Admin (P)
- Validação em tempo real (campos obrigatórios, URL válida)
- Upload de imagem: componente drag & drop com preview (data URL no mock, preparado para R2)
- Reordenação drag & drop com dnd-kit (cursos, módulos, aulas) — substituir botões up/down
- Confirmação antes de deletar (AlertDialog consistente)
- Atalhos de teclado: Ctrl+S para salvar, Esc para fechar dialog

---

## Fase 3: Gamificação

**Objetivo:** Sistema de engajamento que motive o aluno a voltar todo dia e completar cursos.

### 3.1 Sistema de XP e Níveis (M)
- Ações com XP:
  - Completar aula: +50 XP
  - Completar módulo: +200 XP
  - Completar curso: +500 XP
  - Primeiro acesso do dia: +25 XP
  - 5 aulas no mesmo dia: +100 XP bônus
- Níveis: Iniciante (0), Explorador (500), Estudioso (1500), Dedicado (3500), Expert (7000), Mestre (15000)
- Barra de XP no header do aluno (nível atual + progresso para o próximo)
- Animação ao ganhar XP ("+50 XP" flutuante)
- Persistência localStorage, estrutura preparada para backend

### 3.2 Sistema de Streaks (P)
- Contagem de dias consecutivos acessando a plataforma
- Ícone de fogo no header com número do streak
- Alerta quando streak prestes a ser perdido
- Bônus XP por milestones: 7 dias (+200 XP), 30 dias (+1000 XP)
- Calendário de atividade (grid tipo GitHub contributions) no perfil

### 3.3 Sistema de Badges/Conquistas (M)
- ~15 badges desbloqueáveis:
  - "Primeiro Passo" — completou primeira aula
  - "Maratonista" — 5 aulas em um dia
  - "Dedicação Total" — streak de 7 dias
  - "Mestre do Curso" — completou um curso inteiro
  - "Colecionador" — completou 3 cursos
  - "Nota 10" — anotações em 10 aulas
  - "Explorador" — acessou todos os cursos
  - + ~8 badges adicionais (definidos durante implementação com base nas features disponíveis em cada fase)
- Cada badge: ícone, título, descrição, data de conquista
- Toast + modal de celebração ao desbloquear
- Galeria no perfil (desbloqueados brilhantes, bloqueados em cinza com dica)

### 3.4 Ranking/Leaderboard (P)
- Página /ranking ou seção na CoursesPage
- Tabela: posição, avatar, nome, nível, XP total, streak
- Filtros: semanal, mensal, geral
- Destaque para o usuário logado ("Você está em #5!")
- Mock: 20-30 usuários fictícios
- Top 3 com destaque visual (ouro, prata, bronze)

### 3.5 Perfil do Aluno (M)
- Rota /perfil
- Seções: info pessoal (nome, avatar, nível), estatísticas (XP, aulas completadas, horas de estudo, streak record), galeria de badges, calendário de atividade, cursos em andamento
- Card "próxima conquista" — badge mais próximo com progresso

---

## Fase 4: Certificados

**Objetivo:** Valor tangível à conclusão — algo que o aluno baixa, compartilha e usa como prova.

### 4.1 Geração de Certificado (M)
- Ao completar 100% das aulas, botão "Gerar Certificado" aparece
- Geração client-side com html2canvas + jsPDF
- Template do certificado:
  - **Imagem de fundo customizável** (configurada pelo admin por curso — permite certificados personalizados)
  - "Certificado de Conclusão"
  - Nome do aluno (input editável ou pré-preenchido do perfil)
  - Nome do curso
  - Carga horária estimada (nº aulas × duração média configurável)
  - Data de conclusão
  - Código de verificação único (UUID)
  - Assinatura digital (imagem placeholder do instrutor)
- **Sem logo Lumi** — foco no design com background customizado
- Formato: PDF A4 paisagem

### 4.2 Galeria de Certificados (P)
- Rota /certificados (área do aluno)
- Grid com thumbnails dos certificados obtidos
- Card: nome do curso, data, botão "Baixar PDF"
- Estado vazio: "Você ainda não completou nenhum curso. Continue estudando!"
- Persistência localStorage: [{courseId, completedAt, studentName, verificationCode}]

### 4.3 Compartilhamento Social (P)
- Botão "Compartilhar" no certificado
- Imagem PNG 1200x630px otimizada para redes sociais
- Opções: copiar link, baixar imagem, LinkedIn/WhatsApp/Instagram
- Modal de celebração no primeiro certificado (confetti)

### 4.4 Admin: Configuração de Certificados (P)
- No editor de curso, seção "Certificado"
- Campos: habilitar/desabilitar, carga horária, nome instrutor, texto customizado, imagem de fundo
- Preview do certificado com dados de exemplo

### 4.5 Verificação de Certificado (P)
- Rota pública /verificar/:codigo
- Exibe dados se código válido (lookup localStorage)
- "Certificado válido" com detalhes ou "Código não encontrado"
- URL compartilhável para validação

---

## Fase 5: Comunidade

**Objetivo:** Interação entre alunos, retenção e senso de pertencimento.

### 5.1 Comentários por Aula (M)
- Seção abaixo do player
- Comentário: avatar, nome, data, texto, botão curtir
- Respostas (1 nível de aninhamento)
- Ordenação: mais recentes ou mais curtidos
- Contador de comentários na sidebar ao lado do título da aula
- Mock: 3-5 comentários pré-populados por aula
- Persistência localStorage

### 5.2 Sistema de Q&A por Aula (M)
- Tab separada dos comentários: "Perguntas e Respostas"
- Aluno posta pergunta, outros respondem
- Admin marca "Resposta oficial" (destaque visual)
- Upvote em perguntas para ranquear relevância
- Filtro: sem resposta, respondidas, mais votadas
- Badge "Colaborador" para quem responde 10+ (integra gamificação)

### 5.3 Feed e Grupos de Comunidade (G)

#### Estrutura de Grupos
- Cada grupo = comunidade temática (ex: "Fotografia", "Edição", "Marketing")
- Admin cria/gerencia grupos em /admin/comunidade
- Alunos vinculados a grupos por acesso ao curso ou liberação manual do admin
- Cada grupo: nome, descrição, imagem de capa, contagem de membros

#### Feed Geral (/comunidade)
- Agrega todas as publicações dos grupos que o aluno participa
- Ao publicar no feed geral, aluno escolhe em qual(is) grupo(s) postar (dropdown multi-select dos grupos que pertence)
- Ordenação: mais recentes, com seção "Em Alta" no topo (posts com mais curtidas/comentários nas últimas 24-48h)
- Hashtags (#) clicáveis — seção "# Em Alta" com as mais usadas

#### Feed por Grupo (/comunidade/:groupId)
- Apenas publicações daquele grupo
- Header: capa, nome, descrição, nº membros
- Mesmo layout do feed geral, filtrado
- Só membros publicam

#### Publicações
- Texto com suporte a hashtags (#) e menções (@)
- Fotos: 1 a 6 imagens por post (carrossel com dots/setas)
- Imagens: data URL no mock, preparado para R2 futuro
- Preview de imagens antes de postar

#### Interações por Post
- Curtir (coração com contador)
- Comentar (thread linear sob o post)
- Responder comentários (1 nível de aninhamento)
- Denunciar (flag → moderação admin)
- Salvar (bookmark → aparece em /perfil aba "Salvos")

#### Sidebar da Comunidade
- Lista de grupos do aluno
- "# Em Alta" — top 5-10 hashtags da semana
- "Sugestões de Grupos" — grupos que o aluno ainda não participa

#### Mock Data
- 30-40 posts distribuídos entre 4-5 grupos
- Comentários, curtidas, hashtags variadas

### 5.4 Admin: Moderação (M)
- Seção /admin/comunidade
- CRUD de grupos (criar, editar, desativar, vincular a cursos)
- Gerenciar membros por grupo (adicionar/remover)
- Moderar posts: aprovar, remover, destacar
- Fila de denúncias com ação (remover post, banir do grupo, ignorar)
- Dashboard: posts por dia, grupos mais ativos, denúncias pendentes
- Toggle global: habilitar/desabilitar comentários por curso

---

## Modelo de Dados (Novas Entidades)

### Gamificação
```typescript
type UserGamification = {
  id: string
  userId: string
  xp: number
  level: string
  currentStreak: number
  longestStreak: number
  lastActiveDate: string // ISO 8601
  activityCalendar: Record<string, boolean> // "2026-03-27": true
  badges: UserBadge[]
}

type UserBadge = {
  id: string
  badgeId: string
  unlockedAt: string
}

type BadgeDefinition = {
  id: string
  title: string
  description: string
  icon: string // nome do ícone lucide-react (ex: "trophy", "flame", "star")
  condition: string // descritivo, lógica implementada no código
  xpReward: number
}
```

### Certificados
```typescript
type Certificate = {
  id: string
  courseId: string
  userId: string
  studentName: string
  courseName: string
  completedAt: string
  verificationCode: string
  workloadHours: number
  instructorName: string
}

// Extensão do Course
type CourseCertificateConfig = {
  enabled: boolean
  workloadHours: number
  instructorName: string
  customText?: string
  backgroundImageUrl: string // imagem de fundo customizável
}
```

### Comunidade
```typescript
type CommunityGroup = {
  id: string
  name: string
  description: string
  coverImageUrl: string
  memberCount: number
  isActive: boolean
  linkedCourseIds: string[]
  createdAt: string
}

type CommunityPost = {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string
  groupIds: string[] // pode pertencer a múltiplos grupos
  content: string // texto com #hashtags e @menções
  images: string[] // 0-6 URLs
  hashtags: string[]
  likesCount: number
  likedBy: string[]
  commentsCount: number
  savedBy: string[]
  reportedBy: string[]
  createdAt: string
}

type PostComment = {
  id: string
  postId: string
  parentCommentId: string | null // null = top-level, string = reply
  authorId: string
  authorName: string
  authorAvatar: string
  content: string
  likesCount: number
  likedBy: string[]
  createdAt: string
}

type LessonComment = {
  id: string
  lessonId: string
  parentCommentId: string | null
  authorId: string
  authorName: string
  authorAvatar: string
  content: string
  likesCount: number
  likedBy: string[]
  createdAt: string
}

type LessonQuestion = {
  id: string
  lessonId: string
  authorId: string
  authorName: string
  authorAvatar: string
  content: string
  upvotes: number
  upvotedBy: string[]
  answers: LessonAnswer[]
  isAnswered: boolean
  createdAt: string
}

type LessonAnswer = {
  id: string
  questionId: string
  authorId: string
  authorName: string
  authorAvatar: string
  content: string
  isOfficial: boolean // marcada pelo admin
  createdAt: string
}
```

### Usuários Mock
```typescript
type MockUser = {
  id: string
  name: string
  email: string
  avatar: string
  plan: "free" | "pro" | "max"
  isActive: boolean
  enrolledCourseIds: string[]
  joinedAt: string
  lastAccessAt: string
}
```

### Notas do Aluno
```typescript
type LessonNote = {
  lessonId: string
  courseId: string
  content: string
  updatedAt: string
}
```

---

## Resumo de Complexidade

| Fase | Foco | Complexidade |
|------|------|-------------|
| 1. Quick Wins | UX/UI polish, busca, navegação, micro-interações | P |
| 2. Admin Completo | Dashboard, editor rico, preview, usuários, forms | M-G |
| 3. Gamificação | XP, streaks, badges, ranking, perfil do aluno | M |
| 4. Certificados | Geração customizável, galeria, compartilhamento, verificação | M |
| 5. Comunidade | Comentários/Q&A, feed + grupos, moderação admin | G |

---

## Dependências entre Fases

```
Fase 1 (Quick Wins) → independente, pode começar imediatamente
Fase 2 (Admin) → independente da Fase 1, mas recomendado após
Fase 3 (Gamificação) → Perfil do aluno (3.5) é pré-requisito para badges/ranking
Fase 4 (Certificados) → depende do Perfil (3.5) para nome do aluno
Fase 5 (Comunidade) → depende do Perfil (3.5) para identidade do aluno, integra com gamificação (3.3) para badge "Colaborador"
```

## Novas Dependências (npm)

| Pacote | Fase | Propósito |
|--------|------|-----------|
| recharts | 2 | Gráficos do dashboard admin |
| @tiptap/react + extensões | 2 | Editor rico de conteúdo |
| @dnd-kit/core + @dnd-kit/sortable | 2 | Drag & drop para reordenação |
| react-markdown + remark-gfm | 2 | Renderização Markdown na área do aluno |
| react-helmet-async | 1 | Meta tags dinâmicas por página |
| html2canvas | 4 | Geração de imagem do certificado |
| jspdf | 4 | Geração de PDF do certificado |
| canvas-confetti | 3/4 | Animação de celebração |
