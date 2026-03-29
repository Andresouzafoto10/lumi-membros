# 🏛️ LUMI MEMBROS — ECOSSISTEMA DE AGENTES DE IA
**Versão:** 1.0.0 | **Criado:** 2026-03-29 | **Atualizado:** 2026-03-29

---

## VISÃO GERAL

O ecossistema Lumi é um time de agentes especializados que trabalham em cadeia para evoluir a plataforma de área de membros. Cada agente tem uma função clara, um gatilho de ativação e um output definido. Nenhum agente age sozinho em decisões críticas — tudo passa por **gates de aprovação** do fundador.

---

## 🗂️ HIERARQUIA DO TIME

```
┌─────────────────────────────────────────┐
│         🚀 GATEWAY (10_GATEWAY.md)      │
│   Ponto único de entrada do fundador    │
└──────��───────┬──────────���───────────────┘
               │
┌──────────────▼──────────────────────────┐
│           👑 LUMI-CEO                   │
│   Comandante / Auto-Router / Orquestrador│
│   Classifica → Roteia → Ativa Times     │
└─���────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼───────┐    ┌────────▼──────┐
│ LUMI-     │    │  LUMI-        │
│ RESEARCH  │    │  SKILL        │
│ Pesquisa  │    │  Criador de   │
│ & Intel.  │    │  Skills/Tools │
└───┬───────┘    └────────┬──────┘
    │                     │
┌───▼───────┐    ┌────────▼──────┐
│ LUMI-     │    │  LUMI-        │
│ DESIGN    │    │  DEV          │
│ UI/UX     │    │  Full-stack   │
│ Designer  │    │  Developer    │
└───┬───────┘    └────────┬──────┘
    │                     │
    └──────────┬──────────┘
               │
         ┌─────▼──────┐
         │  LUMI-QA   │
         │  Quality   │
         │  Assurance │
         └─────┬──────┘
               │
         ┌─────▼──────┐
         │  LUMI-DOCS │
         │  Documenta │
         │  & Rastreia│
         └────────────┘
```

---

## 🤖 AGENTES E ARQUIVOS

| Agente | Arquivo | Função Principal |
|--------|---------|-----------------|
| 🚀 Gateway | `10_GATEWAY.md` | Prompt único de entrada — cole e use |
| 👑 CEO | `01_CEO-AGENT.md` | Estratégia, auto-routing, orquestração de times |
| 🔍 Research | `02_RESEARCH-AGENT.md` | Concorrentes, UX, benchmarks |
| 🎨 Design | `03_DESIGN-AGENT.md` | UI/UX, design system, componentes |
| 💻 Dev | `04_DEV-AGENT.md` | Código React/TS, integrações |
| 🛠️ Skill | `05_SKILL-AGENT.md` | Criar/melhorar skills e automações |
| ✅ QA | `06_QA-AGENT.md` | Testes, bugs, experiência final |
| 📋 Docs | `07_DOCS-AGENT.md` | Documentar, rastrear tarefas, datas |

---

## 🔄 FLUXO DE TRABALHO PADRÃO

```
DEMANDA ENTRA
     │
     ▼
[CEO] Analisa → Prioriza → Decompõe em Tasks
     │
     ▼
[CEO] Aciona o primeiro agente da cadeia
     │
     ▼
[RESEARCH] (se necessário) → Entrega brief
     │
     ▼
[DESIGN] Propõe solução visual → 🔴 GATE: Aprovação do Fundador
     │
     ▼
[DEV] Implementa baseado no design aprovado
     │
     ▼
[QA] Testa → Reporta bugs → Dev corrige
     │
     ▼
[DOCS] Documenta o que foi feito, atualiza TASKS.md
     │
     ▼
✅ ENTREGA
```

---

## 🚦 SISTEMA DE GATES (Aprovação)

Gates são pontos onde o trabalho PARA e aguarda decisão do fundador.

| Gate | Quando | Agente Responsável |
|------|--------|--------------------|
| 🔴 GATE-1 | Antes de qualquer implementação | CEO apresenta plano |
| 🟡 GATE-2 | Antes de codificar (design aprovado?) | Design entrega mockup |
| 🟢 GATE-3 | Antes de deploy (QA aprovado?) | QA libera ou bloqueia |

---

## 📁 ESTRUTURA DE TASKS

Todo trabalho é registrado em `TASKS.md` com o formato:

```
TASK-001 | [AGENTE] | STATUS | Data Início | Data Fim | Descrição
```

Status: `🔵 PLANEJANDO` → `🟡 EM ANDAMENTO` → `🔴 AGUARDANDO APROVAÇÃO` → `✅ CONCLUÍDO` → `❌ CANCELADO`

---

## 🏗️ PLATAFORMA LUMI — CONTEXTO BASE

