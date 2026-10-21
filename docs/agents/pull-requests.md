# Commits e pull requests

## Commit

Mensagem em pt-BR, prefixo em inglês: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `infra:`, `perf:`.

```
feat: mapa pinta estado pelo líder do maior cargo (RF-007)
fix: evita piscar a cor quando a diferença cruza zero (RN-016)
docs: documenta contrato do arquivo -ab.json
```

Um commit por unidade coerente. Sem trailers de ferramenta. Sem `--no-verify`.

## Branch e base

- `dev` é a branch padrão de integração; `main` recebe só release.
- PR sempre contra `dev`, em **draft** até estar pronto.
- Release: PR `dev` → `main` com **merge commit** e tag `v0.N.0`; nunca squash na release.
- Nunca commitar direto em `dev` ou `main`.
- Nunca force-push em branch compartilhada.

## Antes de pedir revisão

1. **Entrega provada:** cada item do "Pronto quando" testado no commit do PR, com a seção "Teste da entrega" preenchida (critério × como testou × resultado).
2. **Checks verdes:** lint, tipos, unitários, contrato, e2e fake, build, size-limit, a11y.
3. **Revisão independente:** o diff foi lido por outra pessoa/agente; achados corrigidos ou respondidos.
4. **Riscos:** o que pode quebrar, o que não foi testado e por quê.

## Corpo do PR

```markdown
Refs #<ticket>

## Resumo

<menor visão que mostra a mudança: fluxo, arquivos, pseudocódigo ou Mermaid>

## Evidência

- **Antes:** <teste, saída ou tela>
  **Depois:** <teste, saída ou tela>
- Comandos executados: ...

## Teste da entrega

| Critério | Como foi testado | Resultado |
|---|---|---|
| ... | ... | ... |

## Riscos e limites

- ...

## Não executado

- ...
```

## Revisão

- O revisor confere: aderência ao RF/RN, testes, dados reais vs. simulados, acessibilidade, neutralidade editorial, custo.
- Comentário bloqueante usa `[bloqueia]`; sugestão usa `[sugestão]`.
- O autor responde cada ponto e faz um commit consolidado das correções.

## Merge

- **Squash and merge** em `dev`, com o título do PR como mensagem.
- Exige checks verdes, revisão aprovada e branch atualizada quando houver conflito.
- Após o merge, acompanhar o deploy e o smoke.
