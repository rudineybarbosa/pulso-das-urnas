# 12 — Rastreabilidade

Cada requisito funcional tem regra, critério de aceite e artefato de teste. "Status" é o estado da implementação; a coluna só muda por evidência.

## 12.1 Matriz requisito → regra → aceite → teste

| RF | Regras | AT | Artefato de teste | Fase | Status |
|---|---|---|---|---|---|
| RF-001 | RN-001, RN-037 | AT-001, AT-036, AT-040 | `packages/tse/catalog.test.ts`, `apps/ingest/catalog-lifecycle.test.ts` | F2 | planejado |
| RF-002 | RN-003, RN-030, RN-037 | AT-001, AT-031, AT-036, AT-040 | `apps/api/pleitos.test.ts`, `apps/ingest/catalog-lifecycle.test.ts` | F2 | planejado |
| RF-003 | RN-004 | AT-002 | `packages/domain/offices.test.ts` | F2 | planejado |
| RF-004 | RN-004, RN-005 | AT-002 | `packages/domain/offices.test.ts` | F2 | planejado |
| RF-005 | RN-002, RN-031, RN-036 | AT-003, AT-026, AT-038 | `e2e/j03-citar.spec.ts`, `e2e/suplementar.spec.ts` | F3 | planejado |
| RF-006 | RN-005, RN-036 | AT-003, AT-026 | `e2e/j03-citar.spec.ts` | F3 | planejado |
| RF-007 | RN-005 | AT-004 | `packages/domain/featured-office.test.ts` | F2 | planejado |
| RF-008 | RN-006, RN-023, RN-024 | AT-005 | `apps/web/map/BrazilMap.test.tsx` | F3 | planejado |
| RF-009 | — | AT-007 | `e2e/j02-cidade.spec.ts` | F3 | planejado |
| RF-010 | RN-028 | AT-007, AT-037 | `e2e/geometria.spec.ts` | F3 | planejado |
| RF-011 | RN-036 | AT-008, AT-026 | `e2e/j02-cidade.spec.ts` | F3 | planejado |
| RF-012 | — | AT-009 | `e2e/j02-cidade.spec.ts` | F3 | planejado |
| RF-013 | RN-028, RN-035 | AT-010 | `apps/web/map/states.test.tsx` | F3 | planejado |
| RF-014 | RN-006, RN-007, RN-022, RN-038 | AT-006, AT-011 | `packages/domain/color.test.ts` | F2 | planejado |
| RF-015 | RN-006, RN-038 | AT-011 | `packages/domain/hysteresis.test.ts` | F2 | planejado |
| RF-016 | RN-008 | AT-012 | `packages/domain/tie.test.ts` | F2 | planejado |
| RF-017 | RN-028, RN-035 | AT-010 | `apps/web/map/states.test.tsx` | F3 | planejado |
| RF-018 | RN-009, RN-030 | AT-013 | `packages/domain/fallback.test.ts` | F2 | planejado |
| RF-019 | RN-006 | AT-005 | `apps/web/map/Legend.test.tsx` | F3 | planejado |
| RF-020 | RN-010, RN-021, RN-025, RN-026 | AT-008, AT-014 | `apps/web/panel/Candidates.test.tsx` | F3 | planejado |
| RF-021 | — | AT-008, AT-035 | `apps/web/panel/Tabs.test.tsx`, `apps/api/payload-budget.test.ts` | F3 | planejado |
| RF-022 | RN-020 | AT-014 | `apps/web/panel/Summary.test.tsx` | F3 | planejado |
| RF-023 | RN-010 | AT-014 | `packages/domain/share.test.ts` | F2 | planejado |
| RF-024 | RN-029 | AT-014 | `apps/web/panel/CandidateDetail.test.tsx` | F3 | planejado |
| RF-025 | RN-026 | AT-015 | `apps/api/national-ranking.test.ts` | F3 | planejado |
| RF-026 | RN-011 | AT-016 | `e2e/j02-cidade.spec.ts` | F3 | planejado |
| RF-027 | RN-011 | AT-016 | `packages/domain/search.test.ts` | F2 | planejado |
| RF-028 | RN-011, RN-018 | AT-016 | `packages/domain/search.test.ts` | F2 | planejado |
| RF-029 | RN-011 | AT-016 | `apps/web/search/empty.test.tsx` | F3 | planejado |
| RF-030 | RN-012, RN-040 | AT-017, AT-028, AT-034 | `apps/web/queries/polling.test.ts` | F3 | planejado |
| RF-031 | RN-013, RN-034, RN-039 | AT-017 | `apps/web/Freshness.test.tsx` | F3 | planejado |
| RF-032 | RN-013, RN-039 | AT-018, AT-039 | `e2e/erros.spec.ts`, `e2e/offline.spec.ts` | F3 | planejado |
| RF-033 | RN-014 | AT-019 | `e2e/fim.spec.ts` | F3 | planejado |
| RF-034 | RN-012 | AT-017 | `apps/web/Freshness.test.tsx` | F3 | planejado |
| RF-035 | RN-005 | AT-020 | `apps/web/src/features/race/PulseMonitor.tsx`, `e2e/jornadas.spec.ts` | F4 | implementado |
| RF-036 | RN-015 | AT-021 | `packages/domain/src/domain.test.ts` | F4 | implementado |
| RF-037 | RN-015, RN-016, RN-021, RN-033 | AT-022 | `packages/domain/src/domain.test.ts` | F4 | implementado |
| RF-038 | RN-014, RN-033 | AT-023, AT-024 | `e2e/fim.spec.ts`, `PulseMonitor.tsx` | F4 | implementado |
| RF-039 | — | AT-024 | `PulseMonitor.tsx` | F4 | implementado |
| RF-040 | RNF-A11Y-05 | AT-024 | `e2e/jornadas.spec.ts` | F4 | implementado |
| RF-041 | RNF-A11Y-02, RNF-A11Y-03 | AT-025 | `e2e/j05-teclado.spec.ts` | F3 | planejado |
| RF-042 | RN-028, RN-035, RNF-A11Y-06 | AT-025, AT-037 | `e2e/a11y/table.spec.ts` | F3 | planejado |
| RF-043 | RN-018, RN-041 | AT-026 | `e2e/deep-link.spec.ts` | F3 | planejado |
| RF-044 | RNF-LEGAL-01, RNF-LEGAL-02 | AT-027 | `e2e/footer.spec.ts` | F3 | planejado |
| RF-045 | RN-013, RN-035, RN-036 | AT-018, AT-026, AT-039 | `e2e/erros.spec.ts`, `e2e/offline.spec.ts` | F3 | planejado |
| RF-046 | RN-012, RN-037 | AT-023, AT-036, AT-040 | `e2e/pleitos.spec.ts` | F3 | planejado |

