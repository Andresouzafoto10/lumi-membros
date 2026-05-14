# SKILL_DESIGN_VENDAS — Design para Páginas de Vendas de Alta Conversão

**Versão:** 1.0.0
**Plataforma:** Master Membros
**Stack:** Vite 5 + React 18 + TypeScript + Tailwind CSS 3 + shadcn/ui

---

## OBJETIVO

Transformar copy em interfaces que vendem. Design não é decoração — é o motor visual da conversão. Cada elemento deve guiar o olho, reduzir fricção e empurrar para o CTA.

---

## 1. PRINCÍPIOS VISUAIS QUE CONVERTEM

### 1.1 Hierarquia Visual
- **Headline** = maior elemento da página (60-80px desktop / 36-48px mobile)
- **Subheadline** = 50-60% do tamanho da headline
- **CTA** = botão maior que tudo ao redor, cor de destaque
- **Corpo** = 16-18px desktop / 14-16px mobile (legibilidade primeiro)

### 1.2 Contraste
- CTA tem cor que NÃO aparece em nenhum outro lugar da página
- Texto sobre fundo: contraste mínimo WCAG AA (4.5:1)
- Botão primário = alto contraste com fundo da seção

### 1.3 Espaço em Branco
- Cada seção respira: `py-16 md:py-24 lg:py-32`
- Headline tem `max-w-4xl` para evitar linhas muito longas
- Corpo de texto: `max-w-prose` (65ch)

### 1.4 Direção do Olhar
- **F-pattern** para texto longo (esquerda-direita-down)
- **Z-pattern** para sections curtas com CTA
- Imagens de pessoas olham para o CTA (não para fora)
- Setas, ícones e linhas pontilhadas guiam até a oferta

---

## 2. STACK TÉCNICO OBRIGATÓRIO

### 2.1 Tecnologias
- **React 18** com SWC
- **TypeScript** estrito
- **Tailwind CSS 3** com variáveis CSS da plataforma
- **shadcn/ui** primitives (Button, Card, Accordion, Dialog)
- **lucide-react** para ícones
- **react-helmet-async** para meta tags SEO

### 2.2 Variáveis CSS da Plataforma (USAR SEMPRE)
```tsx
// CORRETO — usar tokens da plataforma
className="bg-background text-foreground"
className="bg-primary text-primary-foreground"
className="bg-card border border-border"

// ERRADO — nunca hardcode
className="bg-[#00C2CB]"
className="bg-orange-500"
```

Tokens disponíveis: `--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--accent`, `--border`, `--input`, `--ring`.

### 2.3 Tipografia
- Fonte: **Plus Jakarta Sans** (já configurada na plataforma)
- Pesos: 400 / 500 / 600 / 700 / 800
- Headlines: `font-bold` ou `font-extrabold` + `tracking-tight`
- Corpo: `font-normal` + `leading-relaxed`

---

## 3. SEÇÕES OBRIGATÓRIAS DE UMA PÁGINA DE VENDAS

Ordem importa. Toda página de vendas que converte tem essas 12 seções na ordem:

### 3.1 HERO (acima da dobra)
```tsx
<section className="min-h-[100vh] flex flex-col justify-center px-4 py-12 md:py-20">
  <div className="max-w-6xl mx-auto w-full">
    {/* Badge opcional de urgência/destaque */}
    <Badge>VAGAS LIMITADAS</Badge>

    {/* Headline */}
    <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight">
      [HEADLINE_DA_COPY]
    </h1>

    {/* Subheadline */}
    <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-3xl">
      [SUBHEADLINE_DA_COPY]
    </p>

    {/* CTA + Garantia */}
    <Button size="lg" className="mt-8">
      [HERO_CTA_DA_COPY]
    </Button>
    <p className="text-sm text-muted-foreground mt-3">
      ✓ 7 dias de garantia · ✓ Acesso imediato
    </p>

    {/* Imagem/Vídeo do produto */}
    <div className="mt-12 rounded-2xl overflow-hidden shadow-2xl">
      <video poster={thumbnail} controls />
    </div>
  </div>
</section>
```

### 3.2 PROVA SOCIAL RÁPIDA
- Faixa de logos / "+847 alunos" / 5 estrelas
- Imediatamente após o Hero
- Reduz abandono em até 30%

### 3.3 PROBLEMA / DOR
- Confronta o leitor com sua realidade
- 3-5 frases curtas de identificação
- Visual: ícones de "dor" ou imagem evocativa

### 3.4 SOLUÇÃO / TRANSFORMAÇÃO
- Apresenta o produto como ponte
- Antes / depois quando possível
- Visual: comparação lado-a-lado ou setas

