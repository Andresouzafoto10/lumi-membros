# LUMI MEMBROS — ECOSSISTEMA DE AGENTES DE IA
**Versao:** 2.0.0 | **Criado:** 2026-03-29 | **Atualizado:** 2026-03-31

---

## VISAO GERAL

O ecossistema Lumi e um time de agentes especializados que trabalham em cadeia para evoluir a plataforma de area de membros. Cada agente tem uma funcao clara, um gatilho de ativacao e um output definido. Nenhum agente age sozinho em decisoes criticas — tudo passa por **gates de aprovacao** do fundador.

---

## HIERARQUIA DO TIME

```
+-----------------------------------------+
|         GATEWAY (10_GATEWAY.md)         |
|   Ponto unico de entrada do fundador   |
+-------------------+---------------------+
                    |
+-------------------v---------------------+
|           CEO                           |
|   Comandante / Auto-Router / Orquestrador|
|   Classifica -> Roteia -> Ativa Times   |
+-------------------+---------------------+
                    |
         +----------+----------+
         |                     |
+--------v------+    +---------v-----+
| LUMI-         |    |  LUMI-        |
| RESEARCH      |    |  SKILL        |
| Pesquisa      |    |  Criador de   |
| & Intel.      |    |  Skills/Tools |
+--------+------+    +---------+-----+
         |                     |
+--------v------+    +---------v-----+
| LUMI-         |    |  LUMI-        |
| DESIGN        |    |  DEV          |
| UI/UX         |    |  Full-stack   |
| Designer      |    |  Developer    |
+--------+------+    +---------+-----+
         |                     |
         +----------+----------+
                    |
              +-----v------+
              |  LUMI-QA   |
              |  Quality   |
              |  Assurance |
              +-----+------+
                    |
              +-----v------+
              |  LUMI-DOCS |
              |  Documenta |
              |  & Rastreia|
              +------------+
```

---

## AGENTES E ARQUIVOS

| Agente | Arquivo | Funcao Principal |
|--------|---------|-----------------|
| Gateway | `10_GATEWAY.md` | Prompt unico de entrada — cole e use |
| CEO | `01_CEO-AGENT.md` | Estrategia, auto-routing, orquestracao de times |
| Research | `02_RESEARCH-AGENT.md` | Concorrentes, UX, benchmarks, documentacao tecnica |
| Design | `03_DESIGN-AGENT.md` | UI/UX, design system, componentes, prototipagem |
| Dev | `04_DEV-AGENT.md` | Codigo React/TS, Supabase, integracoes backend |
| Skill | `05_SKILL-AGENT.md` | Criar/melhorar skills e automacoes |
| QA | `06_QA-AGENT.md` | Testes, bugs, experiencia final, browser testing |
| Docs | `07_DOCS-AGENT.md` | Documentar, rastrear tarefas, manter CLAUDE.md |

---

## FLUXO DE TRABALHO PADRAO

```
DEMANDA ENTRA
     |
     v
[CEO] Analisa -> Prioriza -> Decompoe em Tasks
     |
     v
[CEO] Aciona o primeiro agente da cadeia
     |
     v
[RESEARCH] (se necessario) -> Entrega brief
     |
     v
[DESIGN] Propoe solucao visual -> GATE: Aprovacao do Fundador
     |
     v
[DEV] Implementa baseado no design aprovado
     |
     v
[QA] Testa -> Reporta bugs -> Dev corrige
     |
     v
[DOCS] Documenta o que foi feito, atualiza TASKS.md
     |
     v
ENTREGA
```

---

## SISTEMA DE GATES (Aprovacao)

Gates sao pontos onde o trabalho PARA e aguarda decisao do fundador.

| Gate | Quando | Agente Responsavel |
|------|--------|--------------------|
| GATE-1 | Antes de qualquer implementacao | CEO apresenta plano |
| GATE-2 | Antes de codificar (design aprovado?) | Design entrega mockup |
| GATE-3 | Antes de deploy (QA aprovado?) | QA libera ou bloqueia |

---

## ESTRUTURA DE TASKS

Todo trabalho e registrado em `TASKS.md` com o formato:

```
TASK-001 | [AGENTE] | STATUS | Data Inicio | Data Fim | Descricao
```

Status: `PLANEJANDO` -> `EM ANDAMENTO` -> `AGUARDANDO APROVACAO` -> `CONCLUIDO` -> `CANCELADO`

---

## PLATAFORMA LUMI — CONTEXTO BASE (Atualizado 2026-03-31)

**Stack:** React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + Radix UI (shadcn)
**Roteamento:** React Router v6
**Estado:** React Query + Supabase (migrado de localStorage em 2026-03-29)
**Backend:** Supabase PostgreSQL (project `gdbkbeurjjtjgmrmfngk`) — 22 tabelas + RLS
**Auth:** Supabase Auth (login/cadastro/sessao persistente/rotas protegidas)
**Media (planejado):** Cloudflare R2 para videos e imagens
**Email (planejado):** Resend para emails transacionais
**Pagamentos (planejado):** Stripe/Ticto webhooks
**Idioma:** Portugues Brasileiro
**Cor Principal:** Lumi Teal `#00C2CB`
**Publico Admin:** Produtores de conteudo (fotografos, criadores)
**Publico Aluno:** Estudantes consumindo cursos e comunidade

**Concorrentes a Monitorar:**
- MemberKit: https://memberkit.com.br/
- Cademi: https://cademi.com.br/
- Circle: https://circle.so/

---

## FERRAMENTAS MCP DISPONIVEIS

