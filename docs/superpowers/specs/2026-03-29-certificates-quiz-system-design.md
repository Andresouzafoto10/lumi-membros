# Design: Fix Certificados + Sistema de Quiz + Requisitos Expandidos

**Data:** 2026-03-29
**Status:** Aprovado
**Sprints:** A (fix), B (quiz), C (integração)

---

## Contexto

O sistema de certificados atual tem dois bugs visuais (texto sobreposto nos previews, mock data com valores confusos) e carece de um sistema de quiz que permita ao admin criar provas por aula e vincular a aprovação como requisito para avançar no curso ou obter o certificado.

### Decisões tomadas durante brainstorming

| Decisão | Escolha |
|---------|---------|
| Modelo de quiz | Combinação: quiz por aula (gate) + prova final (certificado) |
| Formato de perguntas | Múltipla escolha + Verdadeiro/Falso |
| Retentativas | Ilimitadas, perguntas reembaralhadas |
| UI do quiz para aluno | Inline na aula (abaixo do vídeo ou no lugar do vídeo) |
| Fix de certificados | Manter posicionamento livre em %, corrigir escala e mock values |

---

## Sprint A — Fix dos Certificados

### Problema

Os blocos de texto usam `fontSize` em `px` fixos. Quando o container de preview é pequeno (~400px de largura), os textos mantêm seu tamanho absoluto e se sobrepõem. O design original assume 1920px de largura.

### Solução

**1. Escalar font-size proporcionalmente ao container**

No `CertificateRenderer`, calcular a escala como `containerWidth / REFERENCE_WIDTH` (onde `REFERENCE_WIDTH = 1920`). Cada bloco aplica `fontSize * scale`.

Implementação: usar `useRef` + `useEffect` com `ResizeObserver` para medir a largura real do container e recalcular a escala quando redimensiona.

**2. Corrigir mock templates**

Reespaçar os valores `top` dos blocos para gap adequado:

Template Clássico (centrado):
- `certificate_title`: top 15%, fontSize 36
- `platform_name`: top 28%, fontSize 14
- `student_name`: top 40%, fontSize 32
- `custom_text`: top 53%, fontSize 16
- `course_name`: top 62%, fontSize 24
- `completion_date`: top 80%, left 10%, width 40%
- `course_hours`: top 80%, left 50%, width 40%

Template Moderno (alinhado à esquerda):
- `platform_name`: top 10%, fontSize 12
- `certificate_title`: top 20%, fontSize 40
- `student_name`: top 40%, fontSize 28
- `course_name`: top 55%, fontSize 20
- `completion_date`: top 72%, fontSize 14
- `course_hours`: top 80%, fontSize 14

**3. Garantir que o CertificateRenderer sem background-image funcione bem**

O gradiente fallback (`from-zinc-900 via-zinc-800 to-zinc-900`) está ok. Manter.

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/components/certificates/CertificateRenderer.tsx` | Adicionar ResizeObserver + escala proporcional de fontSize |
| `src/data/mock-certificates.ts` | Corrigir valores de `top` e `fontSize` dos blocos |

---

## Sprint B — Sistema de Quiz

### Tipos de dados

#### Novos tipos em `src/types/course.ts`

```typescript
export type QuizQuestionType = "multiple_choice" | "true_false";

export type QuizOption = {
  id: string;
  text: string;
};

