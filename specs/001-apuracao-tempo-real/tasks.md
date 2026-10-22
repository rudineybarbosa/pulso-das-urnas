---
description: "Task list for the Pulso das Urnas v1 vertical slice"
---

# Tasks: Apuração em tempo real — v1

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [grilling.md](grilling.md)

**Prerequisites**: plan.md, spec.md, docs/requisitos/06 e 10, fixtures reais

**Tests**: obrigatórios para comportamento (constituição II).

**Organization**: por fase; `[P]` = paralelizável; `[USn]` = história.

## Fase 0 — Fundação

- [X] T001 Criar `package.json` raiz, `pnpm-workspace.yaml`, `tsconfig.base.json` e scripts (`dev`, `test`, `lint`, `typecheck`, `build`, `size`). Verificar: `pnpm install`.
- [X] T002 [P] Configurar ESLint flat, Prettier, Vitest (workspace) e `size-limit`. Verificar: `pnpm lint` e `pnpm test` vazios passam.
- [X] T003 [P] Atualizar `.gitignore` para `data/snapshots`, `dist`, `coverage`, `playwright-report`. Verificar: `git status` limpo após build.

## Fase 1 — Contratos e domínio

- [X] T004 [P] `packages/contracts`: schemas Zod do envelope, pleito, escopo, cargo, candidato, snapshot, corrida e erros. Verificar: teste de parse dos exemplos do contrato.
- [X] T005 [P] `packages/domain/offices.ts`: hierarquia RN-005, destaque e cargos por escopo (RN-004). Verificar: tabela de casos.
- [X] T006 [P] `packages/domain/leader.ts`: elegibilidade (RN-021), líder, empate e ordenação (RN-026). Verificar: casos com fixture.
- [X] T007 [P] `packages/domain/color.ts`: cor do estado, histerese (RN-038), contraste (RN-024) e fallback de partido (RN-023). Verificar: 0 voto branco, sem dado cinza, empate hachura.
- [X] T008 [P] `packages/domain/share.ts`: base única de percentual e arredondamento (RN-010). Verificar: soma 100 ± 0,1.
- [X] T009 [P] `packages/domain/absence.ts`: cinco estados e precedência (RN-035). Verificar: casos de `null`/`0`/sem elegível.
- [X] T010 [P] `packages/domain/search.ts`: normalização, ranking e slug canônico (RN-011/RN-041). Verificar: acentos, sigla, homônimos.
- [X] T011 [P] `packages/domain/race.ts`: geometria com `d` assinado, histerese, cooldown e fim (RN-015/016/038). Verificar: AT-021/AT-022.
- [X] T012 Testes de domínio cobrindo T005–T011. Verificar: `pnpm test packages/domain` verde, cobertura ≥ 90%.

## Fase 2 — TSE e dados falsos

- [X] T013 Capturar fixtures reais (catálogo, BR/SP/cidade, governador, 2º turno, `-ab`, municípios) com `manifest.json` (url, data, sha256, parserVersion). Verificar: manifesto completo.
- [X] T014 [P] `packages/tse/catalog.ts`: parse do `ele-c.json`. Verificar: pleitos 3220/3221 e cargos 1/3/5/6/7/8.
- [X] T015 [P] `packages/tse/result.ts`: parse de `-u.json` (agr/par/cand, `dvt`, `vap`, `idg`). Verificar: fixture SP.
- [X] T016 [P] `packages/tse/config.ts`: parse de `-ab.json` e `mun-cm.json` (TSE↔IBGE). Verificar: 5.570 municípios.
- [X] T017 `packages/tse/normalize.ts`: snapshot interno com fonte, idades, `percentualBase`, origem e status. Verificar: golden file.
- [X] T018 `packages/tse/client.ts`: ETag, 304, backoff, circuit breaker e ≤ 5 rps. Verificar: teste com servidor fake.
- [X] T019 `packages/tse/fake-source.ts`: cenários `sem-votos`, `parcial`, `virada`, `empate`, `fim`, `erro-fonte`, `dois-turnos`, determinístico por seed. Verificar: snapshots coerentes.
- [X] T020 `packages/tse/snapshots.ts`: ler/gravar snapshots em `data/snapshots` com ponteiro e idempotência. Verificar: mesmo `idg` não regrava.
- [X] T021 Testes de contrato e parser para T014–T020. Verificar: todas as fixtures parseiam; `null` ≠ `0`.

## Fase 3 — API

- [X] T022 `apps/api`: Fastify, plugins de erro (Problem Details), requestId, cache e rate limit. Verificar: `/healthz`.
- [X] T023 [P] Rotas `/pleitos` e `/panorama` com ETag e cache. Verificar: 200 e 304.
- [X] T024 [P] Rotas `/escopos/{uf}`, `/municipios/{ibge}` e `/cargos`. Verificar: 200 com `dados:null` para ausência.
- [X] T025 [P] Rota `/corrida` e `/localidades`. Verificar: payload e cache.
- [X] T026 Fonte injetável `real|fake` por `DATA_MODE`; bootstrap do catálogo e snapshots. Verificar: `pnpm dev` sobe sem TSE.
- [X] T027 Testes de API (contrato, 304, 404, ausência, rate limit). Verificar: verdes.

