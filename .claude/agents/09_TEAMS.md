# 🏟️ LUMI MEMBROS — TIMES DE AGENTES
**Arquivo:** `09_TEAMS.md` | **Versão:** 1.0.0 | **Atualizado:** 2026-03-29

---

## VISÃO GERAL

Os agentes Lumi se organizam em **4 times especializados** que são ativados conforme o tipo de demanda. Cada time tem um gatilho claro, uma sequência de handoff definida e um output esperado. Os times não são fixos — agentes podem participar de múltiplos times conforme necessidade.

---

## TIME ALPHA — Descoberta

**Composição:** 👑 LUMI-CEO + 🔍 LUMI-RESEARCH
**Cor:** 🟦 Azul

### Gatilho de Ativação
- Nova feature request do fundador
- Pesquisa de concorrente solicitada
- Decisão de produto que precisa de dados
- Exploração de nova área de mercado
- "Como o concorrente X faz Y?"

### Sequência de Handoff

```
FUNDADOR → ideia/pergunta
     │
     ▼
[CEO] Analisa a demanda
  - Classifica impacto/esforço/urgência
  - Define escopo da pesquisa
  - Cria TASK-XXX tipo RESEARCH
     │
     ▼
[RESEARCH] Executa pesquisa
  - Acessa plataformas concorrentes
  - Mapeia fluxos e funcionalidades
  - Documenta insights com evidências
     │
     ▼
[CEO] Consolida e recomenda
  - Analisa relatório do Research
  - Prioriza insights acionáveis
  - Apresenta plano ao fundador
     │
     ▼
🔴 GATE-1: Fundador aprova direção
     │
     ▼
OUTPUT → Brief para TIME BETA (construção)
```

### Output Esperado
- Relatório de pesquisa estruturado (template RESEARCH)
- Mapa comparativo atualizado (Lumi vs concorrentes)
- Recomendação com priorização (impacto × esforço)
- TASK-XXX criadas para o TIME BETA

### Skills Utilizadas
| Agente | Skills |
|--------|--------|
| CEO | `/product-marketing-context`, `/marketing-ideas`, `/pricing-strategy`, `/launch-strategy` |
| RESEARCH | `/seo-audit`, `/web-perf`, `/competitor-alternatives`, `/content-strategy`, `/site-architecture` |

---

## TIME BETA — Construção

**Composição:** 🎨 LUMI-DESIGN + 💻 LUMI-DEV + 🛠️ LUMI-SKILL
**Cor:** 🟩 Verde

### Gatilho de Ativação
- Feature aprovada pelo fundador (GATE-1 passou)
- Design brief pronto para implementar
- Integração técnica aprovada (Supabase, R2, Stripe)
- Skill nova precisa ser criada para suportar a feature

### Sequência de Handoff

```
GATE-1 aprovado → Brief do TIME ALPHA
     │
     ▼
[DESIGN] Propõe solução visual
  - Especificação UI/UX completa
  - Componentes, estados, micro-interações
  - Perguntas para o fundador
     │
     ▼
🔴 GATE-2: Fundador aprova design
     │
     ▼
[SKILL] (se necessário) Cria skills de suporte
  - Templates de componente
  - Padrões de integração
  - Guias técnicos
     │
     ▼
[DEV] Implementa
  - Código seguindo brief do Design
  - Usa skills criadas pelo SKILL
  - Segue padrões da codebase
  - Entrega com handoff para QA
     │
     ▼
OUTPUT → Feature implementada para TIME GAMMA
```

### Output Esperado
- Proposta de design aprovada (template DESIGN)
- Skills técnicas criadas (se necessário)
- Código implementado e testável
- Handoff completo para QA (fluxos a testar, edge cases)

### Skills Utilizadas
| Agente | Skills |
|--------|--------|
| DESIGN | `/frontend-design`, `/ui-ux-pro-max`, `/accessibility-audit`, `/page-cro`, `/onboarding-cro` |
| DEV | `/supabase-postgres-best-practices`, `/stripe-best-practices`, `/pdf`, `/cloudflare`, `/smart-fix`, `/refactor-clean`, `/api-scaffold`, `/tdd-cycle` |
| SKILL | `/skill-creator`, `/find-skills`, `/prompt-optimize`, `/code-explain` |

---

## TIME GAMMA — Qualidade

**Composição:** ✅ LUMI-QA + 📋 LUMI-DOCS
**Cor:** 🟨 Amarelo

### Gatilho de Ativação
- Feature entregue pelo DEV (TIME BETA concluiu)
- Bug corrigido e precisa de verificação
- Release candidate pronto para validação
- Documentação precisa ser atualizada após entrega

### Sequência de Handoff

```
TIME BETA entrega → Feature implementada
     │
     ▼
[QA] Testa tudo
  - Funcionalidade (happy path + edge cases)
  - Visual e design system
  - Responsividade (mobile/tablet/desktop)
  - Acessibilidade
  - Performance
  - Segurança básica
     │
     ├── Se bugs CRÍTICOS → volta ao DEV (TIME BETA)
     │
     ▼ (se aprovado)
🔴 GATE-3: Fundador vê resultado final
     │
     ▼
[DOCS] Documenta
  - Atualiza TASKS.md (status CONCLUÍDO)
  - Adiciona ao CHANGELOG.md
  - Registra decisões em DECISIONS.md
  - Atualiza CLAUDE.md se arquitetura mudou
     │
     ▼
OUTPUT → Feature documentada e entregue ✅
```

