# Produção do segundo turno de 2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar o Pulso das Urnas com ingestão real do segundo turno no Cloud Storage/Firestore a partir de 25/10/2026 16:55, mantendo o primeiro turno revisável e fornecendo um runbook completo para a primeira configuração GCP.

**Architecture:** O TSE continua sendo consultado somente pelo Cloud Run Job. Cada geração validada é gravada como objeto imutável no Cloud Storage e referenciada por um ponteiro transacional no Firestore; a API lê os ponteiros e objetos, com cache em memória e fallback ao último snapshot válido. A SPA usa `pleito` na URL e seleciona 6258 por padrão quando disponível.

**Tech Stack:** Node 22, TypeScript strict, Fastify 5, React 19, TanStack Query, Zod, `@google-cloud/storage`, `@google-cloud/firestore`, Cloud Run, Cloud Run Jobs, Cloud Scheduler, Firebase Hosting, Terraform Google provider 6.

**Spec:** `docs/superpowers/specs/2026-10-24-producao-segundo-turno-design.md`

## Global Constraints

- Dado eleitoral nunca é inventado em modo real; falha da fonte serve o último snapshot com horário e frescor.
- O navegador nunca chama o TSE; somente API/ingestão podem consultar a fonte oficial allow-listed.
- Toda gravação é idempotente por `(ciclo, pleito, escopo, cargo, idg)` e o ponteiro só avança depois de validar e gravar o objeto.
- Nenhum RG, IP persistido, MAC, fingerprint, cookie de rastreio ou endpoint de voto será criado.
- Requisições ao TSE ficam limitadas a 5 req/s, concorrência máxima 4, com ETag/304 e retry/backoff.
- A janela real é `2026-10-25T16:55:00-03:00` até `2026-10-26T00:00:00-03:00`.
- Região GCP é `southamerica-east1`; buckets permanecem privados.
- Não executar `terraform apply`, criar recursos externos ou ler segredos durante os testes locais.

## Review Focus

- Pleito 6258 ausente antes da primeira publicação: a API deve retornar `sem_dado`, nunca reutilizar 6257; testar em `apps/api/src/app.test.ts`.
- 304, upload duplicado e geração antiga: o ponteiro não pode retroceder; testar em `packages/cloud/src/repository.test.ts`.
- Firestore/Storage indisponíveis: a API deve manter último snapshot em cache e sinalizar frescor; testar em `apps/api/src/cloud-store.test.ts`.
- Horário de Brasília e virada da meia-noite: somente o intervalo exato coleta; testar em `apps/ingest/src/window.test.ts`.
- URL do primeiro turno: trocar o seletor deve atualizar cache/query e não misturar números de 6257 e 6258; testar em `e2e/jornadas.spec.ts`.

---

### Task 1: Incorporar o monitor de pulso e fixar a branch de entrega

**Files:** `apps/web/src/App.tsx`, `apps/web/src/features/race/PulseMonitor.tsx`, `apps/web/src/styles.css`, `e2e/fim.spec.ts`, `e2e/jornadas.spec.ts`.

- [ ] Trazer o commit já revisado `a249ddb` da branch `feat/monitor-de-pulso` com `git cherry-pick a249ddb`; se ele já estiver no histórico, somente verificar a equivalência.
- [ ] Executar `pnpm typecheck` e `pnpm test:e2e -- e2e/jornadas.spec.ts e2e/fim.spec.ts`; monitor, reduced motion, cena final e no-scroll devem passar.
- [ ] Commitar com `chore: incorporar monitor de pulso na entrega de produção`.

### Task 2: Modelar pleitos e janela de produção

**Files:** `packages/contracts/src/index.ts`, `apps/ingest/src/window.ts`, `apps/ingest/src/window.test.ts`, `apps/api/src/store.ts`, `apps/api/src/app.ts`, `apps/api/src/app.test.ts`.

- [ ] Adicionar testes para `pleito=6258`, `pleito=6257` e `pleito=9999` com `PLEITO_NAO_ENCONTRADO`.
- [ ] Adicionar `DEFAULT_LIVE_ELECTION="6258"`, `DEFAULT_REVIEW_ELECTION="6257"` e schemas de seleção; passar `pleito` para panorama, UF, município e corrida.
- [ ] Mapear 6258 para o cenário fake de segundo turno e manter 6257 como revisão, sem misturar números.
- [ ] Testar a janela em `19:54:59Z` false, `19:55:00Z` true, `02:59:59Z` true, `03:00:00Z` false e 25/10/2027 false.
- [ ] Executar `pnpm test -- apps/ingest/src/window.test.ts apps/api/src/app.test.ts` e `pnpm typecheck`.
- [ ] Commitar com `feat: selecionar pleito e janela do segundo turno`.

