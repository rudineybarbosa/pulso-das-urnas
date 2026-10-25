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
- Cargo `tp = 3` (consulta popular) NÃO participa do mapa nem do monitor; aparece apenas na lista de pleitos.

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

A tabela é exaustiva. Cargo fora dela: peso 90, ordenado por `nmn` (`localeCompare("pt-BR")`, asc). Cargo `tp = 3` (consulta popular) NÃO entra na hierarquia: não é mapa, monitor nem destaque (RN-004). O cargo em destaque é o de menor peso presente no escopo na eleição ativa.

### RN-006 — Cor do estado
"Cor do estado" é o **preenchimento** do polígono com a cor do partido do líder do cargo em destaque (RN-022). Não existe cor de identidade por estado; nenhuma UF tem cor fixa.

```
cor(uf) = corDoPartido(lider(uf, cargoEmDestaque(uf)))
```

- Sem líder, o preenchimento e o rótulo seguem o estado de ausência de RN-035 (`sem_voto`, `sem_dado`, `nao_aplicavel`, `sem_lider_elegivel`). `retificado` é flag acumulável: não troca o preenchimento.
- Empate → hachura neutra (RN-008).
- A cor NUNCA é calculada a partir de um cargo menor quando o maior existe, mesmo que o menor tenha mais votos — e NÃO muda quando o usuário seleciona outro cargo nos chips; a seleção altera painel, tabela e legenda, não o preenchimento do mapa.
- A troca de cor obedece à histerese de RN-038: no máximo 1 mudança a cada 10 s, liderança nova só com margem sustentada por 2 snapshots; abaixo disso o detalhe marca "disputa acirrada".
- Erro ou atraso da fonte NUNCA troca a cor: mantém o último snapshot e aplica o selo de frescor de RN-039.

### RN-007 — Definição de líder
Líder é o candidato com maior `vap` entre os candidatos elegíveis para liderança (RN-021), no escopo e cargo.
- Desempate: maior `vap`; depois nome de urna (`localeCompare("pt-BR")`); depois número.
- O líder de um estado no cargo "Presidente" é calculado no arquivo da UF, não no arquivo nacional.
- O líder nacional é calculado no arquivo `br`.

### RN-008 — Empate
Empate exato: dois ou mais candidatos elegíveis com o mesmo `vap` máximo.
- Estado: hachura diagonal 45° (`--map-border` sobre branco), rótulo "Empate".
- Painel: candidatos empatados na mesma posição, com a marca "Empate".
- O monitor mostra as duas linhas na mesma altura (`g = 0`).

### RN-009 — Fallback entre turnos e gerações
Se o escopo não tiver o cargo em destaque no turno vigente:
1. usar o resultado final do mesmo cargo e escopo no turno anterior do mesmo pleito;
2. se não houver, usar o resultado final do mesmo cargo no pleito anterior mais recente;
3. se o cargo se aplica ao escopo/turno mas o arquivo ainda não existe, o estado é `sem_dado` (RN-035);
4. se o cargo não existe no escopo/turno e não há fallback, o estado é `nao_aplicavel` (RN-035).

Todo snapshot servido por fallback carrega `origem: { pleito, turno, generationId, generatedAt }` (D-018). A tela mostra o selo "1º turno" (ou "eleição de 2024") com tooltip da origem, sem esconder o horário do snapshot atual. O selo de frescor continua sendo o do snapshot usado.

2º turno (RN-030): estados com disputa usam o arquivo do turno vigente; estados sem disputa usam o resultado final do turno anterior com o selo "1º turno". O monitor nacional usa apenas Presidente do turno vigente.

### RN-010 — Percentual, base e rótulo
Base única por tela, declarada pela API em `percentualBase`:
- `oficial_validos`: `v.vv` (votos válidos oficiais do escopo/cargo) existe e é a base.
- `calculado_validos`: `v.vv` ausente; a base é `soma(vap dos candidatos com dvt = Válido) + votos de legenda válidos`, rotulada "calculado".
- `share(candidato) = vap / base × 100`.
- Se o candidato trouxer `pvap` oficial, `pvap` prevalece e o rótulo é "percentual oficial do TSE" (`calculado: false`).
- Nunca misturar bases na mesma tela nem recalcular total oficial (RN-020). A API expõe `calculado: true | false`.
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

