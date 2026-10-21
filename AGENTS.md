# Pulso das Urnas — guia de trabalho

Este repositório é um painel público de acompanhamento da apuração eleitoral brasileira. Código, nomes de variáveis, tipos e mensagens de commit em **inglês**; telas, documentação de produto e comunicação em **pt-BR**.

## Ordem de leitura

1. [README.md](README.md) — índice.
2. [CONTEXT.md](CONTEXT.md) — vocabulário do domínio (não invente sinônimos).
3. [docs/requisitos/](docs/requisitos/) — requisitos com IDs; a implementação referencia o ID que atende.
4. [docs/decisoes/](docs/decisoes/) — ADRs. Um ADR `proposed` não autoriza implementar a decisão como se estivesse aprovada.
5. [SPECKIT-USAGE.md](SPECKIT-USAGE.md) e [docs/agents/agent-tools.md](docs/agents/agent-tools.md) — Spec Kit, agentes e onde cada ferramenta os encontra.
6. O `AGENTS.md` da pasta que você vai alterar (`web/AGENTS.md`, `api/AGENTS.md`, ...), quando existir.

## Regras invioláveis

- **Dado eleitoral nunca é inventado em modo real.** Se a fonte falhar, sirva o último snapshot com o horário dele e marque como desatualizado. Números simulados só existem em `DATA_MODE=fake`.
- **Neutralidade.** Nenhum texto, cor, ordem ou animação pode favorecer candidato, partido ou campo político. A ordem padrão é sempre por votos; empates são explícitos.
- **Fonte e horário sempre visíveis.** Toda tela que mostra número mostra de onde veio e de quando é.
- **Acessibilidade não é opcional.** WCAG 2.2 AA, navegação por teclado no mapa, `prefers-reduced-motion` e alternativa em tabela.
- **Sem dados pessoais.** Não coletamos nome, e-mail, IP persistido, localização precisa nem cookie de rastreio.
- **Orçamento.** Nenhuma mudança pode estourar o teto de custo de [RNF-COST](docs/requisitos/05-requisitos-nao-funcionais.md). Se precisar de um recurso pago, registre no PR com estimativa.
- **Citação da fonte.** "Fonte: TSE" com link e horário; nunca sugerir vínculo oficial.

## Fluxo de trabalho

1. **Ticket antes de código.** Cada mudança nasce de um ticket com critério de aceite observável e link para o RF/RN que atende.
2. **Spec é a fonte da verdade.** Divergência entre código e spec se resolve atualizando a spec (com justificativa) ou corrigindo o código — nunca deixando os dois diverge­rem em silêncio.
3. **TDD para comportamento.** Teste que falha → implementação mínima → refatoração. Parsers do TSE e regras de cor/corrida têm teste obrigatório com fixture real gravada.
4. **Branch por ticket.** `feat/<n>-<slug>`, `fix/<n>-<slug>`, `docs/<slug>`. PR sempre contra `dev`, em rascunho, com o teste da entrega preenchido.
5. **Tudo automatizado no CI:** lint, tipos, testes unitários, contrato, e2e em modo fake, orçamento de bundle, acessibilidade e `terraform validate`.
6. **Merge não é entrega.** O ticket só fecha quando o critério de aceite foi verificado na URL publicada, por quem não implementou.

## Agentes e skills

- **OpenCode:** agentes em [.opencode/agents/](.opencode/agents/), skills em [.opencode/skills/](.opencode/skills/), comandos do Spec Kit em [.opencode/commands/](.opencode/commands/).
- **GitHub Copilot:** instruções em [.github/copilot-instructions.md](.github/copilot-instructions.md), agentes em [.github/agents/](.github/agents/) e skills em [.github/skills/](.github/skills/).
- **Fonte única:** agentes são editados em `.specify/agents/` e gerados por `node scripts/sync-agents.mjs`; skills são editadas em `.opencode/skills/` e espelhadas por `node scripts/check-skills.mjs --sync`. Não edite os gerados.
- O CI falha se os espelhos divergirem (`sync-agents --check`, `check-skills`).
- Use a skill certa antes de agir: dados do TSE, mapa, cavalos, infra, testes locais, React, Fastify, Firestore, desempenho, segurança. Se a tarefa não se encaixa em nenhuma, siga este guia.

## Precedência de skills

1. **Constituição e requisitos** vencem qualquer skill; um conflito com `.specify/memory/constitution.md` é bloqueante.
2. **Skills de domínio do projeto** (`.opencode/skills`): `dados-tse`, `mapa-eleitoral`, `animacao-cavalos`, `react-typescript`, `node-fastify-api`, `firestore-snapshots`, `performance-web`, `seguranca-web`, `testes-locais`, `infra-gcp`, `revisao-de-codigo`, `prova-de-entrega`, `documentacao-ai-first`.
3. **Spec Kit** para governança e artefatos: `speckit.specify`, `speckit.plan`, `speckit.tasks`, `speckit.implement`.
4. **Matt Pocock** (`.agents/skills`) para discovery e síntese: `grilling`, `wayfinder`, `to-spec`, `to-tickets`, `triage`, `ask-matt`. Use para decidir **o quê** e **por quê**; não repita discovery já aprovado.
5. **Superpowers** para execução: TDD, debugging, revisão, worktrees e execução de planos.
6. **Skills genéricas** (`pr`, `code-review`, `tdd`, `implement`) só quando não houver equivalente do projeto.

Regras: não execute dois rituais para a mesma etapa; skill de domínio vence skill genérica; toda skill continua subordinada à evidência e à neutralidade. As skills de terceiros são MIT (`mattpocock/skills`), instaladas em `.agents/skills`, espelhadas em `.github/skills` e travadas por `skills-lock.json`.

## Spec Kit

- Constituição bloqueante: [.specify/memory/constitution.md](.specify/memory/constitution.md).
- Guia de uso: [SPECKIT-USAGE.md](SPECKIT-USAGE.md).
- Feature corrente: `specs/001-apuracao-tempo-real/`.
- Fluxo: `/speckit.specify` → `/speckit.clarify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`.
- Nenhum comando do Spec Kit autoriza `terraform apply`, push em `main`/`dev` ou leitura de segredos.

## Comandos (a partir da implementação)

```bash
pnpm install          # dependências
pnpm dev              # web + api + simulador em modo fake
pnpm dev:real         # web + api lendo o TSE de verdade
pnpm test             # unitários e de contrato
pnpm test:e2e         # Playwright em modo fake
pnpm lint             # ESLint + Prettier check
pnpm typecheck        # TypeScript strict
pnpm build            # build de produção + checagem de orçamento
pnpm infra:plan       # terraform plan (sem aplicar)
node scripts/sync-agents.mjs --check   # agentes OpenCode/Copilot em sincronia
node scripts/check-skills.mjs          # skills espelhadas
node scripts/check-links.mjs           # links e IDs da documentação
```

## Convenções de código

- TypeScript `strict`, sem `any` implícito. `unknown` + validação por schema (Zod) na borda.
- Regras de negócio puras em `packages/domain` — sem I/O, sem React, testáveis isoladamente.
- Nenhum componente de tela chama o TSE; só a API normalizada.
- Datas: sempre ISO 8601 com fuso `America/Sao_Paulo` na API; formatação `pt-BR` na tela.
- Dinheiro/votos: inteiros (`number` seguro até 2^53); percentuais com 2 casas, calculados no servidor.
- Erros da API no formato Problem Details (`application/problem+json`).
- Commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `infra:` + mensagem em pt-BR no imperativo.
