# 10 — Testes e dados falsos

## 1. Pirâmide e ferramentas

| Nível | Ferramenta | O que cobre | Onde |
|---|---|---|---|
| Unitário | Vitest | regras (RN), parsers, normalização, busca, matemática da corrida | `packages/*` |
| Contrato | Vitest + Zod + OpenAPI | schemas de entrada/saída, campos obrigatórios, versionamento | `packages/contracts`, `apps/api` |
| Componente | Vitest + Testing Library | mapa, painel, busca, legenda, corrida | `apps/web` |
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
└── manifest.json                           # url, capturedAt, sha256, tamanho
```

Regras:
- Toda fixture tem URL, data de captura e hash; o teste de contrato falha se o parser não aceitar a fixture.
- Dados são públicos; nenhuma fixture contém dado pessoal.
- Fixtures grandes são reduzidas apenas quando o campo removido não é usado (documentar no manifest).

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
- Soma dos percentuais = 100% ± 0,1 p.p.
- Votos inválidos não entram na base.
- `pvap` oficial prevalece sobre cálculo.
- Voto de legenda entra no total válido e não vira líder.

### 3.3 Corrida
- `g(0) = 0` → cavalos lado a lado.
- `d > 0` → líder à frente; `d < 0` → invertido (nunca acontece com dados válidos).
- `V = 0` → pista vazia, sem divisão por zero.
- `p = 0` → ambos na largada; `p = 1` → ambos na chegada, com separação.
- Histerese: alternância de ±0,005 não dispara relincho.
- Mudança de sinal + |g| ≥ 0,01 em dois snapshots → dispara.
- Cooldown de 20 s impede repetição.

### 3.4 Busca
- "sao paulo" → estado SP e município São Paulo/SP.
- "SP" → estado São Paulo.
- "santa luzia" → 3 municípios com UF.
- "acre" → estado Acre; "rio" → estado Rio de Janeiro + municípios com "rio".
- "  SÃO   PAULO  " → normaliza.
- "x" → nenhum resultado (mínimo 2 caracteres).

## 4. E2E (Playwright)

| Arquivo | Cenário | Critério |
|---|---|---|
| `j01-panorama.spec.ts` | abre, vê mapa, legenda e frescor | AT-005, AT-017 |
| `j02-cidade.spec.ts` | busca → cidade → votos → voltar 2× | AT-008, AT-009, AT-016 |
| `j03-citar.spec.ts` | `/br/sp?cargo=3`, tabela, URL | AT-014, AT-025, AT-026 |
| `j04-virada.spec.ts` | cenário `virada` a 120× | AT-011, AT-021, AT-022 |
| `j05-teclado.spec.ts` | fluxo só com teclado | AT-025 |
| `fim.spec.ts` | cenário `fim` | AT-019, AT-023 |
| `reduced-motion.spec.ts` | `prefers-reduced-motion` | AT-024 |
| `erros.spec.ts` | 404 de município, fonte fora, offline | AT-018 |
| `visual.spec.ts` | screenshots: sem votos, parcial, empate, final | regressão visual |

- Tempo controlado: o simulador aceita `?t=` (timestamp) e `REPLAY_SPEED`; os testes usam `clock` do Playwright quando possível.
- Nenhum teste depende da rede externa. O TSE real só é exercitado no teste de fumaça agendado.

## 5. Simulador local

### 5.1 Como roda
```bash
pnpm dev          # api com DATA_MODE=fake + web
# variáveis:
#   SCENARIO=sem-votos|parcial|virada|empate|fim|erro-fonte
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
| `sem-votos` | `p = 0`, todos brancos, corrida na largada |
| `parcial` | `p` cresce de 0 a 100 em 5 min, sem virada |
| `virada` | candidato B começa à frente e A assume aos 60% (dois picos de diferença) |
| `empate` | diferença vai a zero e permanece por 30 s |
| `fim` | `p = 100`, `tf = s`, cena final dispara uma vez |
| `erro-fonte` | após 30 s, a fonte começa a falhar; selo "desatualizado" |
| `dois-turnos` | 1º turno finalizado + 2º turno zerado |

## 6. Carga

`load/panorama.js` (k6):
```
estágios: 0 → 2.000 VUs (2 min) → 10.000 VUs (5 min) → 0 (1 min)
threshholds: http_req_failed < 0.1%, http_req_duration p95 < 150 ms,
             http_reqs > 400/s no platô
```
- Rodar contra o ambiente de dev com CDN ativa e `s-maxage` real.
- Medir hit ratio da CDN e req/s no origin; registrar no relatório `docs/operacao/carga-YYYY-MM-DD.md`.
- Teste sem CDN é proibido como evidência de escala.

## 7. Gates de CI

| Etapa | Falha se |
|---|---|
| lint | erro de ESLint/Prettier |
| typecheck | erro de TS |
| unit | teste falha ou cobertura < 80% (global) / < 90% (rules e tse) |
| contrato | schema quebra ou fixture não parseia |
| build | size-limit estoura |
| e2e | qualquer cenário falha |
| a11y | violação séria/crítica |
| infra | `terraform fmt -check` ou `validate` falha |
| skills | espelhos `.opencode` e `.github` divergem |

## 8. Evidência

- Cada AT em [11-criterios-de-aceite.md](11-criterios-de-aceite.md) aponta para o teste que o cobre.
- PR anexa: comando executado, saída resumida e, quando visual, screenshot/GIF.
- "Não executado" é declarado; não se presume verde.
