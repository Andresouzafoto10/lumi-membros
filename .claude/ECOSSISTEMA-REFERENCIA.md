# Ecossistema Lumi Membros — Referência Rápida

## Times de Agentes

| Time | Cor | Composição | Quando Ativar |
|------|-----|-----------|---------------|
| **ALPHA** | 🟦 | CEO + RESEARCH | Feature nova, pesquisa, decisão de produto |
| **BETA** | 🟩 | DESIGN + DEV + SKILL | Feature aprovada para implementação |
| **GAMMA** | 🟨 | QA + DOCS | Feature entregue, bug reportado |
| **DELTA** | 🟥 | CEO + DEV + QA | Emergência, plataforma caiu |

---

## Agentes

| Agente | Arquivo | Função |
|--------|---------|--------|
| 👑 **LUMI-CEO** | `01_CEO-AGENT.md` | Estratégia, roteamento automático, orquestração de times |
| 🔍 **LUMI-RESEARCH** | `02_RESEARCH-AGENT.md` | Pesquisa de concorrentes, benchmarks, inteligência de produto |
| 🎨 **LUMI-DESIGN** | `03_DESIGN-AGENT.md` | UI/UX, especificação visual, design system |
| 💻 **LUMI-DEV** | `04_DEV-AGENT.md` | Código React/TS, integrações backend, implementação |
| 🛠️ **LUMI-SKILL** | `05_SKILL-AGENT.md` | Criação e manutenção de skills reutilizáveis |
| ✅ **LUMI-QA** | `06_QA-AGENT.md` | Testes, validação de qualidade, revisão de UX |
| 📋 **LUMI-DOCS** | `07_DOCS-AGENT.md` | Documentação, rastreamento de tasks, changelog |

### Skills por Agente

| Agente | Skills Principais |
|--------|-----------------|
| CEO | `superpowers:brainstorming`, `writing-plans`, `executing-plans`, `dispatching-parallel-agents`, `task-management`, `memory-management` |
| RESEARCH | `superpowers:brainstorming`, Playwright MCP, Context7 MCP |
| DESIGN | `frontend-design`, `theme-factory`, `superpowers:brainstorming`, Playwright MCP |
| DEV | `superpowers:test-driven-development`, `systematic-debugging`, `writing-plans`, `verification-before-completion`, `feature-dev:feature-dev`, Supabase MCP, Vercel MCP |
| SKILL | `skill-creator`, `skill-development`, `claude-automation-recommender`, Context7 MCP |
| QA | `verification-before-completion`, `systematic-debugging`, `code-review:code-review`, Playwright MCP |
| DOCS | `claude-md-management`, `task-management`, `memory-management` |

---

## Skills Instaladas

### Superpowers (framework de desenvolvimento)

| Skill | Para que serve |
|-------|---------------|
| `superpowers:brainstorming` | Estrutura criativa antes de qualquer feature ou implementação |
| `superpowers:writing-plans` | Cria plano detalhado de implementação antes de codificar |
| `superpowers:executing-plans` | Executa plano existente em worktree isolado |
| `superpowers:test-driven-development` | TDD — escreve testes antes do código |
| `superpowers:systematic-debugging` | Debugar bugs de forma estruturada e metódica |
| `superpowers:verification-before-completion` | Verifica se tudo está correto antes de declarar "pronto" |
| `superpowers:dispatching-parallel-agents` | Lança múltiplos agentes em paralelo para tarefas independentes |
| `superpowers:subagent-driven-development` | Executa planos com tarefas independentes via subagentes |
| `superpowers:using-git-worktrees` | Isola features em worktrees Git separados |
| `superpowers:finishing-a-development-branch` | Finaliza branch, prepara para merge/PR |
| `superpowers:requesting-code-review` | Solicita code review estruturado |
| `superpowers:receiving-code-review` | Implementa feedback de code review |
| `superpowers:writing-skills` | Cria ou edita skills do Claude Code |
| `superpowers:using-superpowers` | Introdução ao sistema — como encontrar e usar skills |

