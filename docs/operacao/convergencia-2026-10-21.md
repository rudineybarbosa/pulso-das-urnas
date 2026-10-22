# Convergência — fatia vertical v1

**Data**: 2026-10-21 · **Feature**: `001-apuracao-tempo-real` · **Base**: [spec](../specs/001-apuracao-tempo-real/spec.md), [plan](../specs/001-apuracao-tempo-real/plan.md), [tasks](../specs/001-apuracao-tempo-real/tasks.md) e [grilling](../specs/001-apuracao-tempo-real/grilling.md)

## Escopo avaliado

A convergência compara o código com o **recorte aprovado no grill-me**: fatia vertical end-to-end com contratos, domínio, parser do TSE, API, mapa, busca, painel, corrida, testes e Terraform validado, em modo fake e real (snapshots do ingest).

## Evidências executadas

| Verificação | Comando | Resultado |
|---|---|---|
| Tipos | `pnpm typecheck` | ok |
| Lint/format | `pnpm lint` | ok |
| Unidade/contrato | `pnpm test` | 73 testes |
| Cobertura | `pnpm test:coverage` | 95,1% linhas · 80,8% branches · 93,5% funções |
| E2E | `pnpm test:e2e` | 9 testes |
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
| FR-005 painel de votos | Parcial | `ScopePanel`; em real, município só tem arquivo próprio para SP |
| FR-006 busca | Implementado | `SearchCombobox`; e2e |
| FR-007 atualização/frescor | Parcial | três idades; falta `fonte_sem_atualizacao` |
| FR-008 corrida | Implementado | `RaceTrack`; e2e |
| FR-009 pausa/reduced motion | Implementado | botão + media query; e2e |
| FR-010 teclado/tabela | Parcial | foco/Esc/tabela paginada; falta setas/`aria-live` agregado |
| FR-011 URL | Parcial | URL por UF/IBGE; slug/301 e OG pré-renderizado ficam para v1.1 |
| FR-012 fonte/não oficialidade | Implementado | rodapé + `index.html` |
| FR-013 degradação | Implementado | estados de ausência e mensagens |
| FR-014 sem PII | Implementado | sem cookies/terceiros; `localStorage` só pausa |
| FR-015 pleitos passados | Fora da fatia | seletor 2026; backlog v1.1 |
| FR-016 URL canônica | Parcial | IBGE aceito; slug/301 no backlog v1.1 |

## Lacunas fora da fatia (backlog v1.1)

1. Slug canônico com 301 e aliases (FR-016).
2. OG/Twitter pré-renderizado para 128 rotas.
3. Pleitos passados/arquivados no seletor.
4. Cena final com e2e dedicado (hoje validada no contrato + screenshot).
5. SSE/telão e deploy em nuvem (Q-04/Q-02).

Nenhuma lacuna acima bloqueia a fatia entregue; todas estão fora do recorte aprovado no grill-me.

## Conclusão

**Convergente para a fatia vertical.** Prova em [prova-entrega-2026-10-21.md](prova-entrega-2026-10-21.md). Nenhuma tarefa nova foi anexada; as lacunas são de escopo posterior e estão registradas para o backlog.