- A ingestão de 2026 é ativada em **25/10/2026 às 16:55** (`America/Sao_Paulo`) e desativada em **26/10/2026 às 00:00**; por causa da precisão mínima de um minuto do Cloud Scheduler, o primeiro disparo ocorre às **16:56**, sem invocações do Scheduler antes da ativação. A janela de coleta de resultados começa às 17h. O job valida a data para não repetir a coleta em 25/10 de anos seguintes.
- Aba oculta: suspender o polling do cliente; ao voltar, atualizar imediatamente.
- Requisições condicionais obrigatórias (`If-None-Match`); `304` não conta como erro.
- Jitter de ±20% para evitar sincronia de clientes.
- Teto de cache das respostas de resultado: durante a apuração `s-maxage + stale-while-revalidate + stale-if-error ≤ 30 s`; após `finalizada`, até 6 h (RN-040).

### RN-013 — Frescor
Três idades independentes, calculadas no servidor e expostas na API (RN-039):
- `sourceAge = agora − fonte.generatedAt` — geração do TSE (`dg`/`hg`/`idg`).
- `collectedAge = agora − fonte.collectedAt` — nossa última coleta bem-sucedida.
- `snapshotAge = agora − snapshot.gravadoEm` — idade do objeto imutável servido.

O estado de frescor é derivado de RN-039. Regras de apresentação:
- "Ao vivo" exige `collectedAge ≤ 90 s` **e** `sourceAge ≤ 5 min` durante a apuração.
- Coleta fresca de arquivo parado → "Fonte sem atualização há X" (âmbar), nunca "ao vivo".
- Após `finalizada`, `ao_vivo` vira `finalizado` e o selo mostra a data/hora do encerramento.
- O horário exibido é o **do TSE** (`dg`/`hg`), com o da coleta em tooltip.
- Erro ou atraso da fonte NÃO zera número nem troca cor: mantém o último snapshot e aplica `fonte_sem_atualizacao`/`fonte_indisponivel` (RN-039).

### RN-014 — Fim da apuração
Um cargo/escopo está finalizado quando `tf = s` e `s.pst ≥ 99,99`.
O pleito está finalizado quando todos os pares (escopo, cargo) ativos estão finalizados.
`finalizado_por_estabilidade` exige, cumulativamente:
1. `p = 100` em todos os escopos ativos;
2. 6 ciclos consecutivos sem `idg` novo (≥ 60 s);
3. ≥ 10 min desde a última mudança de `idg`.

Enquanto os três critérios não estiverem satisfeitos, o status é "aguardando confirmação" e a cena final NÃO roda.
A cena final só ocorre com `finalizado` ou `finalizado_por_estabilidade`.

### RN-015 — Geometria do monitor de pulso
O monitor acompanha **dois candidatos fixos** (A e B), escolhidos entre os dois mais votados do maior cargo nacional em disputa (RN-005).
- Desempate: `vap` desc → nome de urna (`localeCompare("pt-BR")`) → número. Determinístico (RN-026).
- A dupla é fixa na sessão. Troca só quando o **conjunto** dos dois primeiros muda por 2 snapshots consecutivos (≥ 10 s); o monitor reancora as linhas e `aria-live` anuncia "A leitura recomeçou: <A> e <B>".
- Candidato anulado ou removido no meio: recalcular o líder (RN-021); a linha afetada fica marcada "indisponível", sem disputar altura; se o conjunto mudar, aplica-se a regra dos 2 snapshots.
- `V = 0` (`sem_voto`, RN-035) → tela vazia, sem escolha de dupla e sem batimento.

```
V = votos válidos do cargo no escopo nacional
d = votos(A) − votos(B)                        // com sinal
g = sinal(d) × ln(1 + |d|) / ln(1 + V)         // g ∈ (−1, 1)
magnitude = min(1, 12 × |g|)                   // amplia a leitura visual
gap = 4 + 16 × magnitude                       // px
yLíder = centro − gap
ySegundo = centro + gap
```

- A linha do líder fica sempre acima; a distância vertical entre as linhas é `2 × gap` (8 a 40 px).
- A rolagem horizontal é decorativa e constante (1,4 s por ciclo); não representa votos.
- Transição de altura: 600 ms; atualização no máximo a 10 Hz; apenas `transform`.
- `g` é recalculado a cada snapshot; nunca é usado dado de escopo diferente do nacional do cargo.
- Empate exato: as duas linhas ficam na mesma altura (`gap = 0` visual) e o detalhe marca "Empate".

