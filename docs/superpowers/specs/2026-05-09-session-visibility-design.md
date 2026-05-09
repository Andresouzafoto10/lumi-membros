# Session Visibility Design

**Data:** 2026-05-09
**Status:** Aprovado para implementação

## Problema

Hoje todas as sessões de cursos (`course_sessions`) aparecem para qualquer aluno logado. Cursos individuais já têm controle de acesso (`access.mode`), mas sessões inteiras são sempre visíveis. Admin não consegue limitar visibilidade da sessão.

## Solução

Adicionar campo `visibility_mode` na tabela `course_sessions` com dois valores:

- `'all'` — sessão visível para qualquer aluno logado (comportamento atual, default)
- `'enrolled_courses'` — sessão visível apenas para alunos com matrícula ativa em pelo menos um curso da sessão

Modos de "turmas específicas" foram avaliados e descartados porque a regra de fallback (matrícula em curso garante visibilidade) tornava o modo funcionalmente idêntico a `enrolled_courses`.

## Schema

Migration em `course_sessions`:

```sql
ALTER TABLE course_sessions
  ADD COLUMN visibility_mode text NOT NULL DEFAULT 'all'
  CHECK (visibility_mode IN ('all', 'enrolled_courses'));
```

Sessões existentes ficam `'all'` (backward compat).

## Tipo TypeScript

```ts
// src/types/course.ts
export type SessionVisibilityMode = 'all' | 'enrolled_courses';

export type CourseSession = {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  order: number;
  visibilityMode: SessionVisibilityMode;
  courses: Course[];
};
```

## Regra de visibilidade (cliente)

Função `isSessionVisibleToStudent(session, currentUserId, enrollments, classes, isAdmin)`:

```
if isAdmin → true
if session.visibilityMode === 'all' → true
hasEnrolledCourseInSession = session.courses.some(c =>
  isStudentEnrolled(currentUserId, c.id, enrollments, classes)
)
return hasEnrolledCourseInSession
```

Resumo: sessão aparece se aluno é admin, ou modo é `all`, ou aluno tem matrícula ativa em pelo menos um curso da sessão.

## Mudanças de UI

### Admin — `AdminSessionPage`
Adicionar card "Visibilidade da sessão" abaixo do card de Informações:
- Radio com 2 opções:
  - "Todos os alunos logados" (`all`)
  - "Apenas alunos matriculados em cursos da sessão" (`enrolled_courses`)
- Salvar via `updateSession({ visibilityMode })`

### Aluno — `CoursesPage`
1. Filtrar `activeSessions` com `isSessionVisibleToStudent()` antes de renderizar
2. Remover sessões ocultas do dropdown de filtro de sessões
3. Seção "Meus Cursos" no topo permanece intacta (já usa `useEnrolledCourses` independente de session visibility)

## Arquivos afetados

- `supabase/migrations/<NEW>.sql` — DDL
- `supabase/migrations/001_initial_schema.sql` — sincronizar
- `src/types/course.ts` — adicionar `SessionVisibilityMode`, campo `visibilityMode`
- `src/lib/database.types.ts` — regenerar (ou patch manual)
- `src/hooks/useCourses.ts` — fetch/update incluir `visibility_mode`
- `src/lib/accessControl.ts` — exportar `isSessionVisibleToStudent()`
- `src/pages/admin/AdminSessionPage.tsx` — UI radio
- `src/pages/student/CoursesPage.tsx` — filtro client-side

## Não-objetivos

- Server-side RLS para esconder sessões — metadata não é sensível, filtro client-side suficiente
- Modo `'classes'` (turmas específicas) — descartado por redundância com fallback
- Filtro de sessões para a busca global ou outros lugares fora da `CoursesPage` — escopo mínimo

## Migração de dados

Sessões existentes recebem `visibility_mode = 'all'` automaticamente via DEFAULT da coluna. Sem backfill manual necessário.

## Critérios de aceite

- [ ] Admin consegue alternar `Visibilidade` em `/admin/cursos/sessoes/:id` e persistir
- [ ] Sessão `all`: visível para todos os alunos logados (comportamento atual preservado)
- [ ] Sessão `enrolled_courses`: visível apenas para alunos com matrícula em ≥1 curso da sessão
- [ ] Sessão `enrolled_courses` é omitida do dropdown de filtro quando aluno sem acesso
- [ ] Admin sempre vê todas as sessões independente do modo
- [ ] Seção "Meus Cursos" mantém comportamento atual (mostra cursos matriculados)
