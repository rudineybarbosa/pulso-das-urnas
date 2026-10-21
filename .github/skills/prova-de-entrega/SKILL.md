---
name: Prova de entrega
description: Provar, antes de pedir revisão, que o PR entrega cada item do "Pronto quando" do ticket — testando na tela com Playwright, na API e no repositório — e gravar a seção "Teste da entrega" no corpo do PR. Use ao abrir PR, pedir revisão, atualizar evidência após commits ou responder a uma revisão que pediu prova.
---

# Prova de entrega

Revisão sem evidência não acontece. A prova é feita no commit do PR, não no commit anterior.

## Passos

1. Leia o ticket e liste cada item do "Pronto quando" e cada AT citado.
2. Para cada item, escolha a prova:
   - **Tela:** Playwright (screenshot/vídeo) no cenário do simulador que reproduz o estado.
   - **API:** `curl` com status, payload e cabeçalhos (cache/ETag).
   - **Repositório:** comando e saída (teste, build, size-limit, terraform).
3. Execute no checkout do PR:
   ```bash
   pnpm install --frozen-lockfile
   pnpm lint && pnpm typecheck && pnpm test && pnpm build
   pnpm test:e2e
   ```
4. Registre a tabela:

```markdown
## Teste da entrega

Commit: <sha>

| Critério | Como foi testado | Resultado |
|---|---|---|
| Mapa pinta o líder | `SCENARIO=virada`, screenshot | ✅ |
| Voltar em 1 nível | e2e `j02-cidade` | ✅ |
| Fonte fora mantém dado | `SCENARIO=erro-fonte`, vídeo | ✅ |
| Custo | plan: nenhum recurso fixo | ✅ |
```

5. Declare o que **não** foi testado e por quê.
6. Se um critério não se aplica, marque `n/a` com justificativa; não invente verde.

## Regras

- Prova visual precisa mostrar o estado real (não mock).
- Prova de dado real compara com a fonte oficial e informa a geração.
- Commit novo invalida a prova anterior; refaça.
- Evidência vai no corpo do PR e, quando visual, anexada como imagem/GIF.
