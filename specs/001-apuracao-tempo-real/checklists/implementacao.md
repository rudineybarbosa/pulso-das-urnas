# Checklist de implementação: Apuração em tempo real

**Purpose**: validar se o plano e as tarefas estão prontos para execução, sem lacunas de escopo, dados, testes ou entrega.
**Created**: 2026-10-21
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md)

**Review Ownership**: artefato de revisão; `[x]` significa que o critério foi avaliado e satisfeito. A execução autônoma desta demanda assumiu o papel de revisor.

## Prontidão do plano

- [x] CHK101 — O plano cobre todas as histórias P1–P3 da spec? [Completude, plan §Phases]
- [x] CHK102 — Cada fase tem saída verificável e dependência explícita? [Clareza, plan §Phases]
- [x] CHK103 — O plano respeita a constituição (sem Java/ORM, regra no servidor, Terraform)? [Consistência]
- [x] CHK104 — O recorte do grill-me está explícito (fake + real, sem apply, fora de escopo)? [Clareza, grilling.md]
- [x] CHK105 — As metas de desempenho e acessibilidade estão no plano com números? [Mensurabilidade, plan §Technical Context]

## Dados e contrato

- [x] CHK106 — O parser tem fixtures reais e versão? [Cobertura, 10-testes §2]
- [x] CHK107 — O fake cobre sem-votos, parcial, virada, empate e fim? [Cobertura, ADR-004]
- [x] CHK108 — O contrato distingue ausência de erro e mantém `null` ≠ `0`? [Consistência, RN-035]
- [x] CHK109 — A geo tem estratégia de build, simplificação e orçamento? [Clareza, plan §Fase 4]
- [x] CHK110 — A API e o web compartilham os mesmos tipos? [Consistência, packages/contracts]

## Qualidade

- [x] CHK111 — Há teste para cada regra crítica (líder, cor, percentual, corrida, estados)? [Cobertura, 11-AT]
- [x] CHK112 — O e2e roda em modo fake, sem rede externa? [Clareza, 10-testes §4]
- [x] CHK113 — Acessibilidade e reduced motion têm teste e critério? [Cobertura, RNF-A11Y]
- [x] CHK114 — Cobertura e orçamento de bytes têm gate? [Mensurabilidade, RNF-MAINT/PERF]
- [x] CHK115 — A entrega tem prova local e checklist de revisão? [Completude, prova-de-entrega]

## Operação e limites

- [x] CHK116 — A infra é validável sem apply? [Clareza, 09-infra]
- [x] CHK117 — Os riegos têm mitigação e detecção? [Completude, plan §Risks]
- [x] CHK118 — O que não será entregue está declarado? [Clareza, grilling Q12]

## Notes

- Nenhum item pendente. As lacunas de "aplicar em nuvem" e "modo telão" estão fora do recorte aprovado.
- A verificação real de cada item acontece nas tarefas de teste; este checklist valida o plano, não a implementação.
