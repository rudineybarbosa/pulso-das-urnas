# Produção do segundo turno de 2026 — desenho

**Data:** 24/10/2026  
**Status:** aprovado em conversa; aguardando execução do plano  
**Objetivo:** publicar o Pulso das Urnas em `https://pulso-das-urnas.web.app` para acompanhar o segundo turno de 2026 ao vivo a partir de 25/10/2026 às 16:55 em Brasília, mantendo o primeiro turno disponível para revisão.

## Decisões

1. O pleito padrão do dia será o segundo turno presidencial de 2026 (`6258`, cargo `1`).
2. O primeiro turno (`6257`) continuará disponível por seletor de pleito e por URL compartilhável.
3. A coleta será feita exclusivamente no servidor; o navegador nunca chamará o TSE.
4. O job de ingestão será executado pelo Cloud Scheduler em `America/Sao_Paulo`, mas recusará qualquer execução fora da janela exata:
   - início: `2026-10-25T16:55:00-03:00`;
   - fim: `2026-10-26T00:00:00-03:00`.
5. Snapshots serão imutáveis no Cloud Storage. Firestore guardará somente catálogo, ponteiros da geração atual e locks de single-flight.
6. A API real consultará Firestore/Cloud Storage; o modo fake continuará usando fixtures locais.
7. Falha ou ausência de publicação do TSE servirá o último snapshot válido, com frescor visível; nunca haverá número inventado.
8. Nenhuma enquete ou endpoint de escrita será incluído.

## Fluxo de dados

```text
Cloud Scheduler (25/10, janela)
  -> Cloud Run Job pulso-ingest
  -> TSE JSON com ETag e limite de 5 req/s
  -> validação/parser
  -> Cloud Storage snapshots/{ciclo}/{pleito}/{escopo}/{cargo}/{idg}.json
  -> Firestore current/{pleito}__{escopo}__{cargo}
  -> Cloud Run pulso-api
  -> Firebase Hosting /api/** e SPA
```

O coletor do segundo turno publica o nacional e as 27 UFs para Presidente. Municípios são consultados sob demanda pela API, com cache/single-flight, usando o endpoint oficial do TSE e o mesmo limite de requisições. O primeiro turno existente pode ser servido dos snapshots locais no modo fake e deve ser carregado para os mesmos repositórios no primeiro deploy real, para que o seletor de revisão funcione sem depender do TSE no momento da visita.

## Contrato público

Todas as rotas de resultados recebem `pleito`, defaultando para `6258` quando o catálogo indicar o segundo turno como padrão:

```text
GET /api/v1/pleitos
GET /api/v1/panorama?pleito=6258&cargo=1
GET /api/v1/escopos/SP?pleito=6258&cargo=1
GET /api/v1/municipios/3550308?pleito=6258&cargo=1
GET /api/v1/corrida?pleito=6258&cargo=1
```

O frontend preserva `pleito` na URL. O seletor mostra “2º turno de 2026 — ao vivo” e “1º turno de 2026 — revisão”, com fonte e horário da geração para ambos.

## Infraestrutura

- Projeto GCP configurável por `terraform.tfvars`, sem IDs fixos obrigatórios.
- Bucket de estado criado por bootstrap antes do `terraform init`.
- Artifact Registry para a imagem versionada da API/ingestão.
- Cloud Run API com `min_instances = 0`, `max_instances = 6`, 512 MiB e 1 vCPU.
- Cloud Run Job com uma coleta por execução; o Scheduler dispara a cada minuto na data programada.
- `CYCLE_COUNT=1` no job de produção; a janela é controlada pela aplicação e não por relógio implícito do container.
- Firebase Hosting com site explícito, rewrites de `/healthz`, `/readyz` e `/api/**`, e fallback da SPA.
- `roles/storage.objectViewer` e `roles/datastore.viewer` para a API.
- `roles/storage.objectCreator` e `roles/datastore.editor` para a ingestão.
- `roles/run.invoker` para o Scheduler e para a integração pública do Hosting.
- Budget de US$ 10 para a semana eleitoral, alertas em 50/80/100% e runbook de kill switch.

## Segurança e privacidade

- Nenhum RG, IP persistido, MAC, fingerprint, cookie de rastreio ou voto declarado.
- Buckets privados com uniform bucket-level access e public access prevention.
- Logs da aplicação sem payload eleitoral completo e sem IP persistido; request logs do Cloud Run devem ser excluídos conforme o requisito existente.
- TSE é fonte allow-listed; parâmetros do usuário não formam URLs arbitrárias.
- Cache público somente para respostas de leitura versionadas por ETag.

## Estados e falhas

- Antes de 16:55: site no ar; segundo turno mostra “aguardando primeiro snapshot” ou o último snapshot oficial existente.
- Sem arquivo do segundo turno: `sem_dado`/`fonte_indisponivel`, nunca fallback silencioso para números do primeiro turno.
- 304: mantém o ponteiro e o horário da coleta anterior.
- Falha de upload: não avança ponteiro.
- Falha de Firestore: API serve cache em memória ou último snapshot conhecido e sinaliza frescor.
- Após 00:00: job encerra; site continua disponível com o último snapshot e o horário visível.

## Custos previstos

O modelo de custo será documentado com três cenários:

| Cenário | Premissa | Estimativa do mês da eleição |
|---|---|---:|
| Esperado | 20 GB Hosting, 420 jobs, até 1 M requisições, snapshots abaixo de 5 GB | US$ 3–9 |
| Alto | 100 GB Hosting, 5 M requisições, maior uso de Cloud Run | US$ 20–35 |
| Abuso | bots gerando dezenas de milhões de requisições | variável; kill switch imediato |

O free tier reduz Cloud Run, Firestore e Scheduler, mas orçamento GCP é alerta, não bloqueio. O teto operacional é protegido por Scheduler pausado fora da janela, `max_instances`, cache e kill switch.

## Critérios de aceite

- `terraform validate` e `terraform plan` funcionam com um projeto informado por `terraform.tfvars`.
- Um operador sem experiência consegue criar o billing, o projeto, o bucket de estado, a identidade WIF e aplicar o plano seguindo `docs/operacao/runbook-gcp-producao.md`.
- A ingestão real grava uma geração em Storage e avança o ponteiro Firestore apenas após validação.
- A API lê a geração apontada e retorna `ETag`, frescor e fonte TSE.
- `/br?pleito=6258&cargo=1` é o segundo turno; `/br?pleito=6257&cargo=1` é o primeiro turno.
- O e2e verifica seletor, URL, fallback seguro e janela temporal fake.
- Nenhum teste usa número eleitoral inventado em modo real.
