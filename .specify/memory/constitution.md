# Constitution — Pulso das Urnas

**Versão:** 1.0.0 · **Ratificação:** 20/10/2026 · **Última alteração:** 20/10/2026

Esta constitution governa o trabalho neste repositório. Ela é bloqueante: um princípio violado impede a conclusão do trecho afetado até correção ou exceção registrada. A presença deste arquivo não aprova um plano, um ADR `proposed` nem uma pergunta em aberto.

## I. Decisões e rastreabilidade

- O trabalho DEVE respeitar os [requisitos](../../docs/requisitos/03-requisitos-funcionais.md), as [regras de negócio](../../docs/requisitos/04-regras-de-negocio.md) e os [critérios de aceite](../../docs/requisitos/11-criterios-de-aceite.md) vigentes.
- Alterar uma regra exige atualizar, no mesmo PR, RN, RF, AT e a [matriz de rastreabilidade](../../docs/requisitos/12-rastreabilidade.md). IDs existentes são preservados; uma regra superada mantém o ID e o histórico.
- Decisão (`accepted`), proposta (`proposed`), evidência e pendência (Q) NÃO DEVEM ser confundidas. Uma proposta em ADR, ticket ou protótipo não se torna aprovada porque existe código.
- Uma pendência bloqueia somente o comportamento que depende dela. Não inventar resposta institucional, jurídica ou de produto para liberar implementação.

## II. Continuidade do backlog

- Tickets no GitHub DEVEM manter IDs, histórico, contexto e dependências.
- Cada ticket DEVE ter critério de aceite observável, link para o RF/RN e área. Ticket sem critério não entra em `Ready`.
- Features novas têm especificação e plano canônicos no repositório (`specs/NNN-*`), e os requisitos transversais vivem em `docs/requisitos`. Tickets são unidades de execução, não cópias da spec.
- O plano só começa após a spec revisada. A implementação só começa após o plano aprovado.

## III. Arquitetura e stack

- Um produto, um repositório, uma branch de integração (`dev`) e uma de produção (`main`).
- Stack obrigatória da v1:
  - **Web:** React 19 + TypeScript + Vite; SVG com `d3-geo` + `topojson-client`; TanStack Query; CSS/WAAPI para movimento.
  - **API:** Fastify 5 em Node 22, Zod na borda, OpenAPI como contrato, Problem Details para erro.
  - **Ingestão:** job em Cloud Run orquestrado por Cloud Scheduler, consumindo arquivos oficiais do TSE com `ETag`.
  - **Dados:** Firestore para configuração/ponteiros e Cloud Storage para snapshots imutáveis. **Aplicação e ingestão são 100% TypeScript; a infraestrutura é Terraform. Não há banco relacional nem ORM.**
  - **Entrega:** Firebase Hosting (CDN) com rewrite `/api/**` para Cloud Run.
  - **Infra:** Terraform, Google Cloud, WIF no CI, sem recurso de custo fixo mensal.
- O navegador NUNCA chama o TSE. Toda leitura externa passa pela ingestão e pela API.
- Regra de negócio é pura e vive em `packages/domain`; o servidor é a fonte da verdade. O frontend só apresenta e interpola animação — NÃO DEVE recalcular líder, cor, percentual ou fim de apuração.
- Contratos entre API, ingestão e web vivem em `packages/contracts` e têm teste de contrato. Mudança incompatível exige `apiVersion` nova.
- Dependência nova exige justificativa de peso/benefício; biblioteca que estoure o orçamento de bytes é rejeitada.
- Decisão que altere contrato, custo, arquitetura ou experiência transversal exige ADR.

## IV. Dados, produto e acessibilidade

- **Dado real é dado do TSE.** Em `DATA_MODE=real`, número exibido tem que existir no arquivo oficial da geração informada. Falha da fonte → último snapshot + selo de frescor; NUNCA zerar, inventar ou trocar cor por "sem voto".
- `null` (sem dado) ≠ `0` (dado com zero voto). Só `dvt = "Válido"` define líder. Votos de legenda entram no total válido, mas não elegem líder sozinhos.
- Fonte, horário de geração, horário da coleta e percentual apurado DEVEM estar visíveis em toda tela com número.
- **Neutralidade editorial é bloqueante** (RN-033): sem adjetivo político, sem deboche, sem favorecimento; a cena final é afetuosa e simétrica em tratamento.
- Acessibilidade WCAG 2.2 AA: teclado, foco visível, contraste, `aria-label` completo, alternativa em tabela e `prefers-reduced-motion`. Cor nunca é o único canal.
- Nenhum dado pessoal é coletado; sem cookie de rastreio; `localStorage` apenas para preferência explícita.
- Aviso permanente de que o site não é serviço oficial do TSE; nenhuma marca que sugira endosso.
- Cores partidárias vêm de tabela versionada com fonte registrada; não inventar cor "oficial".