### Frontend & Design

| Skill | Para que serve |
|-------|---------------|
| `frontend-design` | Cria interfaces production-grade com alta qualidade visual |
| `theme-factory` | Aplica temas em artifacts (slides, dashboards, UIs) |
| `web-perf` | Analisa performance web via Chrome DevTools MCP |

### Cloudflare

| Skill | Para que serve |
|-------|---------------|
| `cloudflare` | Workers, Pages, storage (R2, KV, D1), geral |
| `wrangler` | CLI do Cloudflare: deploy, dev local, gerenciar Workers |
| `durable-objects` | Cria Durable Objects para estado persistente em Workers |
| `workers-best-practices` | Revisa Workers contra melhores práticas de produção |
| `building-mcp-server-on-cloudflare` | Constrói servidores MCP remotos no Cloudflare |
| `building-ai-agent-on-cloudflare` | Constrói agentes AI com estado no Cloudflare |
| `agents-sdk` | Constrói agentes AI no Cloudflare Workers (Agents SDK) |

### Claude API & AI

| Skill | Para que serve |
|-------|---------------|
| `claude-api` | Constrói apps com a Claude API / Anthropic SDK |
| `sandbox-sdk` | Execução segura de código em sandboxes |

### Supabase

| Skill | Para que serve |
|-------|---------------|
| `supabase-postgres-best-practices` | Otimização de performance Postgres via Supabase |

### Produtividade & Processo

| Skill | Para que serve |
|-------|---------------|
| `task-management` | Gerencia tasks em TASKS.md compartilhado |
| `memory-management` | Sistema de memória persistente entre conversas |
| `skill-development` | Cria e mantém skills do Claude Code |
| `skill-creator` | Cria skills, mede qualidade, melhora existentes |
| `claude-automation-recommender` | Recomenda automações Claude Code para o projeto |
| `plugin-settings` | Configura settings de plugins |
| `pdf` | Qualquer operação com arquivos PDF |

---

## MCP Servers (Plugins)

| Plugin | Para que serve |
|--------|---------------|
| **Supabase MCP** | Queries SQL, migrações, edge functions, logs — direto no banco |
| **Vercel MCP** | Deploy, logs de build/runtime, domínios, threads de toolbar |
| **Playwright MCP** | Browser automation: screenshots, cliques, navegação, testes E2E |
| **Context7 MCP** | Busca documentação atualizada de qualquer lib/framework/SDK |
| **Pinecone MCP** | Vector database: upsert, busca semântica, rerank de documentos |
| **Resend MCP** | Envio de emails, templates, broadcasts, domínios, contatos |
| **DocuSeal MCP** | Geração e assinatura de documentos digitais |

---

## Atalhos do Fundador

| Comando | Ação |
|---------|------|
| `status` | CEO mostra tasks em andamento e recomendação |
| `proximo` | CEO prioriza backlog e sugere próxima ação |
| `bug: [X]` | Roteamento direto para TIME GAMMA |
| `feature: [X]` | Roteamento para ALPHA ou BETA |
| `melhoria: [X]` | Roteamento direto para BETA |
| `pesquisa: [X]` | Roteamento para ALPHA (só Research) |
| `urgente: [X]` | Roteamento para TIME DELTA |
| `testar [X]` | Aciona QA diretamente |

---

## Tipos de Demanda (Classificação do CEO)

| Tipo | Nome | Descrição |
|------|------|-----------|
| `TIPO-A` | Feature nova | Algo que não existe na plataforma |
| `TIPO-B` | Melhoria | Algo que existe mas precisa melhorar |
| `TIPO-C` | Bug/Erro | Algo quebrado ou mal funcionando |
| `TIPO-D` | Pesquisa | Precisa de dados antes de decidir |
| `TIPO-E` | Organizacional | Tasks, docs, skills, processo |
| `TIPO-F` | Emergência | Plataforma caiu, bug crítico |

---

*Gerado em 2026-04-07 — atualizar sempre que novos agentes/skills/plugins forem adicionados.*
