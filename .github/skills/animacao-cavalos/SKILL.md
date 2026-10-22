---
name: Animação do monitor de pulso
description: Implementar ou ajustar o monitor de pulso do rodapé — altura derivada dos votos, inversão com selo "PULSO!", coração final, pausa e prefers-reduced-motion. Use em qualquer tarefa que toque no rodapé, nas animações ou no tom da cena final. O ID "animacao-cavalos" é histórico; o tema atual é pulso.
---

# Animação do monitor de pulso

> O ID desta skill (`animacao-cavalos`) é legado. Os cavalos foram substituídos pelo monitor de pulso em 22/10/2026 (ADR-006). Não reintroduza cavalos, relincho ou flatline.

Leia `docs/requisitos/07-ux-mapa-e-animacoes.md` §7 e as regras RN-015, RN-016 e RN-033.

## Matemática (não improvise)

```
V = votos válidos do cargo no escopo nacional
d = votos(A) − votos(B)   // com sinal
g = sinal(d) × ln(1 + |d|) / ln(1 + V)        // (−1, 1)
magnitude = min(1, 12 × |g|)
gap = 4 + 16 × magnitude                       // px
yLíder = centro − gap
ySegundo = centro + gap
```

- A linha mais alta é sempre a do maior votação; a distância vertical entre as linhas é `2 × gap` (8 a 40 px).
- Atualize a 10 Hz no máximo; anime apenas `transform`/`opacity`.
- `V = 0` → tela vazia, sem divisão por zero.
- Inversão: sinal muda + `|g| ≥ 0,01` em 2 snapshots + cooldown de 30 s.

## Tom (bloqueante)

- O monitor é lúdico e afetuoso. Nunca humilha, nunca insinua fraude, nunca usa ironia.
- Textos: "venceu", "assume a liderança". Proibido: "derrotou", "arrasou", "humilhou", "esmagou", "vexame", "fraude", "roubo".
- Não há linha reta/flatline, diagnóstico, som de alarme real ou linguagem médica de risco.
- Selo "PULSO!" por até 1,6 s, sem cobrir números.
- Cena final: coração na cor do vencedor, texto neutro; o perdedor mantém a linha e a cor.
- A arte é original; não copie personagens, traços ou logotipos de terceiros.

## Acessibilidade

- A tela tem `role="img"` e `aria-label`/`<title>` com o resumo.
- `aria-live` anuncia a inversão e o fim (máx. 1/10 s).
- Botão "Pausar/Retomar" persistido em `localStorage` (`pulso:paused`); "Rever cena" sempre disponível após o fim.
- `prefers-reduced-motion`: linhas estáticas com nomes, partidos e números; sem rolagem e sem coração animado.

## Implementação

- SVG inline com dois grupos nomeados (`pulse__channel`), um por candidato.
- Cada linha é um conjunto de `<use>` do mesmo motivo de ECG; a rolagem é um `translateX` de 80 px por ciclo.
- A altura de cada grupo vem de `gap` e da liderança; transição de 600 ms.
- Estado da cena em máquina de estados (`idle → running → overtake → finished → final-scene`) para não repetir a cena.
- Cena final roda uma vez por **aba** (`sessionStorage` `pulso:final-scene:{pleito}:{cargo}`); "Rever cena" sempre disponível.
- `localStorage` guarda só a pausa, nunca a marca da cena.

## Antes de concluir

- [ ] `packages/domain/src` (matemática de `racePositions`/`detectOvertake`) e `apps/api/src/app.test.ts` verdes.
- [ ] `e2e/jornadas.spec.ts` (monitor, sem rolagem, reduced motion), `e2e/fim.spec.ts` e `e2e/a11y.spec.ts` verdes.
- [ ] Screenshot/GIF anexado ao PR em `docs/operacao/evidencias/`.
- [ ] Checklist de neutralidade revisado por outra pessoa.
- [ ] 60 fps no aparelho de referência (trace).
