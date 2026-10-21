---
name: Dados do TSE
description: Consumir, normalizar e cachear os arquivos oficiais de resultados do TSE (catálogo de pleitos, resultados por país/UF/município, progresso, municípios). Use ao criar ou alterar ingestão, parser, snapshots, contratos, fixtures ou qualquer chamada a resultados.tse.jus.br.
---

# Dados do TSE

Leia `docs/requisitos/06-contrato-de-dados-tse.md` antes de tocar em qualquer URL ou campo. Ele é normativo.

## Regras que não se negociam

1. **A fonte é o arquivo oficial.** Não existe API de push. O navegador nunca chama o TSE.
2. **Requisição condicional sempre.** `If-None-Match`; `304` não é erro.
3. **Cortesia:** ≤ 5 req/s, concorrência 4, backoff exponencial, circuit breaker (RN-032).
4. **Nunca invente número.** Falha → último snapshot + `status` de frescor.
5. **`null` ≠ `0`.** Ausência de arquivo é `null`; arquivo com zero votos é `0` (RN-028).
6. **Toda gravação é idempotente** pela chave `(ciclo, eleicao, escopo, cargo, idg)` (RN-027).
7. **Fixture real obrigatória** para qualquer mudança de parser; registre URL, data e hash no `manifest.json`.

## Caminhos validados (20/10/2026)

```
catálogo:   /oficial/comum/config/ele-c.json
resultado:  /oficial/{ciclo}/{eleicao}/dados/{uf}/{uf}[-{mun}]-c{cargo}-e{eleicao}-u.json
progresso:  /oficial/{ciclo}/{eleicao}/dados/{uf}/{uf}-e{eleicao}-ab.json
municípios: /oficial/{ciclo}/{eleicao}/config/mun-e{eleicao}-cm.json
fotos:      /oficial/{ciclo}/{eleicao}/fotos/{br|uf}/{id}.jpeg
```

Exemplos reais:
- `oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json`
- `oficial/ele2026/6257/dados/sp/sp71072-c0001-e006257-u.json`
- `oficial/ele2026/6259/dados/sp/sp-c0003-e006259-u.json`

## Estrutura do resultado

- Candidatos ficam em `carg[].agr[].par[].cand[]` (não em `carg[].cand`).
- `vap` = votos, `pvap` = percentual, `dvt` = destinação (`Válido`, `Válido (legenda)`, `Anulado`, `Anulado sub judice`).
- Só `dvt = Válido` define líder (RN-021).
- `idg`/`dg`/`hg` identificam a geração; `tf` indica totalização finalizada; `s.pst` é o percentual de seções.
- Município: `cd` (TSE, 5 dígitos) e `cdi` (IBGE, 7 dígitos, chave canônica).

## Padrão de código

- Parser puro, sem I/O: `packages/tse/parse.ts`.
- Cliente HTTP com retry/limites: `packages/tse/client.ts`.
- Normalização para o contrato interno: `packages/tse/normalize.ts`.
- Validação por Zod em `packages/contracts`.
- Teste de contrato roda todas as fixtures e falha se um campo obrigatório faltar.

## Antes de concluir

- [ ] Fixture nova adicionada ao manifest (URL, `capturedAt`, `sha256`).
- [ ] `pnpm test packages/tse` verde.
- [ ] `null`/`0` e destinação do voto testados.
- [ ] Orçamento de payload conferido (RNF-PERF-06).
- [ ] Nenhuma chamada ao TSE a partir do código do navegador.
