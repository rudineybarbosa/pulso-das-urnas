# ADR-004 — Simulador embutido na API por fonte plugável

- **Status:** aceito
- **Data:** 20/10/2026
- **Relacionado:** RF-035..RF-040, [10-testes](../requisitos/10-testes-e-dados-falsos.md)

## Contexto

Precisamos ver mapas, cores, busca, painel e todas as animações funcionando em localhost, sem depender de uma eleição em andamento e sem esperar horas por uma virada. Também precisamos de testes determinísticos de estados que só aparecem sob condições raras (empate, fonte fora, fim).

## Decisão

- A API recebe a fonte por injeção: `TseSource`, `ReplaySource` ou `SyntheticSource`.
- `DATA_MODE=fake` ativa replay ou síntese; `DATA_MODE=real` ativa o TSE.
- **Não há serviço separado de simulador.** Web e API sobem com `pnpm dev`; o Docker Compose usa os mesmos dois serviços.
- Cenários por variável de ambiente ou query: `sem-votos`, `parcial`, `virada`, `empate`, `fim`, `erro-fonte`, `dois-turnos`.
- Semente determinística (`SEED`) e relógio controlável (`?t=` no modo fake) para testes.
- A tela exibe uma faixa "Modo de demonstração — dados simulados" sempre que `DATA_MODE=fake`.
- O replay usa os **votos finais reais** de uma fixture e sintetiza apenas o ritmo temporal ([10 §5.2](../requisitos/10-testes-e-dados-falsos.md)).

## Consequências

**Positivas**
- Um comando para ver tudo funcionando.
- Os mesmos contratos e componentes são exercitados em teste e em produção.
- Cenários de borda reproduzíveis para Playwright.

**Negativas**
- Código de simulação convive com o de produção; mitigado por injeção e por nunca ser importado no bundle web.
- Risco de o fake divergir do real; mitigado por testes de contrato que rodam o mesmo schema para as duas fontes.

## Alternativas

| Alternativa | Por que não |
|---|---|
| Serviço de mock separado (WireMock/MSW) | duplicaria contrato e não exercita o servidor real |
| Gravar e reproduzir HTTP | não cobre cenários que nunca aconteceram |
| Esperar a eleição real | inviável para desenvolvimento e teste |

## Evidência

`pnpm dev` + `SCENARIO=virada REPLAY_SPEED=60` produz a ultrapassagem em menos de 2 min; vídeo anexado ao PR da fase 4.
