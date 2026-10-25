# DESIGN — Pulso das Urnas

Identidade visual, comportamento do mapa, cores partidárias, movimento e acessibilidade. Este documento é normativo: componentes e animações seguem os tokens e as regras daqui.

## 1. Personalidade

Cívica, calma e viva. A base é neutra (grafite e branco) para que **as cores dos partidos sejam as protagonistas**; o verde-água da marca aparece só em detalhes de interface (foco, links, pulso). Nada de vermelho/azul/verde da marca competindo com o mapa.

## 2. Tokens

### Cor

| Token             | Valor          | Uso                                                                                         |
| ----------------- | -------------- | ------------------------------------------------------------------------------------------- |
| `--bg`            | `#F6F8FB`      | Fundo da página                                                                             |
| `--surface`       | `#FFFFFF`      | Cartões, mapa, painéis                                                                      |
| `--ink`           | `#0B1220`      | Texto principal                                                                             |
| `--ink-muted`     | `#4B5563`      | Texto secundário (contraste 7,5:1)                                                          |
| `--border`        | `#D5DCE7`      | Divisórias e contorno do mapa                                                               |
| `--brand`         | `#123B6D`      | Cabeçalho, títulos                                                                          |
| `--brand-strong`  | `#0A2547`      | Hover do cabeçalho                                                                          |
| `--accent`        | `#0E8C7F`      | Links, foco de marca, pulso                                                                 |
| `--focus`         | `#2563EB`      | Anel de foco (3 px, offset 2 px)                                                            |
| `--success`       | `#067647`      | Apuração finalizada                                                                         |
| `--warning`       | `#B54708`      | Dado desatualizado                                                                          |
| `--danger`        | `#B42318`      | Erro de fonte                                                                               |
| `--map-empty`     | `#FFFFFF`      | Estado sem voto apurado (branco)                                                            |
| `--map-nodata`    | `#E5E7EB`      | Estado sem dado disponível (cinza médio)                                                    |
| `--map-na`        | `#F1F4F8`      | Cargo não aplicável ao escopo (cinza claro, sempre com diagonal)                            |
| `--map-no-leader` | `#6B7280`      | Válidos sem candidato elegível (cinza escuro)                                               |
| `--map-hatch`     | `#6B7280`      | Traço da hachura de empate e da diagonal de "não aplicável" (≥ 3:1 sobre os preenchimentos) |
| `--map-edge`      | `#64748B`      | Contorno de 1 px quando o preenchimento não atinge 3:1 contra o vizinho                     |
| `--map-border`    | `#94A3B8`      | Contorno de estado/município                                                                |
| `--map-hover`     | `#0B1220` a 8% | Realce ao passar o mouse                                                                    |

Regras:

- Texto sobre cor de partido usa **preto ou branco**, escolhido por contraste calculado (mínimo 4,5:1); nunca um terceiro tom.
- Nunca usar cor como único indicador: sempre acompanhar de sigla do partido, nome do candidato ou padrão (hachura para empate).
- Contraste mínimo 4,5:1 para texto normal e 3:1 para texto grande e elementos gráficos.
- **Contraste não textual (D-036):** todo par de preenchimentos vizinhos mantém ≥ 3:1 **ou** é separado por contorno de 1 px que atinja 3:1 contra os dois preenchimentos — escolhido entre `--map-edge` e `--surface` pelo contraste calculado (mesma lógica do texto sobre cor, RN-024); se nenhum atingir, contorno duplo de 1 px (`--map-edge` + `--surface`). A hachura de empate e a diagonal de "não aplicável" também mantêm ≥ 3:1 sobre o preenchimento que cobrem e sobre o vizinho. Medição no build; falha quebra o build.

### Tipografia

- **Inter** variável, self-hosted, subset `latin` + `latin-ext`, `woff2`, `font-display: swap` (orçamento ≤ 32 KB gz).
- Escala: 12 / 14 / 16 / 20 / 24 / 32 / 44 px; linha 1,5 para corpo e 1,15 para títulos.
- Números tabulares (`font-variant-numeric: tabular-nums`) em votos, percentuais e relógio — evita "dança" na atualização.
- Título da página: 32 px (mobile 24 px), peso 700. Rótulo da busca: 16 px, peso 600.