### 3.5 MÓDULOS / CONTEÚDO
- Cards com módulo + descrição + duração
- Cada módulo VENDE seu valor
- Acordeão ou grid de cards

### 3.6 INSTRUTOR / AUTORIDADE
- Foto profissional
- Credenciais em bullets curtos
- Resultados próprios + sociais
- Layout: foto + texto lado-a-lado

### 3.7 DEPOIMENTOS DETALHADOS
- Cards com foto, nome, profissão, resultado
- Mínimo 6 depoimentos
- Antes/depois quando possível
- Mix de formatos: texto, vídeo, screenshot

### 3.8 BÔNUS
- Lista com valor de cada bônus
- "Por se inscrever HOJE, você leva também..."
- Aumenta valor percebido

### 3.9 GARANTIA
- Selo visual grande
- Texto claro: "X dias, 100% do dinheiro de volta"
- Remove a fricção final

### 3.10 OFERTA + PREÇO
- Card destacado, centro da atenção
- Preço de/por com risco visual no de
- Parcelas em destaque
- CTA grande logo abaixo

### 3.11 FAQ
- Acordeão com 7-10 perguntas
- Última pergunta sempre vende de novo
- Cada resposta termina com CTA implícito

### 3.12 CTA FINAL + URGÊNCIA
- Recapitulação da oferta
- Countdown timer (se urgência real)
- CTA + garantia + selos de segurança
- P.S. (post scriptum)

---

## 4. MOBILE-FIRST

**Toda seção é pensada PRIMEIRO para mobile.** 70%+ do tráfego de vendas é mobile.

### 4.1 Breakpoints Tailwind
- Base: < 640px (mobile)
- `sm:` 640px+ (mobile grande)
- `md:` 768px+ (tablet)
- `lg:` 1024px+ (desktop)

### 4.2 Padrões obrigatórios mobile
- Headline cabe em 3 linhas máximo
- CTA largura total em mobile (`w-full md:w-auto`)
- Imagens otimizadas (`object-cover`, `aspect-video`)
- Texto: 16px mínimo para corpo
- Espaçamento entre elementos clicáveis: 48px mínimo
- Não usar hover-only interactions

### 4.3 Teste em 3 viewports
- 375px (iPhone SE — pior caso)
- 768px (iPad)
- 1440px (desktop padrão)

---

## 5. ELEMENTOS DE CONVERSÃO

### 5.1 Sticky CTA Bar (mobile + desktop)
Aparece após o usuário rolar 100vh.
```tsx
<div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 md:p-4 z-40 shadow-xl">
  <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
    <div className="hidden md:block">
      <p className="font-bold">[Nome do curso]</p>
      <p className="text-sm text-muted-foreground">De <s>R$ 1.997</s> por R$ 997</p>
    </div>
    <Button size="lg" className="flex-1 md:flex-none">
      [CTA] →
    </Button>
  </div>
</div>
```

### 5.2 Countdown Timer (apenas urgência real)
```tsx
<div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
  <p className="text-sm font-medium">Oferta expira em:</p>
  <div className="text-3xl font-bold mt-2 tabular-nums">
    [HH] : [MM] : [SS]
  </div>
</div>
```
NUNCA reset fake. Se a oferta tem prazo real, usa timer. Caso contrário, omite.

### 5.3 Badge de Garantia
```tsx
<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400">
  <ShieldCheck className="w-4 h-4" />
  <span className="text-sm font-semibold">Garantia de 7 dias</span>
</div>
```

### 5.4 Selos de Segurança
- "Pagamento 100% seguro"
- Logos de bandeiras (Visa, Master, Pix)
- Cadeado ao lado do CTA de checkout

---

## 6. ESTRUTURA DE PASTAS (Master Membros)

```
src/
  pages/
    SalesPage.tsx                    # Página principal /vendas/:courseSlug
  components/
    sales/
      SalesHero.tsx
      SalesSocialProof.tsx
      SalesProblem.tsx
      SalesSolution.tsx
      SalesModules.tsx
      SalesInstructor.tsx
      SalesTestimonials.tsx
      SalesBonuses.tsx
      SalesGuarantee.tsx
      SalesOffer.tsx
      SalesFAQ.tsx
      SalesCTABar.tsx                # Sticky
      SalesCountdown.tsx             # Quando urgência real
      SalesFinalCTA.tsx
```

### Rota (App.tsx)
```tsx
// PÚBLICA — sem ProtectedRoute
<Route path="/vendas/:courseSlug" element={<SalesPage />} />
```

---

