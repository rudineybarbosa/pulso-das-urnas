---
name: Testes locais e dados falsos
description: Subir o projeto em localhost com dados simulados, escolher cenário (virada, empate, fim, sem votos, erro de fonte), acelerar o replay, rodar e2e e carga. Use quando alguém pedir para "ver funcionando", "testar na minha máquina", reproduzir um estado raro ou validar animações sem eleição real.
---

# Testes locais e dados falsos

Leia `docs/requisitos/10-testes-e-dados-falsos.md` e o ADR-004.

## Subir

```bash
pnpm install
pnpm dev                 # web + api em DATA_MODE=fake
open http://localhost:5173
```

Variáveis:
```bash
SCENARIO=sem-votos|parcial|virada|empate|fim|erro-fonte|dois-turnos
REPLAY_SPEED=1|60|600
SEED=2026
DATA_MODE=real           # consome o TSE de verdade
```

`pnpm dev` nunca depende do TSE. A tela mostra "Modo de demonstração" quando os dados são simulados.

## Cenários para cada animação

| Quero ver | Comando | Tempo |
|---|---|---|
| Mapa branco e cavalos na largada | `SCENARIO=sem-votos pnpm dev` | imediato |
| Mapas colorindo | `SCENARIO=parcial REPLAY_SPEED=60 pnpm dev` | ~5 min |
| Ultrapassagem + relincho | `SCENARIO=virada REPLAY_SPEED=120 pnpm dev` | ~2 min |
| Empate/hachura | `SCENARIO=empate pnpm dev` | ~1 min |
| Fim + lambida | `SCENARIO=fim pnpm dev` | imediato |
| Fonte fora + selo âmbar | `SCENARIO=erro-fonte pnpm dev` | ~30 s |

## Testes

```bash
pnpm test                 # unit + contrato
pnpm test:e2e             # Playwright (fake)
pnpm test:a11y            # axe + teclado
pnpm test:load            # k6 (requer ambiente publicado)
```

- E2E usa apenas fixtures/simulador; nenhum teste depende da rede externa.
- Tempo controlado por `?t=` e `REPLAY_SPEED`; não use `sleep` fixo.
- Teste de carga só vale contra ambiente com CDN (nunca local).

## Depuração

- API: `pnpm --filter api dev` com `LOG_LEVEL=debug`.
- Snapshot atual: `GET /api/v1/_debug/snapshot` (somente `DATA_MODE=fake`).
- Forçar versão: `?v=123`.
- Relógio: `?t=2026-10-04T18:30:00-03:00`.

## Antes de concluir

- [ ] Os cenários que o PR afeta foram abertos e vistos.
- [ ] Evidência (GIF/screenshot/log) anexada.
- [ ] Nenhuma fixture real foi alterada à mão sem atualizar o manifest.