### RN-016 — Inversão de liderança
Há inversão quando:
1. `sinal(g)` muda em relação ao snapshot anterior; e
2. `|g| ≥ 0,01` em dois snapshots consecutivos (≥ 5 s de intervalo); e
3. passaram ao menos 30 s desde a última inversão do mesmo par (cooldown por par).
Oscilação abaixo de `0,01` não dispara.
Efeito: selo **"PULSO!"** por até 1,6 s e troca de altura das linhas; nenhum som; `aria-live` anuncia "Virada: <nome> assume a liderança".
Histerese impede piscar quando a diferença oscila perto de zero. Não existe linha reta/flatline em nenhum estado.

### RN-017 — Monotonicidade dos votos e retificação
Votos por candidato NÃO DEVEM diminuir entre snapshots da mesma eleição, exceto quando o TSE publica geração com retificação.
- Qualquer diminuição é aceita: o valor oficial prevalece sobre o anterior. Registrar `vote_regression` com `idg` anterior e atual.
- A geração com diminuição é marcada `retificado` (RN-035) e a tela exibe o badge "dados retificados pelo TSE" por **60 min ou até 3 gerações consecutivas sem regressão, o que durar mais**.
- A retificação não altera a definição de líder (RN-007/RN-021): o líder é recalculado sobre os valores oficiais vigentes.
- Nunca exibir número negativo nem diferença negativa; o delta mínimo apresentado é `0`.

### RN-018 — Identidade do município
- Chave canônica: código IBGE de 7 dígitos (`cdi`), presente em `mun-e*.json`.
- Para montar o caminho do arquivo do TSE, usar o código TSE de 5 dígitos (`cd`) com zero à esquerda quando necessário.
- A URL pública canônica é `/br/{uf}/{slug}` (UF minúscula, slug ASCII), regida por RN-041.
- O código IBGE na URL (`/br/sp/3550308`) é aceito e redireciona com **301** para o slug canônico.
- O município pertence a exatamente uma UF; a UF vem do catálogo, nunca do texto da URL.
- Homônimos sempre com UF. Alias antigo redireciona 301; município desconhecido → 404 com busca.

### RN-019 — Escopo do arquivo TSE
| Escopo | `tpabr` | Caminho |
|---|---|---|
| País | `br` | `dados/br/br-c{cc}-e{eeeeee}-u.json` |
| UF | `uf` | `dados/{uf}/{uf}-c{cc}-e{eeeeee}-u.json` |
| Município | `mu` | `dados/{uf}/{uf}{mmmmm}-c{cc}-e{eeeeee}-u.json` |

`cc` com 4 dígitos, `eeeeee` com 6, `mmmmm` com 5.

### RN-020 — Composição dos votos
- Usar os totais oficiais do arquivo quando existirem: `v.vv` (válidos), `v.vnom` (nominais), `v.vb` (legenda), `v.vvc` (comparecimento), `v.tvn` (total de votos), `v.vn` (nulos).
- Nunca recalcular total oficial nem somar por conta própria quando o total oficial existir.
- Derivar percentual apenas quando `pvap` não existir, rotulado "calculado"; a API expõe `calculado: true | false` (RN-010).
- `comparecimento = e.c`, `abstenção = e.a`, `eleitorado = e.te`.
- Se um total oficial não existir, calcular pela soma e rotular "calculado".
- Brancos e nulos não entram na base de percentual de candidato (RN-010).

### RN-021 — Elegibilidade para liderança
Só define líder o candidato com `dvt = "Válido"`.
- `Anulado`, `Anulado sub judice` e `Válido (legenda)` não definem líder.
- Votos de legenda entram no total de válidos, mas não elegem líder sozinhos.
- Se houver votos válidos e nenhum candidato elegível, o estado é `sem_lider_elegivel` (RN-035): cinza escuro com rótulo "Aguardando definição judicial".
- Candidato anulado ou removido no meio da apuração: recalcular o líder e aplicar RN-015 (linha "indisponível").

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

Contraste não textual: o preenchimento de um estado/município DEVE ter ≥ 3:1 contra os preenchimentos vizinhos e contra o fundo. Se a cor do partido não atingir, aplicar contorno de 1 px na cor de maior contraste (`--map-edge`) e registrar o ajuste. A hachura de empate também DEVE atingir ≥ 3:1. O mesmo teste de build valida texto (4,5:1) e elemento gráfico (3:1).

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
- `null` = não há informação; a API devolve `dados: null` e `status: "sem_dado"` ou `"nao_aplicavel"`, a tela mostra cinza e o rótulo de RN-035.
- `0` = há informação e nenhum voto; a API devolve `dados` com zeros e `status: "sem_voto"`, a tela mostra branco e "Aguardando o primeiro boletim".
- A API NUNCA converte `null` em `0` nem omite campo por ausência.
- Os cinco estados de ausência e seus preenchimentos estão em RN-035. Ausência de dado nunca é erro de fonte: erro mantém o último snapshot e usa selo de frescor (RN-039).

