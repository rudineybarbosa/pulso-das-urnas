# 07 — UX, mapa e animações

Especificação de tela em estados, interações e movimento. Tokens visuais em [DESIGN.md](../../DESIGN.md).

## 1. Estados da tela

A matriz abaixo é exaustiva para a v1 (RF-045, D-021). Ausência de dado, indisponibilidade de dado e falha de fonte são famílias distintas: nunca compartilham texto, cor nem código.

### 1.1 Estados de ausência (D-001)

Cinco valores de `status`, iguais aos da API e usados sem sinônimo no cliente (RN-035, RN-028):

| `status` | Definição | Exemplo | Nunca significa |
|---|---|---|---|
| `sem_voto` | O arquivo existe e não há voto válido | Antes do primeiro boletim | Erro de fonte |
| `sem_dado` | O cargo se aplica ao escopo, mas não há arquivo | Arquivo ausente na geração | `nao_aplicavel` |
| `nao_aplicavel` | O cargo não existe naquele escopo/turno e não há fallback | Dep. Distrital em SP | `sem_dado` |
| `sem_lider_elegivel` | Há votos válidos, mas nenhum candidato elegível para liderança (RN-021) | Candidato cassado ou anulado | Empate |
| `retificado` | A geração corrente corrige a anterior (RN-017) | Total oficial diminuiu | Número negativo |

- `sem_dado` responde **200** com `dados: null` e é cacheável; `404` fica reservado a pleito/cargo/escopo inexistente (D-013). O cliente exibe o `status`; nunca traduz `404` para "sem dado".
- `retificado` é adorno, não substitui o estado de apuração: o estado continua parcial ou finalizado, com o selo "Dados retificados pelo TSE".

### 1.2 Matriz de estados

| Estado | Condição | Mapa | O que o usuário vê |
|---|---|---|---|
| **Carregando inicial** | Primeira carga | Esqueleto do mapa (contorno cinza-claro) | "Buscando os dados do TSE…"; sem spinner central |
| **Sem votos** (`sem_voto`) | `v.vv = 0` (ou soma dos válidos = 0), com arquivo presente | Todos os estados brancos | Faixa "Aguardando o primeiro boletim de urna"; monitor aguardando o primeiro boletim |
| **Parcial** | `0 < p < 100` | Preenchimento com a cor do líder (RN-006) | Relógio e "% apurado" avançando; linhas de pulso rolando |
| **Finalizado** | `tf = s` em todos | Preenchimento final | Selo verde "Apuração encerrada"; monitor desenha o coração conforme §7.3 |
| **Empate exato** | RN-008 | Hachura diagonal no estado | Rótulo "Empate"; linhas na mesma altura |
| **Sem dado** (`sem_dado`) | `dados: null` | Cinza médio (`--map-nodata`) | Tooltip "Sem dados para este cargo" |
| **Não aplicável** (`nao_aplicavel`) | Cargo inexistente no escopo/turno, sem fallback | Cinza claro com diagonal | Rótulo "Não se aplica a este pleito"; tooltip "Este cargo não existe em <escopo>" |
| **Sem líder elegível** (`sem_lider_elegivel`) | Válidos > 0 e nenhum elegível (RN-021) | Cinza escuro (`--map-no-leader`) | Rótulo "Aguardando definição judicial"; votos válidos e de legenda continuam visíveis |
| **Retificado** (`retificado`) | Correção aceita do TSE (RN-017) | Preenchimento normal | Selo "Dados retificados pelo TSE" por 60 min ou até 3 gerações sem regressão (o que durar mais), sem animação de queda |
| **Desatualizado** | RN-013 (90 s – 10 min sem atualização) | Preenchimento normal | Faixa âmbar "Dados de hh:mm — a fonte não respondeu na última tentativa"; números mantidos |
| **Fonte indisponível** | > 10 min sem sucesso | Preenchimento normal | Faixa vermelha com "Tentar novamente"; último snapshot preservado |
| **Offline** | `navigator.onLine = false` ou falha de rede | Congelado no último estado | Faixa "Você está offline. Mostrando os últimos dados."; monitor congela (§7.5) |
| **2º turno não iniciado** | Arquivos zerados (RN-030) | Cinza claro, sem preenchimento por zero | "O 2º turno começa em 25/10"; nunca "0 votos" |
| **Erro de escopo** | `404` de pleito/cargo/escopo | Esqueleto neutro | Cartão "Não encontramos esse município" + botão "Buscar cidade" |
| **Arquivado** | Pleito fora do catálogo há > 24 h (RN-037) | Preenchimento final | Selo "Arquivado"; sem polling de apuração; acessível por URL direta, ausente do seletor |