## V. Execução e evidências

- Descoberta e requisitos seguem brainstorming e Spec Kit; execução segue TDD, debugging e revisão independente.
- Comportamento novo ou corrigido exige teste que falha antes da implementação. Mudança apenas documental é verificada por consistência, links e IDs — sem teste artificial.
- O autor DEVE registrar o que realmente executou, o resultado e o que não executou. Teste não executado não pode ser apresentado como aprovado.
- Antes de concluir, verificar aderência entre intenção, constitution, implementação e evidência. Divergência obrigatória bloqueia.
- Revisão independente e QA na URL publicada não são substituíveis. Merge não é entrega: o ticket só fecha após QA por quem não implementou.
- Orçamentos medidos: bytes, LCP/INP/CLS, p95 da API, lag de ingestão e custo. Sem medição, não há claim de desempenho.

## Decisões e pendências

| Referência | Situação em 20/10/2026 | Efeito na implementação |
|---|---|---|
| [ADR-001](../../docs/decisoes/ADR-001-stack-frontend.md) | `accepted` | React + Vite + SVG/d3-geo; sem SSR e sem WebGL |
| [ADR-002](../../docs/decisoes/ADR-002-ingestao-e-cache.md) | `accepted` | Job de 1 min com ciclos de 10 s; condicional; ≤ 5 rps |
| [ADR-003](../../docs/decisoes/ADR-003-mapa-topojson.md) | `accepted` | TopoJSON simplificado e versionado |
| [ADR-004](../../docs/decisoes/ADR-004-simulador.md) | `accepted` | Fonte plugável; sem serviço de simulador separado |
| [ADR-005](../../docs/decisoes/ADR-005-hospedagem-e-cdn.md) | `accepted` | Firebase Hosting + Cloud Run; sem LB dedicado |
| Q-01 (domínio próprio) | aberta | Não bloqueia; usar host padrão até decisão |
| Q-02 (conta GCP de produção) | aberta | Bloqueia apenas o apply em prod |
| Q-03 (revisão das cores) | aberta | Bloqueia apenas o lançamento público da paleta |
| Q-04 (modo telão) | aberta | Fora da v1 até decisão |

## Governança, exceções e emendas

Regras desta constitution bloqueiam a implementação ou a conclusão do trecho em conflito. O mantenedor aprova exceções; **o agente não aprova a própria exceção**.

A exceção DEVE registrar no ticket/PR: princípio afetado, motivo, escopo, impacto, mitigação, aprovador, evidência da aprovação e data ou condição de encerramento. Exceção expirada ou fora do escopo volta a bloquear.

Emendas são versionadas em PR com motivo e impacto nos tickets abertos. Incrementar **major** ao remover/redefinir princípio de forma incompatível, **minor** ao acrescentar obrigação e **patch** ao esclarecer texto. Atualizar guias, agentes e checklists afetados.

## Core Tech Principles

### 0. Regra de ouro — edição cirúrgica

- É PROIBIDO reformatar linhas existentes, ajustar espaços ou quebrar linhas sem necessidade.
- Modifique apenas as linhas estritamente necessárias; linhas novas podem ser formatadas (80–100 colunas).
- Se a ferramenta sugerir mudança estética colateral, cancele e use um bloco menor.

### I. SOLID e qualidade de código

- **SRP**: um motivo para mudar; componentes e módulos focados.
- **OCP**: estender por composição/abstração, não por `if` crescente.
- **LSP**: contratos de tipos e interfaces respeitados por implementações.
- **ISP**: interfaces pequenas; nada de "tipo Deus".
- **DIP**: regra pura depende de abstração, não de Firestore/HTTP.

Requisitos: TypeScript `strict`, sem `any` implícito; funções ≤ 30 linhas; complexidade ciclomática < 10; aninhamento ≤ 3; nomes que revelam intenção; comentário explica **por quê**; sem duplicação; sem código morto.

- Regras puras em `packages/domain`: sem `fetch`, sem `fs`, sem relógio global (recebe `now`).
- UI: componente apresenta; não decide partido, líder ou percentual.
- API: schema-first; entrada validada; saída tipada.
- Feature folders (`features/map`, `features/race`), não pastas por camada técnica.