Cobertura: RF-001 a RF-046, sem lacuna; todo RN de [04](04-regras-de-negocio.md) aparece em ao menos uma linha (RN-017, RN-019, RN-027, RN-032 e RN-042 em §12.5) e todo AT de [11](11-criterios-de-aceite.md) é citado ao menos uma vez.

## 12.2 Requisitos não funcionais → verificação

| RNF | Como é verificado | Fase |
|---|---|---|
| RNF-PERF-01..03 | Lighthouse CI com throttling (`/br`, `/br/sp`, `/br/sp/sao-paulo`; mobile primário, p75 de 5 execuções) | F3 |
| RNF-PERF-04..05 | `size-limit` + `geo:budget` | F3 |
| RNF-PERF-06 | teste de contrato de payload + AT-035 | F2 |
| RNF-PERF-07 | Playwright trace + DevTools | F3/F4 |
| RNF-PERF-08 | teste de componente (troca de aba ≤ 100 ms) + AT-035 | F3 |
| RNF-PERF-09 | medição por ciclo no ambiente publicado + AT-034 | F5 |
| RNF-ESC-01..07 | k6 + inspeção de CDN + relatório (AT-030, AT-032) | F5 |
| RNF-A11Y-01..07 | axe + teclado + NVDA/VoiceOver manual (AT-025) | F3/F4 |
| RNF-SEC-01..07 | checklist + scanner + revisão de headers | F5 |
| RNF-OBS-01..06 | dashboard e alertas no console | F5/F6 |
| RNF-COST-01..06 | orçamento + relatório de custo | F6 |
| RNF-COMPAT-01..03 | matriz de navegadores + teste em 360 px | F3 |
| RNF-LGPD-01..05 | AT-033 + revisão de código + página de privacidade | F3 |
| RNF-LEGAL-01..03 | AT-027 + revisão editorial | F3 |
| RNF-MAINT-01..06 | CI + revisão de PR | todas |