Regra: nenhum estado troca números por placeholder. Se há número, ele tem hora.

### 1.3 Faixas e precedência (D-011)

- No máximo **uma faixa de degradação** por tela, na ordem de precedência: `offline` → `fonte_indisponivel` → `desatualizado` → `fonte_sem_atualizacao` (âmbar, quando a coleta é recente mas o arquivo do TSE está parado).
- Selos (`retificado`, `arquivado`, `1º turno`, "Disputa acirrada") coexistem com a faixa e ficam no bloco de frescor, não sobre o mapa.
- Faixa **nunca** altera a cor do estado e **nunca** esconde número; é `role="status"` e não rouba foco.
- Erro de fonte é sempre faixa/vermelho; jamais cinza, branco ou hachura.

## 2. Cabeçalho

- Marca "Pulso das Urnas" (link para `/br`).
- Seletor de pleito/turno (select acessível), com estado de cada turno.
- Chips de cargo, roláveis horizontalmente no mobile, com o maior cargo ativo.
- Bloco de frescor:
  ```
  Ao vivo · 21h14:32 (TSE) · 87,4% apurado     [Atualizar]
  ```
  - Ponto verde pulsante (2 s) quando `ao_vivo`; âmbar quando desatualizado; cinza quando finalizado.
  - `Atualizar` com ícone, desabilitado por 3 s após o clique.
- Em telas < 480 px, o frescor vira uma linha compacta abaixo do título.

### 2.1 Troca de pleito com cidade aberta (D-024)

| Situação | Comportamento |
|---|---|
| O município participa do novo pleito | Painel permanece aberto, com esqueleto enquanto recarrega; mantém a aba de cargo se ela existir no novo escopo (D-016); o mapa troca os dados sem sair do zoom |
| O município não participa | Fecha o painel, mantém o estado selecionado (zoom e recorte), remove o município da URL com `history.replaceState` e mostra o toast "Município não participa deste pleito" |
| O pleito não tem o cargo ativo | Aplica a regra de cargo da RN-036 antes de recarregar o painel |

- O toast é `role="status"`, fica 6 s, não tem ação e não é modal; some ao trocar de pleito novamente.
- A URL só muda por ação explícita do usuário; a remoção do município é a única escrita automática e usa `replaceState` (sem entrada falsa no histórico).
- Falha ao recarregar o município no novo pleito → mantém o painel fechado, faixa de erro de escopo com "Buscar cidade", estado preservado.

## 3. Busca

```
digite o nome do estado ou da cidade:
[ 🔍  São Paulo                                   ]
```

- Campo com 48 px de altura, borda de 1 px, raio 8 px, ícone à esquerda.
- Ao focar: lista de sugestões em `role="listbox"`; item ativo com fundo `--bg` e anel de foco.
- Cada sugestão: nome + UF + tipo ("estado" / "cidade" / "capital").
- `Enter` seleciona; `Esc` fecha a lista sem limpar o texto; `↑`/`↓` navegam.
- Seleção de estado: fecha a lista, limpa o texto, aplica zoom e atualiza a URL.
- Seleção de cidade: fecha a lista, faz zoom no estado e abre o painel com a cidade.
- Sem resultado: mensagem em `role="status"`, sem fechar o mapa.
- O texto de ajuda abaixo do campo (visível só ao focar): "Aceita nome do estado, sigla (SP) ou nome da cidade."

## 4. Mapa