### RN-029 — Vices e suplentes
- Majoritário: exibir vice(s) de `vs[]` com `tp` correspondente.
- Senador: exibir suplentes.
- A ausência de vice não invalida o candidato.

### RN-030 — Segundo turno
- O turno 2 é uma eleição própria (`cdt2`), com apenas os cargos e estados em disputa.
- Antes do início, os arquivos existem com `vap = 0` e `tf = n`; exibir "2º turno ainda não iniciado", não "0 votos".
- Candidatos do 2º turno são os que constam no arquivo do 2º turno; não inferir do 1º.
- No 2º turno parcial, estados com disputa usam o arquivo do turno vigente; estados sem disputa usam o resultado final do turno anterior com o selo "1º turno" e `origem` (RN-009).
- O monitor nacional do 2º turno usa apenas Presidente do turno vigente; nenhuma linha vem do 1º turno.

### RN-031 — Eleições suplementares
Pleitos suplementares (ex.: 6282–6284) são municipais: escopo cidade, cargos Prefeito/Vereador, e aparecem no seletor com o nome do município.
- A eleição suplementar aparece apenas no seletor de pleitos e no escopo do próprio município.
- NÃO altera a cor nacional, o ranking nacional, o cargo em destaque nacional nem o monitor; seus votos não entram em nenhum agregado de UF ou país.

### RN-032 — Limites e cortesia com a fonte
- Máximo 5 requisições/s ao domínio do TSE, concorrência 4, por instância.
- Sempre condicional (`If-None-Match`); cache local do corpo por `idg`.
- Backoff exponencial 1, 2, 4, 8, 16 s em 429/5xx, respeitando `Retry-After`.
- Circuit breaker: 5 falhas consecutivas → pausa 60 s → tentativa única; se falhar, 5 min.
- User-Agent identificável com URL do projeto e contato.

### RN-033 — Neutralidade editorial
- Nenhum adjetivo qualifica candidato, partido ou resultado ("histórico", "esmagador", "surpreendente").
- Ordem sempre por votos; nenhum destaque visual além do líder por regra.
- A cena final trata os dois candidatos com afeto; o perdedor não é humilhado, não tem a linha apagada nem vira flatline, e mantém a cor do partido.
- Sem imagens de candidatos na v1.
- Textos de inversão e encerramento são revisados contra esta regra antes do merge.

### RN-034 — Rastreabilidade do número
Todo número exibido carrega na API: `source.generationId`, `source.generatedAt`, `source.url` e `count.percent`. A tela pode esconder detalhes, mas o dado tem que estar disponível no HTML/semântica e na tabela.

### RN-035 — Estados de ausência e apresentação
Cinco estados. Os quatro primeiros são mutuamente exclusivos; `retificado` é o único acumulável. "Preenchimento" é a cor sólida do polígono, nunca só a borda.

| `status` | Condição | Preenchimento | Rótulo visível e acessível |
|---|---|---|---|
| `sem_voto` | arquivo existe e `v.vv = 0` ou a soma dos válidos é `0` | branco `--map-empty` | "Aguardando o primeiro boletim" |
| `sem_dado` | o cargo se aplica ao escopo/turno e nenhum arquivo foi coletado | cinza médio `--map-nodata` | "Sem dados" |
| `nao_aplicavel` | o cargo não existe no escopo/turno e não há fallback (RN-009) | cinza claro com diagonal | "Não se aplica" |
| `sem_lider_elegivel` | `v.vv > 0` e nenhum candidato com `dvt = "Válido"` (RN-021) | cinza escuro | "Aguardando definição judicial" |
| `retificado` | geração com diminuição de votos (RN-017); acumula com os estados que têm arquivo | preenchimento do estado + selo, sem faixa âmbar | "Dados retificados pelo TSE" |

