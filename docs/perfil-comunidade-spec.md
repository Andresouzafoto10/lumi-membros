# Especificacao — Perfil do Aluno + Comunidade

> Documento de referencia para implementacao dos modulos Perfil do Aluno e Comunidade no lumi-membros.
> Stack: Vite + React 18 + TypeScript + React Router v6 + Tailwind + shadcn/ui + localStorage (mock data).

---

## MODULO 1 — PERFIL DO ALUNO

### Rotas

| Rota | Descricao |
|------|-----------|
| `/meu-perfil` | Perfil proprio do aluno (editavel) |
| `/perfil/:id` | Perfil publico de qualquer aluno |

### Campos do perfil

```ts
type StudentProfile = {
  id: string;
  studentId: string;
  username: string;          // @handle, gerado do email, editavel
  displayName: string;
  avatarUrl: string;         // upload simulado, base64 no localStorage
  coverUrl: string;          // upload simulado, base64 no localStorage
  bio: string;               // max 160 chars
  link: string;              // URL externa opcional
  location: string;          // texto livre
  createdAt: string;         // ISO date
  followers: string[];       // studentIds
  following: string[];       // studentIds
};
```

**localStorage key:** `lumi-membros:profiles`

### Tela `/meu-perfil`

- Foto de capa (banner horizontal) com botao de upload (overlay)
- Avatar circular com botao de upload (overlay)
- Nome de exibicao, @username, bio, link, localizacao, data de entrada
- Botao "Editar perfil" -> abre Dialog com todos os campos editaveis
- Abas:
  1. **Publicacoes** — posts que o aluno publicou
  2. **Posts salvos** — posts que o aluno salvou (bookmark)
  3. **Sobre** — bio completa, link, localizacao, cursos matriculados

### Tela `/perfil/:id`

- Mesma estrutura visual, sem botao "Editar perfil"
- Botao "Seguir / Seguindo" (toggle, salva no localStorage)
- Outros alunos veem publicacoes e informacoes publicas

### Integracao com Admin `/admin/alunos/:id`

- Exibir avatar e displayName do perfil na pagina do admin
- Admin ve informacoes do perfil mas NAO edita
- Admin ve posts do aluno nas comunidades

---

## MODULO 2 — COMUNIDADE

### Conceito

- Cada **turma** pode ter 1+ **comunidades** vinculadas
- Admin controla quais turmas tem acesso a quais comunidades
- **Feed geral** agrega posts de TODAS as comunidades do aluno
- Cada comunidade tem feed isolado

### Rotas Student

| Rota | Descricao |
|------|-----------|
| `/comunidade` | Redirect para `/comunidade/feed` |
| `/comunidade/feed` | Feed geral (todas as comunidades do aluno) |
| `/comunidade/:slug` | Feed de uma comunidade especifica |

### Rotas Admin

| Rota | Descricao |
|------|-----------|
| `/admin/comunidade` | Listagem de comunidades |
| `/admin/comunidade/:id/edit` | Criar/editar comunidade |
| `/admin/comentarios` | Moderacao de posts e comentarios |

### Navegacao

- Adicionar "Comunidade" no header do StudentLayout (ao lado da logo)
- Adicionar "Comunidade" e "Moderacao" na sidebar do AdminLayout

### Layout da Comunidade (student)

**Sidebar esquerda:**
- Feed (geral)
- Lista de comunidades que o aluno tem acesso (agrupadas)
- \# em Alta — top 5 hashtags dos ultimos 7 dias
- Posts mais curtidos do mes — top 3

**Feed central:**
- Input "Criar publicacao" no topo (se permitido e nao restrito)
- Lista de posts: cronologico ou por relevancia
- Filtro: Mais recente / Mais curtido / Seguindo

### Tipos — Posts

```ts
type CommunityPost = {
  id: string;
  communityId: string;
  authorId: string;       // studentId
  type: 'user' | 'system';
  systemEvent?: {
    event: 'module_complete' | 'course_complete';
    courseId: string;
    moduleId?: string;
  };
  title: string;          // opcional
  body: string;           // markdown basico, detecta #hashtags e @mencoes
  images: string[];       // ate 6 URLs (base64 mock)
  hashtags: string[];     // extraidas automaticamente do body
  mentions: string[];     // @usernames extraidos do body
  likesCount: number;
  commentsCount: number;
  likedBy: string[];      // studentIds
  savedBy: string[];      // studentIds (bookmark)
  status: 'published' | 'pending' | 'rejected';
  createdAt: string;
  updatedAt: string;
};
```

### Tipos — Comentarios

```ts
type PostComment = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  likesCount: number;
  likedBy: string[];
  parentCommentId: string | null; // respostas aninhadas (1 nivel)
  createdAt: string;
};
```

### Tipos — Comunidade