### 4.1 Camadas
1. Fundo do oceano: `--surface`.
2. Estados (Brasil) ou municípios (estado), cada um um `<path>`.
3. Contorno do estado selecionado (2 px, `--ink` a 40%).
4. Rótulos: sigla da UF no centroide (Brasil); nome do município só em hover/foco e em municípios grandes.
5. Marcador de capital: pequeno círculo quando o município é capital (opcional, atrás do rótulo).

### 4.2 Interação
| Ação | Efeito |
|---|---|
| Hover/foco em estado | Contorno 2 px + tooltip com nome, líder, partido, votos, %, apurado |
| Clique/Enter em estado | Zoom 600 ms + carregamento dos municípios |
| Clique/Enter em município | Abre painel; mantém zoom |
| `Esc` | Sobe um nível (município → estado → Brasil) |
| Setas | Move o foco entre polígonos vizinhos (ordem geográfica aproximada) |
| `+` / `-` | Zoom de acessibilidade (1,25× / 0,8×) sem mudar de nível |
| `Home` | Volta ao Brasil |

- Duplo clique NÃO deve dar zoom (evita conflito com clique simples).
- Toque: primeiro toque seleciona, segundo confirma? **Não** — um toque já navega (mobile-first), com `touch-action: manipulation`.
- Durante o zoom, cliques são ignorados (250 ms de bloqueio) para evitar navegação dupla.

### 4.3 Tooltip
- Desktop: segue o cursor com deslocamento de 12 px, limitado à viewport.
- Mobile: não há hover; a informação aparece no painel após o toque.
- Conteúdo:
  ```
  São Paulo
  PL · Flavio Bolsonaro
  56.104.503 votos · 47,0% dos válidos
  100% apurado
  ```

### 4.4 Legenda
- Abaixo do mapa, em duas linhas no mobile:
  - Partidos visíveis: chip cor + sigla, ordenados por votos nacionais no cargo selecionado.
  - Símbolos: branco "sem voto", cinza médio "sem dado", cinza claro com diagonal "não aplicável", cinza escuro "aguardando definição judicial", hachura "empate".
- A legenda lista apenas os símbolos presentes no recorte atual, em ordem fixa (partidos por votos; depois os preenchimentos e padrões na ordem acima), para que a mesma cor signifique sempre a mesma coisa.
- "Disputa acirrada" entra como selo na legenda somente quando houver estado nessa condição (§4.7), com o texto "cor mantida até confirmação".
- Botão "Ver todos os partidos" abre lista completa.
- A legenda é um `<ul>` com texto, não depende de cor; cada item combina padrão + rótulo (RNF-A11Y-04).

### 4.5 Voltar
- Botão acima do mapa, à esquerda, com ícone ← e texto **"Voltar"**.
- Aparece em qualquer nível abaixo do Brasil, com animação de entrada de 160 ms.
- `aria-label`: "Voltar para o estado de São Paulo" ou "Voltar para o mapa do Brasil".

### 4.6 Preenchimento do mapa (D-002, D-011)

**Definição normativa (D-002):** "cor predominante do estado" é o **preenchimento** do polígono com a cor do partido do líder no cargo em destaque (RN-006). Não existe cor de identidade por estado, por região ou por UF: nenhum estado tem cor fixa, gradiente próprio ou paleta regional. O oceano e os espaços vazios usam sempre `--surface`.

| Preenchimento | Token | Significado | Rótulo acessível |
|---|---|---|---|
| Branco | `--map-empty` | Sem voto apurado | "sem voto" |
| Cinza médio | `--map-nodata` | Sem dado | "sem dado" |
| Cinza claro com diagonal | `--map-na` + `--map-hatch` | Não aplicável | "não se aplica a este pleito" |
| Cinza escuro | `--map-no-leader` | Sem líder elegível | "aguardando definição judicial" |
| Cor do partido | `data/party-colors.json` | Líder | "PL lidera com 47,0%" |
| Cor do partido + hachura diagonal | cor + `--map-hatch` | Empate exato | "empate" |

