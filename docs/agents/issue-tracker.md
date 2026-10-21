# Issue tracker e board

## Onde

- Issues: GitHub, repositório `rudineybarbosa/pulso-das-urnas`.
- Board: GitHub Projects, colunas `Backlog`, `Ready`, `In progress`, `In review`, `Ready for QA`, `Done`.
- Labels de tipo: `feat`, `fix`, `docs`, `infra`, `test`, `spike`.
- Labels de área: `web`, `api`, `ingest`, `geo`, `infra`, `a11y`, `legal`.
- Labels de prioridade: `P0` (bloqueia eleição), `P1`, `P2`.

## Regras

- Todo ticket tem: contexto, resultado esperado, "Pronto quando", fora de escopo, RF/RN e área.
- Ticket sem critério observável não entra em `Ready`.
- Um ticket por PR, salvo dependência explícita (usar sub-issues).
- Ticket de spike tem prazo e pergunta; o resultado vira comentário, não código descartável sem registro.
- Issue fechada só em `Done`, após QA na URL (quando houver entrega publicada).

## Campos do board

| Campo | Valores |
|---|---|
| Status | Backlog, Ready, In progress, In review, Ready for QA, Done |
| Área | web, api, ingest, geo, infra, docs |
| Prioridade | P0, P1, P2 |
| Fase | F1..F6 |
| Estimativa | 1, 2, 3, 5, 8 pontos |

## Templates

- `feature.md`: contexto, resultado, critérios, fora de escopo, riscos.
- `bug.md`: passos, esperado, observado, ambiente, evidência.
- `spike.md`: pergunta, prazo, o que será testado, o que conta como resposta.
