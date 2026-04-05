# Revisão rápida da base — 2026-04-05

## 1) Tarefa: corrigir erro de digitação (UI em PT-BR)

**Problema encontrado**
- Há labels de interface sem acentuação em palavras que aparecem com acento em outras partes do produto, como `Comentarios`, `publicacoes` e `Mencoes`. Isso passa aparência de texto não finalizado e reduz consistência de UX.
- Exemplo concreto em `MyProfilePage`: `"Comentarios nas minhas publicacoes"` e `"Mencoes"`.

**Arquivos de referência**
- `src/pages/student/MyProfilePage.tsx`

**Sugestão de tarefa**
- Padronizar strings de interface para português com acentuação correta nos textos visíveis ao usuário (ex.: `Comentários`, `publicações`, `Menções`).

**Critérios de aceite**
- [ ] Strings corrigidas sem alterar chaves/IDs de dados.
- [ ] Revisão manual das telas de perfil (aluno e admin) para garantir consistência terminológica.

---

## 2) Tarefa: corrigir bug funcional (regra `course_complete`)

**Problema encontrado**
- Na função `evaluateRule`, o caso `course_complete` exige `referenceId`, porém o cálculo usa apenas `allLessonIds` (curso atual), ignorando na prática o curso referenciado.
- Efeito: quando uma regra depender da conclusão de *outro* curso, o comportamento pode liberar/bloquear aula incorretamente.

**Arquivos de referência**
- `src/lib/accessControl.ts`

**Sugestão de tarefa**
- Ajustar o contrato de `evaluateRule` para aceitar o progresso por curso (ex.: `completedLessonsByCourse`) e usar `rule.referenceId` para validar a conclusão do curso correto.

**Critérios de aceite**
- [ ] Regra `course_complete` valida explicitamente o curso em `referenceId`.
- [ ] Sem regressão para regras `module_complete` e `lesson_complete`.

---

## 3) Tarefa: corrigir comentário/discrepância de documentação

**Problema encontrado**
- O `AGENTS.md` descreve o estado de cursos como store em memória + `localStorage` e afirma ausência de backend.
- Já `useCourses.ts` está implementado com `useQuery` + chamadas Supabase (`course_sessions`, `courses`, etc.).
- Isso gera divergência para onboarding e para quem planeja tarefas com base no documento.

**Arquivos de referência**
- `AGENTS.md`
- `src/hooks/useCourses.ts`

**Sugestão de tarefa**
- Atualizar a seção de arquitetura no `AGENTS.md` para refletir o estado atual: React Query + Supabase como fonte primária de dados, com indicação clara do que ainda usa mock/localStorage.

**Critérios de aceite**
- [ ] Documento descreve corretamente a fonte de verdade de cada domínio (cursos, banners, comunidade etc.).
- [ ] Time consegue seguir o fluxo de dados sem inferências conflitantes.

---

## 4) Tarefa: melhorar teste/check automatizado

**Problema encontrado**
- O script `npm run lint` está quebrado no ambiente atual por falta de configuração do ESLint v9 (`eslint.config.*`), o que remove uma barreira importante de qualidade no CI/local.

**Arquivos de referência**
- `package.json`

**Sugestão de tarefa**
- Implementar configuração compatível com ESLint v9 (flat config) ou pinar temporariamente ESLint v8 com configuração equivalente, e incluir execução de lint no pipeline.

**Critérios de aceite**
- [ ] `npm run lint` executa com sucesso localmente.
- [ ] CI falha em PR quando houver erro de lint.