## 7. ANIMAÇÕES (uso comedido)

Usar animações existentes da plataforma (`tailwind.config.ts`):
- `animate-fade-in` — entrada de seções ao scroll
- `animate-fade-in-up` — cards entrando em sequência
- `animate-pulse-soft` — badges de urgência

Padrão de entrada por scroll:
```tsx
<section className="opacity-0 translate-y-4" data-animate>
  {/* IntersectionObserver dispara animate-fade-in-up */}
</section>
```

**NUNCA:** animações infinitas que distraem, parallax pesado, autoplay de vídeo com som.

---

## 8. PALETA E TEMA

Tema padrão: **dark** (default da plataforma). Página de vendas DEVE funcionar nos dois modos.

### Cores de destaque para vendas:
- **CTA principal:** `bg-primary text-primary-foreground` (laranja Master Membros `#ff7b00`)
- **Garantia/positivo:** `text-green-500` ou `bg-green-500/10`
- **Urgência/atenção:** `text-amber-500` ou `bg-amber-500/10`
- **Erro/dor:** `text-red-500` (para listar problemas)

---

## 9. ANTI-PADRÕES (NUNCA FAZER)

- ❌ Hardcode de cores (`bg-orange-500`)
- ❌ Múltiplos CTAs com cores diferentes (uma cor de CTA, só)
- ❌ Pop-up de saída agressivo logo na entrada
- ❌ Autoplay de vídeo com áudio
- ❌ Sticky bar cobrindo conteúdo importante
- ❌ Headlines maiores que o viewport mobile
- ❌ Imagens sem `loading="lazy"` (exceto hero)
- ❌ Fontes externas (Google Fonts CDN) — usa as locais
- ❌ Botões com hover-only (mobile não tem hover)
- ❌ Layout shift ao carregar (sempre reserva espaço)

---

## 10. CHECKLIST FINAL DE DESIGN

- [ ] Hero cabe acima da dobra mobile (375x667)?
- [ ] CTA acima da dobra em ambos viewports?
- [ ] Headline tem hierarquia visual clara?
- [ ] Sticky CTA bar aparece após scroll?
- [ ] Todas as seções respiram (padding adequado)?
- [ ] Prova social aparece antes do scroll completo?
- [ ] Imagens com alt text descritivo?
- [ ] Sem layout shift ao carregar?
- [ ] Contraste WCAG AA em todos os textos?
- [ ] Botões com `active:scale-95` para feedback?
- [ ] Testado em 375px, 768px, 1440px?
- [ ] Variáveis CSS da plataforma (sem hardcode)?
- [ ] Dark + light mode funcionando?
- [ ] Fontes Plus Jakarta Sans aplicadas?
- [ ] Rota `/vendas/:courseSlug` pública (sem auth)?

---

## 11. EXEMPLO DE COMPONENTE — SalesHero.tsx

```tsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowRight } from "lucide-react";

interface SalesHeroProps {
  badge?: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaHref: string;
  guarantee: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
}

export function SalesHero({
  badge,
  headline,
  subheadline,
  ctaText,
  ctaHref,
  guarantee,
  mediaUrl,
  mediaType = "image",
}: SalesHeroProps) {
  return (
    <section className="relative min-h-[100vh] flex items-center px-4 py-16 md:py-24 overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card -z-10" />

      <div className="max-w-6xl mx-auto w-full">
        {badge && (
          <Badge variant="secondary" className="mb-6 animate-pulse-soft">
            {badge}
          </Badge>
        )}

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl">
          {headline}
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-3xl leading-relaxed">
          {subheadline}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button asChild size="lg" className="w-full sm:w-auto text-base font-bold h-14 px-8">
            <a href={ctaHref}>
              {ctaText} <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            {guarantee}
          </div>
        </div>

        {mediaUrl && (
          <div className="mt-12 md:mt-16 rounded-2xl overflow-hidden shadow-2xl border border-border/50">
            {mediaType === "video" ? (
              <video controls className="w-full aspect-video" src={mediaUrl} />
            ) : (
              <img
                src={mediaUrl}
                alt="Apresentação do curso"
                className="w-full aspect-video object-cover"
                fetchPriority="high"
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
```

---

## 12. REFERÊNCIAS DE INSPIRAÇÃO

**Páginas de vendas referência (estudar visual):**
- ConvertKit
- Hotmart (top sellers)
- Russell Brunson (ClickFunnels)
- Alex Hormozi (Acquisition.com)
- Apple (estrutura de seções)

**Princípio do Banner Blindness:** quanto mais a página parece "ad", menos converte. Design limpo, editorial, profissional > design "vendedor barato".
