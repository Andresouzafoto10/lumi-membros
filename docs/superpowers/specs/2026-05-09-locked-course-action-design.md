# Locked Course Action — Design

**Data:** 2026-05-09
**Status:** Aprovado para implementação

## Problema

Hoje, quando aluno sem acesso clica num card de curso bloqueado, só existem dois comportamentos:

1. `no_access_action = "nothing"` (default atual) → abre modal "Acesso restrito" com botão de suporte
2. `no_access_action = "redirect"` → abre URL externa em nova aba

Falta uma opção em que o card simplesmente leve o aluno à página padrão de "Acesso restrito" da `CourseDetailPage` (a página cheia com botão "Voltar para cursos") — útil quando o admin não quer modal nem redirect, apenas a tela padrão.

## Solução

Adicionar um terceiro valor ao enum `no_access_action`:

- `default` (novo) — card vira `<Link>` normal; ao clicar, navega para `/cursos/:id`; a `CourseDetailPage` mostra a tela "Acesso restrito" cheia
- `nothing` (existente) — `<button>` com `onClick` que abre o modal de suporte
- `redirect` (existente) — `<button>` com `onClick` que abre a URL externa em nova aba

Cursos existentes mantêm seus valores atuais (`nothing` ou `redirect`). Cursos novos passam a ser criados com `default`.

## Schema

`courses.access` é JSONB. O campo `no_access_action` dentro dele aceita os três valores. Não há ALTER TABLE — só atualização do tipo TS e da UI. Validação no banco é dispensada (campo livre dentro de JSONB).

## Tipo TypeScript

```ts
// src/types/course.ts
export type NoAccessAction = "default" | "nothing" | "redirect";

export type CourseAccess = {
  mode: "all" | "plans" | "admin";
  plans?: string[];
  no_access_action?: NoAccessAction; // default treated as "default"
  no_access_redirect_url?: string;
  no_access_support_url?: string;
};
```

## Comportamento do card (cliente)

`CourseCard` quando `locked`:

```
action = access.no_access_action ?? "default"
url = access.no_access_redirect_url ?? ""

if (action === "redirect" && url.trim() !== "") {
  → render <button> with onClick=window.open(url, "_blank")
} else if (action === "nothing") {
  → render <button> with onClick=open modal
} else {
  // action === "default" OR (redirect with empty URL — silent fallback)
  → render <Link to={`/cursos/${courseId}`}>
}
```

A `CourseDetailPage` já possui o bloco "Acesso restrito" para aluno não-matriculado — sem mudanças necessárias nela.

## UI Admin

`AdminCourseEditPage`, card "Sem acesso":

Radio com 3 opções, na ordem:

1. **Sem redirecionamento** (`default`) — "Mostra a página padrão de acesso restrito"
2. **Mensagem de suporte** (`nothing`) — campo opcional `no_access_support_url`
3. **Redirecionar** (`redirect`) — campo `no_access_redirect_url` (label fica obrigatório visualmente, mas vazio → fallback silencioso para `default`)

Default ao criar curso novo: `default`.

## Default para cursos novos

`createCourse` em `src/hooks/useCourses.ts` deve aceitar `access` opcional. Quando admin cria curso sem definir explicitamente, persistir `no_access_action: "default"` no JSONB.

## Não-objetivos

- Migração de cursos existentes — `nothing`/`redirect` continuam funcionais
- Validação de URL no banco
- Mudança no modal/página existentes além do roteamento

## Critérios de aceite

- [ ] Admin vê 3 opções no radio "Sem acesso" no `AdminCourseEditPage`
- [ ] "Sem redirecionamento" salva `no_access_action: "default"`
- [ ] Card locked com `default` → click navega para `/cursos/:id` → mostra "Acesso restrito" da página
- [ ] Card locked com `nothing` → modal aparece (comportamento atual preservado)
- [ ] Card locked com `redirect` + URL preenchida → abre URL em nova aba (comportamento atual preservado)
- [ ] Card locked com `redirect` + URL vazia → fallback para `default` (navega para página)
- [ ] Curso novo criado sem configurar acesso → `default`
- [ ] Cursos existentes salvos com `nothing` ou `redirect` continuam funcionando
