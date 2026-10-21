---
name: Firestore e snapshots
description: Modelagem e operação dos dados do Pulso das Urnas — Firestore para configuração/ponteiros/catálogo, Cloud Storage para snapshots imutáveis, chaves de idempotência, transações de ponteiro, TTL, lifecycle, índices e custo. Use ao criar coleção, consulta, retenção ou reprocessar dados.
---

# Firestore + Cloud Storage

Leia `docs/requisitos/06-contrato-de-dados-tse.md` (RN-027) e `08-arquitetura-e-stack.md`.

## Modelo

| Caminho | Uso |
|---|---|
| `config/pleitos/{ciclo}` | catálogo normalizado + versão |
| `config/party-colors/{sigla}` | cor, fonte, revisadoEm |
| `config/localidades/{ibge}` | nome, UF, slug, código TSE |
| `current/{eleicao}__{escopo}__{cargo}` | ponteiro para o snapshot atual |
| `locks/{sha256(url)}` | single-flight com TTL 30 s |

Buckets:
- `snapshots/{ciclo}/{eleicao}/{escopo}/{cargo}/{idg}.json` — imutável, versionado, lifecycle 90 d.
- `catalogs/`, `geo/`, `fixtures/` — assets.

## Gravação

1. Validar o payload com Zod.
2. Gravar o objeto no bucket (nunca sobrescrever `idg` existente).
3. Em transação, comparar a geração e avançar `current`.
4. Se a geração for igual, não gravar; atualizar `lastSeenAt`.

## Consulta

- Sempre por chave exata.
- Lista para a tela → documento agregado pronto (panorama), não varredura.
- Índice só para consulta real; documentar no plano.
- Cache em memória na API protege o Firestore.

## Custo e retenção

- Estimar leituras/gravações por dia no PR.
- Lifecycle de 90 dias para snapshots; versões antigas preservadas no bucket.
- Nenhum dado pessoal.
- Backup/exportação semanal em fase 5.

## Anti-padrões

- Varrer coleção por request.
- Sobrescrever snapshot histórico.
- Documento gigante (> 1 MB) no Firestore.
- Avançar ponteiro antes de validar.
- Bucket público ou com listagem aberta.
- Sem TTL em lock.

## Antes de concluir

- [ ] Chave e transação revisadas
- [ ] Lifecycle e versionamento
- [ ] Teste com emulador
- [ ] Estimativa de custo
- [ ] Nenhum PII
