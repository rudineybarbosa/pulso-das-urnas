# 07 — UX, mapa e animações

Especificação de tela em estados, interações e movimento. Tokens visuais em [DESIGN.md](../../DESIGN.md).

## 1. Estados da tela

| Estado | Condição | O que o usuário vê |
|---|---|---|
| **Carregando inicial** | Primeira carga | Esqueleto do mapa (contorno cinza-claro) + "Buscando os dados do TSE…"; sem spinner central |
| **Sem votos** | `p = 0` e `tf = n` | Todos os estados brancos; faixa "Aguardando o primeiro boletim de urna"; corrida parada na largada |
| **Parcial** | `0 < p < 100` | Estados coloridos conforme líder; relógio e "% apurado" avançando; corrida em movimento |
| **Finalizado** | `tf = s` em todos | Selo verde "Apuração encerrada"; corrida conclui a cena final |
| **Empate** | RN-008 | Estado hachurado; legenda "Empate"; cavalos lado a lado |
| **Sem dado** | `null` | Estado cinza; tooltip "Sem dados para este cargo" |
| **Desatualizado** | RN-013 | Faixa âmbar "Dados de hh:mm — a fonte não respondeu na última tentativa"; números mantidos |
| **Fonte indisponível** | > 10 min sem sucesso | Faixa vermelha com "Tentar novamente"; último snapshot preservado |
| **2º turno não iniciado** | arquivos zerados | "2º turno começa em 25/10"; sem colorir por voto zero (cinza claro) |
| **Erro de escopo** | 404 | Cartão "Não encontramos esse município" + botão "Buscar cidade" |
| **Offline** | `navigator.onLine = false` | Faixa "Você está offline. Mostrando os últimos dados." |

Regra: nenhum estado troca números por placeholder. Se há número, ele tem hora.

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
  - Símbolos: branco "sem voto", cinza "sem dado", hachura "empate".
- Botão "Ver todos os partidos" abre lista completa.
- A legenda é um `<ul>` com texto, não depende de cor.

### 4.5 Voltar
- Botão acima do mapa, à esquerda, com ícone ← e texto **"Voltar"**.
- Aparece em qualquer nível abaixo do Brasil, com animação de entrada de 160 ms.
- `aria-label`: "Voltar para o estado de São Paulo" ou "Voltar para o mapa do Brasil".

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

### Conteúdo por candidato
- Linha: `[barra] Nome de urna  ·  22 PL        56.104.503  47,0%`
- Líder: rótulo "1º" e barra mais espessa (6 px); demais 4 px.
- Situação: `Eleito` (verde), `2º turno` (azul), `Não eleito` (neutro).
- Candidato com `dvt` ≠ Válido: agrupado em "Votos não computados para liderança", com o motivo.
- Toque na linha expande detalhes (nome completo, vice/suplentes).

### Ordem e empate
- Ordem por votos (RN-026). Empate exato: mesma posição visual + selo "Empate".
- Nunca reordenar com animação brusca: usar transição de posição de 240 ms (`transform`).

## 6. Tabela alternativa

- `<details>` "Ver dados em tabela", fechado por padrão, logo abaixo da legenda.
- Colunas: Escopo, Líder, Partido, Votos, % dos válidos, % apurado, Status.
- Uma linha por estado (Brasil) ou por município (estado) ou por candidato (painel).
- `<caption>` descreve o recorte e a hora do dado.

## 7. Rodapé dos cavalinhos

### 7.1 Composição
```
┌──────────────────────────────────────────────────────────────────────┐
│ Apuração: 87,4%          PL · Flavio Bolsonaro        PT · ...       │
│  🐎━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🏁   │
│  🐎━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🏁   │
│  56.104.503 · 47,0%                          49.998.112 · 41,8%      │
└──────────────────────────────────────────────────────────────────────┘
```
- Duas raias de 56 px; pista com linha de chegada listrada à direita.
- Cavalo: SVG original, vista lateral, sem jóquei, sem chicote, sem ferradura destacada; crina e cauda com movimento leve; manta e número na cor do partido.
- Nome/partido em texto acima de cada raia (para leitor de tela e para quem não distingue cor).
- Números em `tabular-nums` abaixo de cada raia, atualizados sem animação de contagem (evita "roleta").

