# 04 — Regras de negócio

Regras normativas. Toda implementação cita o ID. Fórmulas são executáveis como estão escritas.

## Catálogo e escopo

### RN-001 — Fonte do catálogo
O catálogo de pleitos, turnos, abrangências e cargos vem exclusivamente de `oficial/comum/config/ele-c.json`. Nenhuma lista de cargos, pleitos ou UFs é codificada à mão, exceto a hierarquia de RN-005 e a tabela de cores de RN-023.

### RN-002 — Pleito padrão
1. Se houver um turno com `0 < p < 100` ou (`p = 100` e `tf` falso), escolha-o.
2. Senão, o turno mais recente com `p > 0`.
3. Senão, o turno mais recente do catálogo por `data`.
Empate de data: maior `codigo` de eleição.

### RN-003 — Estado do turno
- `nao_iniciada`: nenhum arquivo coletado com `p > 0` e `tf` falso.
- `em_apuracao`: algum arquivo com `0 < p` e `tf` falso.
- `finalizada`: todos os arquivos ativos com `tf = s`.

### RN-004 — Cargos por escopo
- País: cargos cuja abrangência no catálogo é `br`.
- UF: cargos da eleição estadual aplicáveis à UF mais os cargos nacionais. `Deputado Distrital` só no DF; `Deputado Estadual` nos demais.
- Município: os cargos da UF; em eleição municipal, `Prefeito` e `Vereador`.
- Cargo `tp = 3` (consulta popular) NÃO participa do mapa nem da corrida; aparece apenas na lista de pleitos.

### RN-005 — Hierarquia de cargos
Ordena o "maior cargo em disputa". Quanto menor o peso, maior o cargo:

| Peso | Cargo | Código TSE |
|---|---|---|
| 10 | Presidente | 1 |
| 20 | Governador | 3 |
| 30 | Senador | 5 |
| 40 | Deputado Federal | 6 |
| 50 | Deputado Estadual | 7 |
| 51 | Deputado Distrital | 8 |
| 60 | Prefeito | 11 |
| 70 | Vereador | 13 |
| 80 | Conselheiro Distrital | 25 |

Cargo fora da tabela: peso 90, ordenado por nome. O cargo em destaque é o de menor peso presente no escopo na eleição ativa.

### RN-006 — Cor do estado
```
cor(uf) = corDoPartido(lider(uf, cargoEmDestaque(uf)))
```
- Sem voto válido no cargo em destaque → branco (`--map-empty`).
- Sem arquivo/dado para o par (uf, cargo) → cinza (`--map-nodata`).
- Empate → hachura neutra.
- A cor NUNCA é calculada a partir de um cargo menor quando o maior existe, mesmo que o menor tenha mais votos.

### RN-007 — Definição de líder
Líder é o candidato com maior `vap` entre os candidatos elegíveis para liderança (RN-021), no escopo e cargo.
- Desempate: maior `vap`; depois nome de urna (`localeCompare("pt-BR")`); depois número.
- O líder de um estado no cargo "Presidente" é calculado no arquivo da UF, não no arquivo nacional.
- O líder nacional é calculado no arquivo `br`.

### RN-008 — Empate
Empate exato: dois ou mais candidatos elegíveis com o mesmo `vap` máximo.
- Estado: hachura diagonal 45° (`--map-border` sobre branco), rótulo "Empate".
- Painel: candidatos empatados na mesma posição, com a marca "Empate".
- A corrida mostra os dois cavalos lado a lado (`g = 0`).

### RN-009 — Fallback entre turnos
Se o escopo não tiver o cargo em destaque no turno vigente:
1. usar o resultado final do mesmo cargo e escopo no turno anterior do mesmo pleito;
2. se não houver, usar o resultado final do mesmo cargo no pleito anterior mais recente;
3. se não houver, tratar como `sem dado`.
O detalhe DEVE indicar a origem ("1º turno", "eleição de 2024"). O selo de frescor continua sendo o do snapshot usado.

