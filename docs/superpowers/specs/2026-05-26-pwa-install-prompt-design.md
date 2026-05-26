# PWA — Prompt de instalação ("Transformar em app")

**Data:** 2026-05-26
**Tipo:** TIPO-B (melhoria — infra PWA já existe, falta o aviso de instalar)

## Contexto

Infra PWA já está pronta no projeto:
- `vite-plugin-pwa` configurado em `vite.config.ts` (`registerType: "autoUpdate"`, SW auto-registrado).
- Manifest injetado em runtime via `src/lib/generatePwaManifest.ts` → `applyPwaManifest(settings)`, chamado em `App.tsx` e `AdminSettingsPage.tsx`.
- Painel admin completo: toggle "Ativar PWA", nome, short name, ícone (upload/URL), cor do tema, cor de fundo.
- Colunas DB `pwa_*` mapeadas em `usePlatformSettings`.

**O que falta:** ninguém escuta `beforeinstallprompt` nem mostra um aviso convidando a instalar. Esse é o escopo.

## Decisões (aprovadas)

- **Formato:** banner fixo no rodapé (discreto, dismissível).
- **Quando:** só na área logada (StudentLayout) + após ~20s de engajamento na sessão.
- **iOS:** incluir guia manual (iOS Safari não tem `beforeinstallprompt`).

## Componentes

### `src/hooks/usePwaInstall.ts`
Encapsula a lógica de plataforma. Sem UI.
- Captura `beforeinstallprompt` (preventDefault + guarda o evento adiado).
- Detecta: `isIOS` (iPhone/iPad Safari), `isStandalone` (`display-mode: standalone` ou `navigator.standalone`), `isInstalled`.
- Escuta `appinstalled`.
- Expõe: `{ canInstall, promptInstall(): Promise<outcome>, isIOS, isStandalone, installed }`.

### `src/components/pwa/InstallPrompt.tsx`
Banner + sheet de instruções iOS. Consome `usePwaInstall` + `usePlatformSettings`.

**Mostra o banner quando TODAS verdadeiras:**
1. `settings.pwaEnabled === true`
2. `!isStandalone` (não já instalado/aberto como app)
3. dismiss não ativo — `localStorage["lumi-membros:pwa-dismissed"]` ausente ou > 7 dias
4. engajamento: timer de ~20s desde montagem
5. **Android/Desktop:** `canInstall === true`. **iOS:** `isIOS && !isStandalone`.

**Ações:**
- **Instalar:** Android/Desktop → `promptInstall()` (prompt nativo). iOS → abre sheet com mini-guia (ícone Compartilhar → "Adicionar à Tela de Início").
- **Agora não:** fecha + grava timestamp de dismiss (suprime 7 dias).
- `appinstalled` → grava dismiss permanente + esconde.

**Posição:** `fixed` rodapé, `z` acima do conteúdo, com offset para não cobrir a bottom-nav mobile do StudentLayout.

## Mudanças em arquivos existentes

- `src/components/layout/StudentLayout.tsx`: montar `<InstallPrompt />` uma vez.
- `src/pages/admin/AdminSettingsPage.tsx`: aviso quando `pwaEnabled` ligado mas sem `pwaIconUrl` — sem ícone válido (≥144px) o navegador não dispara `beforeinstallprompt`, então o banner Android/Desktop não aparece. (iOS independe disso.)

## Fora de escopo (não mexer)

SW, manifest runtime, colunas DB, painel PWA existente, ícones estáticos em `public/`.

## Notas de plataforma

- `beforeinstallprompt`: Chrome/Edge/Android. Não dispara em iOS Safari nem se já instalado.
- Critérios do navegador p/ disparar: manifest válido com `name`/`short_name`, `start_url`, `display`, ícone ≥144px, SW ativo. Tudo presente *desde que admin defina ícone*.
- iOS: só "Adicionar à Tela de Início" manual via Safari.
