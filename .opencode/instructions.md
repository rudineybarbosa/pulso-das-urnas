# Instruções do projeto — Pulso das Urnas

## Ponto de partida

Leia o `README.md` da raiz. Ele é o índice e aponta para a documentação pertinente. Não releia todos os documentos em toda tarefa: leia só o que a demanda toca.

## Leitura direcionada

- **Mapa, tela, animação:** `DESIGN.md`, `docs/requisitos/07-ux-mapa-e-animacoes.md` e o RF/RN citado.
- **Dados do TSE:** `docs/requisitos/06-contrato-de-dados-tse.md`, `CONTEXT.md` e `docs/requisitos/04-regras-de-negocio.md`.
- **Backend/API:** `docs/requisitos/08-arquitetura-e-stack.md`, contrato e ADRs.
- **Infra:** `docs/requisitos/09-infra-e-terraform.md` e ADR-005.
- **Testes/dados falsos:** `docs/requisitos/10-testes-e-dados-falsos.md`.

## Regras

- Requisito sem ID não existe: toda implementação cita RF/RN e AT.
- Nunca invente número eleitoral em modo real. Fonte falhou → último snapshot + selo.
- Neutralidade editorial é bloqueante (RN-033).
- Acessibilidade e `prefers-reduced-motion` são critérios de aceite, não polish.
- Antes de dizer "pronto", rode os checks e mostre a saída.
- Não faça commit nem push em nome do usuário sem pedido explícito; nunca direto em `dev`/`main`.
- Atualizou comportamento? Atualize README, RF/RN e a matriz de rastreabilidade no mesmo trabalho.

## Skills

Use a skill antes de agir quando a tarefa casar com a descrição: `dados-tse`, `mapa-eleitoral`, `animacao-cavalos`, `infra-gcp`, `testes-locais`, `revisao-de-codigo`, `prova-de-entrega`, `documentacao-ai-first`.

## Ferramentas

- Node 22 + pnpm 9.
- Playwright para e2e; Vitest para unitário; k6 para carga.
- Terraform ≥ 1.9 (ver `scripts/install-tools.sh`).