- O preenchimento é sempre do líder no cargo em destaque, nunca da soma de votos nem do partido mais votado em outro cargo (RN-006).
- Falha de fonte e dado desatualizado **não** trocam o preenchimento: acrescentam faixa (§1.3).
- Contraste não textual ≥ 3:1 entre preenchimentos vizinhos (D-036), medido no build; quando o par não atinge, entra contorno de 1 px com 3:1 contra os dois lados (escolhido entre `--map-edge` e `--surface`; duplo se necessário), sem sombra e sem blur. Texto sobre a cor continua em 4,5:1 com `cor.texto` (RN-024).
- Hachura: traço de 1 px a 45°, passo de 4 px, estática (não anima), com contraste ≥ 3:1 sobre o preenchimento e sobre o vizinho. A hachura de "não aplicável" tem passo maior (8 px) para não se confundir com a de empate.
- Cor nunca é o único indicador: sigla, rótulo na legenda, `aria-label` do polígono e coluna Status da tabela repetem a informação (RNF-A11Y-04).

### 4.7 Cadência da cor e histerese (D-012, D-008)

- Cada estado muda de preenchimento **no máximo uma vez a cada 10 s**. Snapshots recebidos dentro da janela são **coalescidos**: ao fim da janela vale o estado do snapshot mais recente; as cores intermediárias nunca são pintadas.
- A troca usa transição de 400 ms (`ease-in-out`, DESIGN §6). A primeira pintura não anima. Nada pisca mais de 3×/s; com `prefers-reduced-motion` a transição é 0 ms, mas a cadência de 10 s continua valendo.
- Histerese (RN-038): a liderança visual só muda se o novo líder superar o atual em **≥ 0,5% dos válidos ou ≥ 500 votos** (basta uma das duas) e a condição se sustentar por **2 snapshots consecutivos (≥ 10 s)**. Abaixo disso, a cor é mantida.
- Empate exato é exceção: entra em hachura imediatamente (não há líder a preservar) e só sai quando o desempate atinge o limiar acima.
- Enquanto a cor é mantida por histerese, o estado exibe o selo **"Disputa acirrada"** no tooltip, no cabeçalho do painel e na coluna Status da tabela, com a diferença em votos. O selo não altera a cor.
- A histerese é calculada no servidor: a API entrega `cor` e o indicador de disputa acirrada; o cliente apenas renderiza e não recalcula líder, cor ou limiar (RN-034).

### 4.8 Município sem geometria (D-028)

- Município sem malha aparece na tabela e na busca, com números e status normais; não gera `<path>`, portanto **não é clicável nem focável no mapa**.
- Selecionar pela busca ou pela tabela abre o painel normalmente (o dado existe); o mapa faz o zoom do estado sem destacar o polígono e o painel mostra o selo "Geometria indisponível".
- Texto: "Geometria indisponível para este município." — no painel, na linha da tabela e no `aria-label` da linha ("sem geometria no mapa").
- Faixa discreta no recorte do estado: "<N> município(s) sem geometria — ver tabela". Não é alerta, não usa âmbar nem vermelho.
- Nunca converter em `sem_dado`: o município conta nos totais do estado e o preenchimento do estado continua sendo o do líder por votos.
- Se faltar a malha do estado inteiro, ele é listado na tabela, aberto pela busca e o Brasil mostra a mesma faixa discreta; o build grava o relatório de ausentes (catálogo × malha) e não falha por ausência — ausência de geometria é dado, não erro.

### 4.9 Foco após navegação (D-037)

- Após o zoom para um estado, o foco vai para o título do mapa do estado (`tabindex="-1"`), que é anunciado; `Tab` alcança o primeiro município.
- Ao abrir uma cidade (clique, teclado ou busca), o foco vai para o título do painel (`tabindex="-1"`), no desktop e no bottom sheet.
- "Voltar" (e `Esc`) devolve o foco ao polígono que foi ativado. Se ele não existir mais, o foco vai para o título do mapa.
- Atualização de dados e polling nunca movem o foco; não há armadilha de foco em sheet nem no mapa.

## 5. Painel de votos

