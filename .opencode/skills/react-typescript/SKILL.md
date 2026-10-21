---
name: React e TypeScript
description: Padrões de React 19 + TypeScript estrito + Vite do Pulso das Urnas — componentes, estado na URL, TanStack Query, formulários, acessibilidade, testes com Testing Library e organização por feature. Use ao criar ou alterar componentes, hooks, rotas ou estilos.
---

# React + TypeScript

Leia `docs/requisitos/07-ux-mapa-e-animacoes.md`, `DESIGN.md` e `AGENTS.md`.

## Regras

- `strict: true`; sem `any` implícito; `unknown` + Zod na borda.
- Estado de navegação na URL (`/br/:uf/:municipio?pleito=&cargo=`), não em store global.
- TanStack Query para todo dado remoto; `refetchInterval` conforme RN-012 e pausa com aba oculta.
- Componente apresenta; não calcula líder, cor, percentual ou fim de apuração.
- Feature folders: `features/map`, `features/panel`, `features/search`, `features/race`.
- CSS Modules + tokens de `DESIGN.md`; sem CSS-in-JS pesado.
- Sem `useEffect` para buscar dado; sem `setState` em render.
- `key` estável; listas ordenadas pelo servidor.
- Textos em pt-BR, com acentuação correta.

## Acessibilidade

- Elemento interativo é `<button>`/`<a>`/`<path tabindex>` — nunca `div` com `onClick`.
- `aria-label` completo; `aria-live` com throttle.
- Foco visível (3 px) e ordem lógica.
- `prefers-reduced-motion` respeitado.
- Tabela alternativa para todo mapa.

## Testes

- Testing Library: comportamento, não implementação.
- Playwright: jornada completa em `DATA_MODE=fake`.
- axe: zero violação séria/crítica.
- Snapshots visuais apenas para estados estáveis.

## Anti-padrões

- `any`, `as` para calar o compilador.
- Lógica de domínio no componente.
- Estado duplicado (store + URL).
- Animação em `top/left`.
- Dependência nova sem medir bytes.
- Texto hardcoded fora de um único módulo de microcopy.

## Antes de concluir

- [ ] `pnpm typecheck` e `pnpm lint`
- [ ] Teste de componente + e2e do cenário
- [ ] axe e teclado
- [ ] Bundle dentro do orçamento
- [ ] Screenshot/GIF anexado
