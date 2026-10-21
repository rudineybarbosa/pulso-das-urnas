# Agentes e skills por ferramenta

O projeto funciona em **OpenCode** e **GitHub Copilot** com o mesmo conteúdo, gerado de uma fonte única.

## Fonte única

| Conteúdo | Fonte | Gerado para |
|---|---|---|
| Agentes | `.specify/agents/*.md` | `.opencode/agents/*.md`, `.github/agents/*.agent.md` |
| Skills do projeto | `.opencode/skills/*/SKILL.md` | `.github/skills/*/SKILL.md` |
| Skills de terceiros | `.agents/skills/*/SKILL.md` | `.github/skills/*/SKILL.md` |
| Comandos do Spec Kit | `.opencode/commands/speckit.*.md` | `.github/skills/speckit-*` (via instalação) |
| Regras gerais | `AGENTS.md` | lido pelos dois |

Verificação no CI: `node scripts/sync-agents.mjs --check` e `node scripts/check-skills.mjs`.

## Skills de terceiros

- Origem: `mattpocock/skills` (licença MIT), instaladas com `npx skills@latest add mattpocock/skills -a opencode`.
- Local: `.agents/skills/` (fonte de compatibilidade do OpenCode) e espelho em `.github/skills/` para o Copilot.
- Lock: `skills-lock.json` na raiz (fonte, caminho original e hash por skill).
- 38 skills; 15 são auto-anunciadas e 23 têm `disable-model-invocation: true`, exigindo invocação explícita pelo ID.
- Atualização: rode o comando de instalação de novo e depois `node scripts/check-skills.mjs --sync`.
- Precedência: ver `AGENTS.md` § Precedência de skills; domínio do projeto vence skill genérica.

## OpenCode

| Recurso | Onde | Como usar |
|---|---|---|
| Agentes | `.opencode/agents/*.md` | subagentes; o agente principal escolhe pelo `description` |
| Skills | `.opencode/skills/*/SKILL.md` | ferramenta `skill`, pelo ID da pasta |
| Comandos | `.opencode/commands/*.md` | `/speckit.specify`, `/testar-local`, `/provar-entrega` |
| Instruções | `.opencode/instructions.md` + `AGENTS.md` | carregadas automaticamente |
| Plugin | `superpowers` | configuração em `.opencode/opencode.json` |

Invocar um agente: peça pelo nome ("use o `frontend-specialist` para...") ou deixe o orquestrador escolher.

## GitHub Copilot

| Recurso | Onde | Como usar |
|---|---|---|
| Agentes | `.github/agents/*.agent.md` | selecione no painel de agentes ou no Copilot CLI (`/agent`) |
| Skills | `.github/skills/*/SKILL.md` | o Copilot lê o arquivo indicado no corpo do agente |
| Instruções | `.github/copilot-instructions.md` + `AGENTS.md` | lidas automaticamente |
| Spec Kit | `.github/skills/speckit-*` | `/speckit-specify`, `/speckit-plan`, etc. |

Os agentes do Copilot declaram `tools` no formato dele (`read`, `search`, `execute`, `edit`), derivado da mesma fonte.

## O que cada ferramenta não tem

| Recurso | OpenCode | Copilot |
|---|---|---|
| Ferramenta `skill` nativa | sim | não; lê o arquivo da skill no repositório |
| Seleção manual de subagente | sim | sim (agentes customizados) |
| Hook de proteção de shell | não configurado | não |
| Execução de testes/e2e | sim, local | sim, no runner do Copilot |
| Acesso a segredos de produção | não | não |

Nenhum agente tem permissão para `terraform apply`, push em `main`/`dev` ou leitura de segredos. Essas ações são humanas.

## Convenções

- Todo agente cita o RF/RN/AT que está atendendo.
- Todo agente carrega a skill do domínio antes de editar.
- Agente que só investiga não edita (`edit: deny`).
- Agente que edita não faz merge nem deploy.
- O resultado sempre inclui evidência (comando/saída ou tela).