O ecossistema tem acesso a ferramentas MCP que potencializam os agentes:

| MCP Server | Ferramentas | Agentes que Usam |
|------------|-------------|-----------------|
| **Supabase** | `execute_sql`, `apply_migration`, `list_tables`, `get_logs`, `list_migrations`, `generate_typescript_types` | DEV, QA, DOCS |
| **Playwright** | `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_fill_form`, `browser_take_screenshot` | RESEARCH, QA, DESIGN |
| **Cloudflare** | `workers_list`, `r2_bucket_create`, `d1_database_query`, `kv_namespace_create` | DEV |
| **Vercel** | `deploy_to_vercel`, `list_deployments`, `get_deployment_build_logs`, `get_runtime_logs` | DEV, QA |
| **Context7** | `resolve-library-id`, `query-docs` | RESEARCH, DEV, SKILL |

**IMPORTANTE:** O MCP Supabase esta conectado a uma conta diferente e **nao acessa `gdbkbeurjjtjgmrmfngk`**. Para DDL/SQL no projeto Lumi, usar `curl` com service role key do `.env`.

---

## SKILLS REAIS POR AGENTE

Cada agente tem acesso a skills especificas do sistema. **Apenas skills que existem no ambiente estao listadas aqui.**

### CEO — Estrategia & Coordenacao
| Skill | Quando Usar |
|-------|-------------|
| `superpowers:brainstorming` | Antes de qualquer decisao criativa ou feature nova |
| `superpowers:writing-plans` | Planejar implementacao multi-step |
| `superpowers:executing-plans` | Executar planos escritos |
| `superpowers:dispatching-parallel-agents` | Quando ha 2+ tasks independentes |
| `feature-dev:feature-dev` | Orquestrar desenvolvimento guiado de feature |
| `task-management` | Gerenciar tasks em TASKS.md |
| `memory-management` | Salvar contexto entre sessoes |

### Research — Pesquisa & Inteligencia
| Skill | Quando Usar |
|-------|-------------|
| `superpowers:brainstorming` | Explorar espacos de solucao antes de pesquisar |
| **Playwright MCP** | Navegar plataformas concorrentes (Cademi, Circle, MemberKit) |
| **Context7 MCP** | Buscar documentacao tecnica de libraries |

### Design — UI/UX
| Skill | Quando Usar |
|-------|-------------|
| `frontend-design` | Gerar interfaces production-grade |
| `theme-factory` | Aplicar e criar temas visuais |
| `superpowers:brainstorming` | Explorar opcoes de design antes de decidir |
| **Playwright MCP** | Capturar screenshots de referencia |

### Dev — Desenvolvimento
| Skill | Quando Usar |
|-------|-------------|
| `superpowers:test-driven-development` | TDD para features e bugfixes |
| `superpowers:systematic-debugging` | Debug de bugs complexos |
| `superpowers:writing-plans` | Planejar implementacao antes de codar |
| `superpowers:verification-before-completion` | Verificar antes de declarar pronto |
| `superpowers:using-git-worktrees` | Isolar feature work |
| `feature-dev:feature-dev` | Desenvolvimento guiado de feature |
| `claude-api` | Integracoes com API Claude/Anthropic |
| `pdf` | Gerar PDFs (certificados, relatorios) |
| **Supabase MCP** | Queries SQL, migrations, types |
| **Cloudflare MCP** | Upload R2, Workers |
| **Vercel MCP** | Deploy e logs |
| **Context7 MCP** | Documentacao de libraries |

### Skill — Criacao de Skills
| Skill | Quando Usar |
|-------|-------------|
| `skill-creator` | Criar e otimizar skills |
| `skill-development` | Estruturar skills para plugins |
| `claude-automation-recommender` | Recomendar automacoes para o projeto |
| **Context7 MCP** | Pesquisar docs para embasar skills |

### QA — Qualidade
| Skill | Quando Usar |
|-------|-------------|
| `superpowers:verification-before-completion` | Verificar ANTES de declarar aprovado |
| `superpowers:systematic-debugging` | Debug de bugs dificeis |
| `code-review:code-review` | Code review de PRs |
| `superpowers:requesting-code-review` | Solicitar review estruturado |
| **Playwright MCP** | Testes de browser automatizados |
| **Supabase MCP** | Verificar dados no banco |
| **Vercel MCP** | Verificar build logs e runtime errors |

### Docs — Documentacao
| Skill | Quando Usar |
|-------|-------------|
| `claude-md-management:revise-claude-md` | Atualizar CLAUDE.md apos mudancas |
| `claude-md-management:claude-md-improver` | Auditar qualidade do CLAUDE.md |
| `task-management` | Gerenciar TASKS.md |
| `memory-management` | Persistir conhecimento entre sessoes |
| `pdf` | Gerar relatorios em PDF |

---

## PRINCIPIOS DO ECOSSISTEMA

1. **Qualidade > Velocidade** — Melhor fazer certo do que fazer rapido
2. **Admin primeiro** — Se o admin sofre, o aluno sofre
3. **Design moderno e clean** — Sem poluicao visual, sem cliques desnecessarios
4. **Transparencia total** — Qualquer agente explica o que fez e por que
5. **Nada sem aprovacao** — Decisoes de produto sempre passam pelo fundador
6. **Documentar tudo** — Se nao esta no TASKS.md, nao aconteceu
7. **Supabase e a fonte de verdade** — Dados no banco, nao em localStorage
8. **Verificar antes de entregar** — Nenhuma entrega sem evidencia de que funciona
