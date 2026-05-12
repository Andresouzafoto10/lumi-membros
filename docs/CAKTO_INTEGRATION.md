# Cakto — Guia de Configuração

Integração Cakto Pay com matrícula automática nas turmas via webhook + API REST.

## Componentes entregues

### Backend (Supabase)
- **Migration** `20260512000001_cakto_integration.sql` — cria `cakto_oauth_tokens` (cache OAuth2) e insere `Cakto` em `webhook_platforms`.
- **Edge Function `webhook-intake` (v5)** — passa a aceitar payloads Cakto. Eventos suportados: `purchase_approved`, `subscription_created` (→ matricula), `subscription_renewed` (→ estende), `refund` / `chargeback` / `subscription_canceled` / `subscription_renewal_refused` (→ revoga), demais (`pix_gerado`, `boleto_gerado`, etc.) ficam como `pending` sem ação.
- **Edge Function `cakto-api`** — proxy admin para a REST API da Cakto (produtos, webhooks, pedidos). Faz OAuth2 cacheando token de 10h em `cakto_oauth_tokens`. Exige JWT de admin.
- **Edge Function `cakto-reconcile`** — varre pedidos aprovados da Cakto das últimas 24h (configurável até 168h) e gera matrículas faltantes. Idempotente contra `webhook_logs.transaction_id`. Aceita JWT admin (botão "Sincronizar agora") **ou** header `x-cron-secret` (cron).

### Frontend
- `src/hooks/useCaktoApi.ts` — hooks `useCaktoProducts`, `useCaktoWebhooks`, `useCaktoActions` (createWebhook, deleteWebhook, testWebhook, reconcile).
- `src/pages/admin/AdminIntegrationsPage.tsx` — Cakto aparece em "Nova integração", card recebe:
  - Botão **Auto-criar webhook na Cakto** (registra o webhook na Cakto via API e salva o `secret` automaticamente).
  - Botão **Sincronizar pedidos 24h** (reconciliação manual).
  - Dropdown **Buscar produtos Cakto** no diálogo de mapeamento (clica no produto e preenche o ID).

## Passos manuais (você executa)

### 1) Confirmar secrets no Supabase
Dashboard → Project Settings → Edge Functions → Secrets. Confirme/adicione:

```
CAKTO_CLIENT_ID         = <obtido no painel Cakto > Integrações > Cakto API > Criar Chave de API>
CAKTO_CLIENT_SECRET     = <mesmo lugar, mostrado uma única vez na criação>
```

Opcional (cron):
```
CAKTO_RECONCILE_CRON_SECRET = <string aleatória forte, ex: gerada por openssl rand -hex 32>
```

> Os secrets `CAKTO_CLIENT_ID` e `CAKTO_CLIENT_SECRET` você já configurou.

### 2) Ativar a integração na plataforma
1. Acessar `/admin/configuracoes/integracoes` na app
2. Clicar **Nova integração** → selecionar **Cakto** → dar um rótulo (ex: "Cakto Master") → salvar
3. No card Cakto, clicar **Configurar** e **deixar a chave secreta em branco por enquanto** (será preenchida no passo 3)
4. Ativar o switch (vai exigir `secret_key`; quem preenche é o próximo passo)

### 3) Registrar webhook na Cakto (escolha A ou B)

**A) Automático (recomendado):**
- Clique em **Auto-criar webhook na Cakto** no card Cakto. A função chama `POST /public_api/webhook/` na Cakto com a URL da plataforma e os eventos relevantes. A Cakto retorna um `secret` UUID que é salvo automaticamente em `webhook_platforms.secret_key`.

**B) Manual (se preferir criar no painel Cakto):**
- No painel Cakto → Integrações → Webhooks → criar:
  - **URL:** a URL exibida no card (formato `https://gdbkbeurjjtjgmrmfngk.supabase.co/functions/v1/webhook-intake?token=<UUID>`)
  - **Eventos:** `purchase_approved`, `subscription_created`, `subscription_renewed`, `subscription_renewal_refused`, `subscription_canceled`, `refund`, `chargeback`
- Copie o `secret` que a Cakto exibir
- Volte ao card e clique **Configurar** → cole o secret em "Chave Secreta (HMAC)" → salvar

### 4) Mapear produtos → turmas
1. Aba **Mapeamentos** → cartão da integração Cakto → **Adicionar**
2. Clique **Buscar produtos Cakto** para listar os produtos da sua conta. Clique no produto desejado e o ID será preenchido (ou cole manualmente).
3. Selecione as turmas que devem ser liberadas quando esse produto for comprado
4. Salvar

### 5) Testar
- No painel Cakto → Webhooks → encontre o webhook recém-criado → **Enviar evento de teste** (ou faça uma compra-teste com 1 centavo).
- A aba **Histórico** em Integrações deve mostrar o evento com status `success`.
- Conferir em `enrollments` que o aluno foi matriculado nas turmas mapeadas.

### 6) (Opcional) Agendar reconciliação automática
Se quiser proteção extra contra webhooks falhos, agende `cakto-reconcile` para rodar diariamente:

**Via pg_cron (recomendado, dentro do Supabase):**
```sql
-- Substitua <CRON_SECRET> pelo valor de CAKTO_RECONCILE_CRON_SECRET
SELECT cron.schedule(
  'cakto-reconcile-daily',
  '0 6 * * *',  -- 03:00 BRT = 06:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://gdbkbeurjjtjgmrmfngk.supabase.co/functions/v1/cakto-reconcile',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := jsonb_build_object('hours', 24)
  );
  $$
);
```
Requer extensões `pg_cron` + `pg_net` habilitadas (Dashboard → Database → Extensions).

**Alternativa:** GitHub Actions / Vercel Cron / EasyCron apontando para a mesma URL com o header `x-cron-secret`.

## Resumo do fluxo em produção

```
Compra Cakto aprovada
        │
        ├──→ Webhook "purchase_approved"
        │       → webhook-intake valida HMAC (ou body.secret)
        │       → cria profile (se novo) + enrollment
        │       → dispara welcome email + magic link
        │
        └──→ (se webhook falhar) cakto-reconcile (cron 03:00 ou manual)
                → varre orders das últimas 24h
                → cria matrículas que faltaram
```

## Troubleshooting

- **"Plataforma sem secret_key configurada"** → você não fez o passo 3. Use Auto-criar ou cole manual.
- **"Assinatura HMAC ausente / inválida"** → Cakto pode mandar o secret em uma chave do body diferente. Verifique o payload em `webhook_logs.payload` e ajuste `caktoBodySecretMatches` em `supabase/functions/webhook-intake/index.ts` para apontar para a chave correta.
- **`CAKTO_CLIENT_ID / CAKTO_CLIENT_SECRET ausentes`** → recriar no painel Cakto e adicionar nos secrets do Supabase.
- **Reconcile não cria nada** → verifique se há `webhook_mappings` para o `external_product_id` que está vindo nos pedidos.