Precedência determinística (a primeira condição verdadeira vence):
1. sem arquivo: `nao_aplicavel` se o cargo não existe no escopo/turno; senão `sem_dado`;
2. arquivo com zero válido: `sem_voto` (nunca `sem_lider_elegivel`);
3. válidos > 0 e nenhum elegível: `sem_lider_elegivel`;
4. caso contrário: líder e cor de RN-006.
`retificado` é o único estado acumulável: sobrepõe 2–4 sem trocar o preenchimento.

Regras:
- O mesmo nome de `status` vale na API (`06` §3) e na tela; não criar sinônimo.
- Exceção de rótulo: 2º turno antes do início (`tf = n`, `pst = 0`) mantém `sem_voto`, mas o rótulo é "2º turno ainda não iniciado" (RN-030).
- `sem_dado`/`nao_aplicavel` NÃO são erro de fonte. Erro de fonte mantém o último snapshot e usa `desatualizado`/`fonte_indisponivel` de RN-039, que nunca trocam o preenchimento.
- Os cinco estados aparecem na tabela alternativa e no texto acessível do mapa; cor sozinha não identifica estado.

### RN-036 — Seleção e persistência de pleito, cargo e escopo
1. Ao trocar pleito ou estado, manter o cargo selecionado se ele existir no novo escopo (RN-004).
2. Se o cargo não existir no novo escopo, selecionar o cargo em destaque (RN-005) e mostrar aviso não bloqueante: "Cargo <X> não está em disputa aqui; exibindo <Y>".
3. A URL só muda por ação explícita do usuário (clique em pleito, estado, município ou cargo). Exceções normalizadas com `replaceState`, sem nova navegação: incluir/atualizar `pleito=` quando o padrão muda e remover o município que não participa do novo pleito. Nenhum redirecionamento silencioso por mudança de dado.
4. Deep link com `cargo` inválido para o escopo: redirecionar uma vez para o cargo em destaque com o mesmo aviso do item 2; nunca servir painel vazio.
5. Troca de pleito com município aberto:
   - se o município participa do novo pleito: manter a cidade aberta e recarregar os dados;
   - se não participa: fechar o painel, manter o estado selecionado, remover o município da URL e exibir toast "Município não participa deste pleito".
6. Precedência de escopo ao abrir a aplicação: URL válida > seleção da sessão > padrão de RN-002.
7. Pleito, turno, cargo e escopo são sempre validados contra o catálogo antes de consultar o TSE.

### RN-037 — Ciclo de vida do catálogo
- `catalogVersion = sha256(JSON canônico do catálogo normalizado)[0:12]`; muda quando muda o conjunto de pleitos, turnos, eleições, cargos ou abrangências.
- Catálogo inválido ou indisponível: manter a `catalogVersion` anterior e não remover nada do seletor.
- Pleito, turno ou cargo que desaparece do catálogo:
  1. por 24 h, manter o último snapshot disponível com o selo "catálogo atualizado";
  2. após 24 h, marcar `arquivado` e remover do seletor.
- Turno ou pleito novo entra automaticamente, sem deploy, e é marcado como o mais recente na ordenação do seletor.
- `catalogVersion` é registrada em todo snapshot e no log de ingestão; divergência entre catálogo e snapshot é erro de ingestão, não de tela.
- Pleito `arquivado` não é apagado do histórico enquanto o snapshot existir na retenção.

### RN-038 — Histerese da cor
A liderança só troca a cor se a nova liderança for sustentada. Seja `atual` o líder vigente e `novo` o candidato de maior `vap` elegível no snapshot:

```
margem = vap(novo) − vap(atual)
troca = validos > 0 E ((margem / validos ≥ 0,005) OU (margem ≥ 500))
```

- `validos` = votos válidos do cargo no escopo (RN-010).
- `troca` DEVE ser verdadeira em 2 snapshots consecutivos com intervalo ≥ 10 s.
- Abaixo do limiar, manter a cor e marcar "disputa acirrada" no detalhe do estado.
- Empate exato (`margem = 0`) usa hachura (RN-008), não troca de cor.
- No primeiro snapshot de um escopo não há histerese: aplica-se o líder direto.
- No máximo 1 mudança de cor por estado a cada 10 s; mudanças no mesmo ciclo são coalescidas (a última vence).
- A histerese é aplicada por `(escopo, cargo em destaque)` e não altera a ordem, o líder exibido nem o monitor.

### RN-039 — Frescor em três idades
```
sourceAge    = agora − fonte.generatedAt   // geração do TSE
collectedAge = agora − fonte.collectedAt   // nossa última coleta bem-sucedida
snapshotAge  = agora − snapshot.gravadoEm  // objeto imutável servido
```

