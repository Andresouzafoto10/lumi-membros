# SKILL_PERFORMANCE_VENDAS — Performance e Conversão para Páginas de Vendas

**Versão:** 1.0.0
**Plataforma:** Master Membros
**Foco:** Core Web Vitals + SEO + Tracking + A/B testing

---

## OBJETIVO

Página de vendas que não carrega em até 3s perde 53% dos visitantes mobile. Cada 100ms de delay no LCP = -1% na conversão. Esta skill garante que a página é rápida, mensurável e otimizada para máxima conversão.

---

## 1. CORE WEB VITALS — METAS OBRIGATÓRIAS

### 1.1 Métricas e thresholds

| Métrica | Bom | Precisa Melhorar | Ruim |
|---------|-----|------------------|------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5 - 4.0s | > 4.0s |
| **FID** / **INP** (Interaction to Next Paint) | < 100ms / 200ms | 100-300ms / 200-500ms | > 300ms / 500ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1 - 0.25 | > 0.25 |
| **FCP** (First Contentful Paint) | < 1.8s | 1.8 - 3.0s | > 3.0s |
| **TTFB** (Time to First Byte) | < 0.8s | 0.8 - 1.8s | > 1.8s |

**Meta página de vendas Master Membros:**
- LCP ≤ 2.0s (mobile 4G)
- INP ≤ 150ms
- CLS ≤ 0.05
- Lighthouse Performance ≥ 90

### 1.2 Como medir
```bash
# Chrome DevTools — Lighthouse
# Configurar: Mobile + Slow 4G + 4x CPU slowdown

# CLI alternativo
npx lighthouse https://master-membros.com/vendas/curso-x \
  --view --preset=mobile
```

---

## 2. OTIMIZAÇÕES OBRIGATÓRIAS

### 2.1 Imagens

**Hero (above-the-fold):**
```tsx
<img
  src={heroImage}
  alt="Descrição"
  width="1200"
  height="675"
  fetchPriority="high"
  decoding="async"
  className="w-full aspect-video object-cover"
/>
```

**Imagens abaixo da dobra:**
```tsx
<img
  src={image}
  alt="Descrição"
  width="800"
  height="450"
  loading="lazy"
  decoding="async"
/>
```

**Regras:**
- Sempre `width` + `height` explícitos (previne CLS)
- WebP ou AVIF (Master Membros usa R2 com WebP — `imagePreset`)
- Hero com `fetchPriority="high"` + `loading="eager"` (default)
- Todas as outras com `loading="lazy"`
- `decoding="async"` em todas
- Servir tamanho correto (não usar imagem 4000x3000 em thumbnail)

### 2.2 Fontes

A plataforma já usa Plus Jakarta Sans local. Configurar:
```css
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-display: swap;  /* CRÍTICO — evita FOIT */
  font-weight: 400 800;
  src: url('/fonts/PlusJakartaSans.woff2') format('woff2');
}
```

**Preload da fonte principal:**
```html
<link rel="preload" href="/fonts/PlusJakartaSans.woff2" as="font" type="font/woff2" crossorigin>
```

### 2.3 Vídeo

**NUNCA autoplay com som.** Padrão:
```tsx
<div className="relative aspect-video rounded-2xl overflow-hidden">
  {!playing ? (
    <>
      <img
        src={thumbnail}
        alt="Thumbnail do vídeo"
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <button
        onClick={() => setPlaying(true)}
        className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition"
        aria-label="Reproduzir vídeo"
      >
        <Play className="w-16 h-16 text-white" />
      </button>
    </>
  ) : (
    <iframe
      src={`${videoUrl}?autoplay=1`}
      className="w-full h-full"
      allow="autoplay; encrypted-media"
      allowFullScreen
    />
  )}
</div>
```

Carrega o iframe SOMENTE no clique. Economiza ~1.5MB de JavaScript do YouTube/Vimeo.

### 2.4 JavaScript

**Bundle splitting na página de vendas:**
```tsx
// SalesPage.tsx
import { lazy, Suspense } from "react";

const SalesFAQ = lazy(() => import("@/components/sales/SalesFAQ"));
const SalesTestimonials = lazy(() => import("@/components/sales/SalesTestimonials"));

export default function SalesPage() {
  return (
    <>
      <SalesHero {...heroProps} />
      <SalesSocialProof />
      <SalesProblem />

      {/* Lazy load das seções abaixo da dobra */}
      <Suspense fallback={<SectionSkeleton />}>
        <SalesTestimonials />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <SalesFAQ />
      </Suspense>
    </>
  );
}
```

**O que NÃO carregar na página de vendas:**
- ❌ React Query (não há fetch de dados autenticados)
- ❌ Supabase client (página é pública)
- ❌ AuthContext / ProtectedRoute
- ❌ html2canvas
- ❌ @aws-sdk/client-s3
- ❌ react-easy-crop

