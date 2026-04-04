# LUMI MEMBROS — TIMES DE AGENTES
**Arquivo:** `09_TEAMS.md` | **Versao:** 2.0.0 | **Atualizado:** 2026-03-31

---

## VISAO GERAL

Os agentes Lumi se organizam em **4 times especializados** que sao ativados conforme o tipo de demanda. Cada time tem um gatilho claro, uma sequencia de handoff definida e um output esperado. Os times nao sao fixos — agentes podem participar de multiplos times conforme necessidade.

---

## TIME ALPHA — Descoberta

**Composicao:** CEO + RESEARCH
**Cor:** Azul

### Gatilho de Ativacao
- Nova feature request do fundador
- Pesquisa de concorrente solicitada
- Decisao de produto que precisa de dados
- Exploracao de nova area de mercado
- "Como o concorrente X faz Y?"
- Documentacao tecnica necessaria para decisao

### Sequencia de Handoff

```
FUNDADOR -> ideia/pergunta
     |
     v
[CEO] Analisa a demanda
  - Classifica impacto/esforco/urgencia
  - Define escopo da pesquisa
  - Usa superpowers:brainstorming se necessario
     |
     v
[RESEARCH] Executa pesquisa
  - Playwright MCP para navegar concorrentes
  - Context7 MCP para docs tecnicas
  - Documenta insights com evidencias (screenshots)
     |
     v
[CEO] Consolida e recomenda
  - Analisa relatorio do Research
  - Prioriza insights acionaveis
  - Apresenta plano ao fundador
     |
     v
GATE-1: Fundador aprova direcao
     |
     v
OUTPUT -> Brief para TIME BETA (construcao)
```

### Output Esperado
- Relatorio de pesquisa com screenshots (via Playwright)
- Mapa comparativo atualizado (Lumi vs concorrentes)
- Recomendacao com priorizacao (impacto x esforco)
- TASK-XXX criadas para o TIME BETA

### Skills e Ferramentas do Time
| Agente | Skills / Ferramentas |
|--------|---------------------|
| CEO | `superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:dispatching-parallel-agents`, `memory-management` |
| RESEARCH | **Playwright MCP** (browser), **Context7 MCP** (docs), `superpowers:brainstorming` |

---

## TIME BETA — Construcao

**Composicao:** DESIGN + DEV + SKILL
**Cor:** Verde

### Gatilho de Ativacao
- Feature aprovada pelo fundador (GATE-1 passou)
- Design brief pronto para implementar
- Integracao tecnica aprovada (Supabase, R2, Stripe)
- Skill nova precisa ser criada para suportar a feature

### Sequencia de Handoff

```
GATE-1 aprovado -> Brief do TIME ALPHA
     |
     v
[DESIGN] Propoe solucao visual
  - Usa frontend-design para gerar interfaces
  - Usa theme-factory se envolve branding
  - Usa superpowers:brainstorming para explorar opcoes
     |
     v
GATE-2: Fundador aprova design
     |
     v
[SKILL] (se necessario) Cria skills de suporte
  - Usa skill-creator para estruturar
  - Usa skill-development para best practices
     |
     v
[DEV] Implementa
  - Usa superpowers:writing-plans para planejar
  - Usa feature-dev:feature-dev para features complexas
  - Usa superpowers:test-driven-development para TDD
  - Usa Supabase MCP para queries e migrations
  - Usa superpowers:verification-before-completion antes de entregar
     |
     v
OUTPUT -> Feature implementada para TIME GAMMA
```

### Output Esperado
- Proposta de design aprovada
- Skills tecnicas criadas (se necessario)
- Codigo implementado, build passando, dados no Supabase
- Handoff completo para QA (fluxos a testar, edge cases)

### Skills e Ferramentas do Time
| Agente | Skills / Ferramentas |
|--------|---------------------|
| DESIGN | `frontend-design`, `theme-factory`, `superpowers:brainstorming`, **Playwright MCP** |
| DEV | `superpowers:test-driven-development`, `superpowers:systematic-debugging`, `superpowers:writing-plans`, `superpowers:verification-before-completion`, `superpowers:using-git-worktrees`, `feature-dev:feature-dev`, `claude-api`, `pdf`, **Supabase MCP**, **Cloudflare MCP**, **Vercel MCP**, **Context7 MCP** |
| SKILL | `skill-creator`, `skill-development`, `claude-automation-recommender`, **Context7 MCP** |

---

## TIME GAMMA — Qualidade

**Composicao:** QA + DOCS
**Cor:** Amarelo

### Gatilho de Ativacao
- Feature entregue pelo DEV (TIME BETA concluiu)
- Bug corrigido e precisa de verificacao
- Release candidate pronto para validacao
- Documentacao precisa ser atualizada apos entrega

### Sequencia de Handoff

```
TIME BETA entrega -> Feature implementada
     |
     v
[QA] Testa tudo
  - Playwright MCP para testar fluxos no browser
  - Supabase para verificar dados no banco
  - Vercel MCP para verificar build/runtime logs
  - Funcionalidade (happy path + edge cases)
  - Responsividade (browser_resize: 375px, 768px, 1024px)
  - Console errors (browser_console_messages)
     |
     +-- Se bugs CRITICOS -> volta ao DEV (TIME BETA)
     |
     v (se aprovado)
GATE-3: Fundador ve resultado final
     |
     v
[DOCS] Documenta
  - Atualiza TASKS.md (status CONCLUIDO)
  - Adiciona ao CHANGELOG.md
  - Registra decisoes em DECISIONS.md
  - Atualiza CLAUDE.md se arquitetura mudou (claude-md-management:revise-claude-md)
  - Salva contexto importante (memory-management)
     |
     v
OUTPUT -> Feature documentada e entregue
```

