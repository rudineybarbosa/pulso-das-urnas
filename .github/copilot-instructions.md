# Instruções para GitHub Copilot — Pulso das Urnas

Leia `AGENTS.md` na raiz. Ele é a fonte das regras de trabalho; este arquivo só resume o essencial para o Copilot.

## Contexto

Painel público de apuração eleitoral em tempo real. SPA React + Vite, API Fastify no Cloud Run, ingestão dos arquivos oficiais do TSE, mapa SVG do Brasil com drill-down até município, cores por partido e animação de corrida de cavalinhos no rodapé.

## Regras que o Copilot deve seguir

1. **Consulte os IDs.** Antes de gerar código, identifique o RF/RN em `docs/requisitos/`. Cite no comentário do PR.
2. **Nunca invente dado eleitoral.** Em modo real, só dado do TSE; falha → último snapshot + selo.
3. **`null` ≠ `0`.** Ausência de dado é `null`; zero votos é `0`.
4. **Só `dvt = "Válido"` define líder.** Anulado, sub judice e legenda não.
5. **Neutralidade.** Sem adjetivo político, sem deboche, sem favorecimento. A cena final é carinhosa.
6. **Acessibilidade.** WCAG 2.2 AA, teclado, `aria-label` completo, tabela alternativa, `prefers-reduced-motion`.
7. **Leveza.** Respeite o orçamento: JS inicial ≤ 200 KB gz, Brasil ≤ 120 KB gz, resposta de panorama ≤ 8 KB gz.
8. **Sem chamada ao TSE no navegador.** Tudo passa pela API cacheada.
9. **Custo.** Nada de recurso com custo fixo mensal sem ADR.
10. **Testes.** Comportamento novo → teste que falha primeiro. Parser novo → fixture real.

## Estrutura

- `apps/web` — UI; `apps/api` — leitura; `apps/ingest` — coleta.
- `packages/domain` — regras puras; `packages/tse` — parser/cliente; `packages/contracts` — Zod/OpenAPI; `packages/geo` — TopoJSON.
- `docs/requisitos` — especificação; `docs/decisoes` — ADRs.
- `.opencode/skills` e `.github/skills` — skills espelhadas (não edite só um lado).

## Comandos

```bash
pnpm dev          # modo fake
pnpm test         # unit + contrato
pnpm test:e2e     # Playwright
pnpm lint         # ESLint/Prettier
pnpm typecheck
pnpm build
```

## Onde aprofundar

- Dados: `docs/requisitos/06-contrato-de-dados-tse.md`
- Regras: `docs/requisitos/04-regras-de-negocio.md`
- Tela e animação: `DESIGN.md` e `docs/requisitos/07-ux-mapa-e-animacoes.md`
- Infra: `docs/requisitos/09-infra-e-terraform.md`
- Skills: `.github/skills/<nome>/SKILL.md`
- Spec Kit: `SPECKIT-USAGE.md`, `.specify/memory/constitution.md` e `specs/001-apuracao-tempo-real/spec.md`

## Agentes e Spec Kit

- Agentes customizados: `.github/agents/*.agent.md` — selecione o especialista no painel ou no Copilot CLI.
- Comandos do Spec Kit: `.github/skills/speckit-*` (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`).
- Fonte dos agentes: `.specify/agents/`. Não edite `.github/agents` à mão; rode `node scripts/sync-agents.mjs`.
- Nenhum agente aplica Terraform, faz push em `main`/`dev` ou lê segredos.