export type QuizQuestion = {
  id: string;
  type: QuizQuestionType;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
};
```

#### Extensão de `CourseLesson` em `src/types/course.ts`

Adicionar campos opcionais:

```typescript
export type CourseLesson = {
  // ...campos existentes
  quiz?: QuizQuestion[];
  quizPassingScore?: number;        // 0-100, default 70
  quizRequiredToAdvance?: boolean;  // default false
};
```

#### Novo tipo de tentativa

```typescript
// Em src/types/student.ts
export type QuizAttempt = {
  id: string;
  studentId: string;
  lessonId: string;
  answers: Record<string, string>; // questionId -> selectedOptionId
  score: number;                   // 0-100
  passed: boolean;
  attemptedAt: string;
};
```

### Hook `useQuizAttempts`

**Arquivo:** `src/hooks/useQuizAttempts.ts`
**Chave localStorage:** `lumi-membros:quiz-attempts`
**Padrão:** useSyncExternalStore + module-level state (igual aos outros hooks)

**Funções:**

| Função | Descrição |
|--------|-----------|
| `submitAttempt(studentId, lessonId, quiz, answers)` | Calcula score, cria QuizAttempt, persiste. Retorna o attempt. |
| `getAttempts(studentId, lessonId)` | Todas as tentativas do aluno nessa aula |
| `getBestAttempt(studentId, lessonId)` | Tentativa com maior score |
| `hasPassedQuiz(studentId, lessonId)` | true se alguma tentativa tem `passed === true` |
| `getQuizScoresForCourse(studentId, courseId, lessonIds)` | Média dos melhores scores de cada aula que tem quiz |

**Lógica de `submitAttempt`:**
1. Para cada pergunta no quiz, checar se `answers[questionId] === question.correctOptionId`
2. `score = (acertos / total) * 100`
3. `passed = score >= (quizPassingScore || 70)`
4. Criar QuizAttempt com id, salvar no array

### Admin — Edição de Quiz no dialog de aula

**Arquivo:** `src/pages/admin/AdminModuleEditPage.tsx`

Mudanças no dialog de criar/editar aula:

1. **Tipo de conteúdo** ganha opção adicional no RadioGroup:
   - `video` — Vídeo (existente)
   - `text` — Texto (existente)
   - `quiz` — Quiz (novo, sem vídeo)
   - `video_quiz` — Vídeo + Quiz (novo)

2. **Se quiz ou video_quiz**, mostra seção "Quiz" abaixo do vídeo/descrição:

```
┌─────────────────────────────────────────────┐
│ Perguntas do Quiz                [+ Adicionar] │
├─────────────────────────────────────────────┤
│ Pergunta 1                         [Remover] │
│ Tipo: [Múltipla escolha ▼]                   │
│ Texto: [___________________________]         │
│ Opções:                                      │
│   ○ [Opção A_____________]                   │
│   ○ [Opção B_____________] ← correta         │
│   ○ [Opção C_____________]                   │
│   [+ Adicionar opção]                        │
├─────────────────────────────────────────────┤
│ Pergunta 2 (V ou F)               [Remover] │
│ Texto: [___________________________]         │
│ Resposta correta: ○ Verdadeiro ○ Falso       │
├─────────────────────────────────────────────┤
│ Nota mínima: [slider 50-100%] — 70%         │
│ □ Obrigatório para avançar                   │
└─────────────────────────────────────────────┘
```

**Para V/F:** opções são fixas ("Verdadeiro", "Falso"), admin só marca qual é correta.
**Para múltipla escolha:** admin adiciona 2-5 opções, marca uma como correta via radio.

3. **Persistência:** os campos `quiz`, `quizPassingScore`, `quizRequiredToAdvance` são salvos dentro do `CourseLesson` via `createLesson` / `updateLesson` existentes.

### Aluno — Componente `LessonQuiz`

**Arquivo novo:** `src/components/courses/LessonQuiz.tsx`

**Props:**
```typescript
{
  quiz: QuizQuestion[];
  passingScore: number;
  lessonId: string;
  onPass: () => void;  // callback quando aprovado
}
```

**Comportamento:**
1. Renderiza perguntas em ordem aleatória (embaralhada via `useMemo` com seed baseado em tentativa)
2. Para cada pergunta: texto + opções como radio buttons
3. Botão "Enviar respostas" no final (desabilitado se nem todas respondidas)
4. Ao enviar:
   - Chama `submitAttempt` do hook
   - Mostra resultado: cada pergunta fica verde (acertou) ou vermelha (errou) com a resposta correta
   - Score total exibido no topo
   - Se passou: mensagem de sucesso + chama `onPass()`
   - Se reprovou: mensagem "Tente novamente" + botão para refazer (reembaralha)
5. Se o aluno já passou em tentativa anterior (`hasPassedQuiz`): mostra resumo da melhor nota com badge "Aprovado" e não bloqueia

### Aluno — Integração no `CourseDetailPage`

**Arquivo:** `src/pages/student/CourseDetailPage.tsx`

1. **Se aula tem quiz e não tem vídeo** (`videoType === "none"` e `quiz` definido):
   - Renderiza `LessonQuiz` no lugar do `LessonPlayer`

2. **Se aula tem quiz e tem vídeo** (`videoType !== "none"` e `quiz` definido):
   - Renderiza `LessonPlayer` seguido de `LessonQuiz` abaixo

3. **Botão "Concluir aula":**
   - Se `quizRequiredToAdvance === true` e `!hasPassedQuiz(userId, lessonId)`: desabilitado com tooltip "Aprove no quiz para concluir"
   - Caso contrário: comportamento normal

### Mock data de quiz

Adicionar quiz de exemplo a 1-2 aulas nos mock-courses:
- `aula-1-3` ("Modos de disparo") — 3 perguntas de múltipla escolha sobre ISO/abertura
- `aula-2-3` ("Exercício prático") — 2 perguntas V/F sobre composição

### Arquivos novos

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useQuizAttempts.ts` | Hook de tentativas de quiz |
| `src/components/courses/LessonQuiz.tsx` | Componente inline do quiz |

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/types/course.ts` | Tipos QuizQuestion, QuizOption, QuizQuestionType + extensão de CourseLesson |
| `src/types/student.ts` | Tipo QuizAttempt |
| `src/data/mock-courses.ts` | Adicionar quiz a 2 aulas |
| `src/pages/admin/AdminModuleEditPage.tsx` | Seção quiz no dialog de aula (editor de perguntas) |
| `src/pages/student/CourseDetailPage.tsx` | Renderizar LessonQuiz + bloqueio do botão concluir |
| `src/hooks/useCourses.ts` | Aceitar campos quiz no createLesson/updateLesson (já aceita via spread, mas verificar types) |

---

## Sprint C — Requisitos Expandidos de Certificado

### Mudança em `CertificateConfig`

```typescript
export type CertificateRequirementType =
  | "completion"           // apenas % de aulas
  | "quiz"                 // apenas média dos quizzes
  | "completion_and_quiz"; // ambos

