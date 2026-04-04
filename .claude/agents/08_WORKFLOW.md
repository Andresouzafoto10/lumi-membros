# LUMI MEMBROS — GUIA DE WORKFLOW DOS AGENTES
**Arquivo:** `08_WORKFLOW.md` | **Versao:** 3.0.0 | **Atualizado:** 2026-03-31

---

## PONTO UNICO DE ENTRADA: O CEO

**Toda demanda entra pelo CEO.** Voce nao precisa saber qual agente ou time acionar — o CEO faz isso automaticamente.

### Como usar (simples)

```
Voce fala -> CEO classifica -> Time e ativado -> Agentes trabalham -> Entrega
```

Basta enviar sua demanda. O CEO vai:
1. Classificar o tipo (feature, bug, melhoria, pesquisa, emergencia)
2. Selecionar o time correto (ALPHA, BETA, GAMMA, DELTA)
3. Definir a sequencia de agentes
4. Atribuir quem verifica qualidade
5. Gerar as tasks automaticamente

---

## COMO INICIAR UMA SESSAO

### Opcao 1: Prompt Gateway (recomendado)
Use o arquivo `10_GATEWAY.md` como system prompt.

### Opcao 2: Ativacao direta por tipo
```
"feature: [descreva a feature]"
"bug: [descreva o problema]"
"pesquisa: [o que quer saber]"
"urgente: [o que esta quebrado]"
"melhoria: [o que precisa melhorar]"
```

### Opcao 3: Ativacao de agente especifico
```
"Ative LUMI-RESEARCH para pesquisar [X]"
"Ative LUMI-DESIGN para propor [X]"
"Ative LUMI-DEV para implementar [X]"
"Ative LUMI-QA para testar [X]"
```

---

## FLUXO 0: AUTO-ROUTING (CEO COMO GATEWAY)

```
QUALQUER DEMANDA DO FUNDADOR
         |
         v
   +-------------------------+
   |     CEO RECEBE          |
   |                         |
   |  1. Le TASKS.md        |
   |  2. Classifica tipo     |
   |  3. Avalia urgencia     |
   |  4. Seleciona time      |
   |  5. Define sequencia    |
   |  6. Gera tasks          |
   +------------+------------+
                |
    +-----------+-----------+----------+
    v           v           v          v
 TIPO-A/D    TIPO-B/E    TIPO-C     TIPO-F
 Feature     Melhoria    Bug        Emergencia
 Pesquisa    Organiz.    Erro       Caiu tudo
    |           |           |          |
    v           v           v          v
 ALPHA       BETA       GAMMA      DELTA
    |           |           |          |
    v           v           v          v
 RESEARCH    DESIGN      QA         DEV+QA
 -> CEO      -> DEV      -> DEV     (paralelo)
 -> GATE-1   -> QA       -> QA      -> CEO
 -> BETA     -> DOCS     -> DOCS    -> DOCS
```

### Regras do Auto-Routing
1. **CEO SEMPRE consulta TASKS.md antes de rotear**
2. **CEO SEMPRE gera task antes de ativar time**
3. **CEO decide quem faz QA** baseado na severidade
4. **TIME DELTA cancela qualquer outro time**
5. **Apos cada entrega, CEO verifica se proximo time deve ser ativado**

---

## FLUXO 1: FEATURE NOVA (ALPHA -> BETA -> GAMMA)

