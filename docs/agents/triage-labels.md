# Triage labels

| Label | Significado | Quem aplica | Próximo passo |
|---|---|---|---|
| `needs-triage` | Chegou, ainda não avaliado | qualquer pessoa | avaliar em até 2 dias úteis |
| `needs-info` | Falta informação para decidir | triagem | autor complementa |
| `ready-for-agent` | Escopo fechado, pode ser implementado por agente | triagem | entrar em `Ready` |
| `ready-for-human` | Exige decisão, acesso ou revisão humana | triagem | atribuir responsável |
| `wontfix` | Fora de escopo ou não faremos | triagem | registrar motivo |

Regras:
- `needs-triage` e `needs-info` são mutuamente exclusivos com `ready-*`.
- Ticket `P0` em janela eleitoral não espera triagem: aciona o plantão.
- `wontfix` exige justificativa e link para a decisão.