### Espaço e forma

- Grade de 4 px; espaçamentos 8 / 12 / 16 / 24 / 32 / 48.
- Raio: 8 px (controles), 12 px (cartões), 999 px (chips).
- Sombra: `0 1px 2px rgb(11 18 32 / 0.06), 0 8px 24px rgb(11 18 32 / 0.08)` apenas em cartões flutuantes.
- Largura máxima do conteúdo: 1200 px; no desktop, o mapa do Brasil ocupa o espaço restante ao lado do ranking nacional (240–300 px). O ranking mostra total de votos válidos, percentual e votos de cada candidato, com a mesma fonte e o mesmo horário do mapa; a lista rola dentro do cartão e não cria rolagem de página. No mobile, o ranking fica acima do mapa e o mapa mantém proporção 1:1.

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
│ monitor de pulso                                             │
├──────────────────────────────────────────────────────────────┤
│ fonte, horário, aviso de não oficialidade, acessibilidade    │
└──────────────────────────────────────────────────────────────┘
```

- Mobile: painel de votos vira _bottom sheet_ com três alturas (fechado, metade, quase cheio), arrastável e com botão de fechar.
- Desktop: painel lateral direito (360–420 px) quando há cidade selecionada; o mapa preserva o enquadramento.
- O rodapé é o monitor de pulso: sticky no fim do conteúdo (nunca fixo sobre o mapa) em desktop e colapsável em mobile (altura 160 px, expandindo para 200 px).

## 4. Mapa

- **Projeção:** Mercator (`geoMercator`) ajustada ao Brasil; estados e municípios em `path` SVG gerados a partir de TopoJSON.
- **Brasil:** 27 unidades (26 estados + DF), com contorno branco de 1 px; hover eleva o contorno para 2 px e mostra tooltip.
- **Estado:** municípios do estado, contorno de 0,5 px; o estado permanece visível com 12% de opacidade nas bordas para contexto.
- **Zoom:** transição de 600 ms, `cubic-bezier(0.2, 0, 0, 1)`, com `transform: scale/translate` (não recalcula geometria); respeita `prefers-reduced-motion` (troca instantânea com fade de 120 ms).
- **Clique:** estado → carrega municípios (com esqueleto de até 300 ms) → zoom; cidade → abre o painel e mantém o zoom.
- **Foco:** cada estado/município é um elemento focável (`tabindex="0"`, `role="button"`), com `aria-label` completo ("São Paulo, 27 municípios, PL lidera com 48,2%"). Enter/Space ativa; Esc sobe um nível. Quando não há líder, o rótulo diz o estado em palavras ("sem dado", "não se aplica a este pleito", "aguardando definição judicial", "empate").
- **Fallback sem JS:** lista de estados em `<noscript>` com links para as páginas de estado (pré-renderizadas) — ver RNF-A11Y.
- **Preenchimento (D-002, D-011):** "cor predominante do estado" é o **preenchimento** pela cor do partido do líder no cargo em destaque (RN-006). Não existe cor de identidade por estado, região ou UF. Branco = sem voto; cinza médio = sem dado; cinza claro com diagonal = não aplicável; cinza escuro = sem líder elegível; cor do partido = líder; cor + hachura = empate. Erro de fonte e dado desatualizado **não** trocam a cor: acrescentam faixa.
- **Cadência da cor (D-008, D-012):** cada estado muda no máximo **1 vez a cada 10 s**, com snapshots coalescidos; transição de 400 ms. A histerese de liderança (≥ 0,5% dos válidos ou ≥ 500 votos, sustentada por 2 snapshots) é calculada no servidor; quando a cor é mantida, aparece o selo "Disputa acirrada". Detalhe em `07-ux-mapa-e-animacoes.md` §4.7.
- **Foco (D-037):** após o zoom, o foco vai ao título do mapa do estado (`tabindex="-1"`) e `Tab` alcança o primeiro município; ao abrir cidade, vai ao título do painel; "Voltar" devolve ao polígono ativado.
- **Sem geometria (D-028):** município sem malha aparece na tabela e na busca, não tem `path` e não é clicável; faixa discreta no recorte do estado. Nunca é tratado como "sem dado".

## 5. Cores partidárias

- **"Cor predominante do estado" é preenchimento, não identidade (D-002).** O mapa pinta o polígono com a cor do partido do líder no cargo em destaque; nenhum estado tem cor fixa, gradiente próprio ou paleta regional.
- Arquivo canônico: `data/party-colors.json`, com `sigla`, `nome`, `hex`, `fonte` (documento de identidade visual do partido) e `revisadoEm`.
- Não existe cor oficial publicada pelo TSE; a tabela é curada pelo projeto e **versionada**. Toda cor tem origem registrada.
- Fallback: hash estável da sigla em uma paleta de 12 matizes distintos, com saturação/luminosidade fixas; registra-se no log de build qual sigla caiu no fallback.
- Colisão entre as cores dos dois líderes de um mesmo estado: aplica-se contorno de 1 px na cor de maior contraste (RN-024), sem inventar cor. A hachura é reservada ao empate (RN-008); quando usada, o traço mantém ≥ 3:1 (D-036).
- Partido sem cor cadastrada aparece com a cor de fallback e a sigla visível; nunca com branco (que significa "sem voto").
- A mesma sigla tem a mesma cor em todo o produto e em todos os pleitos.
- Liderança só troca a cor com histerese (RN-038): ≥ 0,5% dos válidos ou ≥ 500 votos, por 2 snapshots. Abaixo disso, a cor fica e o detalhe mostra "Disputa acirrada".
- Todo par de preenchimentos vizinhos precisa de 3:1 ou contorno de 1 px com 3:1 contra os dois lados (escolhido entre `--map-edge` e `--surface`); a verificação roda no build e falha o build.

Valores iniciais (revisar e completar na implementação, com fonte):

| Sigla         | Hex inicial |
| ------------- | ----------- |
| PT            | `#C8102E`   |
| PL            | `#0B4EA2`   |
| UNIÃO         | `#F58220`   |
| PSD           | `#0F7B4F`   |
| MDB           | `#0B6E4F`   |
| PP            | `#1D4ED8`   |
| PSDB          | `#1B62B3`   |
| PDT           | `#E03C31`   |
| PSB           | `#CA8A04`   |
| PSOL          | `#6D28D9`   |
| NOVO          | `#EA580C`   |
| CIDADANIA     | `#DB2777`   |
| SOLIDARIEDADE | `#15803D`   |
| REPUBLICANOS  | `#1E3A8A`   |
| PCdoB         | `#B91C1C`   |
| PV            | `#2E7D32`   |
| REDE          | `#0E8C7F`   |
| AVANTE        | `#F59E0B`   |
| PODE          | `#0EA5E9`   |
| PROS          | `#7C3AED`   |
| PTB           | `#334155`   |
| DC            | `#475569`   |

