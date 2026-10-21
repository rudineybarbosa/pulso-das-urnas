# ADR-001 — Stack do frontend: React + Vite + SVG

- **Status:** aceito
- **Data:** 20/10/2026
- **Decisores:** mantenedor do projeto
- **Relacionado:** RNF-PERF, RNF-COMPAT, RF-008..RF-019

## Contexto

O produto é um mapa coroplético interativo com dois níveis (estados e municípios), atualização frequente, painel de votos e animação no rodapé. O público inclui conexões móveis lentas. O orçamento é de 200 KB gz de JS inicial, LCP ≤ 2,5 s e 60 fps nas transições.

Precisamos escolher: (a) framework com SSR, (b) renderização do mapa (SVG, Canvas ou WebGL) e (c) biblioteca de animação.

## Decisão

1. **SPA React 19 + TypeScript + Vite**, com code-splitting por rota e por estado.
2. **Mapa em SVG** gerado com `d3-geo` + `topojson-client`, com um `<path>` por unidade e atributos ARIA.
3. **Sem biblioteca de animação**: CSS transitions para mapa/painéis e uma mola própria (~1 KB) para os cavalos, com WAAPI quando necessário.
4. Estado de navegação na URL; TanStack Query para dados.

## Consequências

**Positivas**
- Bundle inicial controlável (~120 KB gz estimado).
- Cada estado/município é um elemento focável e endereçável — acessibilidade e testes ficam simples.
- Sem SSR significa build e deploy simples, sem servidor Node para o frontend.
- Menos dependências: menos risco de supply chain e menos bytes.

**Negativas**
- SEO limitado a metatags pré-renderizadas no build para as rotas principais (`/br`, `/br/{uf}`).
- Animações complexas exigem implementação própria (mitigado pela mola pequena e testes visuais).

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Next.js (SSR/ISR) | servidor Node adicional, mais custo e complexidade; ganho de SEO irrelevante para o caso |
| MapLibre GL | WebGL, ~200 KB, tiles externos, difícil de tornar acessível por elemento |
| Leaflet | raster, peso e dependência de tiles; menos controle visual |
| Framer Motion | ~35 KB gz para animações que CSS/WAAPI resolvem |

## Evidência

Medição de bundle e Lighthouse na fase 3; se o orçamento estourar, reabrir esta decisão com números.
