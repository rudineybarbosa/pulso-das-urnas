# Implementation Plan: Apuração em tempo real

**Branch**: `001-apuracao-tempo-real` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-apuracao-tempo-real/spec.md`, decisões do [grill-me](grilling.md) e requisitos em `docs/requisitos/`.

## Summary

Entregar a v1 vertical do Pulso das Urnas: um monorepo TypeScript com regras puras, parser dos arquivos oficiais do TSE, API cacheável, job de ingestão, SPA com mapa SVG do Brasil, drill-down até município, painel de votos, busca e corrida de cavalinhos, com modo fake local e testes automatizados. Infraestrutura em Terraform fica pronta e validada, sem apply.

## Technical Context

**Language/Version**: TypeScript 5.6 estrito; Node 22 LTS

**Primary Dependencies**: React 19, Vite 6, TanStack Query 5, d3-geo 3, topojson-client 3, Fastify 5, Zod 3

**Storage**: sistema de arquivos em dev (`data/snapshots`, `data/geo`); Firestore + Cloud Storage na arquitetura de produção (não aplicados nesta execução)

**Testing**: Vitest 2, Testing Library, Playwright 1.49, axe-core, size-limit

**Target Platform**: navegadores evergreen; Node 22 no servidor

**Project Type**: monorepo web (SPA + API + ingestão + pacotes)

**Performance Goals**: LCP ≤ 2,5 s p75; INP ≤ 200 ms; JS inicial ≤ 200 KB gz; panorama ≤ 8 KB gz; 60 fps no mapa/corrida

**Constraints**: 10.000 usuários simultâneos; staleness ≤ 30 s; custo ≤ US$ 10 na semana; sem banco relacional

**Scale/Scope**: 27 UFs, 5.570 municípios, 5 cargos por pleito, atualização de 5–10 s

## Constitution Check

| Princípio | Como o plano atende |
|---|---|
| I. Rastreabilidade | Cada tarefa cita RF/RN/AT; matriz em `12-rastreabilidade.md` |
| II. Backlog | Tickets/tarefas em `tasks.md`; spec e plano canônicos |
| III. Arquitetura | React/Vite, Fastify, Firestore/GCS, Terraform; regra no servidor; sem Java/ORM |
| IV. Dados e acessibilidade | TSE oficial, `null` ≠ `0`, cinco estados, WCAG 2.2 AA e reduced motion |
| V. Evidência | TDD, testes por AT, revisão e prova de entrega antes de concluir |
| Custos | Nenhum recurso pago aplicado; Terraform validado |

Sem violações que exijam exceção.

## Project Structure

### Documentation

```text
specs/001-apuracao-tempo-real/
├── spec.md
├── plan.md
├── tasks.md
├── research.md
├── grilling.md
└── checklists/
```

### Source Code

```text
apps/
├── web/                  # React + Vite
│   ├── src/features/{map,panel,search,race,freshness}
│   ├── src/components/
│   ├── src/queries/
│   └── src/routes/
├── api/                  # Fastify 5
│   ├── src/routes/
│   ├── src/services/
│   ├── src/repositories/
│   └── src/plugins/
└── ingest/               # CLI de coleta e normalização

packages/
├── domain/               # regras puras
├── tse/                  # parser e cliente
├── contracts/            # Zod + tipos
└── geo/                  # TopoJSON e projeção

data/
├── geo/                  # br.topo.json, uf/*.topo.json
├── fixtures/tse/
├── snapshots/            # gerado pelo fake/ingest (gitignored)
└── party-colors.json

infra/terraform/
└── modules/ + envs/{dev,prod}/
```

**Structure Decision**: monorepo pnpm com apps finos e pacotes puros; o web nunca importa `packages/tse`.

## Phases

### Fase 0 — Fundação
Workspace pnpm, TypeScript, Vitest, ESLint/Prettier, scripts raiz, `.gitignore`, `size-limit`.

### Fase 1 — Contratos e domínio
Tipos e schemas do envelope, snapshot, escopo e cargo. Regras: hierarquia, líder, cor, histerese, percentual, estados de ausência, busca normalizada, matemática da corrida, canonicalização de URL.

### Fase 2 — TSE e dados falsos
Parser do catálogo, `-u.json`, `-ab.json`, `mun-cm.json`; normalizador; cliente com ETag/limites; fixtures reais; `FakeSource` com cenários (`sem-votos`, `parcial`, `virada`, `empate`, `fim`); snapshots em disco.

### Fase 3 — API
Fastify com `/pleitos`, `/panorama`, `/escopos/{uf}`, `/municipios/{ibge}`, `/corrida`, `/localidades`, `/healthz`, `/readyz`; ETag, cache, Problem Details, rate limit; fonte injetável.

### Fase 4 — Geo
Script que baixa malhas do IBGE, simplifica para TopoJSON, gera `br.topo.json` e `uf/*.topo.json` com metadados; orçamento de bytes.

### Fase 5 — Web: mapa e busca
SPA, roteamento por URL, mapa do Brasil, zoom para estado, municípios, botão Voltar, busca normalizada, legenda, tooltip, tabela alternativa, foco e teclado.

### Fase 6 — Web: painel e frescor
Painel por cargo, candidatos ordenados, resumo, abas, atualização automática, selo de frescor, estados de erro/offline.

### Fase 7 — Corrida
Dois cavalos, posição por apuração e diferença, histerese, relincho, cena final, pausa, reduced motion, testes visuais.

### Fase 8 — Qualidade
Testes unitários, contrato, componente, e2e, axe, orçamento de bytes; cobertura ≥ 80% global e ≥ 90% em domínio/TSE.

### Fase 9 — Infra
Módulos Terraform, ambientes dev/prod, validação e plano; sem apply.

### Fase 10 — Convergência e entrega
`/speckit.converge`, revisão independente, correções, `prova-de-entrega`, commits semânticos.

## Testing Strategy

- **Unidade**: regras e parser com fixtures reais.
- **Contrato**: schemas Zod e respostas da API.
- **Componente**: mapa, painel, busca, corrida.
- **E2E**: jornadas J-01..J-05 em `DATA_MODE=fake`.
- **A11y**: axe + teclado + reduced motion.
- **Visual**: screenshot dos estados do mapa e da cena final.

## Risks

| Risco | Mitigação |
|---|---|
| Malhas do IBGE grandes/lentas | simplificação e orçamento no build; fallback para estados |
| Divergência entre fake e real | mesmo contrato e testes de contrato nas duas fontes |
| Animação com jank | transform/opacity, 10 Hz, mola própria |
| Escopo grande para uma sessão | fatia vertical; tasks pequenas e verificáveis |
| Sem app publicado | prova de entrega em localhost, documentada |

## Complexity Tracking

Nenhuma violação da constituição. O monorepo é justificado por três executáveis e quatro pacotes compartilhados; um projeto único duplicaria contratos e regras.