```ts
type Community = {
  id: string;
  slug: string;
  name: string;
  description: string;
  coverUrl: string;
  iconUrl: string;
  classIds: string[];     // turmas com acesso
  pinnedPostId: string | null;
  settings: {
    allowStudentPosts: boolean;
    requireApproval: boolean;
    allowImages: boolean;
  };
  status: 'active' | 'inactive';
  createdAt: string;
};
```

### Tipos — Restricoes

```ts
type StudentRestriction = {
  id: string;
  studentId: string;
  reason: string;
  appliedBy: string;        // admin studentId
  startsAt: string;
  endsAt: string | null;    // null = permanente
  active: boolean;
};
```

### Tipos — Notificacoes

```ts
type AppNotification = {
  id: string;
  recipientId: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'system';
  actorId: string | null;
  targetId: string;
  targetType: 'post' | 'comment' | 'profile';
  message: string;
  read: boolean;
  createdAt: string;
};
```

### Tipos — Gamificacao

```ts
type GamificationData = {
  studentId: string;
  points: number;
  badges: string[];       // badge IDs conquistados
};

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;           // emoji ou lucide icon name
  condition: string;      // descricao da condicao
};
```

### localStorage keys

| Key | Conteudo |
|-----|----------|
| `lumi-membros:profiles` | StudentProfile[] |
| `lumi-membros:communities` | Community[] |
| `lumi-membros:posts` | CommunityPost[] |
| `lumi-membros:comments` | PostComment[] |
| `lumi-membros:restrictions` | StudentRestriction[] |
| `lumi-membros:notifications` | AppNotification[] |
| `lumi-membros:gamification` | GamificationData[] |

---

## ACOES DE POST

| Acao | Descricao |
|------|-----------|
| Curtir | Toggle, mostra contagem |
| Comentar | Expande comentarios, mostra contagem |
| Salvar | Bookmark, aparece em "Posts salvos" no perfil |
| Compartilhar | Copia link (mock) |
| Menu (...) | Reportar / Editar / Excluir (se proprio) |

### Criar publicacao (modal)

