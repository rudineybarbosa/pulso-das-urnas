# Runbook — primeira publicação do Pulso das Urnas na GCP

**URL planejada:** `https://pulso-das-urnas.web.app`
**Região:** `southamerica-east1` (São Paulo)
**Janela do segundo turno:** 25/10/2026 16:55 até 26/10/2026 00:00 (`America/Sao_Paulo`)

> Este documento é para o operador que nunca publicou uma aplicação na Google Cloud. O agente não cria a conta Google, não cadastra cartão, não lê credenciais e não executa `terraform apply` por conta própria.

## 1. Arquitetura publicada

```text
Firebase Hosting
  https://pulso-das-urnas.web.app
       /api/** -> Cloud Run pulso-api

Cloud Run pulso-api
  lê Firestore current/* e Cloud Storage snapshots/*

Cloud Run Job pulso-ingest
  consulta o TSE e grava snapshots imutáveis

Cloud Scheduler pulso-ingest-16h56 + pulso-ingest-1m
  disparam o job a partir de 16:56 em 25/10; o job valida 16:55–00:00
```

O site continua disponível fora da janela. Depois da meia-noite, a ingestão para e a API mantém o último snapshot com horário e frescor.

## 2. Pré-requisitos locais

Instale Node 22, pnpm 9, Git, Docker, `gcloud`, Terraform >= 1.9 e Firebase CLI.

```bash
node --version
pnpm --version
gcloud --version
terraform version
docker --version
npx firebase-tools --version
```

No repositório:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
```

Não prossiga se esses comandos falharem.

## 3. Conta, billing e projeto

1. Abra `https://console.cloud.google.com/freetrial`.
2. Crie a conta Google Cloud Trial, se elegível.
3. Confirme identidade e método de pagamento.
4. Crie o projeto com o ID `pulso-das-urnas`.
5. Vincule o projeto a uma conta de faturamento.
6. Anote o `PROJECT_ID` e o `BILLING_ACCOUNT_ID`.

O ID escolhido é `pulso-das-urnas`. Se o Console informar que ele já está ocupado, pare e escolha outro ID antes de continuar; não substitua silenciosamente o valor nos comandos.

```bash
export PROJECT_ID="pulso-das-urnas"
export BILLING_ACCOUNT_ID="01814A-837814-2BD28A"
export REGION="southamerica-east1"
export SITE_ID="pulso-das-urnas"
export HOST="${SITE_ID}.web.app"
export TFSTATE_BUCKET="pulso-tfstate"

gcloud auth login
gcloud auth application-default login
gcloud config set project "$PROJECT_ID"
gcloud config set compute/region "$REGION"
```

`gcloud auth application-default login` autoriza bibliotecas locais. Não coloque tokens no Git.

## 3.1. Identidade do GitHub Actions (WIF)

Esta etapa é opcional para o primeiro deploy manual, mas necessária para o workflow de release.

No Console, crie:

1. uma service account de deploy, por exemplo `sa-deploy@PROJECT_ID.iam.gserviceaccount.com`;
2. permissões mínimas `run.admin`, `artifactregistry.writer`, `iam.serviceAccountUser` e acesso ao bucket de tfstate;
3. um Workload Identity Pool;
4. um Provider OIDC do GitHub com `issuer=https://token.actions.githubusercontent.com`;
5. uma condição restringindo o repositório ao GitHub correto e à organização correta;
6. o vínculo `roles/iam.workloadIdentityUser` entre o principal do repositório e `sa-deploy`.

No GitHub, em **Settings → Secrets and variables → Actions**, configure:

- secret `GCP_WIF_PROVIDER`: nome completo do provider;
- secret `GCP_DEPLOY_SA`: e-mail da service account de deploy;
- secret `FIREBASE_TOKEN`: token criado com `npx firebase-tools login:ci`;
- variable `GCP_PROJECT`: ID do projeto;
- variable `PUBLIC_HOST`: host Firebase, por exemplo `pulso-das-urnas.web.app`.

Não use chave JSON de service account no GitHub. Faça um workflow manual de plan antes de habilitar tags de produção.

## 4. Criar o bucket do estado Terraform

O backend GCS precisa existir antes de `terraform init`.

```bash
cd /caminho/para/pulso-das-urnas
terraform -chdir=infra/terraform/bootstrap init -backend=false
terraform -chdir=infra/terraform/bootstrap validate
terraform -chdir=infra/terraform/bootstrap apply \
  -var="project_id=$PROJECT_ID" \
  -var="region=$REGION" \
  -var="bucket_name=$TFSTATE_BUCKET"
```