export type CertificateConfig = {
  templateId: string | null;
  hoursLoad: number;
  requirementType: CertificateRequirementType;
  completionThreshold: number;  // usado em "completion" e "completion_and_quiz"
  quizThreshold: number;        // usado em "quiz" e "completion_and_quiz"
};
```

**Valores default:** `requirementType: "completion"`, `completionThreshold: 100`, `quizThreshold: 70`

### Lógica expandida em `checkAndAwardCertificate`

```
Se requirementType === "completion":
  → checa completedLessons >= completionThreshold% (comportamento atual)

Se requirementType === "quiz":
  → busca todas as aulas do curso que têm quiz
  → para cada uma, pega o melhor score via getBestAttempt
  → calcula média
  → média >= quizThreshold?

Se requirementType === "completion_and_quiz":
  → ambas as condições acima devem ser true
```

### Admin UI expandida

No `AdminCourseEditPage`, seção Certificado:

```
Modelo: [dropdown templates]

Tipo de requisito:
  ○ Conclusão de aulas
  ○ Aprovação nos quizzes
  ○ Conclusão + Quizzes

(se conclusão selecionado):
  Percentual de conclusão — [slider 50-100%] — 100%

(se quiz selecionado):
  Nota mínima média — [slider 50-100%] — 70%

(se ambos): ambos os sliders aparecem

Carga horária: [input number]
[Preview do certificado]
```

### Aluno — Indicadores expandidos no `CourseDetailPage`

O indicador de progresso para certificado mostra conforme o tipo:

- **completion:** "Complete 80% das aulas para o certificado" + barra de progresso
- **quiz:** "Alcance 70% de média nos quizzes para o certificado" + nota atual
- **completion_and_quiz:** ambos empilhados com status individual (checkmark verde quando atingido)

### Compatibilidade retroativa

Cursos existentes sem `requirementType` devem funcionar como `"completion"` com `completionThreshold: 100` (default). O código deve tratar `undefined` como `"completion"`.

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/types/course.ts` | `CertificateRequirementType` + expandir `CertificateConfig` |
| `src/hooks/useCertificates.ts` | Lógica de verificação expandida com quiz scores |
| `src/pages/admin/AdminCourseEditPage.tsx` | RadioGroup de tipo de requisito + slider condicional |
| `src/pages/student/CourseDetailPage.tsx` | Indicadores expandidos |

---

## Resumo de todos os arquivos

### Novos (3)
- `src/hooks/useQuizAttempts.ts`
- `src/components/courses/LessonQuiz.tsx`
- `docs/superpowers/specs/2026-03-29-certificates-quiz-system-design.md`

### Modificados (9)
- `src/types/course.ts`
- `src/types/student.ts`
- `src/data/mock-courses.ts`
- `src/data/mock-certificates.ts`
- `src/components/certificates/CertificateRenderer.tsx`
- `src/hooks/useCertificates.ts`
- `src/pages/admin/AdminModuleEditPage.tsx`
- `src/pages/admin/AdminCourseEditPage.tsx`
- `src/pages/student/CourseDetailPage.tsx`

### Dependências de sprint
```
Sprint A (fix certificados) → independente
Sprint B (quiz) → independente
Sprint C (integração) → depende de A + B
```