## Fase 4 — Geo

- [X] T028 `scripts/geo/build.mjs`: baixar malhas do IBGE, simplificar e gerar TopoJSON (Brasil + 27 UFs) com `meta.json`. Verificar: arquivos existem e parseiam.
- [X] T029 `packages/geo`: projeção, centroides e carregamento sob demanda. Verificar: budgets (Brasil ≤ 120 KB gz; UF ≤ 80 KB gz).
- [X] T030 Geração real dos arquivos em `data/geo`. Verificar: `pnpm geo:budget` verde.

## Fase 5 — Web: mapa e busca (US1, US2)

- [X] T031 `apps/web`: Vite, React, roteador por URL, QueryClient, layout e fontes. Verificar: `pnpm build`.
- [X] T032 [P] [US1] `BrazilMap` com 27 estados, cores por API, tooltip e legenda. Verificar: AT-005/AT-006.
- [X] T033 [P] [US1] `StateMap` com municípios, zoom 600 ms, foco e "Voltar". Verificar: AT-007/AT-009.
- [X] T034 [P] [US2] `SearchCombobox` com label exato, normalização e homônimos. Verificar: AT-016.
- [X] T035 [P] [US1] Legenda, tabela alternativa paginada e estados de ausência. Verificar: AT-010/AT-025.
- [X] T036 [US1] Acessibilidade do mapa: teclado, foco após zoom/voltar, `aria-live` agregado. Verificar: axe + teclado.

## Fase 6 — Painel e frescor (US2, US5)

- [X] T037 [US2] `ScopePanel` com candidatos, abas por cargo, resumo e detalhe. Verificar: AT-008/AT-014.
- [X] T038 [US5] `FreshnessBadge` com três idades, polling e selo de desatualizado. Verificar: AT-017.
- [X] T039 [US5] Estados de erro, offline, 404 e toast de troca de pleito. Verificar: AT-018/AT-039.

## Fase 7 — Corrida (US3)

- [X] T040 [US3] `RaceTrack` com dois cavalos, cores, números e `aria-label`. Verificar: AT-020.
- [X] T041 [US3] Posição por apuração e diferença assinada, mola e 10 Hz. Verificar: AT-021.
- [X] T042 [US3] Ultrapassagem, balão "Relincho!" e anúncio. Verificar: AT-022.
- [X] T043 [US3] Cena final, `sessionStorage`, "Rever cena", pausa e reduced motion. Verificar: AT-023/AT-024.
- [X] T044 Testes de componente e e2e da corrida. Verificar: `e2e/j04`, `e2e/fim`, `reduced-motion`.

## Fase 8 — Qualidade

- [X] T045 Testes de componente do mapa, painel, busca e legenda. Verificar: verdes.
- [X] T046 E2E das jornadas J-01..J-05 e erros em modo fake. Verificar: `pnpm test:e2e`.
- [X] T047 A11y: axe, teclado, contraste e reduced motion. Verificar: zero violação séria.
- [X] T048 Gates de cobertura ≥ 80% (90% domínio/TSE) e size-limit. Verificar: `pnpm test --coverage` e `pnpm size`.

## Fase 9 — Infra

- [X] T049 Módulos Terraform (apis, artifact, data, runtime, scheduler, hosting, observability). Verificar: `terraform validate`.
- [X] T050 Ambientes dev/prod, backend GCS e budget. Verificar: `terraform fmt -check` e `plan` local sem apply.

## Fase 10 — Convergência e entrega

- [X] T051 Rodar `/speckit.converge` e corrigir divergências. Verificar: relatório limpo.
- [X] T052 Revisão independente (`requesting-code-review`) e correções. Verificar: sem bloqueios.
- [X] T053 `prova-de-entrega`: testar cada AT da fatia na URL local e registrar no PR/relatório. Verificar: tabela critério × teste × resultado.
- [X] T054 Commits semânticos e verificação final (`lint`, `typecheck`, `test`, `e2e`, `build`). Verificar: árvore limpa.

## Notas de execução

- `pnpm dev` sobe API + web; `DATA_MODE=fake` é o padrão e `real` lê `data/snapshots/raw` quando o ingest já rodou.
- Cinco cargos de 2026 suportados na demo: Presidente, Governador, Senador, Dep. Federal e Dep. Estadual/Distrital.
- A cena final é validada no contrato da corrida (`interesses: finalizado`); a animação visual é coberta por screenshot, não por e2e dedicado.
- Deploy em nuvem fora do recorte (Q-02): Terraform validado em dev e prod, sem apply.