| Estado de frescor | Condição | Apresentação |
|---|---|---|
| `ao_vivo` | apuração ativa, `collectedAge ≤ 90 s` **e** `sourceAge ≤ 5 min` | selo verde "Ao vivo"; horário do TSE |
| `fonte_sem_atualizacao` | apuração ativa, `collectedAge ≤ 90 s` e `sourceAge > 5 min` | selo âmbar "Fonte sem atualização há <X>" |
| `desatualizado` | apuração ativa, `90 s < collectedAge ≤ 10 min` | selo âmbar com o horário do snapshot |
| `fonte_indisponivel` | `collectedAge > 10 min` durante a apuração, ou `collectedAge > 6 h` após finalizada | faixa vermelha; números e cores mantidos |
| `finalizado` | apuração finalizada (RN-014) | data/hora do encerramento |

- "Ao vivo" exige as duas condições; coleta fresca de arquivo parado é `fonte_sem_atualizacao`, nunca "ao vivo".
- Após `finalizada`, `finalizado` substitui `ao_vivo`/`desatualizado`; `fonte_indisponivel` só aparece após 6 h sem coleta bem-sucedida.
- O detalhe/tooltip mostra as três idades; o selo resume a mais antiga delas.
- Frescor nunca zera número, nunca troca cor e nunca converte `sem_voto` em `sem_dado`.
- O estado de frescor é por snapshot servido; com fallback (RN-009), vale o frescor do snapshot de origem.

### RN-040 — Latência fim a fim e staleness máximo
Meta durante apuração ativa: geração do TSE → pixel com **p95 ≤ 30 s** e **mediana ≤ 15 s**.

Orçamento (soma ≈ 22 s, com 8 s de folga):

| Etapa | Orçamento |
|---|---|
| Ingestão (download + validação) | 10 s |
| Processamento e gravação | 2 s |
| Propagação de CDN | 3 s |
| Polling do cliente | 5 s |
| Render | 2 s |

Teto de staleness por resposta de resultado (panorama, escopo, município, monitor):
- durante a apuração: `s-maxage + stale-while-revalidate + stale-if-error ≤ 30 s`;
- após `finalizada`: `s-maxage + stale-while-revalidate + stale-if-error ≤ 21600` (6 h).
Toda resposta dinâmica registra `ingest_lag_seconds` e `age`; alerta quando o p95 passar de 30 s com apuração ativa. Sem medição, a meta não é considerada atendida.

### RN-041 — Canonicalização de URL de município
- Formato canônico: `/br/{uf}/{slug}`.
- `uf`: duas letras minúsculas do catálogo (`sp`, `df`), nunca por dedução do texto.
- `slug` derivado do nome oficial do município no catálogo: `NFD` → remover diacríticos → minúsculas → trocar `[^a-z0-9]+` por `-` → colapsar hífens → remover hífens das pontas → cortar em 80 caracteres.
- Código IBGE de 7 dígitos na posição do slug é aceito e redireciona **301** para o slug canônico.
- Homônimos sempre incluem UF. Alias antigo redireciona **301** direto para o canônico, em um salto.
- Código ou slug desconhecido → **404** com estado de busca (nunca página em branco).
- Redirecionamento não muda `pleito` nem `cargo` escolhidos; 301 é permanente e cacheável.

### RN-042 — Versão do parser e rollback
- `parserVersion` é semver `MAJOR.MINOR.PATCH`, registrada em todo snapshot e no envelope da API.
  - `MAJOR`: mudança incompatível de campo ou semântica; `MINOR`: campo novo ou normalização compatível; `PATCH`: correção sem mudança de contrato.
- Cada fixture do `manifest.json` registra `url`, `capturedAt`, `sha256` e a `parserVersion` que a produziu; fixture nova é obrigatória em toda mudança de formato.
- Falha de schema: NÃO gravar, NÃO avançar `current`, manter o último snapshot, registrar `parser_schema_failure` e alertar.
- Fixar parser anterior por flag (`PARSER_VERSION_PIN=<versao>`) sem novo deploy; a flag é auditada no log.
- Rollback (voltar `parserVersion`, reprocessar fixtures e republicar ponteiro) está no runbook; o rollback também mantém o último snapshot válido.
- Promoção de parser exige todas as fixtures aprovadas e comparação com a saída da versão anterior.
