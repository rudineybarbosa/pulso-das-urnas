# ADR-006 — Monitor de pulso no lugar da corrida de cavalos

- **Status:** aceito
- **Data:** 22/10/2026
- **Decisores:** mantenedor do projeto
- **Relacionado:** RF-035..RF-040, RN-015, RN-016, RN-033, AT-020..AT-024

## Contexto

A corrida de cavalos foi especificada para traduzir a diferença de votos em movimento. A primeira ilustração implementada não atingiu qualidade visual aceitável: os cavalos ficaram toscos e pouco legíveis em tamanho de rodapé. O mantenedor propôs uma metáfora médica: **a linha de pulso de um monitor**, com duas linhas — uma por candidato — e leitura imediata de quem está à frente.

## Decisão

Substituir a corrida por um **monitor de pulso lúdico**:

- tela escura com grade, duas linhas de ECG nas cores dos partidos;
- a linha do líder fica mais alta; a distância vertical é derivada da diferença normalizada de votos;
- ao inverter a liderança, um selo **“PULSO!”** aparece e a linha sobe/desce com transição;
- no fim, as linhas se acomodam e um coração na cor do vencedor é desenhado, com o texto “venceu”;
- “BPM” é simbólico (ritmo da apuração), não uma medida médica; não há linha reta/flatline.

Os IDs RF-035..038, RN-015/016 e AT-020..023 são preservados; o texto passa a descrever o monitor. A matemática de normalização (`g`) permanece.

## Consequências

**Positivas**
- Leitura mais clara da diferença: altura relativa é imediata.
- Visual original, sem marca de terceiro, e sem risco de deboche.
- Mais leve que a arte de cavalos; sem novos assets.

**Negativas**
- Metáfora médica pode ser sensível; por isso não há flatline, diagnóstico ou linguagem de saúde.
- O requisito original citava cavalos; a mudança fica registrada aqui e na nota dos requisitos.

## Alternativas

| Alternativa | Por que não |
|---|---|
| Refazer os cavalos com mais detalhe | O mantenedor rejeitou o tema; o custo de arte era alto |
| Gráfico de barras animado | Perde a leitura afetiva e a “corrida” |
| Velocímetro/termômetro | Menos divertido e mais genérico |

## Evidência

Screenshot em `docs/operacao/evidencias/mapa-brasil.png` e e2e `monitor tem duas linhas e números`.
