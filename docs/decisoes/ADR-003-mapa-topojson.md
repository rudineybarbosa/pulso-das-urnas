# ADR-003 — TopoJSON simplificado, gerado no build e versionado

- **Status:** aceito
- **Data:** 20/10/2026
- **Relacionado:** RF-008..RF-010, RNF-PERF-05

## Contexto

O mapa precisa de 27 estados e de até 645 municípios por estado, com clique, foco e troca de cor. As malhas do IBGE em GeoJSON "intermediária" somam ~251 KB para o Brasil e ~1 MB para São Paulo, o que estouraria o orçamento se baixado cru a cada visita.

## Decisão

- Script `scripts/geo/build.mjs` baixa as malhas do IBGE (país e 27 UFs) em qualidade `intermediaria`.
- Simplifica com `mapshaper` (topologia preservada, ~8–12% dos pontos) e converte para **TopoJSON quantizado** (1e5).
- Gera:
  - `data/geo/br.topo.json` (≤ 120 KB gz);
  - `data/geo/uf/{ibge}.topo.json` (≤ 80 KB gz cada);
  - `data/geo/meta.json` com centroides, bounding boxes e lista de municípios.
- Os arquivos são **commitados** e servidos com `Cache-Control: immutable`.
- O build de produção verifica os orçamentos de bytes e falha se estourar.
- O script registra a URL e o hash de origem de cada malha.

## Consequências

**Positivas**
- Sem dependência de rede no runtime nem no build de produção.
- Geometria determinística entre ambientes e testes visuais estáveis.
- Troca de estado carrega só o arquivo daquele estado.

**Negativas**
- Arquivos binários-texto no git (≈ 2 MB no total); mudanças de malha geram diffs grandes.
- Simplificação pode alterar a forma de municípios pequenos; a legenda/tooltip garante a identificação.

## Alternativas

| Alternativa | Por que não |
|---|---|
| GeoJSON cru do IBGE | 10× maior |
| Baixar malha em runtime | dependência externa, latência e risco |
| Tiles vetoriais (PMTiles) | complexidade de infra e hosting; ganho irrelevante para 27 + 645 polígonos |
| TopoJSON sem simplificação | ainda pesado no celular |

## Evidência

`pnpm geo:budget` no CI com os tamanhos reais após a geração.
