# 📋 LUMI MEMBROS — TASK TRACKER
**Última atualização:** 2026-04-07 | **Versão do Tracker:** 2.2.0

---

## 🔵 PLANEJANDO

| ID | Descrição | Agente | Prioridade | Criado |
|----|-----------|--------|-----------|--------|
| TASK-001 | Pesquisa completa do fluxo do aluno na Cademi (login → aula) | RESEARCH | ALTA | 2026-03-29 |
| TASK-002 | Pesquisa de comunidade e moderação no Circle (admin) | RESEARCH | ALTA | 2026-03-29 |
| TASK-003 | Mapa comparativo completo de features Lumi vs MemberKit vs Cademi | RESEARCH | ALTA | 2026-03-29 |
| TASK-004 | Criar SKILL_hook-store.md — template para novos hooks | SKILL | MÉDIA | 2026-03-29 |
| TASK-005 | Criar SKILL_componente-react.md — template para novos componentes | SKILL | MÉDIA | 2026-03-29 |
| TASK-006 | Criar SKILL_admin-page-pattern.md — template para páginas admin | SKILL | MÉDIA | 2026-03-29 |
| TASK-007 | Criar SKILL_supabase-migration.md — guia de migração mock→real | SKILL | ALTA | 2026-03-29 |
| TASK-008 | Design: Analytics dashboard para o produtor | DESIGN | ALTA | 2026-03-29 |
| TASK-009 | Design: Melhorias no player de vídeo (baseado em referência Cademi) | DESIGN | ALTA | 2026-03-29 |
| TASK-010 | Design: Onboarding do produtor (primeiro curso guiado) | DESIGN | MÉDIA | 2026-03-29 |
| TASK-012 | Dev: Upload de vídeo/imagem via Cloudflare R2 | DEV | ALTA | 2026-03-29 |
| TASK-014 | Dev: Webhook Stripe/Ticto para matrículas | DEV | ALTA | 2026-03-29 |
| TASK-015 | QA: Auditoria completa da experiência do aluno | QA | ALTA | 2026-03-29 |
| TASK-016 | QA: Auditoria completa da experiência do admin | QA | ALTA | 2026-03-29 |
| ECO-002 | Criar skills prioritárias do backlog (hook-store, componente-react, supabase-migration) | SKILL | ALTA | 2026-03-29 |
| ECO-003 | Testar ativação de cada time (ALPHA, BETA, GAMMA, DELTA) com cenário simulado | CEO | MÉDIA | 2026-03-29 |
| ECO-004 | Criar CHANGELOG.md, DECISIONS.md, ROADMAP.md, BUGS.md (estrutura inicial) | DOCS | MÉDIA | 2026-03-29 |
| ECO-005 | Revisar e otimizar prompts de todos os agentes com /prompt-optimize | SKILL | MÉDIA | 2026-03-29 |

---

## 🟡 EM ANDAMENTO

| ID | Descrição | Agente | Prioridade | Criado |
|----|-----------|--------|-----------|--------|
| TASK-012 | Migração uploads Supabase Storage → R2 (Fases 1-3 concluídas, Fase 4-5 pendente) | DEV | ALTA | 2026-03-29 |

---

## 🔴 AGUARDANDO APROVAÇÃO DO FUNDADOR

*Nenhuma task aguardando aprovação*

---

## ✅ CONCLUÍDAS

