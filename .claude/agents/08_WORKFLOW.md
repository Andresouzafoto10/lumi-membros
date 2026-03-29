# 🔄 LUMI MEMBROS — GUIA DE WORKFLOW DOS AGENTES
**Arquivo:** `08_WORKFLOW.md` | **Versão:** 2.0.0 | **Atualizado:** 2026-03-29

---

## PONTO ÚNICO DE ENTRADA: O CEO

**Toda demanda entra pelo CEO.** Você não precisa saber qual agente ou time acionar — o CEO faz isso automaticamente.

### Como usar (simples)

```
Você fala → CEO classifica → Time é ativado → Agentes trabalham → Entrega
```

Basta enviar sua demanda. O CEO vai:
1. Classificar o tipo (feature, bug, melhoria, pesquisa, emergência)
2. Selecionar o time correto (ALPHA, BETA, GAMMA, DELTA)
3. Definir a sequência de agentes
4. Atribuir quem verifica qualidade
5. Gerar as tasks automaticamente

---

## COMO INICIAR UMA SESSÃO

### Opção 1: Prompt Gateway (recomendado)

Use o arquivo `10_GATEWAY.md` como system prompt ou cole no início do chat:

```
"[Cole o conteúdo de 10_GATEWAY.md]"

Depois digite sua demanda normalmente:
"Quero adicionar um sistema de quiz nas aulas"
```

O CEO vai automaticamente classificar, rotear e iniciar a execução.

### Opção 2: Ativação direta por tipo

Se você já sabe o tipo da demanda:

```
"LUMI-CEO, nova feature: [descreva a feature]"
"LUMI-CEO, bug encontrado: [descreva o problema]"
"LUMI-CEO, pesquisar: [o que quer saber sobre concorrente]"
"LUMI-CEO, emergência: [o que está quebrado]"
"LUMI-CEO, melhorar: [o que precisa melhorar]"
```

### Opção 3: Ativação de agente específico

Se você precisa de um agente diretamente (o CEO ainda supervisiona):

```
"Ative LUMI-RESEARCH para pesquisar [X]"
"Ative LUMI-DESIGN para propor [X]"
"Ative LUMI-DEV para implementar [X]"
"Ative LUMI-QA para testar [X]"
```

---

## FLUXO 0: AUTO-ROUTING (CEO COMO GATEWAY)

Este é o fluxo principal que governa todos os outros:

```
QUALQUER DEMANDA DO FUNDADOR
         │
         ▼
   ┌─────────────────────────┐
   │     👑 CEO RECEBE       │
   │                         │
   │  1. Lê TASKS.md        │
   │  2. Classifica tipo     │
   │  3. Avalia urgência     │
   │  4. Seleciona time      │
   │  5. Define sequência    │
   │  6. Gera tasks          │
   └────────────┬────────────┘
                │
    ┌───────────┼───────────┬──────────┐
    ▼           ▼           ▼          ▼
 TIPO-A/D    TIPO-B/E    TIPO-C     TIPO-F
 Feature     Melhoria    Bug        Emergência
 Pesquisa    Organiz.    Erro       Caiu tudo
    │           │           │          │
    ▼           ▼           ▼          ▼
 🟦 ALPHA    🟩 BETA    🟨 GAMMA   🟥 DELTA
    │           │           │          │
    ▼           ▼           ▼          ▼
 RESEARCH    DESIGN      QA         DEV+QA
 → CEO       → DEV       → DEV      (paralelo)
 → GATE-1    → QA        → QA       → CEO
 → BETA      → DOCS      → DOCS     → DOCS
```

### Regras do Auto-Routing

1. **CEO SEMPRE consulta TASKS.md antes de rotear** — para verificar dependências e conflitos
2. **CEO SEMPRE gera task antes de ativar time** — nada roda sem registro
3. **CEO decide quem faz QA** baseado na severidade
4. **TIME DELTA cancela qualquer outro time** — emergência é prioridade absoluta
5. **Após cada entrega, CEO verifica se próximo time deve ser ativado**

---

## FLUXO 1: FEATURE NOVA (TIME ALPHA → BETA → GAMMA)

