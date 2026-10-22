# Convergência — fatia vertical v1

**Data**: 2026-10-21 · **Feature**: `001-apuracao-tempo-real` · **Base**: [spec](../../specs/001-apuracao-tempo-real/spec.md), [plan](../../specs/001-apuracao-tempo-real/plan.md), [tasks](../../specs/001-apuracao-tempo-real/tasks.md) e [grilling](../../specs/001-apuracao-tempo-real/grilling.md)

## Escopo avaliado

A convergência compara o código com o **recorte aprovado no grill-me**: fatia vertical end-to-end com contratos, domínio, parser do TSE, API, mapa, busca, painel, corrida, testes e Terraform validado, em modo fake e real (snapshots do ingest).

## Evidências executadas

| Verificação | Comando | Resultado |
|---|---|---|
| Tipos | `pnpm typecheck` | ok |
| Lint/format | `pnpm lint` | ok |
| Unidade/contrato | `pnpm test` | 73 testes |
| Cobertura | `pnpm test:coverage` | 95,1% linhas · 80,8% branches · 93,5% funções |
| E2E | `pnpm test:e2e` | 13 testes |
| Acessibilidade | `pnpm test:a11y` | 2 testes, axe sem violação séria |
| Build | `pnpm build` | 103,1 KB gz JS · 3,3 KB gz CSS |
| Orçamento | `pnpm size` | dentro de 200/30 KB |
| Geo | `pnpm geo:budget` | Brasil 5,2 KB gz; maior UF 54,6 KB gz |
| Terraform dev | `terraform validate` | ok |
| Terraform prod | `terraform validate` | ok |
| Ingestão real | `pnpm ingest` | 56 requisições, 8 s, 56 arquivos |

## Cobertura dos requisitos da fatia

| Requisito | Situação | Evidência |
|---|---|---|
| FR-001 catálogo/cargos | Implementado | 27 UFs; 5 cargos de 2026; `/pleitos` |
| FR-002 maior cargo/cor | Implementado | `packages/domain/offices.ts` + `panorama` |
| FR-003 estados de cor | Implementado | mapa + `resolveStatus`; a11y/e2e |
| FR-004 drill-down | Implementado | `BrazilMap`/`StateMap`; e2e J-02 |
| FR-005 painel de votos | Implementado | `ScopePanel`; em real, município é buscado on-demand no TSE com cache |
| FR-006 busca | Implementado | `SearchCombobox`; e2e |
| FR-007 atualização/frescor | Parcial | três idades; falta `fonte_sem_atualizacao` |
| FR-008 corrida | Implementado | `RaceTrack`; e2e |
| FR-009 pausa/reduced motion | Implementado | botão + media query; e2e |
| FR-010 teclado/tabela | Parcial | foco/Esc/tabela paginada; falta setas/`aria-live` agregado |
| FR-011 URL/OG | Implementado | slug canônico + redirect de IBGE; 5.785 rotas com OG no build |
| FR-012 fonte/não oficialidade | Implementado | rodapé + `index.html` |
| FR-013 degradação | Implementado | estados de ausência e mensagens |
| FR-014 sem PII | Implementado | sem cookies/terceiros; `localStorage` só pausa |
| FR-015 pleitos passados | Bloqueado na fonte | o TSE não serve mais os arquivos de 2022 (404); sem dado não se inventa |
| FR-016 URL canônica | Parcial | IBGE aceito; slug/301 no backlog v1.1 |

## Residual fechado nesta rodada

1. Município real em qualquer UF: API busca o arquivo municipal no TSE on-demand, com cache de 30 s e single-flight (testado com Rio de Janeiro).
2. Cena final: e2e dedicado no projeto `fim`, com `SCENARIO=fim`.
3. URL canônica: IBGE redireciona para slug; slug abre o painel; 5.785 rotas com OG/Twitter geradas no build.
4. SSE (`/api/v1/stream`) e modo telão (`/telao`) implementados e verificados.
5. Script k6 de 10.000 VUs em `load/panorama.js` (não executado sem ambiente publicado).

## Bloqueios externos

- **Pleitos passados**: o TSE responde 404 para os arquivos de 2022; sem fonte não há resultado real para exibir.
- **Deploy em nuvem**: Q-02 (projeto/billing) continua aberta; Terraform validado sem apply.

Nenhum bloqueio acima permite inventar dado ou aplicar infraestrutura sem decisão humana.

## Conclusão

**Convergente para a fatia vertical.** Prova em [prova-entrega-2026-10-21.md](prova-entrega-2026-10-21.md). Nenhuma tarefa nova foi anexada; as lacunas são de escopo posterior e estão registradas para o backlog.