| ID | Descrição | Agente | Concluído |
|----|-----------|--------|----------|
| AUDIT-002 | Auditoria total da plataforma — 41 itens (5 críticos, 8 bugs, 8 melhorias, 20 ideias) — resultado em auditoriatotal.md | TIME COMPLETO | 2026-04-07 |
| FEAT-008 | Gestão de turmas e cursos no perfil do aluno — updateEnrollment no useStudents, card Turmas melhorado (vincular com tipo/duração automáticos da turma, editar expiração inline, mostrar cursos por turma, duração/tipo visíveis), novo card Cursos com Acesso (lista cursos derivados das turmas ativas, indica "Via: turma X", admins veem todos com badge "Acesso total"), filtro Restritos na lista de alunos | DEV | 2026-04-04 |
| FEAT-007 | Melhorias na Moderação — Tab Aulas: "Ver na aula" (link nova aba), "Responder" inline (adminAddComment), replies agrupadas com collapse (>2). Tab Posts: "Ver na comunidade" (link nova aba), "Responder" inline (createPostComment), comentários aninhados com replies e ações moderação (excluir/restringir em cada reply). Delete dialog unificado (post/post-comment/lesson-comment). AvatarSmall helper. Separadores visuais border-l-2. | DEV | 2026-04-04 |
| FEAT-006 | Moderação de Comentários de Aulas — useAllLessonCommentsAdmin (join profiles+lessons+courses), adminDeleteComment mutation, tab "Comentários de Aulas" na AdminModerationPage com filtros (busca, curso, aula), cards com avatar/badges/contexto reply/truncate expandível, ações excluir + restringir autor (reusa dialog existente), paginação "Carregar mais" (50 por vez) | DEV | 2026-04-04 |
| FEAT-005 | Comentários nas Aulas — tabela lesson_comments (RLS, indexes, trigger), comments_enabled em courses e course_lessons, tipo LessonComment, hook useLessonComments (React Query + join profiles + replies + likes + gamificação), componente LessonComments (markdown, likes, replies colapsáveis, highlight mais curtido), toggle admin por curso (AdminCourseEditPage) e por aula (AdminModuleEditPage), integrado em CourseDetailPage, action_type lesson_comment na gamificação | DEV | 2026-04-04 |
| FEAT-004 | Controle de acesso a cursos — banner compacto (160px) no admin, config "Sem acesso" no jsonb access (no_access_action/redirect_url/support_url), CourseCard com grayscale+cadeado para cursos sem matricula, modal "Acesso restrito" ou redirect externo, admins sempre veem normal, CoursesPage mostra todos os cursos (enrolled+locked) | DEV | 2026-04-04 |
| EMAIL-002 | Preferencias de notificacao por usuario — tabela notification_preferences (25 campos email+notif), trigger auto-create, hook useNotificationPreferences (optimistic updates), tab Notificacoes no MyProfilePage (checkboxes email/in-app), card no AdminStudentProfilePage, notify-email verifica preferencias antes de enviar, notificationTriggers verifica notif_* para in-app | TIME BETA | 2026-04-04 |
| EMAIL-001 | Sistema completo de Email Marketing & Automacoes — tabela email_automations (12 automacoes seed), template HTML base com paleta Master (#ff7b00), notify-email expandido (18 tipos), email-scheduler (inatividade 7d/30d), resend-access-email (magic link admin), useEmailAutomations hook, useEmailNotifications expandido (14 funcoes), AdminEmailsPage com 4 tabs (Automacoes/Historico/Reenviar Acesso/Configuracoes), rota /admin/emails, link no sidebar | TIME BETA | 2026-04-04 |
| DOC-001 | Auditoria completa e atualização do CLAUDE.md — leitura de 100+ arquivos, 65+ divergências identificadas e corrigidas, backend ativo documentado, 30+ tabelas Supabase, Edge Functions, gamificação, certificados, quiz system, DRM | DOCS | 2026-04-04 |
| FEAT-003 | Materiais de Aula com DRM Social — tabela lesson_materials, Edge Function download-material (pdf-lib watermark nome+email+CPF), bucket Supabase Storage privado, hook useLessonMaterials, componente admin LessonMaterialsManager, componente aluno LessonMaterials, coluna cpf em profiles, RLS corrigido via classes→enrollments | DEV | 2026-04-04 |
| TASK-013 | Dev: Sistema de autenticação real (Supabase Auth) — login, cadastro, sessão persistente, proteção de rotas | DEV | 2026-03-29 |
| TASK-011 | Dev: Migração completa mock→Supabase — 20+ hooks, SQL schema, RLS, build limpo sem erros | DEV | 2026-03-29 |
| PERF-001 | Code-splitting com React.lazy: bundle principal de 1MB para 362KB, 85+ chunks separados | DEV | 2026-03-29 |
| FEAT-001 | ErrorBoundary global: crashes agora mostram UI amigável em vez de tela branca | DEV | 2026-03-29 |
| FEAT-002 | Loading spinner (PageLoader) para transições entre rotas lazy-loaded | DEV | 2026-03-29 |
| FIX-006 | Fix: Mobile bottom nav sem link de Certificados (Award icon importado mas não usado) | DEV | 2026-03-29 |
| FIX-005 | Fix: Non-null assertions inseguras em CertificateCard, AdminCourseEditPage, AdminStudentProfilePage | DEV | 2026-03-29 |
| FIX-004 | Fix: createLesson não aceitava campos quiz no useCourses.ts | DEV | 2026-03-29 |
| FIX-003 | Fix: vite.config.ts sem @types/node, adicionado types:["node"] em tsconfig.node.json | DEV | 2026-03-29 |
| FIX-002 | Fix: PostComments.tsx isMostLiked tipo boolean/null incompatível | DEV | 2026-03-29 |
| FIX-001 | Fix: AdminStudentsPage Ban icon com prop title inválida | DEV | 2026-03-29 |
| AUDIT-001 | Auditoria completa do codebase: 21 hooks, 24 pages, gaps identificados | QA | 2026-03-29 |
| ECO-008 | Gateway v1.0: Prompt único de entrada com atalhos, exemplos e instruções completas (10_GATEWAY.md) | DOCS | 2026-03-29 |
| ECO-007 | Workflow v2.0: Fluxo de ativação automática, 6 fluxos documentados, transição entre times | DOCS | 2026-03-29 |
| ECO-006 | CEO v2.0: Sistema de auto-routing, orquestra��ão automática de times, detecção proativa de bugs | CEO | 2026-03-29 |
| ECO-001 | Aprovação e evolução do ecossistema de agentes (skills mapeadas, times criados, CLAUDE.md atualizado) | DOCS | 2026-03-29 |
| ECO-000 | Criação do ecossistema de agentes Lumi (7 agentes + TASKS.md) | DOCS | 2026-03-29 |
| FIX-007 | Fix: Configurações de aparência não persistiam — race condition em 3 updates concorrentes não-awaited, corrigido para single atomic update com async/await e error handling | QA+DEV | 2026-04-06 |

---

## ❌ CANCELADAS

*Nenhuma task cancelada ainda*

---

## 🐛 BUGS ABERTOS

*Nenhum bug aberto*

---

## 📊 MÉTRICAS DO TIME

| Métrica | Valor |
|---------|-------|
| Tasks criadas | 36 |
| Tasks em andamento | 0 |
| Tasks aguardando aprovação | 0 |
| Tasks concluídas | 22 |
| Bugs críticos abertos | 0 |
| Skills criadas | 0 |
| Decisões registradas | 1 |
| Times configurados | 4 (ALPHA, BETA, GAMMA, DELTA) |
| Skills mapeadas | 50+ (distribuídas em 7 agentes) |

---

## 📅 PRÓXIMA REVISÃO

**Data:** 2026-04-05 (uma semana após criação)
**Responsável:** CEO + Fundador
**Pauta:** Priorizar quais tasks entram em andamento primeiro

---

## 🧭 DECISÕES REGISTRADAS

### DEC-003 | 2026-03-29 | Migração completa mock data → Supabase
**Status:** Concluído
**Contexto:** Plataforma usava localStorage + useSyncExternalStore com mock data. Sem autenticação real.
**Decisão:** Migrar 100% para Supabase Auth + PostgreSQL. Remover VITE_USE_MOCK_DATA. Criar SQL schema com 23 tabelas + RLS. Páginas /login e /cadastro. ProtectedRoute para admin e alunos.
**Impacto:** Plataforma agora tem backend real. Dados persistem no banco. Auth seguro com sessão persistente. Build passa sem erros (`npm run build` ✓). 20+ hooks migrados para React Query + Supabase.

### DEC-002 | 2026-03-29 | CEO como orquestrador automático com Gateway
**Status:** Aprovado
**Contexto:** Fundador quer que o CEO ative times automaticamente sem precisar saber qual agente ou time acionar
**Decisão:** Reescrever CEO v2.0 com auto-routing, criar Gateway (prompt único de entrada), atualizar workflow com 6 fluxos
**Impacto:** Toda demanda agora entra por um ponto único (CEO) que classifica, roteia e orquestra automaticamente

### DEC-001 | 2026-03-29 | Criação do ecossistema de agentes
**Status:** Aprovado
**Contexto:** Fundador quer um time estruturado de agentes IA para evoluir o Lumi Membros
**Decis��o:** Criar 7 agentes especializados com prompts detalhados, sistema de tasks e gates de aprovação
**Impacto:** Todo desenvolvimento futuro usa esse ecossistema como base

---

## 🔗 DEPENDÊNCIAS

```
TASK-013 (Auth) → bloqueia → TASK-011 (Supabase cursos)
TASK-011 (Supabase) → bloqueia → TASK-012 (Upload R2)
TASK-001 (Research Cademi) → alimenta → TASK-009 (Design player)
TASK-002 (Research Circle) → alimenta → TASK-008 (Design analytics)
TASK-003 (Mapa comparativo) → alimenta → TASK-008, TASK-009, TASK-010
TASK-015 (QA aluno) → depende de → TASK-009 (player melhorado)
```