## 12.3 Documento → fonte

| Documento | Depende de |
|---|---|
| [03 RF](03-requisitos-funcionais.md) | [04 RN](04-regras-de-negocio.md), [07 UX](07-ux-mapa-e-animacoes.md) |
| [06 Contrato](06-contrato-de-dados-tse.md) | TSE (validado em 20/10/2026), [CONTEXT.md](../../CONTEXT.md) |
| [08 Arquitetura](08-arquitetura-e-stack.md) | ADR-001..005 |
| [09 Infra](09-infra-e-terraform.md) | [08](08-arquitetura-e-stack.md), RNF-COST |
| [10 Testes](10-testes-e-dados-falsos.md) | [11 AT](11-criterios-de-aceite.md) |
| [11 AT](11-criterios-de-aceite.md) | [03 RF](03-requisitos-funcionais.md), [04 RN](04-regras-de-negocio.md) |
| [12 Rastreabilidade](12-rastreabilidade.md) | [03](03-requisitos-funcionais.md), [04](04-regras-de-negocio.md), [05](05-requisitos-nao-funcionais.md), [10](10-testes-e-dados-falsos.md), [11](11-criterios-de-aceite.md) |

## 12.4 Regras de manutenção

- Alterou comportamento → atualize RF/RN e esta matriz no mesmo PR.
- Novo cargo ou pleito → nenhuma mudança de código; se exigir, a regra está errada.
- Nova cor de partido → atualize `data/party-colors.json` e o teste de contraste.
- Novo endpoint → contrato em [06](06-contrato-de-dados-tse.md) + teste de contrato + `apiVersion` se incompatível.
- AT ou RN novo sem linha nesta matriz é lacuna de rastreabilidade e deve ser corrigido no mesmo PR.

## 12.5 Critérios e testes sem RF direto

Regras transversais de ingestão, plataforma e operação que não pertencem a um único RF:

| Critério ou teste | Regras | Artefato | Fase |
|---|---|---|---|
| AT-029 — ingestão idempotente, monotônica e retificação | RN-017, RN-027 | `apps/ingest/idempotency.test.ts` | F2 |
| Contrato de caminho e escopo do arquivo TSE | RN-019 | `packages/tse/path.test.ts` | F2 |
| Cliente TSE: limites, condicional, backoff e circuit breaker | RN-032 | `packages/tse/client.test.ts` | F2 |
| Pin e rollback de parser | RN-042 | `apps/ingest/parser-pin.test.ts`, `apps/ingest/schema-failure.test.ts`, `docs/operacao/rollback-parser.md` | F2 |
| AT-030 — cache de CDN e ETag | RNF-ESC-04 | verificação manual `curl -I` no dev | F5 |
| AT-032 — carga de 10.000 VUs | RNF-ESC-01, RNF-ESC-02, RN-040 | `load/panorama.js` + `docs/operacao/carga-*.md` | F5 |

## 12.6 Requisitos da spec → aceite

| Spec | Como é verificado | Artefato | Fase |
|---|---|---|---|
| **FR-014** — sem PII, sem requisição a terceiro, `localStorage` só `pulso:*` | AT-033 | `e2e/privacidade.spec.ts` + HAR e dump de armazenamento no PR | F3 |
| **SC-007** — 5/5 participantes, só teclado e `prefers-reduced-motion`, tarefa "abrir `/br`, identificar o líder do próprio estado, abrir os votos da própria cidade" em ≤ 3 ações e ≤ 60 s | teste de usabilidade de D-049: roteiro com 5 participantes, cronômetro, contagem de ações e comparação dos números com a versão com mouse e animação | `e2e/usabilidade-sc007.md` + `e2e/j05-teclado.spec.ts` | F5 |

Os demais critérios de sucesso da spec já são cobertos pelos ATs mapeados acima: SC-001/SC-002 em AT-025, SC-003 em AT-017, SC-004 em RNF-PERF-01..03, SC-005 em AT-032, SC-006 em RNF-COST e SC-008 em AT-006 e AT-015.