### RN-010 — Percentual e base
- Base padrão: `v.vv` (votos válidos oficiais do escopo/cargo), quando presente no arquivo.
- Se `v.vv` não existir, `votosValidosEscopo = soma(vap dos candidatos com dvt = Válido) + votos de legenda válidos`, e a tela rotula "calculado".
- `share(candidato) = vap / votosValidosEscopo × 100`.
- Se o arquivo trouxer `pvap` oficial, usar `pvap` e exibir a base como "percentual oficial do TSE".
- Arredondar só na apresentação (1 casa). A soma exibida pode variar até 0,1 p.p.; não "corrigir" o último candidato.
- Nunca calcular percentual sobre votos totais (que incluem brancos/nulos) sem rotular.

### RN-011 — Busca
Normalização: `NFD` → remover diacríticos → minúsculas → remover pontuação → colapsar espaços.
- Aceitar sigla de UF com 2 letras (case-insensitive) e nome do estado.
- Municípios: prefixo mínimo de 2 caracteres; máximo 10 sugestões.
- Ordem: igualdade exata > prefixo > contém; dentro do grupo, estado antes de município, depois alfabética.
- Homônimos sempre com UF.
- A busca nunca dispara requisição por caractere: debounce de 150 ms e cache local do catálogo (5.570 municípios, ~250 KB gzip; carregado sob demanda na primeira busca).

## Atualização

### RN-012 — Cadência
| Situação | Coleta no servidor | Atualização no cliente |
|---|---|---|
| Janela eleitoral (17h–23h59 do `pl[].dt` do pleito) | 10 s | 5 s |
| Apuração em andamento fora da janela | 30 s | 15 s |
| Apuração finalizada | 30 min | 60 s |
| Sem pleito ativo | 6 h | 5 min |

- Aba oculta: suspender o polling do cliente; ao voltar, atualizar imediatamente.
- Requisições condicionais obrigatórias (`If-None-Match`); `304` não conta como erro.
- Jitter de ±20% para evitar sincronia de clientes.

### RN-013 — Frescor
- `idade = agora − source.collectedAt`.
- `ao_vivo`: idade ≤ 90 s durante apuração.
- `desatualizado`: 90 s < idade ≤ 10 min.
- `fonte_indisponivel`: idade > 10 min durante apuração, ou > 6 h após finalizada.
- Após `finalizada`, `ao_vivo` vira `finalizado` e o selo mostra a data/hora do encerramento.
- O horário exibido é o **do TSE** (`dg`/`hg`), com o da coleta em tooltip.

### RN-014 — Fim da apuração
Um cargo/escopo está finalizado quando `tf = s` e `s.pst ≥ 99,99`.
O pleito está finalizado quando todos os pares (escopo, cargo) ativos estão finalizados.
Fallback: se `p = 100` em todos os escopos e nenhum `idg` novo por 3 ciclos consecutivos (≥ 30 s), marcar `finalizado_por_estabilidade` e registrar no log.
A cena final só ocorre com `finalizado` ou `finalizado_por_estabilidade`.

### RN-015 — Geometria da corrida
A corrida acompanha **dois candidatos fixos** (A e B), escolhidos no primeiro snapshot da sessão entre os dois mais votados do maior cargo nacional. A dupla não troca de identidade durante a sessão; se uma retificação mudar os dois primeiros, a pista reinicia com a nova dupla e anuncia o motivo.

```
p = clamp(s.pst / 100, 0, 1)                  // progresso da apuração
V = votos válidos do cargo no escopo nacional  // se V = 0, pista vazia
d = votos(A) − votos(B)                        // com sinal
g = sinal(d) × ln(1 + |d|) / ln(1 + V)         // g ∈ (−1, 1)
largura útil L = 100% − 2 × margem − larguraCavalo
xBase = margem + p × L
separação = 14% × L × |g|
xA = xBase + (separação/2) × sinal(d)
xB = xBase − (separação/2) × sinal(d)
```

