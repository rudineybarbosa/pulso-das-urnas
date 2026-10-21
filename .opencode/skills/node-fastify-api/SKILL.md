---
name: API Node e Fastify
description: Padrões da API do Pulso das Urnas — Fastify 5 no Node 22, schema Zod, OpenAPI, Problem Details, cache HTTP com ETag, rate limit, Cloud Run e leitura de snapshots. Use ao criar rota, contrato, erro, cache ou ajuste de desempenho da API.
---

# API Node + Fastify

Leia `docs/requisitos/06-contrato-de-dados-tse.md` e `08-arquitetura-e-stack.md`.

## Estrutura

```
apps/api/src/
├── routes/          # uma rota por arquivo, schema de entrada/saída
├── services/        # orquestração (snapshot, panorama, corrida)
├── repositories/    # leitura de Firestore/GCS
├── plugins/         # cache, erro, requestId, rate limit
└── server.ts
```

## Contrato

- Zod na entrada e na saída; OpenAPI gerado do schema.
- Erro: `application/problem+json` com `type`, `title`, `status`, `detail`, `instance`, `code`, `requestId`.
- Códigos estáveis: `PARAMETRO_INVALIDO`, `PLEITO_NAO_ENCONTRADO`, `ESCOPO_NAO_ENCONTRADO`, `SEM_DADOS`, `FONTE_INDISPONIVEL`, `RATE_LIMITED`, `ERRO_INTERNO`.
- Campo novo é aditivo; remoção exige `/v2`.

## Cache

- `ETag` = versão do snapshot (`eleicao:escopo:cargo:idg`).
- `If-None-Match` → `304` sem corpo.
- Cabeçalhos por rota:
  - panorama: `public, max-age=0, s-maxage=3, stale-while-revalidate=10, stale-if-error=600`
  - município: `s-maxage=5, stale-while-revalidate=30`
  - corrida: `s-maxage=2, stale-while-revalidate=5`
  - localidades: `s-maxage=86400`
- Nunca cachear erro.
- Sem `Vary` além de `Accept-Encoding`.

## Desempenho

- Serialização por schema do Fastify no caminho quente.
- LRU em memória (200 itens) para snapshot e geo.
- `Promise.all` com limite de concorrência.
- Payload: panorama ≤ 8 KB gz; município ≤ 12 KB gz.
- Logs estruturados; nada de `console.log`.

## Segurança

- Rate limit 60 req/min/IP com `Retry-After`.
- Query desconhecida → 400 (não polui cache).
- Nenhum segredo em env do cliente.
- Timeout e circuit breaker na leitura de storage.

## Antes de concluir

- [ ] Teste de contrato e de erro
- [ ] 304 verificado
- [ ] Headers de cache corretos
- [ ] Payload medido
- [ ] Nenhuma chamada ao TSE no handler