### II. TDD — Red, Green, Refactor

- Escreva o teste que falha, implemente o mínimo, refatore. Nunca implemente antes de ver o teste falhar.
- Unidade: Vitest + Testing Library; contrato: Zod/OpenAPI + fixtures reais do TSE; e2e: Playwright em `DATA_MODE=fake`; acessibilidade: axe; carga: k6.
- Cobertura mínima: 90% em `packages/domain` e `packages/tse`; 80% global. Caminhos críticos (líder, cor, percentual, fim de apuração, corrida) com 100%.
- Teste não pode depender da rede externa. Fixture real é obrigatória para parser.
- Nome do teste descreve comportamento: `deve pintar branco quando não há voto válido`.
- Sem `sleep` fixo; use relógio injetável e `clock` do Playwright.

### III. DevSec e OWASP Top 10:2025

| Regra | Exigência no projeto |
|---|---|
| A01 | Sem autenticação de usuário; toda rota é leitura pública e validada. Nenhuma rota de escrita exposta. |
| A02 | TLS 1.2+; nenhum segredo no cliente; WIF no CI; sem chave JSON versionada. |
| A03 | Validação por Zod na borda; saída escapada; proibido `dangerouslySetInnerHTML` com dado externo. |
| A04 | Modelo de ameaça: fonte pública, sem PII, superfície mínima; rate limit e limite de instâncias. |
| A05 | CSP restritiva, headers de segurança, sem debug em produção, dependências mínimas. |
| A06 | SBOM, Dependabot, `pnpm audit`, lockfile obrigatório. |
| A07 | Não se aplica autenticação; ainda assim, nenhum token/segredo em log. |
| A08 | Build reproduzível, imagem distroless non-root, deploy por WIF, artifact registry. |
| A09 | Logs estruturados, métricas de lag/5xx, alertas com limiar. |
| A10 | Nenhuma URL arbitrária é buscada em runtime; allow-list de domínios do TSE. |

Obrigatório: revisão de segurança em mudança de infra, dependência ou superfície; scanners no CI; nenhum segredo em código ou log; dados de fonte externa tratados como não confiáveis.

### IV. Alta coesão e padrões

- Coesão: uma responsabilidade por módulo; dependências explícitas.
- Acoplamento baixo: composição, injeção por parâmetro, eventos só quando necessário.
- Padrões (Factory, Strategy, Observer, Decorator) apenas para problema real; a fonte plugável (`TseSource`, `ReplaySource`, `SyntheticSource`) é um Strategy justificado.
- Encapsulamento: exponha o mínimo; não vaze tipos do Firestore/GCS para a UI.
- Herança só para relação IS-A; prefira composição.
- Erros de domínio tipados; erros de infraestrutura convertidos na borda.

## Code Quality Standards

| Aspecto | Padrão |
|---|---|
| Legibilidade | ESLint + Prettier; complexidade < 10; aninhamento ≤ 3; sem código morto |
| Documentação | TSDoc em APIs públicas; README por app/pacote; comentário explica o porquê |
| Performance | LCP p75 ≤ 2,5 s; INP ≤ 200 ms; API p95 ≤ 150 ms na CDN; JS inicial ≤ 200 KB gz; sem N+1 de leitura |
| Erros | Falha rápida com mensagem contextual; Problem Details; nunca expor stack |
| Observabilidade | `requestId`, versão do snapshot, lag de ingestão, métricas e alertas |

## Development Workflow

- **Commits**: pt-BR, prefixo (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `infra:`), atômicos, referenciando o ticket.
- **PR**: problema, solução, evidência antes/depois, testes executados, riscos e o que não foi testado. Draft até estar pronto. Squash em `dev`.
- **Antes do deploy**: lint, tipos, unitários, contrato, e2e fake, a11y, build, orçamento de bytes, `terraform validate`.
- **Release**: PR `dev` → `main` com merge commit e tag `v0.N.0`.
- **Rollback**: revisão anterior do Cloud Run e `firebase hosting:rollback`, documentados no runbook.

## Governance

| Aspecto | Prática |
|---|---|
| Autoridade | Esta constitution é a fonte da verdade para decisões de código, dados e segurança |
| Aplicação | Revisão de código + gates de CI; gate vermelho bloqueia merge |
| Emendas | PR com motivo, impacto e aprovação do mantenedor |
| Exceções | Registradas no ticket/PR com prazo; nunca silenciosas |

---

**Version Tech Principles:** 1.0.0 · **Definida em:** 2026-10-20