- `margem = 8%`, `larguraCavalo = 12%` da pista.
- Suavização: interpolação exponencial com constante de tempo 250 ms; atualização no máximo a 10 Hz; `transform: translate3d`.
- Limites: `x ∈ [margem, margem + L]`. Se um cavalo encostar no limite, a separação comprime, mantendo a ordem.
- `g` é recalculado a cada snapshot; nunca é usado dado de escopo diferente do nacional do cargo.
- O cavalo que está à frente é sempre o de maior votação; a inversão do sinal de `d` é o que caracteriza a ultrapassagem.

### RN-016 — Ultrapassagem
Há ultrapassagem quando:
1. `sinal(g)` muda em relação ao snapshot anterior; e
2. `|g| ≥ 0,01` em dois snapshots consecutivos (≥ 5 s de intervalo); e
3. passaram ao menos 20 s desde a última ultrapassagem do mesmo par.
Efeito: balão "Relincho!" no cavalo que assumiu a frente por até 1,2 s; nenhum som; `aria-live` anuncia "Virada: <nome> assume a liderança".
Histerese impede piscar quando a diferença oscila perto de zero.

### RN-017 — Monotonicidade dos votos
Votos por candidato não podem diminuir entre snapshots da mesma eleição, exceto quando o TSE publica nova geração com retificação.
- Variação negativa ≤ 0,5%: aceitar, registrar `vote_regression` e manter o novo valor.
- Variação negativa > 0,5%: aceitar (o dado oficial prevalece), marcar o snapshot como `retificado` e exibir "dados retificados pelo TSE" por 1 h.
- Nunca exibir número negativo.

### RN-018 — Identidade do município
- Chave canônica: código IBGE de 7 dígitos (`cdi`), presente em `mun-e*.json`.
- Para montar o caminho do arquivo do TSE, usar o código TSE de 5 dígitos (`cd`) com zero à esquerda quando necessário.
- A URL pública usa o slug do município (`/br/sp/sao-paulo`) e aceita o código IBGE (`/br/sp/3550308`), redirecionando 301 para o slug canônico.
- O município pertence a exatamente uma UF; a UF vem do catálogo, nunca do texto da URL.

### RN-019 — Escopo do arquivo TSE
| Escopo | `tpabr` | Caminho |
|---|---|---|
| País | `br` | `dados/br/br-c{cc}-e{eeeeee}-u.json` |
| UF | `uf` | `dados/{uf}/{uf}-c{cc}-e{eeeeee}-u.json` |
| Município | `mu` | `dados/{uf}/{uf}{mmmmm}-c{cc}-e{eeeeee}-u.json` |

`cc` com 4 dígitos, `eeeeee` com 6, `mmmmm` com 5.

### RN-020 — Composição dos votos
- Usar os totais oficiais do arquivo quando existirem: `v.vv` (válidos), `v.vnom` (nominais), `v.vb` (legenda), `v.vvc` (comparecimento), `v.tvn` (total de votos), `v.vn` (nulos).
- Nunca somar por conta própria quando o total oficial existir.
- `comparecimento = e.c`, `abstenção = e.a`, `eleitorado = e.te`.
- Se um total oficial não existir, calcular pela soma e rotular "calculado".
- Brancos e nulos não entram na base de percentual de candidato (RN-010).

### RN-021 — Elegibilidade para liderança
Só define líder o candidato com `dvt = "Válido"`.
- `Anulado`, `Anulado sub judice` e `Válido (legenda)` não definem líder.
- Votos de legenda entram no total de válidos, mas não elegem líder sozinhos.
- Se todos os candidatos forem inelegíveis para liderança e houver votos válidos, o estado usa `--map-nodata` com rótulo "Aguardando definição judicial".

### RN-022 — Partido do candidato
A cor vem do partido do candidato (`par.sg` do partido ao qual o candidato pertence), não da coligação nem da federação.
- Em `agr` do tipo coligação, percorrer `par[]` e usar a sigla do partido do candidato.
- Federação: usar o partido do candidato; a federação aparece como texto secundário.

### RN-023 — Cores partidárias
- Tabela canônica `data/party-colors.json`, com `sigla`, `nome`, `hex`, `fonte`, `revisadoEm`.
- Sigla ausente: hash FNV-1a de 32 bits da sigla `% 12` em uma paleta fixa de 12 matizes; registrar em `build/fallback-colors.json`.
- A cor de uma sigla é estável entre pleitos, escopos e sessões.
- Nunca usar branco, cinza de "sem dado" ou a cor de foco como cor de partido.