### Desktop (≥ 1024 px)
- Painel lateral direito, 400 px, fixo ao lado do mapa, com sombra à esquerda.
- Cabeçalho: nome do município, UF, "87,4% apurado", botão fechar.
- Abas de cargo (scroll horizontal se necessário).
- Lista de candidatos: barra proporcional na cor do partido, nome de urna, número · partido, votos e %.
- Rodapé: resumo (válidos, brancos, nulos, comparecimento, abstenção) em `<details>`.

### Mobile (< 1024 px)
- Bottom sheet com três alturas: 96 px (peek), 55% (meio), 92% (quase cheio).
- Arrastar a alça; toque na alça alterna entre meio e cheio; botão fechar.
- Ao abrir, foco vai para o título do painel; ao fechar, volta ao município.

### Abas de cargo (D-016)

- **Uma aba = uma consulta.** O painel carrega **um cargo por vez**, com resposta ≤ 12 KB gz (RNF-PERF-06, RF-021); nunca a lista completa de cargos do município.
- Pré-busca somente o **cargo em destaque**. As demais abas buscam na primeira ativação e ficam em cache por `(pleito, turno, escopo, cargo, versão)`.
- Trocar de aba **não refaz o mapa**: o mapa lê o panorama do cargo em destaque e mantém zoom, seleção e rolagem; só a lista do painel re-renderiza.
- A aba ativa vai para a URL (`cargo=`); abrir link com aba inválida cai no destaque com o aviso da RN-036.
- Máximo de **5 abas** por município, o que cobre os cargos do catálogo municipal; se um escopo exceder, o excedente fica em "Outros cargos", no mesmo padrão de consulta única.
- Durante o carregamento da aba: esqueleto de 5 linhas; números da aba anterior não são reaproveitados (bases diferentes, RN-010).
- Falha na aba: erro inline com "Tentar novamente"; as outras abas seguem funcionando.
- Abas são `role="tablist"` com `role="tab"`/`tabpanel`, setas, `Home`/`End` e `aria-selected`.

### Conteúdo por candidato
- Linha: `[barra] Nome de urna  ·  22 PL        56.104.503  47,0%`
- Líder: rótulo "1º" e barra mais espessa (6 px); demais 4 px.
- Situação: `Eleito` (verde), `2º turno` (azul), `Não eleito` (neutro).
- Candidato com `dvt` ≠ Válido: agrupado em "Votos não computados para liderança", com o motivo.
- Toque na linha expande detalhes (nome completo, vice/suplentes).

### Ordem e empate
- Ordem por votos (RN-026). Empate exato: mesma posição visual + selo "Empate".
- Quando a diferença entre 1º e 2º fica abaixo do limiar de histerese (§4.7), a lista mostra o selo "Disputa acirrada" ao lado da diferença, sem mudar a cor do mapa.
- Nunca reordenar com animação brusca: usar transição de posição de 240 ms (`transform`).

## 6. Tabela alternativa

- `<details>` "Ver dados em tabela", fechado por padrão, logo abaixo da legenda.
- Colunas: Escopo, Líder, Partido, Votos, % dos válidos, % apurado, Status.
- Uma linha por estado (Brasil) ou por município (estado) ou por candidato (painel).
- `<caption>` descreve o recorte e a hora do dado.
- A coluna Status escreve o estado em palavras: "sem voto", "sem dado", "não aplicável", "aguardando definição judicial", "empate", "disputa acirrada", "retificado", "1º turno", "arquivado" — inclusive "sem geometria no mapa" (D-028).
- Ordem sempre a do servidor (RN-026); a tabela não oferece reordenação.

### 6.1 Paginação e busca (D-026)

- **100 linhas por página**, com "Anterior" / "Próxima" e o indicador "1–100 de 645"; a página não vai para a URL e um `role="status"` anuncia "Página 2 de 7" (fora da fila de anúncios da apuração, §7.8).
- **Busca dentro do escopo**: campo próprio dentro do `<details>`, com a normalização da RN-011, `debounce` de 150 ms e filtro local sobre o recorte já carregado. Não é a busca global do §3: não navega, não altera a URL e não dispara requisição por caractere.
- A busca e a paginação combinam: filtrar reinicia na página 1; contagem "12 resultados" em `role="status"`; sem resultado → "Nenhum município com esse nome neste estado".
- **Sem exportação CSV ou planilha na v1** (D-026): nenhum botão de download; a limitação é declarada no rodapé da tabela e registrada como dívida para a v2.
- Na impressão a tabela ignora a paginação e imprime o escopo completo (§10).