### Task 3: Criar repositório Cloud Storage/Firestore

**Files:** criar `packages/cloud/src/{types.ts,snapshot-repository.ts,firestore-repository.ts,repository.test.ts}`, `packages/cloud/package.json`, `packages/cloud/tsconfig.json`; modificar workspace e lockfile.

- [ ] Testar primeira gravação, `idg` duplicado, geração antiga, geração nova, falha de upload e chave exata.
- [ ] Implementar `SnapshotRepository.putIfNewer(input): Promise<SnapshotPointer>` e `getCurrent(key): Promise<StoredSnapshot | null>`.
- [ ] Gravar em `snapshots/{ciclo}/{pleito}/{escopo}/{cargo}/{idg}.json` com precondição de objeto imutável.
- [ ] Atualizar `current/{pleito}__{escopo}__{cargo}` em transação somente quando a geração for mais nova.
- [ ] Criar adapters locais em memória/temporários para testes sem credenciais.
- [ ] Executar `pnpm test -- packages/cloud/src/repository.test.ts` e `pnpm typecheck`.
- [ ] Commitar com `feat: adicionar repositório de snapshots em storage e firestore`.

### Task 4: Publicar a ingestão real do segundo turno

**Files:** modificar `apps/ingest/src/cli.ts`; criar `apps/ingest/src/election-config.ts`, `apps/ingest/src/collector.ts`, `apps/ingest/src/repository.test.ts`; modificar `apps/ingest/package.json` e Dockerfile aplicável.

- [ ] Testar URLs oficiais 6258 nacional/UF, concorrência máxima 4, 304, 404, payload inválido e janela fora do horário sem requisições.
- [ ] Implementar `collectElection(config, client, repository, now): Promise<CollectionSummary>` para nacional + 27 UFs de Presidente.
- [ ] Usar `fetchTseJson` com ETag, parser/Zod, retry/backoff, limite de 5 req/s e escrita imutável antes do ponteiro.
- [ ] Configurar produção com `ELECTION_ID=6258`, `CICLO=ele2026`, janela exata, `CYCLE_COUNT=1`, `CYCLE_SECONDS=0` e `MAX_RPS_TSE=5`.
- [ ] Executar testes de ingestão e `pnpm typecheck`.
- [ ] Commitar com `feat: publicar snapshots do segundo turno no storage`.

### Task 5: Fazer a API real ler Storage/Firestore

**Files:** criar `apps/api/src/repositories/cloud-snapshot-repository.ts`, `apps/api/src/cloud-store.ts`, `apps/api/src/cloud-store.test.ts`; modificar `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/package.json`.

- [ ] Testar ponteiro → objeto → contrato, fallback em falha, cache em memória, single-flight, frescor e ausência de fallback silencioso para 6257.
- [ ] Implementar `CloudDataStore` com métodos assíncronos para panorama, UF, município, corrida, pleitos, cargos e validações.
- [ ] Fazer `createApp` aguardar métodos cloud sem perder ETag/cache headers; incluir `pleito` nas chaves.
- [ ] Manter `/healthz` como saúde de processo e fazer `/readyz` tolerar ausência do primeiro boletim com estado explícito.
- [ ] Executar testes API, contrato e typecheck.
- [ ] Commitar com `feat: API real lê snapshots do storage com fallback`.

### Task 6: Adicionar seletor de primeiro/segundo turno

**Files:** modificar `apps/web/src/App.tsx`, `apps/web/src/lib/queries.ts`, `apps/web/src/styles.css`, `e2e/jornadas.spec.ts`, `e2e/fim.spec.ts`; criar `apps/web/src/features/election/ElectionSelector.tsx` e teste.

- [ ] Testar default 6258, seleção 6257, URL compartilhável e separação de cache/query.
- [ ] Implementar seletor acessível com “2º turno de 2026 — ao vivo” e “1º turno de 2026 — revisão”.
- [ ] Alterar `usePanorama`, `useRace`, `useScope` e `useMunicipality` para receber `pleito` e incluí-lo nas query keys.
- [ ] Passar o pleito por mapa, painel, município, corrida e telão; preservar fonte e horário.
- [ ] Executar testes de componente, e2e e a11y.
- [ ] Commitar com `feat: permitir revisão do primeiro turno pela URL`.

### Task 7: Corrigir Terraform, IAM, Firebase e Scheduler