### Output Esperado
- Relatorio de QA com evidencias (screenshots, dados do banco)
- Bugs classificados por severidade (se houver)
- TASKS.md atualizado
- CHANGELOG.md atualizado
- CLAUDE.md atualizado (se schema/arquitetura mudou)

### Skills e Ferramentas do Time
| Agente | Skills / Ferramentas |
|--------|---------------------|
| QA | `superpowers:verification-before-completion`, `superpowers:systematic-debugging`, `code-review:code-review`, `superpowers:requesting-code-review`, **Playwright MCP**, **Supabase MCP**, **Vercel MCP** |
| DOCS | `claude-md-management:revise-claude-md`, `claude-md-management:claude-md-improver`, `task-management`, `memory-management`, `pdf` |

---

## TIME DELTA — Emergencia

**Composicao:** CEO + DEV + QA
**Cor:** Vermelho

### Gatilho de Ativacao
- Bug critico em producao (plataforma quebrada)
- Regressao apos deploy (feature que funcionava parou)
- Problema de seguranca identificado (RLS, auth, XSS)
- Fundador reporta urgencia maxima
- Dados corrompidos ou perdidos no Supabase
- Erro critico de Supabase (RLS recursion, connection failure)

### Sequencia de Handoff

```
ALERTA: Bug critico identificado
     |
     v
[CEO] Triagem imediata (< 5 min)
  - Classifica severidade
  - Identifica impacto
  - Define se e rollback ou hotfix
     |
     v
[DEV] Diagnostico e correcao (< 30 min)
  - superpowers:systematic-debugging para root cause
  - Supabase MCP / curl para verificar banco
  - Vercel MCP para verificar logs
  - Implementa fix minimo
  - NAO refatora, NAO melhora — so corrige
     |
     v
[QA] Verificacao rapida (< 15 min)
  - Playwright MCP para confirmar fix
  - Verifica regressao minima
  - Nao faz QA completo — so validacao do fix
     |
     v
[CEO] Decide deploy
     |
     v
OUTPUT -> Fix deployado + post-mortem agendado
```

### Output Esperado
- Root cause identificado
- Fix minimo implementado e verificado
- Post-mortem breve (o que quebrou, por que, como prevenir)
- BUGS.md atualizado
- TASK de melhoria criada (para evitar recorrencia)

### Skills e Ferramentas do Time
| Agente | Skills / Ferramentas |
|--------|---------------------|
| CEO | `superpowers:brainstorming`, `memory-management` |
| DEV | `superpowers:systematic-debugging`, `superpowers:verification-before-completion`, **Supabase MCP**, **Vercel MCP**, **Context7 MCP** |
| QA | `superpowers:verification-before-completion`, **Playwright MCP**, **Supabase MCP**, **Vercel MCP** |

### Regras Especiais do TIME DELTA
1. **SLA:** Triagem em 5 min, fix em 30 min, verificacao em 15 min
2. **Sem gates:** CEO pode autorizar deploy direto sem fundador (apenas para hotfix)
3. **Escopo minimo:** Fix APENAS o bug, nada mais
4. **Post-mortem obrigatorio:** Apos resolver, documentar o que aconteceu
5. **Criar TASK preventiva:** Sempre gerar task para evitar recorrencia

---

## REGRAS GERAIS DOS TIMES

### Ativacao
- Apenas o **CEO** ou o **Fundador** ativam times
- Um time pode ser ativado enquanto outro esta em andamento (ex: DELTA interrompe BETA)
- TIME DELTA tem prioridade sobre todos os outros

### Comunicacao entre Times
- O handoff entre times SEMPRE passa pelo CEO
- O output de um time e o input do proximo
- Se um time esta bloqueado, o CEO redireciona

### Metricas por Time
| Time | Metrica Principal | Meta |
|------|------------------|------|
| ALPHA | Tempo de descoberta -> decisao | < 2 dias |
| BETA | Tempo de design -> codigo entregue | < 5 dias |
| GAMMA | Tempo de QA -> documentacao | < 2 dias |
| DELTA | Tempo de alerta -> fix deployado | < 1 hora |

### Diagrama de Fluxo entre Times

```
              +----------------------------------+
              |                                  |
              |         TIME DELTA               |
              |      (Emergencia — a qualquer    |
              |       momento interrompe tudo)    |
              |                                  |
              +----------------------------------+
                          ^
                          |
+----------+    +----------+    +----------+
|  ALPHA   |--->|  BETA    |--->|  GAMMA   |
| Descoberta|    |Construcao|    |Qualidade |
|           |    |          |    |          |
| CEO +     |    | DESIGN + |    | QA +     |
| RESEARCH  |    | DEV +    |    | DOCS     |
|           |    | SKILL    |    |          |
+----------+    +----------+    +----------+
     |               ^               |
     |               |               |
     +--- GATE-1 ----+               |
                                     |
              +--- GATE-2 -----------+
              |
              v
         ENTREGA
```