### 7.2 Movimento
- Avanço = % de seções apuradas (RN-015); separação = diferença normalizada.
- Galope: ciclo de 4 patas em 0,8 s, com `transform` apenas; poeira a cada 2 ciclos.
- Suavização por mola (250 ms); sem saltos.
- Se `p` não muda, o cavalo continua galopando no lugar (sensação de corrida), mas não avança.
- A pista tem `role="img"` e `aria-label` resumindo a corrida; a cada mudança relevante, `aria-live` anuncia (máx. 1/10 s).

### 7.3 Ultrapassagem
- Gatilho: RN-016.
- Balão de quadrinho branco, borda `--ink`, rabicho apontando para o cavalo, texto **"Relincho!"** (peso 700, 14 px).
- Entrada 320 ms (escala 0,8 → 1, `ease-out`), permanência 900 ms, saída 200 ms.
- Posição: acima da raia do cavalo que assumiu a frente, deslocado para trás para não cobrir a linha de chegada.
- Sem som. Sem partículas agressivas. Sem texto dirigido a pessoas.
- `aria-live="polite"`: "Virada: <nome> assume a liderança."

### 7.4 Cena final (2,4 s)
| Tempo | Ação |
|---|---|
| 0,0–0,4 s | Cavalos desaceleram até a linha de chegada; poeira assenta |
| 0,4–1,0 s | Vencedor vira a cabeça para o perdedor e inclina o corpo |
| 1,0–1,6 s | Lambida carinhosa (língua e cabeça, 2 ciclos suaves); perdedor baixa a cabeça |
| 1,6–2,2 s | Perdedor dobra as patas e deita de lado, sem impacto; vencedor permanece ao lado |
| 2,2–2,4 s | Três corações sobem e desaparecem; legenda "Apuração encerrada" |
- Texto neutro: "Apuração encerrada. <Candidato> venceu." (sem "derrotou").
- Uma única execução por sessão/cargo; botão "Rever cena" no rodapé.
- Com `prefers-reduced-motion`: sem cena; mostra o resultado em texto e um ícone estático de coração.

### 7.5 Controles
- `Pausar animação` / `Retomar` (ícone + texto), persistido em `localStorage`.
- Em mobile, o rodapé pode ser recolhido para 56 px ("Mostrar corrida").
- A pista nunca cobre a busca nem o mapa; é `position: sticky` no fim do conteúdo, não fixa sobre o mapa.

## 8. Microcopy

| Situação | Texto |
|---|---|
| Sem votos | "Aguardando o primeiro boletim de urna." |
| Sem dado | "Sem dados para este cargo neste estado." |
| Desatualizado | "Dados de 20/10/2026, 18h42. A fonte não respondeu na última tentativa." |
| Fonte fora | "Não foi possível consultar o TSE agora. Mostrando os últimos dados disponíveis." |
| Empate | "Empate entre os candidatos." |
| Fim | "Apuração encerrada em 20/10/2026, 21h15. PL venceu em São Paulo." |
| Virada | "Virada: Flavio Bolsonaro assume a liderança." |
| 2º turno | "O 2º turno começa em 25/10/2026." |
| Não oficial | "Este site não é um serviço oficial do TSE." |

## 9. Responsividade

| Breakpoint | Comportamento |
|---|---|
| < 480 px | Mapa 1:1; chips em scroll; painel em sheet; corrida recolhível; busca em largura total |
| 480–1023 px | Mapa 4:3; painel em sheet; legenda em 2 linhas |
| ≥ 1024 px | Mapa 16:10; painel lateral 400 px; corrida visível; legenda em 1 linha |

## 10. Impressão

- `@media print`: esconde busca, chips, corrida e botões; mostra mapa + tabela + fonte/hora.
- A tabela é sempre impressa completa para o escopo atual.