> Estes valores são um ponto de partida visual, não uma afirmação de cor oficial. A implementação deve registrar a fonte de cada um ou substituí-lo.

## 6. Movimento

| Interação              | Duração                                                    | Curva                     |
| ---------------------- | ---------------------------------------------------------- | ------------------------- |
| Hover de estado        | 120 ms                                                     | `ease-out`                |
| Zoom do mapa           | 600 ms                                                     | `cubic-bezier(0.2,0,0,1)` |
| Troca de cor do estado | 400 ms                                                     | `ease-in-out`             |
| Entrada de painel      | 240 ms                                                     | `cubic-bezier(0.2,0,0,1)` |
| Selo "PULSO!"          | 320 ms (entrada) / 1,6 s (permanência) / 200 ms (saída)    | mola suave                |
| Monitor de pulso       | rolagem de 1,4 s por ciclo + transição de altura de 600 ms | —                         |
| Cena final             | 2,4 s                                                      | sequência coreografada    |

- Toda animação tem versão sem movimento; `prefers-reduced-motion` desliga a rolagem do pulso, o zoom animado e o coração.
- Nada pisca mais de 3 vezes por segundo; nada bloqueia interação.
- O monitor é decorativo: os mesmos números estão sempre disponíveis em texto e na tabela.
- **Cadência de cor (D-012):** no máximo 1 troca por estado a cada 10 s, com snapshots coalescidos; a primeira pintura não anima; com `prefers-reduced-motion` a transição é 0 ms, mas a cadência continua valendo.
- **Reconexão (D-027):** as linhas são reancoradas no alvo com transição de 400 ms, sem oscilação; inversões ocorridas durante o offline não são reproduzidas.
- **Monitor (D-025, D-030):** dupla fixa na sessão; quando o conjunto muda por 2 snapshots (≥ 10 s), as linhas são reancoradas e o anúncio explica a troca.
- **Cena final (D-032):** uma vez por aba, com a chave `pulso:final-scene:{pleito}:{cargo}` em `sessionStorage`; "Rever cena" sempre disponível; `localStorage` guarda só a pausa.

