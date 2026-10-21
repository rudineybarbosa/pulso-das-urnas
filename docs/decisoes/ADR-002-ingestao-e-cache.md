# ADR-002 — Ingestão por job de 1 minuto com ciclos internos e cache condicional

- **Status:** aceito
- **Data:** 20/10/2026
- **Relacionado:** RN-012, RN-027, RN-032, RNF-ESC, RF-030..RF-033

## Contexto

O TSE publica arquivos JSON estáticos por cargo e abrangência, com `ETag` e `Cache-Control`. O app oficial revalida a cada 30 s durante a apuração parcial e a cada 3 min após o fim. O Cloud Scheduler tem granularidade mínima de **1 minuto**, o que impede um gatilho nativo de 10 s.

Precisamos de atualização a cada ~10 s, sem ultrapassar 5 req/s na fonte e sem manter um serviço ligado 24 h.

## Decisão

- A coleta é um **Cloud Run Job** disparado a cada minuto pelo Scheduler.
- Cada execução roda **5 ciclos de 10 s** (com jitter) e encerra em até 55 s.
- Requisições **condicionais** (`If-None-Match`); `304` encerra o trabalho daquele arquivo.
- **Single-flight** por URL via documento de lock no Firestore (TTL 30 s), para várias execuções não duplicarem.
- Cache local do corpo por `idg`; o snapshot só é regravado com `idg` novo.
- Fora da janela eleitoral, o job roda a cada 30 min e o Scheduler é ajustado por variável de ambiente/Terraform.
- Limites: 5 req/s, concorrência 4, backoff exponencial, circuit breaker (RN-032).

## Consequências

**Positivas**
- Custo próximo de zero: o job só existe enquanto roda.
- Cadência de 10 s compatível com a fonte.
- Simples de operar: um recurso, um cron.

**Negativas**
- Latência mínima de ~10 s entre a publicação do TSE e o snapshot (aceitável: RN-013 permite 90 s).
- Execuções podem se sobrepor em picos; o lock resolve.
- Job morto não reinicia sozinho até o próximo minuto — mitigado por alerta de lag > 5 min.

## Alternativas

| Alternativa | Por que não |
|---|---|
| Cloud Scheduler a cada 10 s | granularidade mínima de 1 min |
| Serviço sempre ligado com loop | custo contínuo e min-instances fixo |
| Cloud Tasks por arquivo | complexidade de fila e custo de operações |
| Cloud Functions por evento | sem evento na fonte; exigiria polling de qualquer forma |
| SSE/WebSocket do TSE | não existe endpoint de push público |

## Evidência

Medir `ingest_lag_seconds` em ensaio com o TSE real e registrar no runbook antes da eleição.
