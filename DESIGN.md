# DESIGN — Pulso das Urnas

Identidade visual, comportamento do mapa, cores partidárias, movimento e acessibilidade. Este documento é normativo: componentes e animações seguem os tokens e as regras daqui.

## 1. Personalidade

Cívica, calma e viva. A base é neutra (grafite e branco) para que **as cores dos partidos sejam as protagonistas**; o verde-água da marca aparece só em detalhes de interface (foco, links, pulso). Nada de vermelho/azul/verde da marca competindo com o mapa.

## 2. Tokens

### Cor

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#F6F8FB` | Fundo da página |
| `--surface` | `#FFFFFF` | Cartões, mapa, painéis |
| `--ink` | `#0B1220` | Texto principal |
| `--ink-muted` | `#4B5563` | Texto secundário (contraste 7,5:1) |
| `--border` | `#D5DCE7` | Divisórias e contorno do mapa |
| `--brand` | `#123B6D` | Cabeçalho, títulos |
| `--brand-strong` | `#0A2547` | Hover do cabeçalho |
| `--accent` | `#0E8C7F` | Links, foco de marca, pulso |
| `--focus` | `#2563EB` | Anel de foco (3 px, offset 2 px) |
| `--success` | `#067647` | Apuração finalizada |
| `--warning` | `#B54708` | Dado desatualizado |
| `--danger` | `#B42318` | Erro de fonte |
| `--map-empty` | `#FFFFFF` | Estado sem voto apurado |
| `--map-nodata` | `#E5E7EB` | Estado sem dado disponível |
| `--map-border` | `#94A3B8` | Contorno de estado/município |
| `--map-hover` | `#0B1220` a 8% | Realce ao passar o mouse |

Regras:
- Texto sobre cor de partido usa **preto ou branco**, escolhido por contraste calculado (mínimo 4,5:1); nunca um terceiro tom.
- Nunca usar cor como único indicador: sempre acompanhar de sigla do partido, nome do candidato ou padrão (hachura para empate).
- Contraste mínimo 4,5:1 para texto normal e 3:1 para texto grande e elementos gráficos.

### Tipografia

- **Inter** variável, self-hosted, subset `latin` + `latin-ext`, `woff2`, `font-display: swap` (orçamento ≤ 32 KB gz).
- Escala: 12 / 14 / 16 / 20 / 24 / 32 / 44 px; linha 1,5 para corpo e 1,15 para títulos.
- Números tabulares (`font-variant-numeric: tabular-nums`) em votos, percentuais e relógio — evita "dança" na atualização.
- Título da página: 32 px (mobile 24 px), peso 700. Rótulo da busca: 16 px, peso 600.

### Espaço e forma

- Grade de 4 px; espaçamentos 8 / 12 / 16 / 24 / 32 / 48.
- Raio: 8 px (controles), 12 px (cartões), 999 px (chips).
- Sombra: `0 1px 2px rgb(11 18 32 / 0.06), 0 8px 24px rgb(11 18 32 / 0.08)` apenas em cartões flutuantes.
- Largura máxima do conteúdo: 1200 px; mapa ocupa 100% da largura disponível com proporção 1:1 no mobile e 16:10 no desktop.

