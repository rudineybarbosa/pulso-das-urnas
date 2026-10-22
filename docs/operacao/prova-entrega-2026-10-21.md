# Prova de entrega — fatia vertical v1

**Commit avaliado**: `1ee85a9` (código e docs) · **Data**: 2026-10-21 · **Feature**: `001-apuracao-tempo-real`

Execução no checkout do commit, com `DATA_MODE=fake` para a tela e `SCENARIO=parcial` no simulador. As imagens estão em [`evidencias/`](evidencias/).

## Teste da entrega

| Critério (AT/RF) | Como foi testado | Resultado |
|---|---|---|
| Mapa do Brasil com 27 estados, cores por partido e legenda (AT-005/AT-006, RF-008/019) | e2e `J-01` + screenshot `mapa-brasil.png` | ✅ |
| Drill-down estado → município e **Voltar** por nível (AT-007/AT-009, RF-009..012) | e2e `J-02` | ✅ |
| Busca por estado/cidade com label exato e homônimos (AT-016, RF-026..029) | e2e `busca por cidade` | ✅ |
| Painel de votos por cargo, ordenado, com partido, % e situação (AT-008/AT-014, RF-020..024) | e2e + screenshot `cidade-sao-paulo.png` | ✅ |
| Cinco cargos de 2026 (Presidente, Governador, Senador, Dep. Federal, Dep. Estadual/Distrital) | API `/panorama` e chips da tela | ✅ |
| Cor do estado pelo **maior cargo**, imune ao chip selecionado (RN-006, C2) | teste de API comparando cores com `cargo=1` e `cargo=3` | ✅ |
| Ausência de dado é `null`, não `0` (RN-035, C4) | teste `DF cargo 7` → `nao_aplicavel`, `dados:null` | ✅ |
| `dvt` ausente não vira `Válido` (RN-021, C3) | teste do parser com `dvt` ausente → `Desconhecido` | ✅ |
| Empate com hachura e sem cor de partido (RN-008) | cenário `empate` + `<pattern id="hatch">` | ✅ |
| Corrida com dois cavalos, avanço pela apuração e diferença (AT-020/AT-021) | e2e + screenshot | ✅ |
| Pausa e `prefers-reduced-motion` (AT-024) | e2e verificando `animationName: none` | ✅ |
| Teclado, foco, tabela alternativa paginada e axe (AT-025) | e2e a11y (2) + testes de componente | ✅ |
| Rodapé com fonte, horário e não oficialidade (AT-027, RF-044) | e2e `J-01` | ✅ |
| API com ETag/304 e cache por rota (AT-017/AT-030) | `curl` com `If-None-Match` → 304 | ✅ |
| Cargo/pleito inexistente → 404 Problem Details | `curl` `cargo=99` → `CARGO_NAO_ENCONTRADO` | ✅ |
| Ingestão real do TSE (ETag, catálogo, UFs, cargos) | `pnpm ingest` → 56 requisições, 8 s | ✅ |
| Build e orçamento de bytes (RNF-PERF-04) | `pnpm build` + `pnpm size` → 103,6 KB gz JS / 3,4 KB gz CSS | ✅ |
| Geo e orçamento de malhas (RNF-PERF-05) | `pnpm geo:budget` → Brasil 5,2 KB gz; maior UF 54,6 KB gz | ✅ |
| Clone limpo serve a geometria (C5) | `rm -rf apps/web/public/geo && pnpm build` → `prebuild` recria e build passa | ✅ |
| Terraform dev/prod (RNF-COST) | `terraform fmt -check` + `validate` nos dois envs | ✅ |
| Cobertura (RNF-MAINT-02) | `pnpm test:coverage` → 95,1% linhas, 80,8% branches, 93,5% funções | ✅ |
| Testes unitários/componente | `pnpm test` → 73 testes | ✅ |
| E2E | `pnpm test:e2e` → 9 testes | ✅ |
| Acessibilidade | `pnpm test:a11y` → 2 testes, axe sem violação séria | ✅ |

## Saídas reais

```
install=0  lint=0  types=0  test=0 (73)  coverage=0 (95.1/80.76/93.54)
build=0 (103.76 kB gz JS, 3.44 kB gz CSS)  size=0  e2e=0 (9)  a11y=0 (2)
geo=0  tf-fmt=0  tf-dev=0  tf-prod=0
```

API (fake/parcial):

```
health {"status":"ok"}
panorama 27 estados, modo fake, SP cor PL #0B4EA2
ETag/304 ok
município 3550308: SÃO PAULO, 12 candidatos, status ok
corrida: 2 cavalos, ao_vivo
DF cargo 7: nao_aplicavel
cargo 99: 404 CARGO_NAO_ENCONTRADO
```

## Não testado (e por quê)

- **Deploy em nuvem / URL publicada**: fora do recorte (Q-02); Terraform validado sem apply.
- **Modo real de município fora de SP**: o ingest baixa UFs e cargos, mas só há arquivo municipal capturado para São Paulo; os demais municípios retornam `sem_dado` em real. Fica para v1.1.
- **Cena final com e2e dedicado**: validada no contrato (`interesses: finalizado`) e por screenshot; falta um cenário e2e próprio.
- **Carga k6 / 10.000 usuários**: sem ambiente publicado, não executada.
- **Slug/301, OG pré-renderizado, pleitos passados, SSE**: declarados no backlog v1.1 em [convergencia-2026-10-21.md](convergencia-2026-10-21.md).

## Revisão independente

Revisão sênior em `2e0531f..1498027` apontou 5 críticos (modo real com fixture, cor pelo cargo selecionado, `dvt` ausente virando válido, `null` virando `0`, geo não versionada) e itens importantes. Os críticos e os principais importantes (histerese, corrida sem votos, validação de cargo/pleito, empate, versão por `idg`, foco/tabela, headers/rate limit, Terraform/custo) foram corrigidos nesta entrega. O residual está declarado em “Não testado” e na convergência.
