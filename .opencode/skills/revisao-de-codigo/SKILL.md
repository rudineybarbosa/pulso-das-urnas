---
name: Revisão de código
description: Revisar um PR do Pulso das Urnas com foco em aderência ao RF/RN, dados reais vs. simulados, acessibilidade, neutralidade editorial, desempenho, custo e testes. Use ao revisar PR de outra pessoa, re-revisar após commits ou antes de aprovar e publicar.
---

# Revisão de código

Leia o ticket, o RF/RN citado e o diff. Revise o comportamento, não o estilo que o lint já cobre.

## Ordem

1. **Escopo:** o PR entrega o que o ticket promete, sem extras silenciosos?
2. **Regra:** cada comportamento aponta para RF/RN; a regra implementada é a documentada?
3. **Dados:** em modo real, nenhum número é inventado; falha preserva snapshot; `null` ≠ `0`; só `dvt = Válido` lidera.
4. **Contrato:** schema Zod/OpenAPI atualizado; payload dentro do orçamento; cache correto.
5. **Tela:** estados de carregando/vazio/erro/desatualizado/final; mobile; teclado; contraste; reduced motion.
6. **Neutralidade:** textos e animação sem deboche, sem adjetivo político, sem favorecimento.
7. **Desempenho:** bundle, render do mapa, polling, sem chamada ao TSE no cliente.
8. **Custo:** nenhum recurso novo com custo fixo; orçamento respeitado.
9. **Testes:** cobrem o critério e os limites; fixtures reais; nada de teste que "passa sempre".
10. **Operação:** logs, alertas e rollback quando aplicável.

## Como testar

- Rode os checks do autor: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- Rode o cenário do simulador que o PR afeta e veja com os próprios olhos.
- Para dado real, compare uma amostra com o arquivo do TSE da mesma geração.
- Para acessibilidade, navegue por teclado e rode `pnpm test:a11y`.
- Para carga, exija o relatório do k6 contra ambiente com CDN.

## Comentários

- `[bloqueia]` apenas para: dado errado, regra violada, risco legal/editorial, acessibilidade quebrada, custo fora do teto, teste ausente de critério.
- `[sugestão]` para o resto.
- Aponte arquivo e linha, explique o impacto, proponha o caminho.
- Aprove só quando os bloqueios estiverem resolvidos e os checks verdes.

## Saída da revisão

```markdown
## Revisão

- Escopo: ok | ajustar
- Regras: RF-xxx / RN-xxx verificados
- Testes executados: ...
- Bloqueios: ...
- Sugestões: ...
- Decisão: aprovar | pedir mudanças
```
