# 10 — Testes e dados falsos

## 1. Pirâmide e ferramentas

| Nível | Ferramenta | O que cobre | Onde |
|---|---|---|---|
| Unitário | Vitest | regras (RN), parsers, normalização, busca, matemática do monitor | `packages/*` |
| Contrato | Vitest + Zod + OpenAPI | schemas de entrada/saída, campos obrigatórios, versionamento | `packages/contracts`, `apps/api` |
| Componente | Vitest + Testing Library | mapa, painel, busca, legenda, monitor | `apps/web` |
| Integração | Vitest + Firestore/GCS emulados | ingestão, idempotência, ponteiro, cache | `apps/ingest`, `apps/api` |
| E2E | Playwright | jornadas J-01..J-05 em modo fake | `e2e/` |
| Acessibilidade | axe-core + Playwright | violações sérias/críticas, teclado | `e2e/a11y` |
| Visual | Playwright screenshots | estados do mapa e cena final | `e2e/visual` |
| Carga | k6 | 10.000 VUs, p95, erro, hit ratio | `load/` |
| Build | size-limit | orçamento de bytes | CI |
| Infra | `terraform validate`, `terraform fmt -check` | sintaxe e formatação | CI |

## 2. Fixtures reais

`data/fixtures/tse/` guarda respostas **reais** capturadas, com metadados:

```
data/fixtures/tse/
├── catalog/ele-c-2026-10-20.json
├── 2026/6257/br-c0001-e006257-u.json
├── 2026/6257/sp-c0001-e006257-u.json
├── 2026/6257/sp71072-c0001-e006257-u.json
├── 2026/6257/br-e006257-ab.json
├── 2026/6257/config/mun-e006257-cm.json
├── 2026/6259/sp-c0003-e006259-u.json
├── 2026/6259/sp-c0007-e006259-u.json
├── 2026/6258/br-c0001-e006258-u.json      # 2º turno antes do início (zeros)
├── 2026/6260/sp-c0003-e006260-u.json      # 404 esperado em estado sem disputa
├── 2024/619/...                            # eleição municipal (Prefeito/Vereador)
└── manifest.json                           # url, capturedAt, sha256, parserVersion, tamanho
```

Regras:
- Toda fixture tem URL, data de captura e hash; o teste de contrato falha se o parser não aceitar a fixture.
- Dados são públicos; nenhuma fixture contém dado pessoal.
- Fixtures grandes são reduzidas apenas quando o campo removido não é usado (documentar no manifest).
- `manifest.json` registra também a `parserVersion` semver que produziu a fixture; mudança de formato exige fixture nova capturada (RN-042).
- O manifest `data/fixtures/tse/manifest.json` registra as 29 respostas oficiais do Presidente no 1º turno de 2026 (`6257`), conferidas contra `resultados.tse.jus.br` em 25/10/2026, com SHA-256 e tamanho de cada arquivo.
- **Pin e rollback de parser (D-050):** com `PARSER_VERSION_PIN=<versao>` a ingestão reprocessa a fixture com a versão fixada, sem novo deploy; falha de schema não grava, não avança `current`, mantém o último snapshot válido, registra `parser_schema_failure` e alerta. A flag é auditada no log e o rollback está em `docs/operacao/rollback-parser.md`. Teste: `apps/ingest/parser-pin.test.ts` e `apps/ingest/schema-failure.test.ts`.

## 3. Casos de teste das regras

### 3.1 Hierarquia e cor
| Caso | Entrada | Esperado |
|---|---|---|
| Presidente + governador | cargos 1 e 3 | cor do líder de presidente |
| Governador + deputados | cargos 3, 6, 7 | cor do líder de governador |
| Só municipal | cargos 11, 13 | cor do líder de prefeito |
| Cargo em destaque sem voto | presidente 0, governador 100 | branco (não usa governador) |
| Sem arquivo | `null` | cinza + "sem dado" |
| Empate exato | dois candidatos com `vap` igual | hachura |
| Todos anulados | `dvt` anulado | cinza + "aguardando definição judicial" |

### 3.2 Votos e percentual
- Soma dos percentuais = 100% ± 0,1 p.p. sobre uma única base por tela.
- Votos inválidos não entram na base.
- `pvap` oficial prevalece sobre cálculo, com `calculado: false` e rótulo "percentual oficial do TSE".
- Sem `v.vv`, `percentualBase = "calculado_validos"` e `calculado: true`, com o rótulo "calculado".
- Voto de legenda entra no total válido e não vira líder.
- Válidos > 0 e nenhum `dvt = "Válido"` → `sem_lider_elegivel` (RN-021, RN-035).

