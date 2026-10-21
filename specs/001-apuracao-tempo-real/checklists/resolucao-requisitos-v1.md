# Resolução do checklist de requisitos v1

**Feature**: `001-apuracao-tempo-real` · **Data**: 2026-10-20 · **Base**: [requisitos-v1.md](requisitos-v1.md) e [research.md](../research.md)

As 52 decisões foram aplicadas por especialistas (dados, frontend, produto, infra, testes, backend e segurança) e revisadas em auditoria independente. Os checkboxes do checklist **não foram alterados**: a marcação é do revisor, conforme o contrato do `/speckit-checklist`.

## Mapa CHK → decisão → destino

| CHK | D | Onde virou requisito |
|---|---|---|
| CHK001 | D-001 | RN-035, RN-028, RF-017, AT-010 |
| CHK002 | D-002 | RN-006, DESIGN §4–§5, Spec FR-003 |
| CHK003 | D-003 | RF-004, RN-004, Contrato §3.10 |
| CHK004 | D-004 | RN-036, RF-005, RF-006 |
| CHK005 | D-005 | RN-037, RF-002, AT-040 |
| CHK006 | D-006 | RF-046, AT-036, UX §1 |
| CHK007 | D-007 | RN-005, AT-004 |
| CHK008 | D-008 | RN-038, RN-006, AT-011 |
| CHK009 | D-009 | RN-021, RN-035, AT-010 |
| CHK010 | D-010 | RN-010, Contrato §3.3, AT-014 |
| CHK011 | D-011 | RN-028, RN-039, UX §1.1–§1.2 |
| CHK012 | D-012 | RN-006, RNF-A11Y-05, UX §4.7 |
| CHK013 | D-013 | Contrato §3–§4, RF-017, AT-010 |
| CHK014 | D-014 | RN-039, AT-017 |
| CHK015 | D-015 | RNF-PERF-09, RN-040, AT-034 |
| CHK016 | D-016 | RF-021, Contrato §3.5.1, RNF-PERF-06, AT-035 |
| CHK017 | D-017 | Contrato §3.3–§3.6, RN-040, RNF-ESC-05 |
| CHK018 | D-018 | RN-009, Contrato §3.3, AT-013 |
| CHK019 | D-019 | RN-017, AT-029 |
| CHK020 | D-020 | RN-020, RN-010, Contrato §3.3 |
| CHK021 | D-021 | UX §1.2, RF-045, AT-010 |
| CHK022 | D-022 | RN-030, RN-009, AT-013 |
| CHK023 | D-023 | RN-031, AT-038 |
| CHK024 | D-024 | RN-036, RF-011, AT-026 |
| CHK025 | D-025 | RN-015, RN-021, AT-022 |
| CHK026 | D-026 | RF-042, UX §6.1, AT-025 |
| CHK027 | D-027 | RF-032, UX §7.7, AT-039 |
| CHK028 | D-028 | RN-028, RF-010, RF-042, AT-037 |
| CHK029 | D-029 | RN-015, AT-021 |
| CHK030 | D-030 | RN-015, RF-035, UX §7.6 |
| CHK031 | D-031 | RN-014, AT-019 |
| CHK032 | D-032 | RF-038, UX §7.4, AT-024 |
| CHK033 | D-033 | RN-016, AT-022 |
| CHK034 | D-034 | RN-033, UX §8.1, AT-023 |
| CHK035 | D-035 | RNF-A11Y-06, UX §7.8, AT-025 |
| CHK036 | D-036 | RN-024, DESIGN §2–§5, gate `contraste` |
| CHK037 | D-037 | RF-041, UX §4.9, AT-025 |
| CHK038 | D-038 | UX §8, UX §8.1, AT-018 |
| CHK039 | D-039 | RF-044, UX §11, AT-027 |
| CHK040 | D-040 | RN-018, RN-041, AT-026 |
| CHK041 | D-041 | RNF-ESC-01, 10 §6, AT-032 |
| CHK042 | D-042 | RNF-PERF-01..03, gate `cwv` |
| CHK043 | D-043 | RNF-COST-05/06, 09 §6.1, §7.5 |
| CHK044 | D-044 | RNF-SEC-04, 08 §8, 09 §5 |
| CHK045 | D-045 | RNF-LGPD-05, 09 §7.9 |
| CHK046 | D-046 | RNF-OBS-06, 09 §7.6 |
| CHK047 | D-047 | 00-visao §7 |
| CHK048 | D-048 | Spec FR-014, AT-033, 12.6 |
| CHK049 | D-049 | Spec SC-007, 10 §4 |
| CHK050 | D-050 | RN-042, Contrato §5, 09 §7.7 |
| CHK051 | D-051 | UX §7.1, `assets/race/README.md`, gate `arte` |
| CHK052 | D-052 | RF-043, 08 §5.6, AT-026 |

## O que mudou de fato

- **Estados de ausência** unificados em cinco nomes (`sem_voto`, `sem_dado`, `nao_aplicavel`, `sem_lider_elegivel`, `retificado`), com precedência, preenchimento e microcopy.
- **Contrato**: ausência é `200` + `dados:null`/`status`, não `404`; painel por cargo ≤ 12 KB; `origem` de fallback; `percentualBase`; `parserVersion`; `catalogVersion`.
- **Frescor e latência**: três idades, "ao vivo" exige coleta ≤ 90 s e geração ≤ 5 min, fim a fim ≤ 30 s p95, staleness ≤ 30 s.
- **Fim da apuração**: 100% + 6 ciclos/60 s + 10 min desde o último `idg`.
- **Corrida**: dupla determinística, `d` com sinal, cooldown 30 s, candidato removido, reinício anunciado, cena por aba.
- **Acessibilidade**: `aria-live` agregado, foco após zoom/voltar, contraste não textual 3:1, tabela paginada.
- **Operação**: rate limit 300/min no origin, SLO 99,9% com budget, tetos de custo e kill switch, logs de provedor 30 dias, pin/rollback de parser.
- **URL/OG**: slug canônico com 301, 128 rotas OG pré-renderizadas e limite declarado.

## Verificação executada

```
node scripts/check-links.mjs           → 109 arquivos, 133 IDs, links ok
node scripts/check-skills.mjs          → 13 skills em sincronia
node scripts/sync-agents.mjs --check   → 22 gerados em sincronia
```

Contagem: 46 RF, 42 RN, 40 AT. Nenhum ID órfão ou duplicado.

## Limites conhecidos

- Não há código nem ambiente publicado: os gates de build, Lighthouse, k6, axe e Terraform só podem rodar depois da implementação.
- A retenção de log do CDN do Firebase não é configurável pelo projeto; a página de privacidade deve declarar o limite, não prometer a janela de 30 dias para a borda.
- `FIREBASE_TOKEN` no CI é um segredo de longa duração; permanece até o WIF cobrir o deploy do Hosting.
- O checklist continua não marcado; cabe ao revisor confirmar cada item na próxima leitura.