### Output Esperado
- Relatório de QA (aprovado/bloqueado/com ressalvas)
- Bugs classificados por severidade (se houver)
- TASKS.md atualizado
- CHANGELOG.md atualizado
- Documentação técnica atualizada

### Skills Utilizadas
| Agente | Skills |
|--------|--------|
| QA | `/accessibility-audit`, `/web-perf`, `/security-scan`, `/error-analysis`, `/full-review`, `/multi-agent-review`, `/test-harness` |
| DOCS | `/doc-generate`, `/pdf`, `/standup-notes`, `/pr-enhance`, `/git-workflow`, `/context-save` |

---

## TIME DELTA — Emergência

**Composição:** 👑 LUMI-CEO + 💻 LUMI-DEV + ✅ LUMI-QA
**Cor:** 🟥 Vermelho

### Gatilho de Ativação
- Bug crítico em produção (plataforma quebrada)
- Regressão após deploy (feature que funcionava parou)
- Problema de segurança identificado
- Fundador reporta urgência máxima
- Dados corrompidos ou perdidos

### Sequência de Handoff

```
🚨 ALERTA: Bug crítico identificado
     │
     ▼
[CEO] Triagem imediata (< 5 min)
  - Classifica severidade
  - Identifica impacto (quantos usuários afetados)
  - Define se é rollback ou hotfix
     │
     ▼
[DEV] Diagnóstico e correção (< 30 min)
  - Identifica root cause
  - Implementa fix mínimo
  - NÃO refatora, NÃO melhora — só corrige
     │
     ▼
[QA] Verificação rápida (< 15 min)
  - Confirma que bug foi resolvido
  - Testa regressão mínima
  - Não faz QA completo — só validação do fix
     │
     ▼
[CEO] Decide deploy
  - Aprova ou bloqueia
  - Comunica ao fundador
     │
     ▼
OUTPUT → Fix deployado + post-mortem agendado
```

### Output Esperado
- Root cause identificado
- Fix mínimo implementado e verificado
- Post-mortem breve (o que quebrou, por quê, como prevenir)
- BUGS.md atualizado
- TASK de melhoria criada (para evitar recorrência)

### Skills Utilizadas
| Agente | Skills |
|--------|--------|
| CEO | `/incident-response`, `/context-save` |
| DEV | `/smart-debug`, `/smart-fix`, `/error-analysis`, `/security-scan` |
| QA | `/error-analysis`, `/config-validate`, `/test-harness` |

### Regras Especiais do TIME DELTA
1. **SLA:** Triagem em 5 min, fix em 30 min, verificação em 15 min
2. **Sem gates:** CEO pode autorizar deploy direto sem fundador (apenas para hotfix)
3. **Escopo mínimo:** Fix APENAS o bug, nada mais
4. **Post-mortem obrigatório:** Após resolver, documentar o que aconteceu
5. **Criar TASK preventiva:** Sempre gerar task para evitar recorrência

---

## REGRAS GERAIS DOS TIMES

### Ativação
- Apenas o **CEO** ou o **Fundador** ativam times
- Um time pode ser ativado enquanto outro está em andamento (ex: DELTA interrompe BETA)
- TIME DELTA tem prioridade sobre todos os outros

### Comunicação entre Times
- O handoff entre times SEMPRE passa pelo CEO
- O output de um time é o input do próximo
- Se um time está bloqueado, o CEO redireciona

### Métricas por Time
| Time | Métrica Principal | Meta |
|------|------------------|------|
| ALPHA | Tempo de descoberta → decisão | < 2 dias |
| BETA | Tempo de design → código entregue | < 5 dias |
| GAMMA | Tempo de QA → documentação | < 2 dias |
| DELTA | Tempo de alerta → fix deployado | < 1 hora |

### Diagrama de Fluxo entre Times

```
              ┌─────────────────────────────────┐
              │                                 │
              │         🟥 TIME DELTA           │
              │      (Emergência — a qualquer   │
              │       momento interrompe tudo)   │
              │                                 │
              └─────────────────────────────────┘
                          ▲ 🚨
                          │
┌──────────┐    ┌──────────┐    ┌──────────┐
│ 🟦 ALPHA │───▶│ 🟩 BETA  │───▶│ 🟨 GAMMA │
│ Descoberta│    │Construção│    │Qualidade │
│           │    │          │    │          │
│ CEO +     │    │ DESIGN + │    │ QA +     │
│ RESEARCH  │    │ DEV +    │    │ DOCS     │
│           │    │ SKILL    │    │          │
└──────────┘    └──────────┘    └──────────┘
     │               ▲               │
     │               │               │
     └───── GATE-1 ──┘               │
                                     │
              ┌──── GATE-2 ──────────┘
              │
              ▼
         ✅ ENTREGA
```