### 3.3 Corrida
- `g(0) = 0` → linhas na mesma altura.
- `d > 0` → líder à frente; `d < 0` → invertido (nunca acontece com dados válidos).
- `V = 0` → pista vazia, sem divisão por zero.
- `p = 0` → ambos na largada; `p = 1` → ambos na chegada, com separação.
- Histerese: alternância de ±0,005 não dispara o selo "PULSO!".
- Mudança de sinal + |g| ≥ 0,01 em dois snapshots consecutivos (≥ 5 s) → dispara.
- Cooldown de 30 s por par impede repetição (D-033); aos 29 s não dispara, aos 30 s dispara.
- Dupla: empate em `vap` desempata por nome de urna (`pt-BR`) e depois número, independente da ordem do JSON.
- Dupla é fixa na sessão; só troca quando o conjunto dos dois primeiros muda por 2 snapshots (≥ 10 s).

### 3.4 Busca
- "sao paulo" → estado SP e município São Paulo/SP.
- "SP" → estado São Paulo.
- "santa luzia" → 3 municípios com UF.
- "acre" → estado Acre; "rio" → estado Rio de Janeiro + municípios com "rio".
- "  SÃO   PAULO  " → normaliza.
- "x" → nenhum resultado (mínimo 2 caracteres).

### 3.5 Estados de ausência, frescor e bordas de produto
| Caso | Entrada | Esperado | AT |
|---|---|---|---|
| Cinco ausências | fixtures que produzem `sem_voto`, `sem_dado`, `nao_aplicavel`, `sem_lider_elegivel` e `retificado` | preenchimento e rótulo de RN-035, precedência determinística, nenhum vira erro de fonte | AT-010 |
| Sem líder elegível | `v.vv > 0` e todos os candidatos com `dvt` anulado | cinza escuro "Aguardando definição judicial"; legenda e votos válidos visíveis; legenda de partido não elege líder | AT-010 |
| Retificação | geração com votos menores que a anterior | valor oficial prevalece, `vote_regression` com `idg` anterior/atual, selo por 60 min ou 3 gerações sem regressão, delta mínimo `0` | AT-029 |
| Frescor parado | coleta recente, `generationId` antigo | `fonte_sem_atualizacao` âmbar, nunca "ao vivo"; números e cores intactos | AT-017 |
| 2º turno parcial | parte das UFs com disputa no turno vigente | UF com disputa usa o turno; sem disputa usa o 1º turno com selo e `origem`; monitor só com Presidente do turno | AT-013 |
| Suplementar | pleito municipal suplementar + pleito geral | panorama, ranking, cargo em destaque e monitor nacionais idênticos ao pleito geral | AT-038 |
| Catálogo alterado | `catalogVersion` nova sem um pleito e com um turno novo | selo "catálogo atualizado" por 24 h, depois `arquivado` fora do seletor; turno novo entra como mais recente | AT-040 |
| Candidato removido | candidato do 2º lugar passa a `Anulado` aos 50% | líder recalculado; linha "indisponível" parada; se o conjunto mudar por 2 snapshots, o monitor reancora | AT-022 |
| Offline/reconexão | `context.setOffline(true)` por 30 s e volta | congelamento, uma única condicional na volta, nenhum replay de ultrapassagem, mola reancorada em 400 ms | AT-039 |
| Geometria ausente | malha sem 2 municípios do catálogo | tabela e busca com números, sem `<path>` nem foco no mapa, faixa discreta, distinto de `sem_dado` | AT-037 |

## 4. E2E (Playwright)