A página de vendas deve ser leve. Importar APENAS:
- React + React Router
- shadcn/ui primitives usados
- lucide-react (ícones específicos via tree-shaking)
- react-helmet-async

### 2.5 CSS Crítico Inline

Para o Hero, inline CSS crítico no `<head>` para evitar render-blocking:
```html
<style>
  /* Inline crítico do hero — gerar via Critters/Vite plugin */
  .hero-section { min-height: 100vh; display: flex; ... }
  .hero-headline { font-size: 3rem; font-weight: 800; ... }
</style>
```

Considerar plugin `vite-plugin-critical` para automatizar.

### 2.6 Preconnect / DNS Prefetch
```html
<link rel="preconnect" href="https://pub-xxxxx.r2.dev">
<link rel="dns-prefetch" href="https://www.youtube.com">
```

---

## 3. TRACKING DE CONVERSÃO

### 3.1 Eventos obrigatórios

```tsx
// src/lib/salesTracking.ts
type SalesEvent =
  | "page_view"
  | "cta_click"
  | "scroll_depth"          // 25 / 50 / 75 / 100
  | "video_play"
  | "video_complete"
  | "faq_open"
  | "testimonial_view"
  | "offer_view"
  | "exit_intent";

interface TrackPayload {
  event: SalesEvent;
  course_slug: string;
  cta_id?: string;          // hero / sticky / final / faq
  scroll_pct?: number;
  metadata?: Record<string, unknown>;
}

export function trackSalesEvent(payload: TrackPayload) {
  // 1) GA4 / Pixel se configurado
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", payload.event, payload);
  }
  // 2) Facebook Pixel
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("trackCustom", payload.event, payload);
  }
  // 3) Endpoint próprio (futuro: Supabase edge function)
  if (import.meta.env.DEV) {
    console.log("[sales]", payload);
  }
}
```

### 3.2 Hook de Scroll Depth
```tsx
// src/hooks/useScrollDepth.ts
import { useEffect, useRef } from "react";
import { trackSalesEvent } from "@/lib/salesTracking";

export function useScrollDepth(courseSlug: string) {
  const tracked = useRef<Set<number>>(new Set());

  useEffect(() => {
    const handler = () => {
      const scrolled =
        (window.scrollY + window.innerHeight) / document.body.scrollHeight;
      const pct = Math.floor(scrolled * 100);

      [25, 50, 75, 100].forEach((threshold) => {
        if (pct >= threshold && !tracked.current.has(threshold)) {
          tracked.current.add(threshold);
          trackSalesEvent({
            event: "scroll_depth",
            course_slug: courseSlug,
            scroll_pct: threshold,
          });
        }
      });
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [courseSlug]);
}
```

### 3.3 Exit Intent (desktop)
```tsx
useEffect(() => {
  const handler = (e: MouseEvent) => {
    if (e.clientY <= 0) {
      trackSalesEvent({ event: "exit_intent", course_slug: slug });
      // Opcional: abrir modal de captura
    }
  };
  document.addEventListener("mouseleave", handler);
  return () => document.removeEventListener("mouseleave", handler);
}, [slug]);
```

### 3.4 CTA Tracking
Cada `<Button>` de CTA deve disparar:
```tsx
<Button
  onClick={() => trackSalesEvent({
    event: "cta_click",
    course_slug: slug,
    cta_id: "hero",  // ou "sticky", "final", "faq"
  })}
>
  {ctaText}
</Button>
```

---

## 4. SEO ON-PAGE