## 3. Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Cabeçalho: marca · pleito · cargo · frescor do dado          │
├──────────────────────────────────────────────────────────────┤
│ "digite o nome do estado ou da cidade:"  [____________]      │
│ chips de cargo                                               │
├──────────────────────────────────────────────────────────────┤
│ [ Voltar ]  (somente após zoom)                              │
│                                                              │
│                     MAPA (SVG)                               │
│                                                              │
│ legenda: partidos + estados sem dado + empate                │
├──────────────────────────────────────────────────────────────┤
│ painel do estado/cidade (quando houver seleção)              │
├──────────────────────────────────────────────────────────────┤
│ pista dos cavalinhos                                         │
├──────────────────────────────────────────────────────────────┤
│ fonte, horário, aviso de não oficialidade, acessibilidade    │
└──────────────────────────────────────────────────────────────┘
```

- Mobile: painel de votos vira *bottom sheet* com três alturas (fechado, metade, quase cheio), arrastável e com botão de fechar.
- Desktop: painel lateral direito (360–420 px) quando há cidade selecionada; o mapa preserva o enquadramento.
- O rodapé dos cavalinhos é fixo na parte inferior em desktop e colapsável em mobile (altura 96 px, expandindo para 160 px).

## 4. Mapa

- **Projeção:** Mercator (`geoMercator`) ajustada ao Brasil; estados e municípios em `path` SVG gerados a partir de TopoJSON.
- **Brasil:** 27 unidades (26 estados + DF), com contorno branco de 1 px; hover eleva o contorno para 2 px e mostra tooltip.
- **Estado:** municípios do estado, contorno de 0,5 px; o estado permanece visível com 12% de opacidade nas bordas para contexto.
- **Zoom:** transição de 600 ms, `cubic-bezier(0.2, 0, 0, 1)`, com `transform: scale/translate` (não recalcula geometria); respeita `prefers-reduced-motion` (troca instantânea com fade de 120 ms).
- **Clique:** estado → carrega municípios (com esqueleto de até 300 ms) → zoom; cidade → abre o painel e mantém o zoom.
- **Foco:** cada estado/município é um elemento focável (`tabindex="0"`, `role="button"`), com `aria-label` completo ("São Paulo, 27 municípios, PL lidera com 48,2%"). Enter/Space ativa; Esc sobe um nível.
- **Fallback sem JS:** lista de estados em `<noscript>` com links para as páginas de estado (pré-renderizadas) — ver RNF-A11Y.

## 5. Cores partidárias

- Arquivo canônico: `data/party-colors.json`, com `sigla`, `nome`, `hex`, `fonte` (documento de identidade visual do partido) e `revisadoEm`.
- Não existe cor oficial publicada pelo TSE; a tabela é curada pelo projeto e **versionada**. Toda cor tem origem registrada.
- Fallback: hash estável da sigla em uma paleta de 12 matizes distintos, com saturação/luminosidade fixas; registra-se no log de build qual sigla caiu no fallback.
- Colisão entre os dois líderes de um mesmo estado: aplica-se hachura diagonal de 45° na cor do segundo, para diferenciar sem inventar cor.
- Partido sem cor cadastrada aparece com a cor de fallback e a sigla visível; nunca com branco (que significa "sem voto").
- A mesma sigla tem a mesma cor em todo o produto e em todos os pleitos.

Valores iniciais (revisar e completar na implementação, com fonte):

| Sigla | Hex inicial |
|---|---|
| PT | `#C8102E` |
| PL | `#0B4EA2` |
| UNIÃO | `#F58220` |
| PSD | `#0F7B4F` |
| MDB | `#0B6E4F` |
| PP | `#1D4ED8` |
| PSDB | `#1B62B3` |
| PDT | `#E03C31` |
| PSB | `#CA8A04` |
| PSOL | `#6D28D9` |
| NOVO | `#EA580C` |
| CIDADANIA | `#DB2777` |
| SOLIDARIEDADE | `#15803D` |
| REPUBLICANOS | `#1E3A8A` |
| PCdoB | `#B91C1C` |
| PV | `#2E7D32` |
| REDE | `#0E8C7F` |
| AVANTE | `#F59E0B` |
| PODE | `#0EA5E9` |
| PROS | `#7C3AED` |
| PTB | `#334155` |
| DC | `#475569` |

> Estes valores são um ponto de partida visual, não uma afirmação de cor oficial. A implementação deve registrar a fonte de cada um ou substituí-lo.

## 6. Movimento

| Interação | Duração | Curva |
|---|---|---|
| Hover de estado | 120 ms | `ease-out` |
| Zoom do mapa | 600 ms | `cubic-bezier(0.2,0,0,1)` |
| Troca de cor do estado | 400 ms | `ease-in-out` |
| Entrada de painel | 240 ms | `cubic-bezier(0.2,0,0,1)` |
| Balão de relincho | 320 ms (entrada) / 900 ms (permanência) / 200 ms (saída) | mola suave |
| Corrida dos cavalos | contínua, mola `stiffness 90 / damping 18` | — |
| Cena final | 2,4 s | sequência coreografada |

- Toda animação tem versão sem movimento; `prefers-reduced-motion` desliga corrida, zoom animado e confete.
- Nada pisca mais de 3 vezes por segundo; nada bloqueia interação.
- A corrida é decorativa: os mesmos números estão sempre disponíveis em texto e na tabela.

## 7. Acessibilidade

- Alvo WCAG 2.2 AA.
- Ordem de foco: cabeçalho → busca → chips → mapa (região com `role="application"` e instruções) → painel → rodapé.
- Atalhos: `Esc` sobe um nível; `+`/`-` zoom; setas navegam entre estados/municípios; `Home` volta ao Brasil.
- Região `aria-live="polite"` anuncia: mudança de líder do estado selecionado, fim da apuração e resultado final. Máximo de um anúncio a cada 10 s para não inundar o leitor de tela.
- Alternativa em tabela (`<details>` "Ver dados em tabela") com estado, líder, votos, percentual e apurado.
- Contraste de todas as cores de partido validado em build; falha quebra o build.
- Vídeo/animação não é o único meio de informação.

## 8. Conteúdo

- Rótulo da busca, literal: **"digite o nome do estado ou da cidade:"**
- Botão de retorno, literal: **"Voltar"**
- Estados vazios: "Aguardando o primeiro boletim de urna."
- Dado atrasado: "Dados de 20/10/2026, 18h42. A fonte não respondeu na última tentativa."
- Fim: "Apuração encerrada em 20/10/2026, 21h15. PL venceu em São Paulo."
- Rodapé legal: "Fonte: Tribunal Superior Eleitoral. Este site não é um serviço oficial do TSE."