```
FUNDADOR: "Quero [feature nova]"
         |
         v
   [CEO] Auto-routing + superpowers:brainstorming
   Tipo: FEATURE NOVA
         |
    +----+----+
    SIM       NAO (referencia clara)
    |         |
    v         v
 [RESEARCH]  Pula para GATE-1
  Playwright MCP para concorrentes
  Context7 MCP para docs tecnicas
    |
    v
 [CEO] Consolida + superpowers:writing-plans
    |
    v
 GATE-1: "Fundador, o plano e este. Aprova?"
    |
    v
 === HANDOFF -> TIME BETA ===
    |
 [DESIGN] frontend-design + theme-factory
    |
    v
 GATE-2: "Fundador, o design e este. Aprova?"
    |
    v
 [DEV] Implementa
  - superpowers:writing-plans para planejar
  - feature-dev:feature-dev para features complexas
  - Supabase MCP para schema + queries
  - superpowers:verification-before-completion
    |
    v
 === HANDOFF -> TIME GAMMA ===
    |
 [QA] Testa
  - Playwright MCP para testar fluxos
  - Supabase MCP para verificar dados
  - Vercel MCP para verificar build
    |
    +-- Bugs criticos -> volta ao DEV
    |
    v (aprovado)
 GATE-3: "Fundador, esta pronto. Confere?"
    |
    v
 [DOCS] Documenta
  - TASKS.md + CHANGELOG.md
  - claude-md-management:revise-claude-md (se schema mudou)
  - memory-management (se contexto importante)
    |
    v
 ENTREGUE
```

---

## FLUXO 2: BUG / MAL FUNCIONAMENTO (TIME GAMMA)

```
FUNDADOR: "[algo] nao funciona / esta estranho"
         |
         v
   [CEO] Auto-routing
   Tipo: BUG
   Time: GAMMA
         |
    +----+------------------+------------------+
    CRITICO                 ALTO/MEDIO          BAIXO
    |                       |                   |
    v                       v                   v
  [QA] Diagnostica        [QA] Diagnostica    [DEV] Corrige
  Playwright MCP          Playwright MCP       auto-verifica
  [DEV] Fix urgente       [DEV] Corrige       [DOCS] Registra
  systematic-debugging    [QA] Verifica
  [QA] Verifica           [DOCS] Registra
  [CEO] Valida
  [DOCS] Registra
```

### Deteccao de bugs pelo CEO

| O que o fundador diz | CEO interpreta como | Acao |
|----------------------|---------------------|------|
| "nao funciona" | Bug confirmado | QA diagnostica -> DEV corrige |
| "esta estranho" | Possivel bug | QA investiga primeiro |
| "nao era assim" | Regressao | DEV verifica git blame -> corrige |
| "esta lento" | Performance | DEV investiga |
| "no celular nao da" | Bug mobile | QA audita com browser_resize |
| "sumiu" | Bug critico | TIME DELTA se impacto alto |
| "erro no banco" | Supabase issue | DEV verifica com SQL + logs |
| "login nao funciona" | Auth issue | DEV verifica Supabase Auth |

---

## FLUXO 3: EMERGENCIA (TIME DELTA)

```
ALERTA: Plataforma quebrada / Bug critico
         |
         v
   [CEO] Auto-routing IMEDIATO
   Time: DELTA
   SLA: 1 hora total
         |
         v
   [CEO] Para qualquer outro time em andamento
         |
         +--- [DEV] Diagnostico (< 10 min)
         |         systematic-debugging
         |         Supabase MCP / Vercel MCP
         |         |
         |         v
         |    [DEV] Fix minimo (< 20 min)
         |         verification-before-completion
         |         |
         |         v
         +--- [QA] Verifica fix (< 15 min)
                   Playwright MCP
                   |
                   v
              [CEO] Decide: deploy?
                   |
                   v (sim)
              [DOCS] Post-mortem + BUGS.md
                   |
                   v
              RESOLVIDO
              [CEO] Retoma times pausados
```

---

## FLUXO 4: PESQUISA (TIME ALPHA apenas)

```
FUNDADOR: "Como o [concorrente] faz [X]?"
         |
         v
   [CEO] Auto-routing
   Time: ALPHA (parcial)
         |
         v
   [RESEARCH] Executa pesquisa
   - Playwright MCP para navegar concorrente
   - Screenshots e evidencias
   - Context7 MCP para docs tecnicas (se aplicavel)
         |
         v
   [CEO] Analisa e apresenta
   Sugere: implementar / adaptar / ignorar
         |
         v
   FUNDADOR decide -> Se sim, vira FEATURE -> FLUXO 1
```