## 7. Monitor de pulso

> Em 22/10/2026 o mantenedor substituiu a corrida de cavalos por um monitor de pulso (ADR-006). Os IDs RF-035..038, RN-015/016 e AT-020..023 foram preservados.

### 7.1 Composição

```
┌──────────────────────────────────────────────────────────────┐
│ ♥ Monitor da apuração        BPM 88  ☕           [Pausar]   │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │  ▁▂▅▇▅▂▁▁▂▅▇▅▂▁  (linha do líder, cor do partido)       │ │
│ │  ▁▂▄▆▄▂▁▁▂▄▆▄▂▁  (linha do segundo, cor do partido)     │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ● FLAVIO BOLSONARO 33.662.702 · 47,0%   ● LULA 32.327.723 · 45,2% │
└──────────────────────────────────────────────────────────────┘
```

- Moldura escura com tela verde-escura, grade discreta e brilho nas linhas.
- Duas linhas de ECG nas cores dos partidos; a do líder fica mais alta e mais espessa.
- “BPM” é simbólico (ritmo da apuração), acompanhado de um ícone de café; não é medida médica.
- Leitura textual abaixo: nome, partido, votos e percentual dos dois candidatos.

### 7.2 Movimento

- Cada linha rola horizontalmente em 1,4 s por ciclo, sem saltos.
- `g = sinal(d)·ln(1+|d|)/ln(1+V)`; a distância vertical entre as linhas é `2 × (4 + 16 × min(1, 12×|g|))` px na tela (8 a 40 px).
- A linha do líder fica acima; a do segundo, abaixo. Empate: as duas ficam na mesma altura.
- Ao inverter a liderança de forma sustentada, o selo **“PULSO!”** aparece por 1,6 s e as linhas trocam de altura com transição de 600 ms.
- Sem “linha reta”/flatline em nenhum momento.

### 7.3 Fim da apuração

- As linhas desaceleram e um coração na cor do vencedor é desenhado no centro da tela, com “<nome> venceu”.
- A cena roda uma vez por aba (`sessionStorage` `pulso:final-scene:{pleito}:{cargo}`); “Rever cena” fica disponível.
- Texto neutro: “venceu”, nunca “derrotou”.

### 7.4 Controles e acessibilidade

- Botão **Pausar/Retomar** congela a rolagem e o brilho; preferência em `localStorage` (`pulso:paused`), sem cookie.
- `prefers-reduced-motion`: linhas estáticas, sem rolagem, sem pulso do coração e sem selo animado; os números continuam visíveis.
- O bloco tem `role="img"` com descrição (“monitor com duas linhas; a mais alta é a do líder”).
- `aria-live` anuncia a inversão e o resultado (máx. 1/10 s).
- Os mesmos dados estão nos readouts e na tabela alternativa.

### 7.5 Offline e reconexão

- Offline congela as linhas; ao reconectar, uma única atualização e reancoragem suave, sem reproduzir inversões perdidas.
- Erro de fonte mantém a última tela e o selo de frescor; nunca inventa batimento.

## 8. Microcopy (D-038)

