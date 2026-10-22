# 01 — Escopo

## 1. Dentro do escopo (v1)

### 1.1 Dados e descoberta

- Leitura do catálogo oficial de pleitos, turnos, abrangências e cargos.
- Coleta dos resultados oficiais por país, UF e município, com cache condicional e controle de taxa.
- Normalização para um contrato interno versionado, com validação por schema.
- Detecção de apuração em andamento e encerrada.
- Histórico de snapshots para auditoria e replay.

### 1.2 Apresentação

- Mapa do Brasil com 27 unidades, cor por partido líder do maior cargo em disputa.
- Zoom para estado com municípios clicáveis; zoom de volta ("Voltar").
- Painel de votos por candidato no município, com abas por cargo.
- Busca por nome de estado ou cidade, com label literal definido em DESIGN.md.
- Seleção de pleito e de cargo.
- Indicador de frescor (horário, % apurado, status da fonte).
- Legenda de cores, empates e estados sem dado.
- Tabela alternativa de dados (acessibilidade).
- URLs compartilháveis por escopo.

### 1.3 Animação

- Monitor de pulso com duas linhas no rodapé, derivado da diferença de votos.
- Inversão de liderança com selo "PULSO!".
- Cena final de encerramento (lambida carinhosa; perdedor deita).
- Controles de pausa e respeito a `prefers-reduced-motion`.

### 1.4 Plataforma

- API pública de leitura, cacheável em CDN, com ETag e Problem Details.
- Ingestão agendada, idempotente e observável.
- Simulador local (`DATA_MODE=fake`) com replay e dados sintéticos.
- Infraestrutura em Terraform (dev e prod), sem aplicar automaticamente na conta do mantenedor.
- CI com lint, tipos, testes, e2e, acessibilidade, orçamento de bundle e `terraform validate`.
- Documentação AI-first, agents e skills para OpenCode e GitHub Copilot.

## 2. Fora do escopo (v1)

| Item | Motivo | Quando reconsiderar |
|---|---|---|
| Login, perfil e favoritos | Não há dado pessoal nem personalização necessária | v2, se houver demanda |
| Comentários, enquetes, apostas | Risco legal e editorial | não previsto |
| Push notification / e-mail | Custo e complexidade sem ganho claro | v2 |
| App nativo | SPA responsiva atende | se houver tração |
| Outros idiomas | Público inicial é brasileiro | v2 |
| Pesquisas de intenção e projeções | Não é o propósito; exigiria metodologia estatística | não previsto |
| Edição manual de números | Risco à integridade do dado | nunca |
| Painel administrativo | Operação é por infraestrutura e configuração versionada | v2 |
| Anúncios e rastreamento | Privacidade e neutralidade | não previsto |
| Modo telão | Desejável, mas não essencial | Q-04 |
| Dados por zona e seção | Granularidade além do município | v2 |
| Fotos de candidatos | Peso e licenciamento | v2, com lazy loading |

## 3. Fases de entrega

| Fase | Entrega | Critério de saída |
|---|---|---|
| **F1 — Fundação** | Repositório, docs, agents/skills, CI, contratos, fixtures, simulador mínimo | `pnpm test` e `pnpm build` verdes; contrato documentado |
| **F2 — Dados** | Ingestão real, normalização, snapshots, API de leitura | ATs da coluna F2 de [12.1](12-rastreabilidade.md) verdes contra o TSE real |
| **F3 — Mapa** | Brasil, estado, município, busca, cores, voltar, tabela | ATs da coluna F3 de [12.1](12-rastreabilidade.md) verdes em modo fake e real |
| **F4 — Monitor de pulso** | Linhas, inversão, selo "PULSO!", coração final, reduced motion | ATs da coluna F4 de [12.1](12-rastreabilidade.md) verdes |
| **F5 — Escala** | CDN, cache, SSE opcional, k6, observabilidade | RNF-ESC medido e registrado |
| **F6 — Infra** | Terraform dev/prod, deploy, runbook | `terraform validate` + plan revisado; deploy manual documentado |

Cada fase termina com demonstração na URL de dev (ou localhost, nas fases iniciais) e registro de evidência.

## 4. Dependências externas

| Dependência | Uso | Risco | Mitigação |
|---|---|---|---|
| Arquivos de resultados do TSE | Fonte primária | Mudança de formato, indisponibilidade | Parser versionado + fixtures + snapshot anterior |
| Catálogo `ele-c.json` | Descoberta de pleitos/cargos | Mudança de esquema | Schema tolerante + fallback ao último catálogo válido |
| Malhas do IBGE | Geometria do mapa | Lentidão/limite | Pré-processar no build e versionar o TopoJSON |
| Firebase Hosting | Entrega do frontend | Custo por banda | Orçamento e cache agressivo |
| Cloud Run / Firestore / GCS | API, config e histórico | Cota gratuita | Limites, alertas e degradação |

## 5. Premissas de operação

- A janela crítica é de 17h às 23h (horário de Brasília) nos dias de votação.
- Fora da janela eleitoral, a coleta segue RN-012: 30 min com apuração em andamento e 6 h sem pleito ativo.
- O produto pode exibir dados de pleitos passados (replay) sem custo adicional.
- A equipe é pequena: automação vale mais que processo manual.
