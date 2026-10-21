---
name: Animação dos cavalos
description: Implementar ou ajustar a corrida de cavalinhos do rodapé — posição derivada dos votos, ultrapassagem com balão de relincho, cena final carinhosa, pausa e prefers-reduced-motion. Use em qualquer tarefa que toque na corrida, nas animações ou no tom da cena final.
---

# Animação dos cavalos

Leia `docs/requisitos/07-ux-mapa-e-animacoes.md` §7 e as regras RN-015, RN-016 e RN-033.

## Matemática (não improvise)

```
p = percentualApurado / 100
V = votos válidos do cargo no escopo nacional
d = votos(A) − votos(B)   // com sinal
g = sinal(d) × ln(1 + |d|) / ln(1 + V)        // (−1, 1)
xBase = margem + p × L
separação = 0,14 × L × |g|
xA = xBase + (separação/2) × sinal(d)
xB = xBase − (separação/2) × sinal(d)
```

- Suavize com mola (250 ms); atualize no máximo a 10 Hz.
- `V = 0` → pista vazia, sem divisão por zero.
- O cavalo à frente é sempre o de maior votação.
- Ultrapassagem: sinal muda + |g| ≥ 0,01 em 2 snapshots + cooldown de 30 s.

## Tom (bloqueante)

- A corrida é esportiva e afetuosa. Nunca humilha, nunca insinua fraude, nunca usa ironia.
- Textos: "venceu", "assume a liderança". Proibido: "derrotou", "arrasou", "humilhou", "esmagou", "vexame", "fraude", "roubo".
- Sem jóquei, sem chicote, sem violência.
- Balão "Relincho!" por até 1,2 s; sem som.
- Cena final: vencedor lambe, perdedor deita sem impacto, corações sobem, texto neutro.
- A arte é original; não copie personagens, traços ou logotipos de terceiros.

## Acessibilidade

- A pista tem `role="img"` e `aria-label` com o resumo.
- `aria-live` anuncia virada e fim (máx. 1/10 s).
- Botão "Pausar animação" persistido em `localStorage`.
- `prefers-reduced-motion`: barra estática com nomes, partidos e números; sem cena.

## Implementação

- SVG inline com grupos nomeados (`horse-a`, `horse-b`).
- Anime apenas `transform`/`opacity`; nada de `top/left` ou layout.
- Estado da cena em máquina de estados (`idle → running → overtake → finished → final-scene`) para não repetir a cena.
- Cena final roda uma vez por **aba** (`sessionStorage` `pulso:final-scene:{pleito}:{cargo}`); "Rever cena" sempre disponível.

## Antes de concluir

- [ ] `packages/domain/race-math.test.ts` e `overtake.test.ts` verdes.
- [ ] `e2e/j04-virada.spec.ts`, `e2e/fim.spec.ts` e `e2e/reduced-motion.spec.ts` verdes.
- [ ] GIF/vídeo anexado ao PR.
- [ ] Checklist de neutralidade revisado por outra pessoa.
- [ ] 60 fps no aparelho de referência (trace).