```
FUNDADOR: "Quero [feature nova]"
         │
         ▼
   [CEO] Auto-routing
   Tipo: FEATURE NOVA
   Time inicial: 🟦 ALPHA
         │
         ▼
   [CEO] Avalia: precisa pesquisar?
         │
    ┌────┴────┐
    SIM       NÃO (referência clara)
    │         │
    ▼         ▼
 [RESEARCH]  Pula para GATE-1
  Pesquisa concorrentes
  Entrega relatório
    │
    ▼
 [CEO] Consolida insights
  Monta plano de ação
    │
    ▼
 🔴 GATE-1: "Fundador, o plano é este. Aprova?"
    │ (fundador aprova)
    ▼
 ═══ HANDOFF → TIME 🟩 BETA ═══
    │
 [DESIGN] Propõe solução visual
  Especificação UI/UX completa
    │
    ▼
 🔴 GATE-2: "Fundador, o design é este. Aprova?"
    │ (fundador aprova)
    ▼
 [SKILL] (se necessário) Cria skills de suporte
    │
    ▼
 [DEV] Implementa
  Código + handoff para QA
    │
    ▼
 ═══ HANDOFF → TIME 🟨 GAMMA ═══
    │
 [QA] Testa tudo
    │
    ├── 🐛 Bugs críticos → volta ao DEV
    │
    ▼ (aprovado)
 🔴 GATE-3: "Fundador, está pronto. Confere?"
    │ (fundador aprova)
    ▼
 [DOCS] Documenta (TASKS.md + CHANGELOG.md)
    │
    ▼
 ✅ ENTREGUE
```

---

## FLUXO 2: BUG / MAL FUNCIONAMENTO (TIME GAMMA)

```
FUNDADOR: "[algo] não funciona / está estranho"
         │
         ▼
   [CEO] Auto-routing
   Tipo: BUG
   Time: 🟨 GAMMA
   Severidade: [CEO classifica]
         │
         ▼
   [CEO] Decide sequência baseado na severidade:
         │
    ┌────┴──────────────┬──────────────────┐
    🔴 CRÍTICO          🟠 ALTO/🟡 MÉDIO   🔵 BAIXO
    │                   │                   │
    ▼                   ▼                   ▼
  [QA] Diagnostica    [QA] Diagnostica    [DEV] Corrige
  [DEV] Fix urgente   [DEV] Corrige       [DEV] Auto-verifica
  [QA] Verifica       [QA] Verifica       [DOCS] Registra
  [CEO] Valida        [DOCS] Registra
  [DOCS] Registra
```

### O que o CEO observa para detectar bugs

| O que o fundador diz | CEO interpreta como | Ação |
|----------------------|---------------------|------|
| "não funciona" | Bug confirmado | QA diagnostica → DEV corrige |
| "está estranho" / "diferente" | Possível bug | QA investiga primeiro |
| "não era assim" | Regressão | DEV verifica git blame → corrige |
| "está lento" | Performance | DEV usa `/web-perf` para medir |
| "no celular não dá" | Bug mobile | QA audita responsividade |
| "sumiu" / "não aparece" | Bug crítico | TIME DELTA se impacto alto |
| "às vezes funciona" | Bug intermitente | QA reproduz → DEV investiga |

---

## FLUXO 3: EMERGÊNCIA (TIME DELTA)

```
🚨 ALERTA: Plataforma quebrada / Bug crítico
         │
         ▼
   [CEO] Auto-routing IMEDIATO
   Tipo: EMERGÊNCIA
   Time: 🟥 DELTA
   ⏱️ SLA: 1 hora total
         │
         ▼
   [CEO] Para qualquer outro time em andamento
         │
         ├─── [DEV] Diagnóstico (< 10 min)
         │         │
         │         ▼
         │    [DEV] Fix mínimo (< 20 min)
         │         │
         │         ▼
         └─── [QA] Verifica fix (< 15 min)
                   │
                   ▼
              [CEO] Decide: deploy?
                   │
                   ▼ (sim)
              [DOCS] Post-mortem + BUGS.md
                   │
                   ▼
              ✅ RESOLVIDO
              [CEO] Retoma times pausados
```

---

## FLUXO 4: PESQUISA (TIME ALPHA apenas)

```
FUNDADOR: "Como o [concorrente] faz [X]?"
         │
         ▼
   [CEO] Auto-routing
   Tipo: PESQUISA
   Time: 🟦 ALPHA (parcial — só CEO + RESEARCH)
         │
         ▼
   [RESEARCH] Executa pesquisa
   Entrega relatório com insights
         │
         ▼
   [CEO] Analisa e apresenta ao fundador
   Sugere: implementar / adaptar / ignorar
         │
         ▼
   FUNDADOR decide → Se sim, vira FEATURE → FLUXO 1
```

---

## FLUXO 5: MELHORIA (TIME BETA direto)

```
FUNDADOR: "Melhora [X] / Ajusta [Y]"
         │
         ▼
   [CEO] Auto-routing
   Tipo: MELHORIA
   Time: 🟩 BETA
         │
    ┌────┴────┐
    Visual     Código
    │          │
    ▼          ▼
  [DESIGN]   [DEV] direto
  → [DEV]    → [QA]
  → [QA]     → [DOCS]
  → [DOCS]
```