---

## FLUXO 5: MELHORIA (TIME BETA direto)

```
FUNDADOR: "Melhora [X] / Ajusta [Y]"
         |
         v
   [CEO] Auto-routing
   Time: BETA
         |
    +----+----+
    Visual     Codigo
    |          |
    v          v
  [DESIGN]   [DEV] direto
  frontend-   systematic-debugging (se bug)
  design      superpowers:writing-plans (se complexo)
  -> [DEV]   -> [QA]
  -> [QA]    -> [DOCS]
  -> [DOCS]
```

---

## FLUXO 6: ORGANIZACAO INTERNA

```
CEO identifica necessidade OU fundador pede
         |
         v
   [CEO] Atribui direto ao agente responsavel:
   - Criar skill -> SKILL (skill-creator + skill-development)
   - Atualizar docs -> DOCS (claude-md-management)
   - Reorganizar tasks -> DOCS (task-management)
   - Recomendar automacoes -> SKILL (claude-automation-recommender)
   - Salvar contexto -> DOCS (memory-management)
```

---

## TRANSICAO ENTRE TIMES

### O CEO como "dispatcher"

```
1. VERIFICA output do time que terminou
2. CONFERE se ha GATE pendente
3. SE GATE -> apresenta ao fundador e aguarda
4. SE SEM GATE -> ativa proximo time imediatamente
5. ATUALIZA TASKS.md com novo status
6. INFORMA o fundador do progresso
```

### Sinais de que um time terminou

| Time | Sinal de Conclusao | CEO faz |
|------|-------------------|---------|
| ALPHA | RESEARCH entregou relatorio | Consolida e apresenta GATE-1 |
| BETA | DEV entregou com handoff | Ativa GAMMA (QA) |
| GAMMA | QA aprovou | Apresenta GATE-3 ao fundador |
| DELTA | QA verificou fix | Confirma deploy e retoma operacao |

---

## FERRAMENTAS POR FLUXO

| Fluxo | Ferramentas Principais |
|-------|----------------------|
| Feature Nova | Playwright, Context7, frontend-design, Supabase MCP, Vercel MCP |
| Bug | Playwright, Supabase MCP, systematic-debugging, Vercel MCP |
| Emergencia | Supabase MCP, Vercel MCP, systematic-debugging, Playwright |
| Pesquisa | Playwright, Context7 |
| Melhoria | frontend-design, Supabase MCP, verification-before-completion |
| Organizacao | skill-creator, claude-md-management, memory-management |

---

## REGRAS DO ECOSSISTEMA

### O que o Fundador sempre decide:
- Quais features entram no produto
- O que e aprovado apos cada gate
- Prioridade entre tasks concorrentes
- Qualquer mudanca de arquitetura ou tecnologia
- O que vai para producao

### O que o CEO decide sozinho:
- Qual time ativar (auto-routing)
- Qual agente executar dentro do time
- Ordem de prioridade do backlog
- Quando pausar um time para emergencia
- Quem faz QA de cada entrega

### O que os agentes decidem sozinhos:
- Como implementar tecnicamente (dentro do padrao)
- Qual componente usar (dentro do design system)
- Como estruturar o codigo (dentro das convencoes)
- Quais edge cases testar
- Como documentar

### Nunca faca sem aprovacao:
- Adicionar nova dependencia (library externa)
- Mudar arquitetura de estado
- Refatorar algo que ja funciona sem task
- Mudar design system (cores, fontes, espacamentos base)
- Integrar novo servico externo
- Alterar schema do Supabase (nova tabela, drop column, etc.)

---

## CONTEXTO SEMPRE PRESENTE

Todo agente deve sempre ter acesso a:
1. `TASKS.md` — status atual do trabalho
2. `CLAUDE.md` — arquitetura tecnica da plataforma
3. `00_ECOSYSTEM.md` — visao geral do ecossistema
4. `09_TEAMS.md` — estrutura dos times
5. O prompt do seu proprio agente