Confira:

```bash
gcloud storage buckets describe "gs://$TFSTATE_BUCKET" \
  --format='yaml(name,location,versioning,iamConfiguration)'
```

Esse é o primeiro `apply` manual: cria somente o bucket de estado.

## 5. Firebase Hosting

```bash
npx firebase-tools login
npx firebase-tools projects:list
npx firebase-tools use --add "$PROJECT_ID"
npx firebase-tools hosting:sites:list --project "$PROJECT_ID"
```

O `firebase.json` versionado declara o site, os rewrites de `/healthz`, `/readyz` e `/api/**`, além do fallback da SPA. Se você escolher outro `SITE_ID`, ajuste também Terraform, `firebase.json` e `terraform.tfvars` antes do plan.

## 6. Plan e apply da infraestrutura

```bash
cp infra/terraform/envs/prod/terraform.tfvars.example \
  infra/terraform/envs/prod/terraform.tfvars
```

Edite o arquivo:

```hcl
project_id          = "SEU_PROJECT_ID"
region              = "southamerica-east1"
image               = "southamerica-east1-docker.pkg.dev/SEU_PROJECT_ID/pulso/api:TAG"
billing_account     = "SEU_BILLING_ACCOUNT_ID"
public_host         = "SEU_SITE_ID.web.app"
default_election_id = "6258"
```

Inicialize e revise:

```bash
terraform -chdir=infra/terraform/envs/prod init
terraform -chdir=infra/terraform/envs/prod fmt -check
terraform -chdir=infra/terraform/envs/prod validate
terraform -chdir=infra/terraform/envs/prod plan -out=tfplan
```

O plano deve criar APIs, Artifact Registry, Firestore Native, buckets privados, IAM, Cloud Run, Job, Scheduler, Firebase, budget e observabilidade. Pare se aparecer `destroy` de bucket, Firestore ou serviço sem intenção explícita.

Depois da revisão:

```bash
terraform -chdir=infra/terraform/envs/prod apply tfplan
```

## 7. Imagem da API

O Artifact Registry deve existir antes do push.

```bash
export IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/pulso/api:$(git rev-parse --short HEAD)"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
docker build -f apps/api/Dockerfile -t "$IMAGE" .
docker push "$IMAGE"
```

Se o repositório não existir, aplique primeiro a infraestrutura e repita o push. Depois rode novamente o plan/apply com o valor da imagem.

## 8. Carregar a revisão do primeiro turno

Antes de depender do segundo turno, importe os snapshots oficiais já gravados no repositório:

```bash
pnpm exec tsx scripts/cloud/seed-snapshots.ts \
  --project="$PROJECT_ID" \
  --bucket="pulso-snapshots-prod" \
  --election=6257
```

Confira:

```bash
gcloud storage ls "gs://pulso-snapshots-prod/snapshots/ele2026/6257/" \
  --project "$PROJECT_ID"
gcloud firestore databases list --project "$PROJECT_ID"
```

O script não cria números: ele lê somente os arquivos oficiais versionados em `data/snapshots/raw`.

## 9. Publicar frontend e validar

```bash
export PUBLIC_SITE_URL="https://${HOST}"
export VITE_DEFAULT_ELECTION="6258"
pnpm build
npx firebase-tools deploy --only hosting \
  --project "$PROJECT_ID" \
  --non-interactive
```

Valide:

```bash
curl -i "https://${HOST}/"
curl -fsS "https://${HOST}/healthz"
curl -fsS "https://${HOST}/readyz"
curl -fsS "https://${HOST}/api/v1/pleitos"
curl -fsS "https://${HOST}/api/v1/panorama?pleito=6257&cargo=1"
curl -fsS "https://${HOST}/api/v1/panorama?pleito=6258&cargo=1"
```

Confirme que:

- `eleicao=6257` e `eleicao=6258` não se misturam;
- 6258 sem boletim aparece como `sem_voto`/`fonte_indisponivel`, nunca com números do primeiro turno;
- `fonte.url` aponta para `ele2026/6258`;
- fonte TSE, horário e aviso de não oficialidade aparecem;
- `/nao-existe` não vira uma página 200 enganosa.

ETag:

```bash
ETAG=$(curl -sSI "https://${HOST}/api/v1/panorama?pleito=6258&cargo=1" \
  | awk -F': ' 'tolower($1)=="etag" {print $2}' | tr -d '\r')
curl -i -H "If-None-Match: $ETAG" \
  "https://${HOST}/api/v1/panorama?pleito=6258&cargo=1"
```