---

## FLUXO 6: ORGANIZAÇÃO INTERNA

```
CEO identifica necessidade OU fundador pede
         │
         ▼
   [CEO] Atribui direto ao agente responsável:
   - Criar skill → SKILL
   - Atualizar docs → DOCS
   - Reorganizar tasks → DOCS
   - Melhorar prompt → SKILL com /prompt-optimize
   - Standup → CEO com /standup-notes
```

---

## TRANSIÇÃO ENTRE TIMES

### O CEO como "dispatcher"

Quando um time termina, o CEO executa automaticamente:

```
1. VERIFICA output do time que terminou
2. CONFERE se há GATE pendente
3. SE GATE → apresenta ao fundador e aguarda
4. SE SEM GATE → ativa próximo time imediatamente
5. ATUALIZA TASKS.md com novo status
6. INFORMA o fundador do progresso
```

### Sinais de que um time terminou

| Time | Sinal de Conclusão | CEO faz |
|------|-------------------|---------|
| ALPHA | RESEARCH entregou relatório | Consolida e apresenta GATE-1 |
| BETA | DEV entregou com handoff | Ativa GAMMA (QA) |
| GAMMA | QA aprovou | Apresenta GATE-3 ao fundador |
| DELTA | QA verificou fix | Confirma deploy e retoma operação |

---

## REGRAS DO ECOSSISTEMA

### O que o Fundador sempre decide:
- ✅ Quais features entram no produto
- ✅ O que é aprovado após cada gate
- ✅ Prioridade entre tasks concorrentes
- ✅ Qualquer mudança de arquitetura ou tecnologia
- ✅ O que vai para produção

### O que o CEO decide sozinho:
- ✅ Qual time ativar (auto-routing)
- ✅ Qual agente executar dentro do time
- ✅ Ordem de prioridade do backlog
- ✅ Quando pausar um time para emergência
- ✅ Quem faz QA de cada entrega

### O que os agentes decidem sozinhos:
- ✅ Como implementar tecnicamente (dentro do padrão)
- ✅ Qual componente usar (dentro do design system)
- ✅ Como estruturar o código (dentro das convenções)
- ✅ Quais edge cases testar
- ✅ Como documentar

### Nunca faça sem aprovação:
- ❌ Adicionar nova dependência (library externa)
- ❌ Mudar arquitetura de estado
- ❌ Refatorar algo que já funciona sem task
- ❌ Mudar design system (cores, fontes, espaçamentos base)
- ❌ Integrar novo serviço externo (Stripe, Supabase, etc.)

---

## CADÊNCIA SUGERIDA

| Frequência | Atividade | Responsável |
|-----------|-----------|-------------|
| **A cada demanda** | Auto-routing + classificação | CEO |
| **A cada entrega** | Handoff automático para próximo time | CEO |
| **Diária** | Revisar tasks em andamento | CEO |
| **Por demanda** | Pesquisa, design, dev, QA | Agentes |
| **Semanal** | Relatório de status | DOCS com `/standup-notes` |
| **Mensal** | Revisão de roadmap | CEO + Fundador |

---

## CONTEXTO SEMPRE PRESENTE

Todo agente deve sempre ter acesso a:
1. `TASKS.md` — status atual do trabalho
2. `CLAUDE.md` — arquitetura técnica da plataforma
3. `00_ECOSYSTEM.md` — visão geral do ecossistema
4. `09_TEAMS.md` — estrutura dos times
5. O prompt do seu próprio agente

Adicione esses arquivos ao Project do Claude para acesso automático.

---

## RESUMO VISUAL

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              FUNDADOR FALA QUALQUER COISA            │
│                         │                           │
│                         ▼                           │
│                   ┌──────────┐                      │
│                   │  👑 CEO  │ ← Ponto único        │
│                   │  Auto-   │   de entrada          │
│                   │  Router  │                       │
│                   └────┬─────┘                      │
│                        │                            │
│          ┌─────────────┼─────────────┐              │
│          ▼             ▼             ▼              │
│    🟦 ALPHA      🟩 BETA       🟨 GAMMA            │
│    Descoberta    Construção    Qualidade             │
│          │             │             │              │
│          └──── GATE ───┘      ┌──────┘              │
│                │              │                     │
│                ▼              ▼                     │
│           ✅ ENTREGA    🐛→ DEV fix                 │
│                                                     │
│         🟥 DELTA (pode interromper a qualquer hora) │
│                                                     │
└─────────────────────────────────────────────────────┘
```
