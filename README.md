# Pulso das Urnas

A apuração das eleições brasileiras em tempo real, estado por estado, cidade por cidade — com um mapa clicável e uma corrida de cavalinhos que mostra a disputa acontecendo.

> **Status:** especificação aprovada para implementação (v0.1.0, 20/10/2026). Ainda não há código de produto neste repositório.

## O que o sistema faz

1. Descobre sozinho quais pleitos, turnos e cargos estão em disputa no Brasil, em cada estado e em cada cidade, a partir do catálogo oficial do TSE.
2. Consulta os arquivos oficiais de resultados do TSE no ritmo certo, normaliza e publica um retrato consistente para milhares de pessoas ao mesmo tempo.
3. Pinta cada estado com a cor do partido que lidera o **maior cargo em disputa** naquele estado; branco antes de qualquer voto.
4. Permite descer do Brasil para o estado e do estado para a cidade, com busca por nome de estado ou cidade e botão **Voltar**.
5. Mostra os votos de cada candidato na cidade escolhida, por cargo.
6. Anima, no rodapé, uma corrida entre os dois candidatos mais votados, com ultrapassagem, relincho e um fim de eleição carinhoso.

## Comece por aqui

| Documento | Para quê |
|---|---|
| [PRODUCT.md](PRODUCT.md) | Visão, público, princípios de produto e o que não fazemos |
| [DESIGN.md](DESIGN.md) | Identidade visual, mapa, cores partidárias, movimento e acessibilidade |
| [CONTEXT.md](CONTEXT.md) | Glossário do domínio eleitoral e do TSE |
| [AGENTS.md](AGENTS.md) | Regras de trabalho para pessoas e agentes de IA |
| [docs/requisitos/00-visao-e-objetivos.md](docs/requisitos/00-visao-e-objetivos.md) | Objetivos, métricas de sucesso e premissas |
| [docs/requisitos/01-escopo.md](docs/requisitos/01-escopo.md) | Escopo, fora de escopo e fases |
| [docs/requisitos/02-personas-e-jornadas.md](docs/requisitos/02-personas-e-jornadas.md) | Quem usa e como |
| [docs/requisitos/03-requisitos-funcionais.md](docs/requisitos/03-requisitos-funcionais.md) | RF-001 a RF-045 |
| [docs/requisitos/04-regras-de-negocio.md](docs/requisitos/04-regras-de-negocio.md) | RN-001 a RN-034 |
| [docs/requisitos/05-requisitos-nao-funcionais.md](docs/requisitos/05-requisitos-nao-funcionais.md) | Desempenho, escala, acessibilidade, segurança, custo |
| [docs/requisitos/06-contrato-de-dados-tse.md](docs/requisitos/06-contrato-de-dados-tse.md) | Endpoints, campos, cache, erros e limites do TSE |
| [docs/requisitos/07-ux-mapa-e-animacoes.md](docs/requisitos/07-ux-mapa-e-animacoes.md) | Telas, estados, interações e animações |
| [docs/requisitos/08-arquitetura-e-stack.md](docs/requisitos/08-arquitetura-e-stack.md) | Componentes, fluxos de dados e stack |
| [docs/requisitos/09-infra-e-terraform.md](docs/requisitos/09-infra-e-terraform.md) | GCP, Terraform, deploy e operação |
| [docs/requisitos/10-testes-e-dados-falsos.md](docs/requisitos/10-testes-e-dados-falsos.md) | Estratégia de testes e simulador local |
| [docs/requisitos/11-criterios-de-aceite.md](docs/requisitos/11-criterios-de-aceite.md) | AT-001 a AT-032 em Given/When/Then |
| [docs/requisitos/12-rastreabilidade.md](docs/requisitos/12-rastreabilidade.md) | Matriz RF ↔ RN ↔ AT ↔ código |
| [docs/decisoes/](docs/decisoes/) | ADR-001 a ADR-005 |
| [docs/agents/](docs/agents/) | Workflow, PRs, tickets e domínio |
| [docs/agents/agent-tools.md](docs/agents/agent-tools.md) | Como OpenCode e Copilot encontram agentes e skills |
| [SPECKIT-USAGE.md](SPECKIT-USAGE.md) | Spec Kit, agentes, skills e fluxo de feature |
| [.specify/memory/constitution.md](.specify/memory/constitution.md) | Constituição bloqueante do projeto |
| [docs/superpowers/specs/2026-10-20-pulso-das-urnas-design.md](docs/superpowers/specs/2026-10-20-pulso-das-urnas-design.md) | Spec canônica aprovada |

## Fontes de dados

- **Resultados oficiais (tempo real):** `https://resultados.tse.jus.br/oficial/`
- **Catálogo de pleitos e cargos:** `https://resultados.tse.jus.br/oficial/comum/config/ele-c.json`
- **Malhas territoriais:** API de malhas do IBGE (`https://servicodados.ibge.gov.br/api/v3/malhas/`)
- **Localidades:** `https://servicodados.ibge.gov.br/api/v1/localidades/`

O Pulso das Urnas **não é um serviço oficial do TSE**. Os dados são públicos, atribuídos à fonte e exibidos com o horário de geração informado pelo TSE.

## Licença e uso

Uso jornalístico e cívico. Sem coleta de dados pessoais, sem login, sem anúncios. Ver [docs/requisitos/05-requisitos-nao-funcionais.md](docs/requisitos/05-requisitos-nao-funcionais.md).

## Spec Kit e agentes

- **Constituição:** [.specify/memory/constitution.md](.specify/memory/constitution.md) — bloqueante.
- **Spec corrente:** [specs/001-apuracao-tempo-real/spec.md](specs/001-apuracao-tempo-real/spec.md).
- **Agentes:** fonte em [.specify/agents/](.specify/agents/), gerados para [.opencode/agents/](.opencode/agents/) e [.github/agents/](.github/agents/).
- **Skills:** canônicas em [.opencode/skills/](.opencode/skills/), espelhadas em [.github/skills/](.github/skills/).
- **Comandos:** `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement` no OpenCode; `/speckit-specify` e equivalentes no Copilot.
- **Guia:** [SPECKIT-USAGE.md](SPECKIT-USAGE.md).