### RN-024 — Contraste
Para cada cor de partido, calcular a luminância relativa WCAG e escolher texto `#0B1220` ou `#FFFFFF`, o que tiver maior contraste, exigindo ≥ 4,5:1. Se nenhum atingir, escurecer/clarear a cor em passos de 5% até atingir e registrar o ajuste. O build falha se alguma cor não puder atingir 4,5:1.

### RN-025 — Formatação
- Números: `Intl.NumberFormat("pt-BR")` (ponto de milhar, sem decimais para votos).
- Percentual: 1 casa, vírgula decimal; `%` separado por espaço fino.
- Horário: `HH:mm:ss`; data: `dd/MM/yyyy`.
- Fuso: `America/Sao_Paulo`; ISO com offset `-03:00` na API.
- Nome de urna sempre que existir; nome completo só no detalhe.

### RN-026 — Ordenação determinística
Candidatos: votos válidos desc → nome de urna (`localeCompare pt-BR`) → número asc → `sqcand`.
Estados: ordem oficial do IBGE (Norte, Nordeste, Sudeste, Sul, Centro-Oeste; alfabética dentro da região).
Municípios: nome (`localeCompare pt-BR`) → código IBGE.

### RN-027 — Idempotência da ingestão
Chave de snapshot: `(ciclo, eleicao, escopo, cargo, idg)`.
- Mesma chave: não regravar; apenas atualizar `lastSeenAt`.
- Chave nova: gravar snapshot imutável e avançar o ponteiro `current`.
- Gravação é atômica: o ponteiro só muda depois do snapshot completo e validado por schema.

### RN-028 — Dado ausente ≠ zero
- `null` = não há informação (cinza, "Sem dados").
- `0` = há informação e nenhum voto (branco, "Aguardando o primeiro boletim").
- A API NUNCA converte `null` em `0` nem omite campo por ausência.

### RN-029 — Vices e suplentes
- Majoritário: exibir vice(s) de `vs[]` com `tp` correspondente.
- Senador: exibir suplentes.
- A ausência de vice não invalida o candidato.

### RN-030 — Segundo turno
- O turno 2 é uma eleição própria (`cdt2`), com apenas os cargos e estados em disputa.
- Antes do início, os arquivos existem com `vap = 0` e `tf = n`; exibir "2º turno ainda não iniciado", não "0 votos".
- Candidatos do 2º turno são os que constam no arquivo do 2º turno; não inferir do 1º.

### RN-031 — Eleições suplementares
Pleitos suplementares (ex.: 6282–6284) são municipais: escopo cidade, cargos Prefeito/Vereador, e aparecem no seletor com o nome do município. Não alteram a coloração nacional.

### RN-032 — Limites e cortesia com a fonte
- Máximo 5 requisições/s ao domínio do TSE, concorrência 4, por instância.
- Sempre condicional (`If-None-Match`); cache local do corpo por `idg`.
- Backoff exponencial 1, 2, 4, 8, 16 s em 429/5xx, respeitando `Retry-After`.
- Circuit breaker: 5 falhas consecutivas → pausa 60 s → tentativa única; se falhar, 5 min.
- User-Agent identificável com URL do projeto e contato.

### RN-033 — Neutralidade editorial
- Nenhum adjetivo qualifica candidato, partido ou resultado ("histórico", "esmagador", "surpreendente").
- Ordem sempre por votos; nenhum destaque visual além do líder por regra.
- A cena final trata os dois cavalos com afeto; o perdedor não é humilhado, não cai de mau jeito, não perde cor.
- Sem imagens de candidatos na v1.
- Textos de virada e encerramento são revisados contra esta regra antes do merge.

### RN-034 — Rastreabilidade do número
Todo número exibido carrega na API: `source.generationId`, `source.generatedAt`, `source.url` e `count.percent`. A tela pode esconder detalhes, mas o dado tem que estar disponível no HTML/semântica e na tabela.