| Arquivo | Cenário | Critério |
|---|---|---|
| `j01-panorama.spec.ts` | abre, vê mapa, legenda e frescor | AT-005, AT-017 |
| `j02-cidade.spec.ts` | busca → cidade → votos → voltar 2× | AT-008, AT-009, AT-016 |
| `j03-citar.spec.ts` | `/br/sp?cargo=3`, tabela, URL | AT-014, AT-025, AT-026 |
| `j04-virada.spec.ts` | cenário `virada` a 120× | AT-011, AT-021, AT-022 |
| `j05-teclado.spec.ts` | fluxo só com teclado, foco após zoom/voltar e tabela paginada | AT-025 |
| `fim.spec.ts` | cenário `fim`, estabilidade, reload e nova aba | AT-019, AT-023, AT-024 |
| `reduced-motion.spec.ts` | `prefers-reduced-motion` | AT-024 |
| `erros.spec.ts` | 404 de município, fonte fora, microcopy | AT-018 |
| `ausencias.spec.ts` | cinco estados de ausência no mapa e na tabela | AT-010 |
| `offline.spec.ts` | `context.setOffline(true)` → reconexão | AT-039 |
| `pleitos.spec.ts` | grupos do seletor, pleito finalizado e arquivado | AT-036, AT-040 |
| `suplementar.spec.ts` | suplementar não altera panorama, ranking nem monitor | AT-038 |
| `geometria.spec.ts` | município sem malha na tabela, busca e faixa | AT-037 |
| `privacidade.spec.ts` | sem terceiros, sem cookie, só chaves `pulso:*` | AT-033 |
| `deep-link.spec.ts` | canônico, `301` de IBGE/alias, troca de pleito | AT-016, AT-026 |
| `visual.spec.ts` | screenshots: sem votos, parcial, empate, final | regressão visual |
| `usabilidade-sc007.md` | roteiro de D-049: 5/5 participantes no teclado com reduced motion | SC-007 |

- Tempo controlado: o simulador aceita `?t=` (timestamp) e `REPLAY_SPEED`; os testes usam `clock` do Playwright quando possível.
- Nenhum teste depende da rede externa. O TSE real só é exercitado no teste de fumaça agendado.

## 5. Simulador local

### 5.1 Como roda
```bash
pnpm dev          # api com DATA_MODE=fake + web
# variáveis:
#   SCENARIO=sem-votos|parcial|virada|empate|fim|erro-fonte|dois-turnos|dois-turnos-parcial
#            |retificacao|suplementar|catalogo-alterado|candidato-removido|offline|geometria-ausente
#   REPLAY_SPEED=1|60|600
#   SEED=2026
```

A fonte é plugável em `packages/tse`:

```ts
interface ResultSource {
  catalog(): Promise<Catalog>
  snapshot(scope: Scope, office: OfficeId): Promise<TseSnapshot | null>
  progress(election: ElectionId, scope: Scope): Promise<Progress | null>
}
```

- `TseSource`: HTTP real, condicional, com limites de RN-032.
- `ReplaySource`: lê fixture final e revela votos progressivamente.
- `SyntheticSource`: gera votos por lote, com roteiro.

### 5.2 Replay
O TSE mantém apenas a última geração de cada arquivo; não é possível baixar o histórico de uma apuração passada. Por isso o replay:
1. usa o **resultado final real** da fixture (números verdadeiros);
2. distribui os votos no tempo por uma curva logística por UF, calibrada pela ordem real de totalização das UFs;
3. varia a geração (`idg`) a cada passo, simulando atualizações.

O que é real: os votos, os candidatos, os partidos, a ordem final.
O que é sintético: o ritmo temporal. Isso fica explícito na tela quando `DATA_MODE=fake` (faixa "modo de demonstração").

### 5.3 Cenários
| Cenário | Roteiro |
|---|---|
| `sem-votos` | `p = 0`, todos brancos, monitor aguardando o primeiro boletim |
| `parcial` | `p` cresce de 0 a 100 em 5 min, sem virada |
| `virada` | candidato B começa à frente e A assume aos 60% (dois picos de diferença) |
| `empate` | diferença vai a zero e permanece por 30 s |
| `fim` | `p = 100`, `tf = s`, cena final dispara uma vez |
| `erro-fonte` | após 30 s, a fonte começa a falhar; selo "desatualizado" |
| `dois-turnos` | 1º turno finalizado + 2º turno zerado (estado `nao_iniciada`) |
| `dois-turnos-parcial` | 2º turno em apuração com disputa em parte das UFs; as demais usam o 1º turno com selo e `origem` |
| `retificacao` | aos 80%, uma geração reduz votos de um candidato e liga o selo "Dados retificados pelo TSE" |
| `suplementar` | catálogo com pleito geral em apuração + suplementar municipal |
| `catalogo-alterado` | catálogo novo remove um pleito, adiciona um turno e muda `catalogVersion` |
| `candidato-removido` | aos 50%, o candidato do 2º lugar passa a `dvt = Anulado` |
| `offline` | derruba a rede por 30 s no meio da apuração e reconecta |
| `geometria-ausente` | remove a malha de 2 municípios do catálogo carregado |

