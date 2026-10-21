---
name: Desempenho web
description: Metas e técnicas de desempenho do Pulso das Urnas — orçamento de bytes, Core Web Vitals, carregamento do TopoJSON, render do mapa, polling eficiente, animação a 60 fps e medição com Lighthouse/Playwright/k6. Use ao criar tela pesada, investigar lentidão ou revisar orçamento.
---

# Desempenho web

Metas (RNF-PERF e RNF-ESC): LCP ≤ 2,5 s p75, INP ≤ 200 ms, CLS ≤ 0,1, JS inicial ≤ 200 KB gz, Brasil ≤ 120 KB gz, estado ≤ 80 KB gz, panorama ≤ 8 KB gz.

## Orçamento

| Recurso | Limite | Onde é medido |
|---|---|---|
| JS inicial | 200 KB gz | `size-limit` |
| CSS | 30 KB gz | `size-limit` |
| Fonte | 32 KB gz | build |
| TopoJSON Brasil | 120 KB gz | `geo:budget` |
| TopoJSON estado | 80 KB gz | `geo:budget` |
| Panorama | 8 KB gz | teste de contrato |

Nenhuma dependência entra sem medir o delta.

## Carregamento

- Rota `/br` não baixa malha de estado.
- Malha do estado é `import()` sob demanda no clique, com cache `immutable`.
- Catálogo de localidades só na primeira busca (idle/`requestIdleCallback`).
- Fonte self-hosted subset, `font-display: swap`.
- Imagens: nenhuma na v1.
- `preconnect` apenas para o próprio host da API.

## Render do mapa

- SVG com `path`; sem filtros, sombras ou blur por polígono.
- Zoom por `transform` no `<g>`; `will-change` só durante a animação.
- Não recalcular projeção a cada frame; `ResizeObserver` com throttle.
- Estados/municípios em `React.memo`; dados mudam por versão, não por objeto novo.

## Polling

- 5 s em apuração; 60 s após o fim; pausa com aba oculta.
- `ETag`/304; jitter de ±20%.
- Nunca recarregar TopoJSON por atualização de votos.
- Não animar contagem numérica (evita custo e “roleta”).

## Animação

- Apenas `transform` e `opacity`.
- Corrida a 10 Hz no máximo, suavizada por mola.
- `prefers-reduced-motion` desliga.
- Meça com DevTools Performance: sem long task > 50 ms no frame.

## Como medir

```bash
pnpm build && pnpm size
pnpm exec lighthouse http://localhost:4173 --preset=desktop
pnpm test:e2e -- --grep performance
k6 run load/panorama.js      # contra ambiente com CDN
```

Registre: data, commit, ambiente, números e conclusão. Sem isso, não há claim.

## Anti-padrões

- Biblioteca de gráficos para desenhar 27 barras.
- Ícone de 200 KB para um botão.
- Re-render do mapa inteiro a cada snapshot.
- `box-shadow` em 5.570 municípios.
- Medir só no desktop potente.
