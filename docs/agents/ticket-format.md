# Formato de ticket

Duas camadas: a de cima para quem acompanha o projeto sem ler código; a técnica para quem implementa (pessoa ou agente).

## Template

```markdown
<!-- Título: ÁREA · resultado em linguagem corrente -->

## Em resumo

- **Quem ganha:** <público>
- **O que muda:** <comportamento observável>
- **Por que importa:** <problema real>

## Pronto quando

- [ ] <comportamento observável na URL publicada>
- [ ] <estado de erro/limite coberto>
- [ ] <acessibilidade, quando houver tela>

## Fica fora

- <o que este ticket não entrega>

---

## Contexto

RF-xxx, RN-xxx, AT-xxx, ADR-xxx. Links, sem copiar o conteúdo.

## Verificação técnica

- [ ] <teste unitário/contrato/e2e que comprova>
- [ ] <comando e resultado esperado>

## Onde a regra roda

- <arquivo/pacote que concentra a regra>

## Riscos

- <o que pode quebrar e como detectar>
```

## Regras

- "Pronto quando" usa linguagem observável, não técnica de implementação.
- Cada item tem um AT correspondente ou é explicitamente novo.
- Ticket que muda tela inclui critério de acessibilidade e de movimento reduzido.
- Ticket que muda dado inclui a fonte, a hora e o que acontece se a fonte falhar.
- Ticket de infraestrutura diz o custo esperado e como reverter.
- Nada de "implementar X" sem dizer o que o usuário vê.