| Situação | Texto |
|---|---|
| Sem votos | "Aguardando o primeiro boletim de urna." |
| Sem dado | "Sem dados para este cargo neste estado." |
| Não aplicável | "Este cargo não existe em <escopo>. Nada a apurar aqui." |
| Sem líder elegível | "Aguardando definição judicial. Há <N> votos válidos e nenhum candidato elegível no momento." |
| Retificado | "Dados retificados pelo TSE às <hh:mm>. O total oficial substituiu o anterior." |
| Arquivado | "Pleito arquivado. Estes são os resultados finais publicados pelo TSE." |
| Desatualizado | "Dados de 20/10/2026, 18h42. A fonte não respondeu na última tentativa." |
| Fonte sem atualização | "A fonte não publica um arquivo novo há <X> min. Estes são os dados de 20/10/2026, 18h42." |
| Fonte fora | "Não foi possível consultar o TSE agora. Mostrando os últimos dados disponíveis." |
| Offline | "Você está offline. Mostrando os últimos dados de 20/10/2026, 18h42." |
| Empate | "Empate entre os candidatos." |
| Disputa acirrada | "Disputa acirrada: diferença de <N> votos. A cor é mantida até confirmação." |
| Fim | "Apuração encerrada em 20/10/2026, 21h15. PL venceu em São Paulo." |
| Virada | "Virada: Flavio Bolsonaro assume a liderança." |
| Monitor reiniciado | "A leitura recomeçou: <A> e <B>." |
| Município fora do pleito | "Município não participa deste pleito." |
| Geometria indisponível | "Geometria indisponível para este município. Os votos estão na tabela." |
| 2º turno | "O 2º turno começa em 25/10/2026." |
| Não oficial | "Este site não é um serviço oficial do TSE." |

- Todo texto acima vem de um único módulo de microcopy, com chaves estáveis (ex.: `nao_aplicavel`, `monitor_reiniciado`); não há string solta em componente.
- Texto de estado especial sempre cita o escopo quando houver ambiguidade ("neste estado", "em São Paulo") e nunca substitui a hora do dado.

### 8.1 Tom e palavras proibidas (D-034)

- **Proibidas**, em qualquer texto da tela, do monitor e da cena final: "derrotou", "arrasou", "humilhou", "esmagou", "vexame", "fraude", "roubo" e sinônimos diretos de humilhação.
- **Permitidas**: "venceu", "assume a liderança", "disputa acirrada", "empate", "apuração encerrada".
- **Tratamento simétrico**: os dois candidatos têm o mesmo tamanho de tipografia, a mesma saturação e a mesma posição de destaque; o perdedor não é dessaturado, não encolhe, não desaparece e não cai. A única distinção visual é a que uma regra prevê (líder por votos, empate, indisponível).
- Sem ironia, sem adjetivo que qualifique candidato, partido ou resultado, sem som e sem imagem de candidato (RN-033).
- Verificação: teste unitário varre o módulo de microcopy e falha ao encontrar termo da lista; a revisão editorial assina o checklist de neutralidade no PR (AT-023).

## 9. Responsividade

| Breakpoint | Comportamento |
|---|---|
| < 480 px | Mapa 1:1; chips em scroll; painel em sheet; monitor recolhível; busca em largura total |
| 480–1023 px | Mapa 4:3; painel em sheet; legenda em 2 linhas |
| ≥ 1024 px | Mapa 16:10; painel lateral 400 px; monitor visível; legenda em 1 linha |

## 10. Impressão

- `@media print`: esconde busca, chips, monitor e botões; mostra mapa + tabela + fonte/hora.
- A tabela é sempre impressa completa para o escopo atual.

## 11. Atribuição no HTML estático (D-039)

- Toda rota — `/br`, `/br/{uf}`, `/br/{uf}/{slug}`, inclusive `404` e deep link — entrega, no **HTML inicial**, fora do React: "Fonte: Tribunal Superior Eleitoral" com link e "Este site não é um serviço oficial do TSE.".
- O bloco é visível sem JavaScript, aparece no `view-source`/`curl` e não depende de hidratação; não pode ser inserido só no cliente nem ficar em `<template>`.
- No mobile ele pode ocupar duas linhas, mas nunca é movido para fora do `<footer>` nem ocultado por CSS.
- O horário no bloco estático é rotulado como **"última atualização disponível"** com `<time datetime>`; a hidratação atualiza para o snapshot corrente. Sem JS, nunca aparece "ao vivo".
- A atribuição do bloco estático é a mesma do §8 e do DESIGN §8: uma única fonte de texto, sem variação por rota.
- Complemento em `<noscript>`: lista de estados com links e aviso de que o mapa interativo precisa de JavaScript (RF-044).
- Verificação: teste lê a resposta HTTP bruta (sem executar JS) e exige os dois textos em cada rota; axe roda também com JavaScript desligado (AT-027).
