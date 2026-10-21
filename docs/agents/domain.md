# Domínio

Contexto único: o produto inteiro compartilha um modelo (pleito → eleição → cargo → escopo → candidato).

## Onde está o conhecimento

| Assunto | Fonte |
|---|---|
| Vocabulário | [CONTEXT.md](../../CONTEXT.md) |
| Regras de negócio | [04-regras-de-negocio.md](../requisitos/04-regras-de-negocio.md) |
| Contrato do TSE | [06-contrato-de-dados-tse.md](../requisitos/06-contrato-de-dados-tse.md) |
| Produto e princípios | [PRODUCT.md](../../PRODUCT.md) |
| Visual e movimento | [DESIGN.md](../../DESIGN.md) |
| Decisões arquiteturais | [docs/decisoes/](../decisoes/) |

## Como alterar uma regra

1. Verifique se a mudança é de produto (regra) ou de implementação (detalhe).
2. Atualize a RN com o novo texto, mantendo o ID e registrando o motivo.
3. Atualize RF e AT impactados; ajuste o teste primeiro (TDD).
4. Atualize a matriz de rastreabilidade.
5. Se afetar contrato, custo ou arquitetura, abra um ADR.
6. Registre no ticket e no PR.

Nunca renomeie um ID existente; regra superada mantém o ID e o histórico.

## Limites

- O produto não projeta resultado, não interpreta pesquisas e não opina.
- O produto não corrige o TSE; se o dado oficial parecer errado, exibe o oficial e registra a anomalia.
- O produto não mantém dados pessoais de candidatos além do necessário (nome, número, partido, situação).

## ADRs

- `proposed`: proposta, não autoriza implementar como se estivesse decidida.
- `accepted`: vale para o código.
- `superseded`: mantém o histórico e aponta para o substituto.
