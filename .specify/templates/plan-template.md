# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x estrito; Node 22 LTS; React 19

**Primary Dependencies**: Vite, Fastify 5, Zod, TanStack Query, d3-geo, topojson-client

**Storage**: Firestore (configuração/ponteiros) + Cloud Storage (snapshots imutáveis); sem banco relacional

**Testing**: Vitest, Testing Library, Playwright, axe, k6

**Target Platform**: navegadores evergreen (desktop e mobile), Cloud Run (Linux, container)

**Project Type**: monorepo web — SPA + API + job de ingestão + pacotes compartilhados

**Performance Goals**: LCP ≤ 2,5 s p75; INP ≤ 200 ms; API p95 ≤ 150 ms na CDN; 60 fps no mapa

**Constraints**: JS inicial ≤ 200 KB gz; panorama ≤ 8 KB gz; 10.000 usuários simultâneos; ≤ US$ 10 na semana eleitoral

**Scale/Scope**: 27 UFs, 5.570 municípios, ~10 cargos por pleito, atualização a cada 5–10 s

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
apps/
├── web/                  # SPA React + Vite
├── api/                  # Fastify 5
└── ingest/               # job de coleta e normalização

packages/
├── domain/               # regras puras (RN)
├── tse/                  # parser, cliente e normalização
├── contracts/            # Zod + OpenAPI
├── geo/                  # TopoJSON e projeção
└── testing/              # fixtures e geradores

data/
├── party-colors.json
├── geo/
└── fixtures/

infra/terraform/
└── envs/{dev,prod}/
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
