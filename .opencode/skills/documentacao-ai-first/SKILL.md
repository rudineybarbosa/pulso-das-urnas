---
name: Documentação AI-first
description: Escrever ou atualizar requisitos, regras, contratos, ADRs e glossário do Pulso das Urnas de forma que uma IA implemente sem adivinhar — IDs estáveis, critérios Given/When/Then, fórmulas, estados de erro e rastreabilidade. Use ao criar documento novo, alterar regra de negócio ou registrar decisão.
---

# Documentação AI-first

## Regras de forma

1. **Um ID por afirmação normativa.** RF-xxx (funcional), RN-xxx (regra), AT-xxx (aceite), RNF-xxx (não funcional), ADR-xxx.
2. **Verbo normativo:** DEVE, NÃO DEVE, PODE. Evite "deveria", "geralmente", "quando possível".
3. **Fórmula executável:** variáveis definidas, domínio, arredondamento, caso de borda.
4. **Nada de placeholder:** sem "TBD", "a definir", "etc." em requisito. Pergunta aberta vira Q-xx com responsável e impacto.
5. **Um exemplo concreto** por contrato: JSON real, campos reais, valores plausíveis.
6. **Estados completos:** vazio, carregando, erro, sem permissão, desatualizado, limite.
7. **Rastreabilidade:** todo RF aponta RN e AT; todo AT aponta teste; toda regra alterada atualiza a matriz.

## Estrutura de um RF

```markdown
### RF-000 — Título
O sistema DEVE <comportamento observável>.
- Entrada: <fonte/parâmetro>
- Saída: <formato>
- Regras: RN-000
- Aceite: AT-000
```

## Estrutura de um AT

```markdown
### AT-000 — Título (RF-000 · RN-000)
> **Dado** ...
> **Quando** ...
> **Então** ...
**Tipo:** unitário | contrato | e2e | carga | manual
**Evidência:** <arquivo/comando>
```

## Estrutura de um ADR

Contexto → decisão → consequências (positivas/negativas) → alternativas → evidência. Status `proposed` não vira código.

## Ao alterar uma regra

- Mantenha o ID; registre o motivo e a data.
- Atualize RF, AT, matriz e teste no mesmo PR.
- Se a regra muda contrato/custo/arquitetura, abra ADR.
- Nunca apague o histórico de uma regra superada.

## Antes de concluir

- [ ] Nenhum placeholder.
- [ ] Links internos funcionam.
- [ ] IDs únicos e referenciados.
- [ ] Exemplo de payload válido contra o schema.
- [ ] README atualizado se surgiu documento novo.