- Titulo (opcional)
- Corpo com markdown basico
- Upload ate 6 imagens (simulado)
- Hashtags detectadas automaticamente (#palavra)
- Mencoes detectadas automaticamente (@username)
- Select de comunidade destino
- Botao Publicar

### Comentarios

- Listados abaixo do post (colapsados por padrao)
- Avatar + nome + texto + data + curtir
- Responder (aninhado 1 nivel)
- Menu (...): Reportar / Excluir (se proprio)

---

## ADMIN — GESTAO DE COMUNIDADES

### Listagem `/admin/comunidade`

- Cards: nome, descricao, turmas, total membros, total posts, status
- Botao "+ Nova comunidade"
- Filtros: status, turma

### Criar/Editar `/admin/comunidade/:id/edit`

- Nome, descricao, slug, imagem capa, icone
- Turmas com acesso (multi-select)
- Status (ativa/inativa)
- Configuracoes: permitir posts de alunos, requerer aprovacao, permitir imagens

### Vinculacao turma <-> comunidade

- Na edicao de turma (`/admin/turmas/:id/edit`), secao "Comunidades"
- Multi-select das comunidades disponiveis

---

## ADMIN — MODERACAO

### Rota `/admin/comentarios`

- Filtros: Todos / Pendentes / Reportados / Restritos
- Filtro por comunidade
- Busca por texto ou autor

### Card de item

- Autor (avatar + nome + @username)
- Conteudo, comunidade, data, status
- Acoes: Aprovar, Excluir, Restringir autor, Ver contexto

### Restringir autor (modal)

- Duracao: 1d / 3d / 7d / 30d / Permanente
- Motivo (texto livre)
- Efeito: aluno nao publica posts nem comentarios

### Aba "Restricoes ativas"

- Lista de alunos restritos com: nome, motivo, datas, quem aplicou
- Botao "Remover restricao"

---

## MELHORIAS INTEGRADAS

### 1. Gamificacao (estrutura base + mock)

- Hook `useGamification` com pontos e badges mock
- Badges pre-definidos (Primeiro Passo, Engajado, Popular, Maratonista, Veterano)
- Pontos mock deterministicos por aluno
- Exibicao no perfil + badge principal no post

### 2. Posts de sistema no feed

- Posts tipo `system` com card diferenciado (icone de trofeu)
- Mock data com eventos de conclusao
- Sem curtir/comentar (so visual)

### 3. Notificacoes in-app

- Hook `useNotifications` com mock data
- Icone de sino no StudentLayout header com badge de contagem
- Dropdown/popover com lista
- Click leva ao post/perfil

### 4. Restricao integrada com admin

- Secao "Restricoes" no AdminStudentProfilePage
- Restricao ativa + historico
- Botao "Restringir aluno" com modal
- Icone na tabela de alunos
- Input de post/comentario desabilitado quando restrito

### 5a. Aba "Seguindo" no feed

- Filtro adicional que mostra so posts de pessoas seguidas

### 5b. Mencoes (@username)

- Detecta @username no body do post/comentario
- Renderiza como link clicavel para `/perfil/:id`

### 5c. Fixar post

- Admin pode fixar 1 post por comunidade
- Campo `pinnedPostId` na Community
- Post fixado aparece no topo do feed com badge "Fixado"

---

## PLANO DE TASKS

### Fase 1 — Fundacao (Tipos + Hooks + Mock Data)

| # | Task | Complexidade | Descricao |
|---|------|-------------|-----------|
| 1 | Tipos base | P | Adicionar todos os tipos novos em `src/types/student.ts` |
| 2 | Mock data | M | Criar `mock-profiles.ts`, `mock-communities.ts`, `mock-posts.ts`, `mock-comments.ts`, `mock-notifications.ts`, `mock-restrictions.ts`, `mock-gamification.ts` |
| 3 | Hook `useProfiles` | M | CRUD de perfis, follow/unfollow, upload simulado |
| 4 | Hook `useCommunities` | M | CRUD de comunidades, vinculacao com turmas |
| 5 | Hook `usePosts` | G | CRUD de posts, curtir, salvar, hashtags, mencoes, filtros |
| 6 | Hook `useComments` | M | CRUD de comentarios, curtir, respostas aninhadas |
| 7 | Hook `useRestrictions` | P | CRUD de restricoes, verificacao de restricao ativa |
| 8 | Hook `useNotifications` | P | Listar, marcar como lido, contagem de nao lidos |
| 9 | Hook `useGamification` | P | Pontos e badges mock, consulta por aluno |

### Fase 2 — Perfil do Aluno

| # | Task | Complexidade | Descricao |
|---|------|-------------|-----------|
| 10 | Pagina `/meu-perfil` | G | Layout completo com capa, avatar, info, abas (Publicacoes, Salvos, Sobre), modal de edicao |
| 11 | Pagina `/perfil/:id` | M | Perfil publico (read-only) com botao Seguir |
| 12 | Integracao Admin | P | Avatar + nome no AdminStudentProfilePage, posts do aluno |

### Fase 3 — Comunidade (Student)

| # | Task | Complexidade | Descricao |
|---|------|-------------|-----------|
| 13 | Layout da comunidade | G | Sidebar esquerda + feed central + rotas |
| 14 | Componente PostCard | G | Card de post completo (acoes, imagens, hashtags, mencoes, menu) |
| 15 | Componente PostComments | M | Lista de comentarios com respostas aninhadas |
| 16 | Modal criar publicacao | M | Form com titulo, body, imagens, select comunidade |
| 17 | Sidebar: # em Alta + Top posts | P | Hashtags trending + posts mais curtidos |
| 18 | Filtros do feed | P | Mais recente / Mais curtido / Seguindo |
| 19 | Post fixado + Posts system | P | Card de post fixado no topo + card system diferenciado |

### Fase 4 — Comunidade (Admin)

| # | Task | Complexidade | Descricao |
|---|------|-------------|-----------|
| 20 | Listagem `/admin/comunidade` | M | Cards com filtros, botao nova comunidade |
| 21 | Criar/Editar comunidade | M | Form completo com multi-select turmas |
| 22 | Vinculacao turma <-> comunidade | P | Secao "Comunidades" na edicao de turma |

### Fase 5 — Moderacao (Admin)

| # | Task | Complexidade | Descricao |
|---|------|-------------|-----------|
| 23 | Pagina de moderacao | G | Listagem com filtros, acoes, modal restringir |
| 24 | Aba restricoes ativas | M | Lista de alunos restritos + remover restricao |
| 25 | Integracao restricao no perfil admin | P | Secao restricoes no AdminStudentProfilePage |

### Fase 6 — Notificacoes + Gamificacao + Navegacao

| # | Task | Complexidade | Descricao |
|---|------|-------------|-----------|
| 26 | Sino de notificacoes | M | Icone no header + dropdown com lista |
| 27 | Gamificacao no perfil | P | Secao pontos + badges no perfil do aluno |
| 28 | Navegacao final | P | Links "Comunidade" no StudentLayout + "Comunidade" e "Moderacao" no AdminLayout |
| 29 | Rotas no App.tsx | P | Registrar todas as rotas novas |
| 30 | Atualizar CLAUDE.md | P | Documentar todos os arquivos e features |

---

## DECISOES APROVADAS

1. **Aluno logado**: Seletor no header para trocar de usuario (testar interacoes entre perfis)
2. **Imagens**: Opcao (C) — mock data com placeholders + upload base64 ao criar post
3. **Markdown**: Basico — negrito, italico, links, hashtags e mencoes clicaveis
4. **Sidebar mobile**: Drawer (como admin)
5. **Ordem**: Fundacao -> Perfil -> Comunidade Student -> Admin -> Moderacao -> Extras
