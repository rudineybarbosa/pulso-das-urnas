# Pulso das Urnas — guia de desenvolvimento

Gerado a partir dos planos de feature. Última atualização: 2026-10-20.

## Tecnologias ativas

- **Web:** React 19, TypeScript estrito, Vite, TanStack Query, d3-geo, topojson-client, CSS/WAAPI.
- **API:** Fastify 5, Node 22, Zod, OpenAPI, Problem Details.
- **Ingestão:** Node 22, job em Cloud Run, ETag, snapshots no Cloud Storage.
- **Dados:** Firestore (configuração/ponteiros) + Cloud Storage (snapshots imutáveis). Sem banco relacional.
- **Infra:** Terraform 1.9+, Google Cloud (Cloud Run, Scheduler, Firestore, GCS), Firebase Hosting, GitHub Actions com WIF.
- **Testes:** Vitest, Testing Library, Playwright, axe, k6.

## Estrutura

```text
apps/web        SPA
apps/api        API de leitura
apps/ingest     coleta e normalização
packages/domain regras puras
packages/tse    parser e cliente do TSE
packages/contracts Zod + OpenAPI
packages/geo    TopoJSON
data/           cores, malhas e fixtures
infra/terraform dev e prod
```

## Comandos

```bash
pnpm install
pnpm dev          # modo fake
pnpm test
pnpm test:e2e
pnpm lint
pnpm typecheck
pnpm build
pnpm size
node scripts/check-skills.mjs
node scripts/sync-agents.mjs --check
node scripts/check-links.mjs
```

## Estilo

- TypeScript `strict`; sem `any` implícito; regras puras sem I/O.
- Componentes apresentam; servidor decide.
- Acessibilidade WCAG 2.2 AA e `prefers-reduced-motion` em toda tela.
- Textos em pt-BR; código em inglês.

## Mudanças recentes

- Especificação inicial e constituição (v1.0.0).
- Spec Kit, agentes e skills adaptados para Node/React/GCP.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
