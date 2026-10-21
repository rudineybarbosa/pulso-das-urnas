# Grill-me — decisões da entrega v1

**Data**: 2026-10-21 · **Modo**: self-grill (sem interferência humana, respostas ancoradas na documentação aprovada)

Este registro é a entrada do `/speckit.specify`. Cada resposta cita a fonte que a sustenta; nenhuma decisão foi inventada.

## Rodada 1 — escopo

### Q1 — Qual é a entrega desta execução?
**Recomendação adotada:** fatia vertical end-to-end — contratos, domínio, parser do TSE, API, mapa, painel, busca, corrida e testes, com infraestrutura pronta para aplicar.
**Fonte:** `docs/requisitos/01-escopo.md` fases F1–F6; o valor do produto só aparece quando mapa e corrida funcionam juntos.

### Q2 — Dados reais ou simulados?
**Recomendação adotada:** ambos. `DATA_MODE=fake` é o padrão local (replay + cenários) e `real` lê o TSE no servidor; o navegador nunca chama a fonte.
**Fonte:** ADR-004, RN-012, RF-030.

### Q3 — A infraestrutura será aplicada?
**Recomendação adotada:** não. Terraform entregue, `fmt`/`validate`/`plan`; `apply` é ação humana (Q-02).
**Fonte:** `00-visao-e-objetivos.md` Q-02; `09-infra-e-terraform.md`.

### Q4 — Login, administração, fotos ou áudio?
**Recomendação adotada:** fora. Produto público, somente leitura, sem PII, sem fotos e sem som.
**Fonte:** `PRODUCT.md` não objetivos; RN-033.

### Q5 — Mapa em SVG ou WebGL?
**Recomendação adotada:** SVG + `d3-geo`, TopoJSON simplificado e versionado.
**Fonte:** ADR-001, ADR-003.

### Q6 — Onde a regra de negócio roda?
**Recomendação adotada:** regra pura em `packages/domain`, decisão no servidor; o cliente apresenta e interpola animação.
**Fonte:** constituição III; RNF-MAINT-03.

## Rodada 2 — execução

### Q7 — Como a entrega será provada?
**Recomendação adotada:** Vitest (regras/parser), Playwright (jornadas, animação), axe, orçamento de bytes; cobertura ≥ 80% global e ≥ 90% em domínio/TSE.
**Fonte:** RNF-MAINT-02; `10-testes-e-dados-falsos.md`.

### Q8 — Qual a ordem de implementação?
**Recomendação adotada:** contratos → domínio → TSE/fixtures → API/fake → web (mapa → painel → busca) → corrida → a11y → infra. Dependências explícitas em `tasks.md`.
**Fonte:** `10-testes` pirâmide; `08-arquitetura` camadas.

### Q9 — Quais fixtures usar?
**Recomendação adotada:** catálogo 2026; Presidente BR/SP/cidade; Governador SP; 2º turno zerado; progresso `-ab`; municípios.
**Fonte:** `10-testes §2`; capturas reais de 20/10/2026.

### Q10 — O que conta como pronto?
**Recomendação adotada:** ATs da fatia verdes, convergência limpa, revisão sem bloqueio e prova de entrega na URL local.
**Fonte:** constituição V; `11-criterios-de-aceite.md`.

### Q11 — Commits?
**Recomendação adotada:** semânticos, pequenos, por unidade lógica.
**Fonte:** instrução do solicitante; `docs/agents/pull-requests.md`.

### Q12 — O que fica fora?
**Recomendação adotada:** telão/SSE, CSV, fotos, push, admin, outros idiomas e dados por zona/seção.
**Fonte:** `01-escopo.md §2`.

## Consequências para a spec

1. A spec 001 é atualizada com o recorte de implementação e as decisões acima; nenhuma feature nova é criada.
2. O plano técnico pode assumir React/Vite, Fastify, Firestore/GCS, Terraform e o simulador, todos já aprovados nos ADRs.
3. A entrega é local e verificável; não há deploy em nuvem nesta execução.
4. `entrega-inova` é substituída por `prova-de-entrega` (equivalente neste repositório).