### 4.1 Meta tags via react-helmet-async
```tsx
import { Helmet } from "react-helmet-async";

<Helmet>
  <title>{course.title} — Master Membros</title>
  <meta name="description" content={course.salesDescription.slice(0, 155)} />

  {/* Open Graph */}
  <meta property="og:type" content="website" />
  <meta property="og:title" content={`${course.title} — Master Membros`} />
  <meta property="og:description" content={course.salesDescription} />
  <meta property="og:image" content={course.ogImage} />
  <meta property="og:url" content={`https://master-membros.com/vendas/${slug}`} />

  {/* Twitter */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={course.title} />
  <meta name="twitter:description" content={course.salesDescription} />
  <meta name="twitter:image" content={course.ogImage} />

  {/* Canonical */}
  <link rel="canonical" href={`https://master-membros.com/vendas/${slug}`} />

  {/* Schema markup */}
  <script type="application/ld+json">
    {JSON.stringify(courseSchema)}
  </script>
</Helmet>
```

### 4.2 Schema markup (Course)
```ts
const courseSchema = {
  "@context": "https://schema.org",
  "@type": "Course",
  "name": course.title,
  "description": course.salesDescription,
  "provider": {
    "@type": "Organization",
    "name": "Master Membros",
    "sameAs": "https://master-membros.com"
  },
  "instructor": {
    "@type": "Person",
    "name": course.instructorName
  },
  "offers": {
    "@type": "Offer",
    "price": course.price,
    "priceCurrency": "BRL",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": course.rating && {
    "@type": "AggregateRating",
    "ratingValue": course.rating.value,
    "reviewCount": course.rating.count
  }
};
```

### 4.3 HTML semântico
- `<h1>` único (headline do hero)
- `<h2>` para títulos de seção
- `<h3>` para subseções
- `<main>` envolve conteúdo principal
- `<section>` para cada bloco
- `<nav>`, `<article>`, `<aside>` quando aplicável

### 4.4 Robots
- Página `/vendas/:courseSlug` = `index, follow`
- Sitemap.xml inclui todas as páginas de vendas ativas

---

## 5. A/B TESTING READY

### 5.1 Estrutura preparada para variantes
```tsx
// src/pages/SalesPage.tsx
const variant = useABVariant(courseSlug, ["headline_v1", "headline_v2"]);

<SalesHero
  headline={
    variant === "headline_v2"
      ? "Versão B da headline"
      : "Versão A da headline"
  }
  {...rest}
/>
```

### 5.2 Hook básico de variant
```tsx
// src/hooks/useABVariant.ts
export function useABVariant<T extends string>(
  key: string,
  variants: T[]
): T {
  const storageKey = `ab:${key}`;

  if (typeof window === "undefined") return variants[0];

  let stored = localStorage.getItem(storageKey) as T | null;
  if (!stored || !variants.includes(stored)) {
    stored = variants[Math.floor(Math.random() * variants.length)];
    localStorage.setItem(storageKey, stored);
    trackSalesEvent({
      event: "page_view",
      course_slug: key,
      metadata: { variant: stored }
    });
  }
  return stored;
}
```

### 5.3 Elementos comumente testados
- Headline (3 variações)
- CTA copy ("QUERO COMEÇAR" vs "GARANTIR MINHA VAGA")
- Cor do botão CTA
- Posição do depoimento
- Preço (de/por vs só por)
- Garantia (7 vs 30 dias)
- Vídeo vs imagem no hero

---

## 6. CHECKLIST DE PERFORMANCE

### Antes do deploy
- [ ] `npm run build` sem erros
- [ ] Bundle da página vendas < 150KB gzip (excluindo imagens)
- [ ] Lighthouse mobile ≥ 90 (Performance)
- [ ] LCP < 2.5s no mobile 4G
- [ ] CLS < 0.1 medido
- [ ] Todas as imagens com `width`/`height`
- [ ] Hero com `fetchPriority="high"`
- [ ] Imagens abaixo da dobra com `loading="lazy"`
- [ ] Vídeo NÃO carrega no SSR (thumbnail + click-to-play)
- [ ] Fontes com `font-display: swap`
- [ ] Preconnect para R2 + YouTube/Vimeo
- [ ] Sem dependências desnecessárias (React Query, Supabase, AWS SDK)
- [ ] Code splitting nas seções pesadas
- [ ] CSS crítico inline (opcional, alto impacto)

### Tracking
- [ ] `page_view` dispara no mount
- [ ] `cta_click` em todos os botões (hero, sticky, final)
- [ ] `scroll_depth` em 25/50/75/100%
- [ ] `video_play` ao clicar no thumbnail
- [ ] `faq_open` ao abrir acordeão
- [ ] `exit_intent` no desktop

### SEO
- [ ] `<title>` único e descritivo (≤ 60 chars)
- [ ] `<meta name="description">` (140-160 chars)
- [ ] Open Graph completo (og:title/description/image/url)
- [ ] Twitter Card completo
- [ ] Canonical URL
- [ ] Schema markup `Course` válido (testar no Rich Results Test)
- [ ] `<h1>` único
- [ ] Hierarquia h1→h2→h3 correta
- [ ] Alt text em todas as imagens

---

## 7. FERRAMENTAS RECOMENDADAS

| Ferramenta | Uso |
|------------|-----|
| **Lighthouse** | Auditoria local (Chrome DevTools) |
| **PageSpeed Insights** | Auditoria pública (dados reais CrUX) |
| **WebPageTest** | Análise detalhada multi-localização |
| **Chrome DevTools — Performance** | Profile manual de runtime |
| **Bundle Analyzer (vite-bundle-visualizer)** | Visualizar bundle size |
| **Rich Results Test (Google)** | Validar schema markup |
| **Wave / axe DevTools** | Acessibilidade |

```bash
# Analisar bundle
npx vite-bundle-visualizer

# Lighthouse CLI
npx lighthouse https://master-membros.com/vendas/exemplo \
  --preset=mobile --view
```

---

## 8. ANTI-PADRÕES (NUNCA FAZER)

- ❌ Carregar React Query / Supabase na página de vendas
- ❌ Imagem sem `width`/`height` (causa CLS)
- ❌ Autoplay de vídeo (penaliza LCP e mobile data)
- ❌ Fontes do Google Fonts CDN (DNS + render block)
- ❌ Múltiplos pixels de tracking sem critério (slow JS)
- ❌ Animações pesadas no scroll (parallax que trava)
- ❌ JavaScript bloqueante no `<head>`
- ❌ CSS inline gigante (use apenas crítico)
- ❌ Bundle único monolítico (sempre code-split)
- ❌ Tracking síncrono que bloqueia clique do CTA

---

## 9. EXEMPLO — PÁGINA OTIMIZADA

```tsx
// src/pages/SalesPage.tsx
import { lazy, Suspense, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { SalesHero } from "@/components/sales/SalesHero";
import { SalesSocialProof } from "@/components/sales/SalesSocialProof";
import { SalesProblem } from "@/components/sales/SalesProblem";
import { SalesCTABar } from "@/components/sales/SalesCTABar";
import { useScrollDepth } from "@/hooks/useScrollDepth";
import { trackSalesEvent } from "@/lib/salesTracking";
import { getCourseBySlug } from "@/data/sales-courses";

const SalesModules = lazy(() => import("@/components/sales/SalesModules"));
const SalesInstructor = lazy(() => import("@/components/sales/SalesInstructor"));
const SalesTestimonials = lazy(() => import("@/components/sales/SalesTestimonials"));
const SalesBonuses = lazy(() => import("@/components/sales/SalesBonuses"));
const SalesGuarantee = lazy(() => import("@/components/sales/SalesGuarantee"));
const SalesOffer = lazy(() => import("@/components/sales/SalesOffer"));
const SalesFAQ = lazy(() => import("@/components/sales/SalesFAQ"));
const SalesFinalCTA = lazy(() => import("@/components/sales/SalesFinalCTA"));

export default function SalesPage() {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const course = courseSlug ? getCourseBySlug(courseSlug) : null;

  useScrollDepth(courseSlug || "unknown");

  useEffect(() => {
    if (courseSlug) {
      trackSalesEvent({ event: "page_view", course_slug: courseSlug });
    }
  }, [courseSlug]);

  if (!course) return <div className="p-12 text-center">Página não encontrada</div>;

  return (
    <>
      <Helmet>
        <title>{course.seoTitle}</title>
        <meta name="description" content={course.seoDescription} />
        <meta property="og:title" content={course.seoTitle} />
        <meta property="og:description" content={course.seoDescription} />
        <meta property="og:image" content={course.ogImage} />
        <link rel="canonical" href={`https://master-membros.com/vendas/${courseSlug}`} />
        <script type="application/ld+json">
          {JSON.stringify(course.schema)}
        </script>
      </Helmet>

      <main>
        <SalesHero {...course.hero} />
        <SalesSocialProof items={course.socialProof} />
        <SalesProblem {...course.problem} />

        <Suspense fallback={<div className="h-96" />}>
          <SalesModules modules={course.modules} />
          <SalesInstructor {...course.instructor} />
          <SalesTestimonials testimonials={course.testimonials} />
          <SalesBonuses bonuses={course.bonuses} />
          <SalesGuarantee {...course.guarantee} />
          <SalesOffer {...course.offer} />
          <SalesFAQ faqs={course.faqs} />
          <SalesFinalCTA {...course.finalCta} />
        </Suspense>
      </main>

      <SalesCTABar
        courseTitle={course.title}
        priceFrom={course.offer.priceFrom}
        priceTo={course.offer.priceTo}
        ctaText={course.offer.ctaText}
        ctaHref={course.offer.ctaHref}
      />
    </>
  );
}
```

---

## 10. METAS DE CONVERSÃO

Benchmarks de mercado de páginas de vendas de cursos:

| Métrica | Ruim | Médio | Bom | Excelente |
|---------|------|-------|-----|-----------|
| Conversion Rate | < 1% | 1-3% | 3-7% | > 7% |
| CTR Hero | < 5% | 5-15% | 15-25% | > 25% |
| Scroll 50% | < 20% | 20-40% | 40-60% | > 60% |
| Tempo médio | < 30s | 30s-1min | 1-3min | > 3min |
| Bounce Rate | > 80% | 60-80% | 40-60% | < 40% |

Otimizar com base em dados, não achismo. Sempre que possível, A/B testar antes de mudar.