## 6. Carga

`load/panorama.js` (k6), executado de **3 runners** — São Paulo, Virgínia (us-east) e Frankfurt (eu-west) — contra o ambiente de dev com **CDN real** e `s-maxage` de produção:

```
estágios: 0 → 2.000 VUs (2 min) → 10.000 VUs (5 min de platô) → 0 (1 min)
mix:      70% panorama (/api/v1/panorama) · 20% município · 10% estático
thresholds: http_req_failed < 0,1%        (total e por runner)
            http_req_duration p95 < 150 ms (borda/CDN)
            origin_ratio ≤ 5%              (origin / total)
            cpu < 80%                      (pulso-api no platô)
            5xx = 0                        (no origin)
```

- Aprovação exige os cinco limites **simultaneamente**; qualquer um fora reprova a execução (D-041).
- Medir hit ratio da CDN, req/s e CPU do origin, `ingest_lag_seconds` p95 e `age`; registrar no relatório `docs/operacao/carga-YYYY-MM-DD.md` com data, commit, runners, mix, números e conclusão.
- Rodar contra o ambiente de dev com CDN ativa e `s-maxage` real, nunca contra `localhost` nem sem CDN — teste sem CDN é proibido como evidência de escala.
- Repetir após mudança de cache, de payload (AT-035) ou de topologia.
- Definição normativa completa em [05 §Escala](05-requisitos-nao-funcionais.md); critério em AT-032.

## 7. Gates de CI

| Etapa | Falha se |
|---|---|
| lint | erro de ESLint/Prettier |
| typecheck | erro de TS |
| unit | teste falha ou cobertura < 80% (global) / < 90% (rules e tse) |
| contrato | schema quebra ou fixture não parseia |
| fixtures | `manifest.json` sem `url`/`capturedAt`/`sha256`/`parserVersion`, ou fixture nova sem captura registrada |
| parser | pin/rollback de `PARSER_VERSION_PIN` não preserva o último snapshot, schema inválido grava ou a flag não é auditada (RN-042) |
| ausências | um dos cinco estados de RN-035 sai com preenchimento, rótulo ou `status` errado (AT-010) |
| build | size-limit estoura |
| payload | resposta de aba > 12 KB gz, painel com > 5 abas ou pré-busca de cargo não-destaque (AT-035) |
| e2e | qualquer cenário falha, incluindo `offline`, `retificacao`, `suplementar`, `catalogo-alterado`, `candidato-removido` e `geometria-ausente` |
| a11y | violação séria/crítica, foco perdido após zoom/voltar ou `aria-live` acima de 1 anúncio/10 s (AT-025) |
| contraste | cor de partido abaixo de 4,5:1 para texto ou 3:1 para preenchimento/hachura, mesmo após ajuste (RN-024) |
| cwv | LCP > 2,5 s, INP > 200 ms ou CLS > 0,1 em `/br`, `/br/sp` e `/br/sp/sao-paulo`, no perfil Moto G4 4G, p75 de 5 execuções |
| arte | `assets/race/README.md` ausente, sem autoria/licença ou com marca de terceiro (D-051) |
| privacidade | requisição a domínio de terceiro, cookie ou chave fora de `pulso:*` (AT-033) |
| latência | p95 fim a fim > 30 s ou mediana > 15 s com apuração ativa no ambiente de dev (AT-034) |
| carga | um dos cinco limites de AT-032 fora, ou execução sem os 3 runners/relatório |
| infra | `terraform fmt -check` ou `validate` falha |
| skills | espelhos `.opencode` e `.github` divergem |

## 8. Evidência

- Cada AT em [11-criterios-de-aceite.md](11-criterios-de-aceite.md) aponta para o teste que o cobre; a matriz de [12](12-rastreabilidade.md) liga RF, RN e AT.
- PR anexa: comando executado, saída resumida e, quando visual, screenshot/GIF.
- Privacidade (AT-033) anexa o HAR e o dump de `localStorage`/`sessionStorage`; sem os dois, o critério não conta como executado.
- Teste de usabilidade de SC-007 (D-049) anexa roteiro, número de participantes, contagem de ações e tempo; os números exibidos são comparados com a versão com mouse e animação.
- "Não executado" é declarado; não se presume verde.