A segunda resposta deve ser `304`.

## 10. Cronograma do dia 25/10/2026

### Antes de 16:30

Deixe os jobs do Scheduler pausados:

```bash
for job in pulso-ingest-16h56 pulso-ingest-1m; do
  gcloud scheduler jobs pause "$job" \
    --project "$PROJECT_ID" --location "$REGION"
done
```

### 16:30

Aqueça a API:

```bash
gcloud run services update pulso-api \
  --project "$PROJECT_ID" --region "$REGION" --min 1
```

Confira budget, IAM, URL, Storage, Firestore e logs.

### 16:45

Execute os smoke tests da seção 9. Não espere dados de 6258 antes da publicação do TSE.

### 16:55

Retome os jobs do Scheduler:

```bash
for job in pulso-ingest-16h56 pulso-ingest-1m; do
  gcloud scheduler jobs resume "$job" \
    --project "$PROJECT_ID" --location "$REGION"
done
```

O primeiro disparo ocorre a partir de 16:56. O job valida a janela em Brasília, consulta 6258 e grava snapshots no bucket.

### 17:00

```bash
gcloud run jobs executions list \
  --job pulso-ingest --project "$PROJECT_ID" --region "$REGION" --limit 5

gcloud logging read \
  'resource.type="cloud_run_job" AND resource.labels.job_name="pulso-ingest"' \
  --project "$PROJECT_ID" --limit 20

curl -fsS "https://${HOST}/api/v1/panorama?pleito=6258&cargo=1" \
  | jq '{eleicao,fonte,apuracao}'
```

### Durante a apuração

A cada hora verifique `sourceAgeSeconds`, `collectedAgeSeconds`, lag do job, 5xx, hit ratio e custo.

### 00:00–00:05

```bash
for job in pulso-ingest-16h56 pulso-ingest-1m; do
  gcloud scheduler jobs pause "$job" \
    --project "$PROJECT_ID" --location "$REGION"
done
gcloud run services update pulso-api \
  --project "$PROJECT_ID" --region "$REGION" --min 0
```

O site permanece acessível com o último snapshot.

## 11. Rollback e kill switch

```bash
for job in pulso-ingest-16h56 pulso-ingest-1m; do
  gcloud scheduler jobs pause "$job" \
    --project "$PROJECT_ID" --location "$REGION"
done
gcloud run services update pulso-api \
  --project "$PROJECT_ID" --region "$REGION" --max 0
```

Listar revisões:

```bash
gcloud run revisions list --service pulso-api \
  --region "$REGION" --project "$PROJECT_ID"
```

Voltar para uma revisão saudável:

```bash
gcloud run services update-traffic pulso-api \
  --to-revisions REVISAO_SAUDAVEL=100 \
  --region "$REGION" --project "$PROJECT_ID"
```

Rollback do frontend:

```bash
npx firebase-tools hosting:releases:list --project "$PROJECT_ID"
npx firebase-tools hosting:rollback --project "$PROJECT_ID"
```

Budget é alerta, não bloqueio automático.

## 12. Erros comuns

| Erro | Causa provável | Ação |
|---|---|---|
| `billing account required` | projeto sem billing | vincular billing |
| `bucket name unavailable` | nome global ocupado | escolher outro nome e ajustar backend |
| `403 run.invoker` | IAM incompleto | conferir `roles/run.invoker` |
| `repository not found` | Artifact Registry não criado | aplicar infraestrutura e repetir push |
| 6258 sem dados | TSE ainda não publicou ou job não rodou | conferir horário, execução e `fonte.status`; não usar 6257 |
| Firebase em URL errada | site não explícito | conferir `firebase.json` e `hosting:sites:list` |
| soft 404 | fallback SPA responde 200 | corrigir `404.html`/rewrites antes do Search Console |

## 13. SEO e descoberta

Depois da URL responder corretamente:

1. Verifique `https://${HOST}/` no Google Search Console.
2. Envie `https://${HOST}/sitemap.xml`.
3. Inspecione `/`, `/br`, `/br/sp` e um município.
4. Confirme canonical, `robots.txt`, HTML inicial, fonte TSE e status HTTP.
5. Monitore soft 404, canonical divergente, páginas não indexadas e Core Web Vitals.

Isso aumenta a chance de descoberta, mas não garante primeiro lugar no Google.
