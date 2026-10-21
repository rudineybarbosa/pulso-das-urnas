# Spec Kit, agentes e skills

O projeto usa o **Spec Kit** para governança e especificação, com agentes especializados e skills compartilhadas entre **OpenCode** e **GitHub Copilot**.

## Estrutura

```
.specify/
├── memory/constitution.md      # princípios bloqueantes (stack TypeScript)
├── agents/*.md                 # fonte única dos 11 agentes
├── templates/                  # spec, plan, tasks, checklist, constitution, agent-file
├── scripts/bash/               # create-new-feature, setup-plan, setup-tasks, pré-requisitos
├── workflows/                  # ciclo completo (specify → plan → tasks → implement)
├── integrations/*.manifest.json
├── integration.json            # opencode + copilot instalados
├── init-options.json
└── feature.json                # aponta para specs/001-apuracao-tempo-real

specs/001-apuracao-tempo-real/
├── spec.md
└── checklists/requirements.md

.opencode/
├── agents/*.md                 # gerado de .specify/agents (OpenCode)
├── skills/*/SKILL.md           # skills do projeto (canônico)
└── commands/speckit.*.md       # comandos do Spec Kit

.github/
├── agents/*.agent.md           # gerado de .specify/agents (Copilot)
├── skills/<projeto>/SKILL.md   # espelho de .opencode/skills
├── skills/speckit-*/SKILL.md   # comandos do Spec Kit para Copilot
└── copilot-instructions.md
```

## Fluxo de uma feature

| Etapa | OpenCode | Copilot | Saída |
|---|---|---|---|
| Especificar | `/speckit.specify` | `/speckit-specify` | `specs/NNN-*/spec.md` |
| Esclarecer | `/speckit.clarify` | `/speckit-clarify` | spec revisada |
| Planejar | `/speckit.plan` | `/speckit-plan` | `plan.md`, `research.md`, `data-model.md`, `contracts/` |
| Tarefas | `/speckit.tasks` | `/speckit-tasks` | `tasks.md` |
| Implementar | `/speckit.implement` | `/speckit-implement` | código + testes |
| Analisar | `/speckit.analyze` | `/speckit-analyze` | relatório de consistência |
| Checklist | `/speckit.checklist` | `/speckit-checklist` | checklist de qualidade |
| Issues | `/speckit.taskstoissues` | `/speckit-taskstoissues` | issues no GitHub |
| Convergir | `/speckit.converge` | `/speckit-converge` | ajuste final |
| Constituição | `/speckit.constitution` | `/speckit-constitution` | emenda versionada |

Regra: `specs/NNN-*` é o canônico da feature; `docs/requisitos` é o canônico dos requisitos transversais. Não duplique conteúdo — referencie.

## Agentes

| Agente | Use para |
|---|---|
| `orchestrator` | Coordenar tarefas que cruzam áreas |
| `project-planner` | Quebrar spec em tarefas verificáveis |
| `explorer-agent` | Mapear código, dependências e riscos |
| `frontend-specialist` | Mapa, painel, busca, animação, a11y |
| `backend-specialist` | Fastify, contratos, cache, erros |
| `data-ingestion-specialist` | Coleta e normalização do TSE |
| `database-architect` | Firestore/GCS, chaves, retenção, custo |
| `test-engineer` | Vitest, Playwright, axe, k6 |
| `security-auditor` | OWASP, CSP, supply chain, LGPD |
| `devops-engineer` | Terraform, Cloud Run, deploy, rollback |
| `debugger` | Causa raiz de bug, regressão, lentidão |

### Editar um agente

1. Edite **apenas** `.specify/agents/<nome>.md`.
2. Rode:
   ```bash
   node scripts/sync-agents.mjs
   node scripts/sync-agents.mjs --check
   ```
3. O script gera `.opencode/agents/<nome>.md` e `.github/agents/<nome>.agent.md` com as permissões e ferramentas adequadas.
4. Nunca edite os gerados: eles têm um comentário de origem e o CI falha se divergirem.

## Skills

Canônico em `.opencode/skills/<id>/SKILL.md`. O espelho `.github/skills` é gerado:

```bash
node scripts/check-skills.mjs --sync
node scripts/check-skills.mjs
```

Skills do Spec Kit (`speckit-*`) vivem só em `.github/skills` e são preservadas pelo sincronizador.

## Constituição

`.specify/memory/constitution.md` é bloqueante. Ela cobre rastreabilidade, arquitetura (React/Vite, Fastify, Cloud Run, Firestore/GCS, Terraform), dados do TSE, acessibilidade, neutralidade, evidência e governança. Emenda exige PR com motivo, impacto e aprovação do mantenedor.

## Requisitos locais

- Node 22 e pnpm 9.
- Bash para os scripts do Spec Kit (`sh`).
- Nenhum runtime além de Node 22 no servidor e no build.

## Solução de problemas

| Sintoma | Correção |
|---|---|
| `feature.json` ausente | recrie com o caminho da feature atual |
| Comando do Spec Kit não aparece | confira `.opencode/commands/speckit.*.md` ou `.github/skills/speckit-*` |
| Agente desatualizado | rode `node scripts/sync-agents.mjs` |
| Skill divergente | rode `node scripts/check-skills.mjs --sync` |
| Template não encontrado | verifique `.specify/templates/` |
