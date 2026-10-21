# ADR-005 — Firebase Hosting + Cloud Run, sem load balancer dedicado

- **Status:** aceito
- **Data:** 20/10/2026
- **Relacionado:** RNF-ESC, RNF-COST, [09-infra](../requisitos/09-infra-e-terraform.md)

## Contexto

Precisamos de CDN global, TLS, domínio, rewrite para a API e cache de resposta, com custo próximo de zero. Um Application Load Balancer do Google Cloud tem custo fixo (~US$ 18/mês) e regras adicionais, o que viola RNF-COST-04.

## Decisão

- **Firebase Hosting** serve a SPA e faz rewrite de `/api/**` para o Cloud Run.
- **Cloud Run** hospeda `pulso-api` (público, somente leitura) e o job `pulso-ingest`.
- Cache de CDN usa os cabeçalhos `Cache-Control` emitidos pela API (`s-maxage`, `stale-while-revalidate`, `stale-if-error`).
- Sem Cloud CDN próprio, sem LB, sem NAT.
- Domínio customizado via Firebase Hosting (quando Q-01 for decidida).

## Consequências

**Positivas**
- CDN e TLS sem custo fixo; paga-se por banda (US$ 0,15/GB).
- Um único domínio para SPA e API: sem CORS.
- Deploy simples (`firebase deploy --only hosting`).
- Rollback de hosting em um comando.

**Negativas**
- Dependência do Firebase para entrega; migrar para Cloud Storage + LB é possível, com custo.
- Controle limitado de WAF/rate limit na borda (mitigado na aplicação).
- Necessário validar que o rewrite preserva `Cache-Control` e `ETag` da API (AT-030). Se não preservar, o fallback é Cloud CDN + LB, reabrindo o custo.

## Alternativas

| Alternativa | Por que não |
|---|---|
| Cloud Load Balancer + Cloud CDN + GCS | custo fixo mensal |
| Vercel/Netlify | fora do GCP; mistura de provedores e limites de banda |
| Cloud Run servindo estáticos | sem CDN embutido; latência e custo maiores |
| App Engine | modelo de cobrança e limites menos previsíveis |

## Evidência

AT-030 (`x-cache: HIT` e ETag preservados) e relatório de banda da semana de teste.