**Stack:** React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + Radix UI (shadcn)
**Roteamento:** React Router v6
**Estado:** useSyncExternalStore + localStorage (sem backend ainda)
**Backend Planejado:** Supabase (DB/Auth) + Cloudflare R2 (mídia) + Resend (email) + Stripe/Ticto
**Idioma:** Português Brasileiro
**Cor Principal:** Lumi Teal `#00C2CB`
**Público Admin:** Produtores de conteúdo (fotógrafos, criadores)
**Público Aluno:** Estudantes consumindo cursos e comunidade

**Concorrentes a Monitorar:**
- MemberKit: https://memberkit.com.br/
- Cademi: https://cademi.com.br/
- Circle: https://circle.so/

---

## 🔧 MAPA DE SKILLS POR AGENTE

Cada agente tem acesso a skills específicas do sistema (slash commands). Use o agente correto para a skill desejada.

### 👑 CEO — Estratégia & Coordenação
| Skill | Comando |
|-------|---------|
| Standup Notes | `/standup-notes` |
| Prompt Optimize | `/prompt-optimize` |
| Context Save/Restore | `/context-save`, `/context-restore` |
| Feature Development | `/feature-development` |
| Full-Stack Feature | `/full-stack-feature` |
| Incident Response | `/incident-response` |
| Marketing Ideas | `/marketing-ideas` |
| Pricing Strategy | `/pricing-strategy` |
| Launch Strategy | `/launch-strategy` |
| Product Marketing Context | `/product-marketing-context` |

### 🔍 Research — Pesquisa & Inteligência
| Skill | Comando |
|-------|---------|
| SEO Audit | `/seo-audit` |
| Web Performance | `/web-perf` |
| Competitor Alternatives | `/competitor-alternatives` |
| Content Strategy | `/content-strategy` |
| Analytics Tracking | `/analytics-tracking` |
| AI SEO | `/ai-seo` |
| Programmatic SEO | `/programmatic-seo` |
| Site Architecture | `/site-architecture` |

### 🎨 Design — UI/UX
| Skill | Comando |
|-------|---------|
| Frontend Design | `/frontend-design` |
| UI/UX Pro Max | `/ui-ux-pro-max` |
| Accessibility Audit | `/accessibility-audit` |
| Page CRO | `/page-cro` |
| Signup Flow CRO | `/signup-flow-cro` |
| Onboarding CRO | `/onboarding-cro` |
| Form CRO | `/form-cro` |
| Schema Markup | `/schema-markup` |

### 💻 Dev — Desenvolvimento
| Skill | Comando |
|-------|---------|
| PDF Generation | `/pdf` |
| Supabase Best Practices | `/supabase-postgres-best-practices` |
| Stripe Best Practices | `/stripe-best-practices` |
| Refactor Clean | `/refactor-clean` |
| Deps Audit/Upgrade | `/deps-audit`, `/deps-upgrade` |
| TDD Cycle | `/tdd-cycle`, `/tdd-red`, `/tdd-green` |
| Test Harness | `/test-harness` |
| API Scaffold | `/api-scaffold` |
| Smart Fix/Debug | `/smart-fix`, `/smart-debug` |
| Security Scan | `/security-scan` |
| Deploy Checklist | `/deploy-checklist` |
| Cloudflare | `/cloudflare` |
| Claude API | `/claude-api` |
| Doc Generate | `/doc-generate` |

### 🛠️ Skill — Criação de Skills
| Skill | Comando |
|-------|---------|
| Skill Creator | `/skill-creator` |
| Find Skills | `/find-skills` |
| Prompt Optimize | `/prompt-optimize` |
| Code Explain | `/code-explain` |
| Doc Generate | `/doc-generate` |

### ✅ QA — Qualidade
| Skill | Comando |
|-------|---------|
| Accessibility Audit | `/accessibility-audit` |
| Web Performance | `/web-perf` |
| Security Scan | `/security-scan` |
| Error Analysis | `/error-analysis` |
| Smart Debug | `/smart-debug` |
| Test Harness | `/test-harness` |
| Config Validate | `/config-validate` |
| Deps Audit | `/deps-audit` |
| Multi-Agent Review | `/multi-agent-review` |
| Full Review | `/full-review` |

### 📋 Docs — Documentação
| Skill | Comando |
|-------|---------|
| Doc Generate | `/doc-generate` |
| PDF Generation | `/pdf` |
| Standup Notes | `/standup-notes` |
| Code Explain | `/code-explain` |
| PR Enhance | `/pr-enhance` |
| Git Workflow | `/git-workflow` |
| Context Save/Restore | `/context-save`, `/context-restore` |

---

## 📐 PRINCÍPIOS DO ECOSSISTEMA

1. **Qualidade > Velocidade** — Melhor fazer certo do que fazer rápido
2. **Admin primeiro** — Se o admin sofre, o aluno sofre
3. **Design moderno e clean** — Sem poluição visual, sem cliques desnecessários
4. **Transparência total** — Qualquer agente explica o que fez e por quê
5. **Nada sem aprovação** — Decisões de produto sempre passam pelo fundador
6. **Documentar tudo** — Se não está no TASKS.md, não aconteceu