## 7. Acessibilidade

- Alvo WCAG 2.2 AA.
- Ordem de foco: cabeçalho → busca → chips → mapa (SVG com `role="group"`, `aria-labelledby` e instruções em região separada; `role="img"` só em versão estática) → painel → rodapé.
- Atalhos: `Esc` sobe um nível; `+`/`-` zoom; setas navegam entre estados/municípios; `Home` volta ao Brasil.
- Região `aria-live="polite"` única, agregada por ciclo de 10 s, com prioridade: (1) líder do escopo selecionado, (2) líder nacional, (3) fim da apuração. Máximo de um anúncio a cada 10 s; o excedente vai para a região "Resumo da apuração" (`aria-live="off"`) sem interromper (D-035).
- Foco após navegação: zoom → título do mapa do estado (`tabindex="-1"`), com `Tab` no primeiro município; cidade aberta → título do painel; "Voltar" e `Esc` → polígono ativado. Polling nunca move o foco (D-037).
- Alternativa em tabela (`<details>` "Ver dados em tabela") com estado, líder, votos, percentual e apurado; 100 linhas por página e busca no escopo, sem CSV na v1 (D-026).
- Contraste de todas as cores de partido validado em build — 4,5:1 para texto sobre cor, 3:1 entre preenchimentos adjacentes (ou contorno equivalente) e para a hachura; falha quebra o build (D-036).
- Atribuição ("Fonte: Tribunal Superior Eleitoral") e aviso "Este site não é um serviço oficial do TSE." no HTML estático inicial de toda rota, visíveis sem JavaScript (D-039).
- Vídeo/animação não é o único meio de informação.

## 8. Conteúdo

- Rótulo da busca, literal: **"digite o nome do estado ou da cidade:"**
- Botão de retorno, literal: **"Voltar"**
- Estados vazios: "Aguardando o primeiro boletim de urna."
- Não aplicável: "Este cargo não existe em <escopo>. Nada a apurar aqui."
- Sem líder elegível: "Aguardando definição judicial."
- Dado atrasado: "Dados de 20/10/2026, 18h42. A fonte não respondeu na última tentativa."
- Fim: "Apuração encerrada em 20/10/2026, 21h15. PL venceu em São Paulo."
- Município fora do pleito: "Município não participa deste pleito."
- Geometria indisponível: "Geometria indisponível para este município. Os votos estão na tabela."
- Monitor reiniciado: "A leitura recomeçou: <A> e <B>."
- Rodapé legal: "Fonte: Tribunal Superior Eleitoral. Este site não é um serviço oficial do TSE." — presente no HTML estático inicial de toda rota, fora do React (D-039).

> A tabela completa de microcopy, com todas as chaves, está em [07 §8](docs/requisitos/07-ux-mapa-e-animacoes.md); este documento repete apenas o que aparece em layout fixo. Palavras proibidas e tratamento simétrico: 07 §8.1 (RN-033).