**Files:** modificar `infra/terraform/modules/{runtime,scheduler,hosting,data}.tf`, `infra/terraform/envs/prod/main.tf`, `firebase.json`; criar `infra/terraform/bootstrap/main.tf`, `infra/terraform/bootstrap/variables.tf`, `infra/terraform/envs/prod/terraform.tfvars.example`, `.firebaserc.example`.

- [ ] Parametrizar projeto, imagem, pleito, janela e bucket sem segredos no repositório.
- [ ] Criar bootstrap do bucket de tfstate com versionamento e acesso uniforme antes do backend.
- [ ] Adicionar `datastore.viewer` para API, `datastore.editor` para ingestão, Storage viewer/creator, `run.invoker` para Scheduler e integração Hosting.
- [ ] Configurar Cloud Run Job com `ELECTION_ID=6258`, janela, `CYCLE_COUNT=1`, `CYCLE_SECONDS=0` e `SNAPSHOT_BUCKET`.
- [ ] Configurar Firebase site `pulso-das-urnas` e rewrites de `/healthz`, `/readyz`, `/api/**` antes do fallback SPA.
- [ ] Validar com `terraform fmt -check -recursive`, `terraform init -backend=false` e `terraform validate` em dev/prod.
- [ ] Commitar com `infra: preparar cloud run storage firestore e firebase`.

### Task 8: Escrever runbook completo para primeiro deploy GCP

**Files:** criar `docs/operacao/runbook-gcp-producao.md`; modificar `docs/requisitos/09-infra-e-terraform.md`, `docs/operacao/prova-entrega-2026-10-21.md`, `README.md`.

- [ ] Documentar conta Google, Free Trial/billing, projeto, APIs, `gcloud`, Terraform, Docker, Node/pnpm e Firebase CLI.
- [ ] Documentar variáveis, criação do tfstate, `terraform init`, `plan`, revisão do plano e `apply` manual.
- [ ] Documentar Artifact Registry, build/push da imagem, deploy Firebase e smoke tests.
- [ ] Documentar importação do primeiro turno, ensaio fake, verificação do Scheduler e cronograma de 25/10: 16:30, 16:45, 16:55, 17:00 e 00:00.
- [ ] Documentar `curl` para site, health, readiness, pleitos, panorama 6257/6258, ETag/304, logs, ponteiros, objetos, rollback e kill switch.
- [ ] Explicar erros comuns: billing ausente, quota, bucket globalmente ocupado, IAM 403, Firebase target, imagem não encontrada e TSE sem boletim.
- [ ] Commitar com `docs: detalhar publicação e operação na GCP`.

### Task 9: Atualizar previsão de gastos e proteção

**Files:** modificar `docs/requisitos/05-requisitos-nao-funcionais.md`, `docs/requisitos/09-infra-e-terraform.md`, `docs/operacao/runbook-gcp-producao.md`, `infra/terraform/modules/observability/main.tf`.

- [ ] Documentar cenários: esperado US$ 3–9 (20 GB Hosting, 420 jobs, até 1 M requests), alto US$ 20–35 (100 GB, 5 M requests) e abuso variável.
- [ ] Separar custos de Hosting, Cloud Run, Job, Firestore, Storage, Artifact Registry, logs e domínio.
- [ ] Explicar que free tier é agregado por billing account e budget é alerta, não bloqueio.
- [ ] Garantir alertas 50/80/100%, `max_instances=6`, Scheduler pausável e kill switch no runbook.
- [ ] Executar `node scripts/check-links.mjs` e commitar com `docs: atualizar previsão de custos e limites da produção`.

### Task 10: Verificação, evidência e release

**Files:** modificar `e2e/jornadas.spec.ts`, `e2e/a11y.spec.ts`, `docs/operacao/prova-entrega-2026-10-21.md`; criar `docs/operacao/evidencias/segundo-turno-seletor.png`.

- [ ] Cobrir default 6258, revisão 6257, no-data antes da ativação, fonte/horário, no-scroll, reduced motion e a11y.
- [ ] Executar:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:a11y
pnpm build
pnpm size
terraform fmt -check -recursive infra/terraform
terraform -chdir=infra/terraform/envs/dev validate
terraform -chdir=infra/terraform/envs/prod validate
node scripts/sync-agents.mjs --check
node scripts/check-skills.mjs
node scripts/check-links.mjs
git diff --check
```

- [ ] Capturar evidência fake do seletor e da revisão; não declarar validação real sem GCP/TSE.
- [ ] Atualizar prova de entrega com saídas exatas, custos e residuais operacionais.
- [ ] Fazer revisão final para garantir ausência de segredos, buckets públicos, endpoint de votação e `terraform apply` executado.
