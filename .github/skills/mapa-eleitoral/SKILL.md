---
name: Mapa eleitoral
description: Construir ou alterar o mapa do Brasil e dos estados (SVG, d3-geo, TopoJSON), zoom, clique, busca de estados/cidades, cores por partido, legenda, tabela alternativa e navegação por teclado. Use em qualquer tarefa de tela que envolva mapa, cor de estado, municípios ou drill-down.
---

# Mapa eleitoral

Leia `DESIGN.md` (§4 e §5) e `docs/requisitos/07-ux-mapa-e-animacoes.md`.

## Estrutura

- `BrazilMap`: 27 `path` a partir de `data/geo/br.topo.json`.
- `StateMap`: municípios de `data/geo/uf/{ibge}.topo.json`, carregado sob demanda.
- Projeção `geoMercator().fitSize([w,h], featureCollection)`; recalcule no resize com `ResizeObserver` (throttle 150 ms).
- Zoom por `transform` no `<g>`; não reprojete a geometria.
- Cada polígono: `tabindex="0"`, `role="button"`, `aria-label` completo.

## Cores

- A cor vem pronta da API (`estados[].cor`); o componente não decide partido.
- Estados: branco = sem voto; cinza = sem dado; hachura = empate; cor = líder.
- Texto sobre a cor: `cor.texto` calculado no servidor (RN-024).
- Transição de 400 ms ao mudar de cor; nada de flash.

## Interação

| Ação | Efeito |
|---|---|
| Clique/Enter | estado → zoom + municípios; município → painel |
| Esc / "Voltar" | um nível acima |
| Setas | foco entre polígonos |
| `Home` | Brasil |
| `+`/`-` | zoom visual |

- Bloqueie cliques por 250 ms durante o zoom.
- Um toque navega (não exija duplo toque).
- Nunca use `div` clicável no lugar de `<path>`/`<button>`.

## Performance

- Não renderize 645 municípios com filtros por ponto no JS; use `path` simples e `will-change: transform` só durante o zoom.
- Carregue o TopoJSON do estado só quando o estado for selecionado.
- Falhe o build se `geo:budget` estourar (Brasil ≤ 120 KB gz; estado ≤ 80 KB gz).

## Acessibilidade

- `<svg role="img" aria-labelledby>` + descrição textual.
- Região com instruções: "Mapa dos estados. Use as setas para navegar e Enter para abrir."
- `aria-live` para mudança de líder (máx. 1/10 s).
- Tabela alternativa com os mesmos dados.
- Teste com teclado e axe antes de concluir.

## Antes de concluir

- [ ] `pnpm test apps/web/map` verde.
- [ ] `e2e/j02-cidade.spec.ts` e `e2e/j05-teclado.spec.ts` verdes.
- [ ] Screenshot dos estados sem voto, parcial, empate e final aprovado.
- [ ] Sem `any`, sem cálculo de partido no cliente.
