# 11 — Critérios de aceite

Formato Given/When/Then. Um critério só é aceito com o teste correspondente verde e evidência anexada ao PR. "Tipo" indica o nível mínimo de teste ([10](10-testes-e-dados-falsos.md)).

## Dados e catálogo

### AT-001 — Pleitos e turnos (RF-001, RF-002 · RN-001, RN-003)
> **Dado** que a API iniciou com o catálogo de 2026
> **Quando** o cliente chama `GET /api/v1/pleitos`
> **Então** recebe os pleitos 3220 e 3221 com turnos, nomes, datas e `estado`, sem nenhuma lista fixa no código.
**Tipo:** contrato + integração. **Evidência:** saída JSON + teste com fixture `ele-c-2026-10-20.json`.

### AT-002 — Cargos por escopo (RF-003, RF-004 · RN-004)
> **Dado** o pleito 6259 no estado de São Paulo
> **Quando** o cliente consulta os cargos do escopo
> **Então** recebe Governador, Senador, Deputado Federal e Deputado Estadual, sem Deputado Distrital.
> **E** no DF, recebe Deputado Distrital e não Deputado Estadual.
**Tipo:** unitário. **Evidência:** tabela de casos em `packages/domain`.

### AT-003 — Seleção de pleito e cargo (RF-005, RF-006 · RN-002)
> **Dado** que o usuário está em `/br`
> **Quando** seleciona o cargo Governador
> **Então** o mapa repinta pela liderança de governador, a URL passa a `?cargo=3` e a corrida continua no cargo nacional mais alto.
**Tipo:** e2e. **Evidência:** teste `j03-citar.spec.ts`.

## Regra de cor

### AT-004 — Maior cargo em disputa (RF-007 · RN-005)
> **Dado** um estado com votos para Presidente e Governador
> **Quando** o líder de Presidente é do partido A e o de Governador é do partido B
> **Então** a cor do estado é a do partido A (Presidente), e o detalhe mostra o cargo em destaque.
**Tipo:** unitário. **Evidência:** caso "Presidente + governador" da tabela de regras.

### AT-005 — Panorama e legenda (RF-008, RF-019 · RN-024)
> **Dado** uma apuração parcial
> **Quando** o panorama é exibido
> **Então** os 27 estados têm cor (ou branco/cinza), a legenda lista os partidos visíveis com sigla e as três situações especiais, e tudo é legível por leitor de tela.
**Tipo:** componente + a11y. **Evidência:** screenshot e árvore de acessibilidade.

### AT-006 — Cor do líder e partido (RF-014 · RN-006, RN-007, RN-022, RN-023)
> **Dado** o arquivo real de São Paulo (presidente, 1º turno)
> **Quando** o estado é renderizado
> **Então** a cor é a do partido do candidato com maior `vap` elegível e o tooltip mostra nome, partido, votos, % e apurado.
**Tipo:** unitário + contrato. **Evidência:** golden file com o resultado esperado.

### AT-011 — Virada com histerese (RF-014, RF-015 · RN-006, RN-038)
> **Dado** um estado pintado com o líder A
> **Quando** chega um snapshot em que B está à frente por margem abaixo do limiar (menos de 0,5% dos válidos **e** menos de 500 votos)
> **Então** a cor permanece a de A, o detalhe marca "Disputa acirrada: diferença de <N> votos" e nada é anunciado.
> **E** quando B supera A em ≥ 0,5% dos válidos **ou** ≥ 500 votos (basta uma das duas), sustentado por 2 snapshots consecutivos com intervalo ≥ 10 s, o estado repinta em 400 ms, com no máximo 1 mudança de cor a cada 10 s e mudanças do mesmo ciclo coalescidas; o `aria-live` anuncia uma única vez.
> **E** empate exato entra em hachura imediatamente, sem esperar os 2 snapshots.
> **E** no primeiro snapshot de um escopo não há histerese: o líder é aplicado direto.
**Tipo:** unitário + e2e. **Evidência:** teste de histerese com relógio injetado, `e2e/j04-virada.spec.ts`, GIF e log de anúncios.

### AT-012 — Empate (RF-016 · RN-008)
> **Dado** dois candidatos com exatamente os mesmos votos válidos
> **Quando** o estado é pintado
> **Então** aparece hachura neutra, o tooltip diz "Empate" e nenhuma cor de partido é usada.
**Tipo:** unitário + visual. **Evidência:** screenshot aprovado.

### AT-013 — Segundo turno parcial e origem do fallback (RF-018 · RN-009, RN-030)
> **Dado** o 2º turno em apuração em que parte dos estados tem disputa de governador e São Paulo não tem
> **Quando** o mapa de governador é exibido
> **Então** os estados com disputa usam o arquivo do turno vigente e São Paulo usa o resultado final do 1º turno, marcado "1º turno", sem aparecer como "sem dado".
> **E** o snapshot de fallback carrega `origem: { pleito, turno, generationId, generatedAt }`, o selo "1º turno" tem tooltip com essa origem e o horário do snapshot atual continua visível; o frescor é o do snapshot de origem.
> **E** a corrida nacional do 2º turno usa apenas Presidente do turno vigente, sem cavalo herdado do 1º turno.
> **E** antes do início (`tf = n`, `pst = 0`), São Paulo exibe `sem_voto` com o rótulo "2º turno ainda não iniciado", nunca "0 votos" nem "sem dado".
**Tipo:** unitário + contrato + e2e. **Evidência:** fixture `2026/6260/sp-c0003-e006260-u.json` (arquivo ausente no turno), golden de `origem` e cenário `dois-turnos-parcial`.

## Mapa e navegação

### AT-007 — Zoom e municípios (RF-009, RF-010)
> **Dado** o mapa do Brasil
> **Quando** o usuário clica em São Paulo
> **Então** o mapa anima o zoom em 600 ms, exibe os 645 municípios e mantém 60 fps no aparelho de referência.
**Tipo:** e2e + performance. **Evidência:** trace do Playwright.

### AT-008 — Painel do município (RF-011, RF-020, RF-021 · RN-010)
> **Dado** o município de São Paulo aberto
> **Quando** o painel carrega
> **Então** lista os candidatos ordenados por votos, com número, partido, votos, % sobre válidos e situação; a aba de Presidente está aberta; trocar de aba leva < 100 ms.
**Tipo:** e2e + componente. **Evidência:** teste `j02-cidade.spec.ts`.

### AT-009 — Voltar (RF-012)
> **Dado** que o usuário está em um município
> **Quando** aciona "Voltar"
> **Então** retorna ao estado; ao acionar de novo, retorna ao Brasil; no Brasil, o botão não existe; `Esc` faz o mesmo.
**Tipo:** e2e. **Evidência:** teste `j02-cidade.spec.ts`.

### AT-010 — Cinco estados de ausência (RF-013, RF-017 · RN-028, RN-035)
> **Dado** cinco escopos que reproduzem, respectivamente, `sem_voto`, `sem_dado`, `nao_aplicavel`, `sem_lider_elegivel` e uma geração `retificado`
> **Quando** o mapa, o tooltip e a tabela são exibidos
> **Então** cada escopo recebe o preenchimento e o rótulo de RN-035: `sem_voto` branco `--map-empty` "Aguardando o primeiro boletim de urna"; `sem_dado` cinza médio `--map-nodata` "Sem dados para este cargo neste estado"; `nao_aplicavel` cinza claro com diagonal "Este cargo não existe em <escopo>. Nada a apurar aqui."; `sem_lider_elegivel` cinza escuro "Aguardando definição judicial"; `retificado` mantém o preenchimento do estado e acumula o selo "Dados retificados pelo TSE".
> **E** `sem_voto` responde `200` com `dados` zerado e `sem_dado` responde `200` com `dados: null`; nenhum dos dois vira `404` e nenhum número é inventado.
> **E** com votos válidos e nenhum candidato `dvt = "Válido"`, o escopo é `sem_lider_elegivel`, os votos válidos e de legenda continuam visíveis e a legenda mantém a entrada (D-009).
> **E** nenhum dos cinco estados usa cor, texto ou faixa de erro de fonte (`desatualizado`/`fonte_indisponivel` nunca trocam o preenchimento).
> **E** os cinco aparecem na tabela alternativa e no texto acessível do mapa; cor sozinha não identifica estado.
**Tipo:** contrato + componente + visual. **Evidência:** tabela de casos `packages/domain/absence-states.test.ts`, screenshot dos cinco preenchimentos e os textos do módulo de microcopy (D-038).

## Votos e detalhes

### AT-014 — Votos, base única de percentual e resumo (RF-020, RF-022, RF-023, RF-024 · RN-010, RN-020, RN-021, RN-025, RN-029)
> **Dado** o arquivo real de São Paulo com `v.vv` oficial e outro escopo em que `v.vv` está ausente
> **Quando** o painel calcula os percentuais
> **Então** a resposta traz `percentualBase: "oficial_validos"` e `calculado: false` no primeiro caso, e `percentualBase: "calculado_validos"` e `calculado: true` no segundo, com o rótulo "calculado" visível na mesma tela.
> **E** a soma fecha em 100% ± 0,1 p.p. sobre **uma única base por tela**; `pvap` oficial prevalece e é rotulado "percentual oficial do TSE"; bases nunca se misturam nem são recalculadas sobre votos totais.
> **E** candidatos com `dvt` diferente de `Válido` ficam fora da liderança, agrupados em "Votos não computados para liderança", e o detalhe mostra vice/suplentes.
> **E** brancos e nulos não entram na base de percentual de candidato; números e percentuais seguem RN-025 (pt-BR, 1 casa, `%` com espaço fino).
**Tipo:** unitário + contrato. **Evidência:** golden file + teste de soma + snapshot do JSON com `percentualBase` e `calculado`.

### AT-015 — Ranking nacional (RF-025)
> **Dado** o cargo Presidente no escopo Brasil
> **Quando** o painel nacional é aberto
> **Então** os candidatos aparecem na ordem nacional real, com os mesmos campos e a mesma hora do panorama.
**Tipo:** contrato. **Evidência:** comparação com fixture `br-c0001-e006257-u.json`.

## Busca

### AT-016 — Busca, desambiguação e URL canônica (RF-026 a RF-029 · RN-011, RN-018, RN-041)
> **Dado** o campo com o rótulo "digite o nome do estado ou da cidade:"
> **Quando** o usuário digita "sao paulo"
> **Então** vê no máximo 10 sugestões, com estado e município distinguidos pela UF; ao escolher o município, o mapa vai para SP, o painel abre e a URL passa a `/br/sp/sao-paulo`.
> **E** "santa luzia" mostra os homônimos com UF; "SP" resolve o estado; "  SÃO   PAULO  " normaliza; "x" não busca (mínimo 2 caracteres) e um termo sem resultado mostra a mensagem e não fecha o mapa.
> **E** `/br/sp/3550308` (código IBGE) e um alias antigo redirecionam com `301` em um salto para o slug canônico, preservando `pleito` e `cargo`.
> **E** slug com caixa alta, acento ou pontuação é normalizado para a forma canônica antes de renderizar, e escopo desconhecido responde `404` com a busca aberta.
**Tipo:** e2e + unitário. **Evidência:** teste de busca com tabela de casos, `e2e/deep-link.spec.ts` com asserção de `301`/`Location` e teste de slug em `packages/domain/canonical-url.test.ts`.

## Atualização

### AT-017 — Atualização e frescor em três idades (RF-030, RF-031, RF-034 · RN-012, RN-013, RN-034, RN-039)
> **Dado** a página aberta durante a apuração
> **Quando** passa um ciclo de 5 s
> **Então** o cliente faz uma requisição condicional; se o snapshot não mudou, recebe `304` e nada pisca; o bloco de frescor mostra horário do TSE (`dg`/`hg`), horário da coleta e % apurado.
> **E** a API expõe `sourceAge`, `collectedAge` e `snapshotAge` independentes, e o detalhe/tooltip mostra as três.
> **E** o selo "Ao vivo" só aparece com `collectedAge ≤ 90 s` **e** `sourceAge ≤ 5 min` durante a apuração; coleta fresca de arquivo parado exibe "Fonte sem atualização há <X>" em âmbar, nunca "ao vivo".
> **E** com a aba oculta não há polling; ao voltar, a atualização é imediata.
> **E** após `finalizada`, o selo vira "finalizado" com data/hora do encerramento, sem `ao_vivo`.
**Tipo:** e2e + contrato. **Evidência:** HAR do teste + contagem de requisições, snapshot do JSON com as três idades e caso `fonte_sem_atualizacao` com relógio injetado.

### AT-018 — Falha e degradação (RF-032, RF-045 · RN-013, RN-039)
> **Dado** o cenário `erro-fonte`
> **Quando** a fonte falha por mais de 90 s
> **Então** os números permanecem, o selo fica âmbar com o horário, e após 10 min vira vermelho com "Tentar novamente"; nenhuma cor vira branco e nenhum estado de ausência é trocado.
> **E** uma única faixa de degradação aparece, na precedência `offline` → `fonte_indisponivel` → `desatualizado` → `fonte_sem_atualizacao`, como `role="status"` e sem roubar foco.
> **E** um 404 de município mostra cartão "Não encontramos esse município" com ação de busca.
> **E** o texto de cada estado especial vem do módulo de microcopy (D-038), com chave estável e sem string solta em componente.
**Tipo:** e2e. **Evidência:** teste `erros.spec.ts` + teste unitário de chaves de microcopy.

### AT-019 — Fim da apuração por estabilidade (RF-033 · RN-014)
> **Dado** o cenário `fim` com `p = 100` em todos os escopos ativos
> **Quando** ainda não passaram 6 ciclos consecutivos sem `idg` novo (≥ 60 s) e 10 min desde a última mudança de `idg`
> **Então** o status é "aguardando confirmação", o selo "Apuração encerrada" não aparece e a cena final não roda.
> **E** satisfeitos os três critérios de `finalizado_por_estabilidade` (ou `tf = s` com `s.pst ≥ 99,99`), o selo aparece com data/hora e vencedor, o polling cai para 60 s e a cena final roda uma única vez.
> **E** o status é calculado no servidor a partir dos ciclos de ingestão, não do relógio do navegador.
**Tipo:** integração + e2e. **Evidência:** teste com relógio injetado percorrendo os 6 ciclos, teste `fim.spec.ts` e log `status=finalizado_por_estabilidade`.

## Animação

### AT-020 — Corrida (RF-035)
> **Dado** o cargo Presidente com dois candidatos
> **Quando** a página carrega
> **Então** dois cavalos aparecem com cor do partido, número e sigla, com `aria-label` e a pista visível sem cobrir o mapa.
**Tipo:** componente + visual. **Evidência:** screenshot.

### AT-021 — Posição derivada e desempate da dupla (RF-036 · RN-015, RN-026)
> **Dado** `p = 0,6`, `V = 100.000`, candidato A com 60.000 e B com 40.000
> **Quando** a posição é calculada
> **Então** `d = 20.000`, `g = ln(20001)/ln(100001) ≈ 0,86`, A fica à frente e o avanço corresponde a 60% da pista; invertendo os votos (A = 40.000, B = 60.000), B passa à frente sem mudar o avanço.
> **E** `g(0) = 0` deixa os cavalos lado a lado e `V = 0` produz pista vazia, sem divisão por zero.
> **E** a dupla é escolhida entre os dois mais votados por `vap` desc → nome de urna (`localeCompare("pt-BR")`) → número, independentemente da ordem do JSON; empate total escolhe sempre o mesmo par.
> **E** a dupla é fixa na sessão e só troca quando o **conjunto** dos dois primeiros muda por 2 snapshots consecutivos (≥ 10 s); trocar posição entre os mesmos dois não é troca de dupla.
**Tipo:** unitário. **Evidência:** tabela de casos com valores esperados + teste de desempate com candidatos homônimos e números distintos.

### AT-022 — Ultrapassagem, cooldown e troca de dupla (RF-037 · RN-015, RN-016, RN-021)
> **Dado** o cenário `virada`
> **Quando** o sinal de `g` inverte com `|g| ≥ 0,01` sustentado por 2 snapshots consecutivos (≥ 5 s de intervalo)
> **Então** o cavalo que assumiu a frente mostra o balão "Relincho!" por até 1,2 s, sem cobrir números, e o `aria-live` anuncia "Virada: <nome> assume a liderança." uma única vez.
> **E** o mesmo par não dispara de novo antes de 30 s de cooldown, e oscilações de `|g| < 0,01` não disparam nada.
> **E** candidato anulado ou removido no meio: o líder é recalculado, o cavalo afetado fica marcado "indisponível" e para no lugar; se o conjunto dos dois primeiros mudar por 2 snapshots (≥ 10 s), a corrida reinicia na posição atual e anuncia "A corrida recomeçou: <A> e <B>".
> **E** sobrando um único elegível, a pista mostra um cavalo com "Aguardando o segundo colocado", sem ultrapassagem e sem cena final.
> **E** se a dupla mudar após o fim por retificação, a cena não roda sozinha de novo e fica disponível em "Rever cena".
**Tipo:** e2e + unitário da histerese. **Evidência:** GIF + teste de cooldown de 30 s com relógio injetado + caso `candidato-removido`.

### AT-023 — Cena final, tom e simetria (RF-038 · RN-014, RN-033)
> **Dado** o fim da apuração
> **Quando** a cena roda
> **Então** em 2,4 s o vencedor lambe o perdedor, o perdedor dobra as patas e deita de lado sem impacto, corações sobem e o texto é neutro ("Apuração encerrada. <Candidato> venceu."), sem "derrotou", sem ironia e sem ofensa a pessoas.
> **E** nenhum texto da tela, da corrida ou da cena contém "derrotou", "arrasou", "humilhou", "esmagou", "vexame", "fraude" ou "roubo"; o teste varre o módulo de microcopy e falha ao encontrar qualquer termo da lista.
> **E** os dois candidatos têm o mesmo tamanho de tipografia, a mesma saturação e a mesma posição de destaque; o perdedor não é dessaturado, não encolhe, não desaparece nem cai de mau jeito — a única distinção visual é a prevista por regra (líder por votos, empate, indisponível).
> **E** a revisão editorial assina o checklist de neutralidade no PR.
**Tipo:** e2e + revisão editorial. **Evidência:** vídeo, teste de palavras proibidas e checklist de neutralidade assinado.

### AT-024 — Cena uma vez por aba, Rever cena, pausa e movimento reduzido (RF-038, RF-039, RF-040 · RNF-A11Y-05)
> **Dado** o fim da apuração do par (pleito, cargo)
> **Quando** a cena termina e a página é recarregada na mesma aba
> **Então** a cena não se repete, porque `sessionStorage` guarda `pulso:final-scene:{pleito}:{cargo}`; em uma nova aba ela roda de novo; trocar de pleito/cargo usa outra chave.
> **E** `localStorage` contém apenas a preferência de pausa (`pulso:*`), nunca a marca da cena.
> **E** o botão "Rever cena" fica sempre disponível no rodapé depois do encerramento, inclusive após recarregar, e roda a cena sob demanda sem regravar a chave.
> **E** o botão de pausa/retomar reflete o estado persistido.
> **E** com `prefers-reduced-motion: reduce` não há corrida, zoom animado nem cena; a barra estática mostra os dois candidatos e os números, e "Rever cena" exibe o cartão estático.
**Tipo:** e2e. **Evidência:** teste `reduced-motion.spec.ts`, `fim.spec.ts` com reload e segunda aba, e dump de `sessionStorage`/`localStorage`.

## Acessibilidade e transparência

### AT-025 — Teclado, foco, anúncios e tabela paginada (RF-041, RF-042 · RN-028, RN-035, RNF-A11Y-02, RNF-A11Y-03, RNF-A11Y-06)
> **Dado** o uso exclusivo de teclado
> **Quando** a pessoa navega da busca até os votos de Salvador
> **Então** completa a tarefa sem mouse, com foco visível (anel de 3 px), `Esc` subindo um nível e a tabela alternativa disponível com os mesmos dados.
> **E** após o zoom para um estado, o foco vai para o título do mapa do estado (`tabindex="-1"`) e `Tab` alcança o primeiro município; ao abrir uma cidade, o foco vai para o título do painel; "Voltar" (e `Esc`) devolve o foco ao polígono que foi ativado, ou ao título do mapa se ele não existir mais.
> **E** atualização de dados e polling nunca movem o foco.
> **E** uma única região `aria-live="polite"` agrega por ciclo de 10 s, no máximo 1 anúncio/10 s, com prioridade: (1) líder do escopo selecionado, (2) líder nacional, (3) fim da apuração; o excedente vai para a região "Resumo da apuração" (`aria-live="off"`), e avisos de navegação usam `role="status"` separado.
> **E** a tabela é paginada em 100 linhas por página com indicador "1–100 de 645", anúncio "Página 2 de 7" em `role="status"`, busca própria no escopo (normalização de RN-011, debounce de 150 ms, filtro local sem requisição por caractere) e sem botão de exportação; na impressão imprime o escopo completo.
> **E** a coluna Status escreve o estado em palavras para os cinco estados de RN-035, mais "disputa acirrada", "1º turno", "arquivado" e "sem geometria no mapa".
> **E** o axe não reporta violações sérias/críticas, inclusive com JavaScript desligado.
**Tipo:** e2e + a11y. **Evidência:** teste `j05-teclado.spec.ts`, `e2e/a11y/table.spec.ts` e relatório axe.

### AT-026 — URLs canônicas, troca de pleito e metadados (RF-005, RF-006, RF-011, RF-043 · RN-018, RN-036, RN-041)
> **Dado** a tela em `/br/sp/salvador?pleito=6259&cargo=3`
> **Quando** a URL é aberta em outra sessão
> **Então** o mesmo estado é reproduzido (estado, município, pleito, cargo), e a URL sempre inclui `pleito=`.
> **E** `/br/SP/Salvador`, `/br/sp/2927408` (código IBGE) e um alias antigo chegam ao canônico `/br/sp/salvador` com `301` em um salto, preservando `pleito` e `cargo`; a UF vem do catálogo, nunca do texto da URL.
> **E** com um município aberto, trocar para um pleito em que ele participa mantém o painel e recarrega; trocar para um pleito em que ele não participa fecha o painel, mantém o estado, remove o município da URL e mostra o toast "Município não participa deste pleito".
> **E** `?cargo=` inválido para o escopo redireciona uma vez para o cargo em destaque com o aviso "Cargo <X> não está em disputa aqui; exibindo <Y>", sem painel vazio.
> **E** as metatags OG/Twitter descrevem o recorte e são pré-renderizadas no build para `/br`, as 27 UFs e os 100 municípios de maior eleitorado; os demais usam metadado genérico com o nome do município no `<title>` do HTML estático, limite documentado em [08](08-arquitetura-e-stack.md).
**Tipo:** e2e + inspeção do HTML. **Evidência:** teste de deep link, asserções de `301`/`Location`, inspeção das metatags e lista de rotas pré-renderizadas no build.

### AT-027 — Transparência no HTML estático (RF-044 · RNF-LEGAL-01, RNF-LEGAL-02)
> **Dado** qualquer rota (`/br`, `/br/{uf}`, `/br/{uf}/{slug}`, deep link e `404`)
> **Quando** a resposta HTTP bruta é lida sem executar JavaScript (`curl`/`view-source`)
> **Então** o HTML inicial contém "Fonte: Tribunal Superior Eleitoral" com link, o horário rotulado como "última atualização disponível" em `<time datetime>` e "Este site não é um serviço oficial do TSE.", fora do React e fora de `<template>`.
> **E** o bloco é visível sem JS, não é ocultado por CSS nem removido na hidratação, e não aparece "ao vivo" sem JavaScript.
> **E** o `<noscript>` lista os estados com links e informa que o mapa interativo precisa de JavaScript.
> **E** não há marca, logotipo ou texto que sugira endosso do TSE; o texto é o mesmo em todas as rotas.
**Tipo:** e2e + inspeção do HTML. **Evidência:** asserção sobre a resposta HTTP bruta de cada rota, axe com JavaScript desligado e screenshot sem JS.

## Plataforma

### AT-028 — Polling e cache no cliente (RF-030 · RNF-ESC-04, RNF-ESC-07)
> **Dado** 10 clientes abertos por 60 s
> **Quando** se mede o tráfego
> **Então** cada cliente faz no máximo 12 requisições/min, a maioria 304, e nenhum cliente chama `resultados.tse.jus.br`.
**Tipo:** e2e + inspeção de rede. **Evidência:** HAR agregado.

### AT-029 — Ingestão idempotente, monotônica e retificação (RN-017, RN-027)
> **Dado** duas execuções com o mesmo `idg`
> **Quando** o job roda duas vezes
> **Então** apenas um snapshot é gravado, o ponteiro avança uma vez e nenhum voto diminui sem marcação de retificação.
> **E** quando o TSE publica geração com diminuição de votos, o valor oficial prevalece sobre o anterior, `vote_regression` é registrado com `idg` anterior e atual, e o escopo fica `retificado` por **60 min ou até 3 gerações consecutivas sem regressão, o que durar mais**.
> **E** a tela exibe "Dados retificados pelo TSE às <hh:mm>. O total oficial substituiu o anterior." e nunca um número ou delta negativo; o delta mínimo apresentado é `0`.
> **E** a retificação não altera a definição de líder: o líder é recalculado sobre os valores oficiais vigentes.
**Tipo:** integração. **Evidência:** teste com emulador, fixture de retificação e golden do badge com relógio injetado.

### AT-030 — Cache de CDN correto (RNF-ESC-04)
> **Dado** o ambiente de dev publicado
> **Quando** duas requisições iguais chegam em 2 s
> **Então** a segunda é servida pela CDN (`x-cache: HIT`) com o mesmo ETag e o origin recebe apenas uma.
**Tipo:** smoke. **Evidência:** `curl -I` nos dois momentos.

### AT-031 — Estados do turno (RF-002 · RN-003, RN-030)
> **Dado** o 2º turno antes de começar
> **Quando** o pleito 6258 é selecionado
> **Então** a tela diz "2º turno ainda não iniciado", os estados ficam sem cor de voto (não "0 votos") e o seletor mostra o estado `nao_iniciada`.
**Tipo:** contrato + e2e. **Evidência:** fixture do 2º turno zerado.

### AT-032 — Carga de 10.000 usuários (RNF-ESC-01, RNF-ESC-02 · RN-040)
> **Dado** o ambiente de dev com CDN real e `s-maxage` de produção
> **Quando** o k6 roda em 3 runners (São Paulo, Virgínia, Frankfurt) com 5 min de platô em 10.000 VUs e mix 70% panorama / 20% município / 10% estático
> **Então** `http_req_failed < 0,1%` no total e em cada runner, p95 na borda < 150 ms, o origin recebe ≤ 5% das requisições, a CPU do `pulso-api` fica < 80% e não há nenhum 5xx no origin.
> **E** `ingest_lag_seconds` p95 ≤ 30 s durante o teste e o `age` das respostas respeita o teto de `RN-040`.
> **E** o relatório `docs/operacao/carga-YYYY-MM-DD.md` é anexado com data, commit, runners, mix, números e conclusão.
> **E** falhar qualquer um dos cinco critérios reprova a execução, mesmo com os outros quatro verdes.
**Tipo:** carga. **Evidência:** `docs/operacao/carga-*.md` + gráfico + saída do k6 por runner.

### AT-033 — Sem PII e sem rastreamento (FR-014 · RNF-LGPD-01, RNF-LGPD-02, RNF-LGPD-03)
> **Dado** uma sessão completa em `/br`, `/br/sp` e `/br/sp/sao-paulo`, com busca, troca de pleito e de aba, painel, tabela e corrida
> **Quando** o HAR e o armazenamento do navegador são inspecionados
> **Então** nenhuma requisição sai para domínio de terceiro: só o próprio host da API, o host dos assets e as fontes servidas pelo projeto; nenhuma chamada a `resultados.tse.jus.br`, analytics, CDN de terceiro ou fonte externa.
> **E** nenhum `Set-Cookie` é gravado e `document.cookie` permanece vazio.
> **E** `localStorage` contém apenas chaves `pulso:*` (no máximo a pausa da corrida) e `sessionStorage` apenas `pulso:final-scene:*`.
> **E** nenhum corpo de requisição ou de resposta carrega nome, e-mail, telefone, IP, localização precisa ou identificador de dispositivo; a API não persiste IP completo.
> **E** a tela funciona igual com cookies bloqueados, sem login e sem consentimento de rastreio.
**Tipo:** e2e + inspeção de rede. **Evidência:** HAR agregado das três rotas, dump de `localStorage`/`sessionStorage` e varredura do módulo de telemetria por campos de PII, em `e2e/privacidade.spec.ts`.

### AT-034 — Latência fim a fim da geração ao pixel (RNF-PERF-09 · RN-040)
> **Dado** apuração ativa com a instrumentação ligada — a ingestão registra `generatedAt` do `idg` e o cliente registra o primeiro frame em que o número aparece
> **Quando** se mede por 1 h ou por pelo menos 100 snapshots
> **Então** o p95 de "geração do TSE → pixel" é ≤ 30 s e a mediana ≤ 15 s.
> **E** cada etapa respeita o orçamento: ingestão ≤ 10 s, processamento e gravação ≤ 2 s, propagação de CDN ≤ 3 s, polling ≤ 5 s, render ≤ 2 s (soma ≈ 22 s, com 8 s de folga).
> **E** toda resposta dinâmica registra `ingest_lag_seconds` e `age`, e o alerta dispara quando o p95 passa de 30 s com apuração ativa.
> **E** o teto de staleness é respeitado: `s-maxage + stale-while-revalidate + stale-if-error ≤ 30 s` durante a apuração e ≤ 6 h após `finalizada`.
> **E** sem a medição registrada, a meta não é considerada atendida.
**Tipo:** integração + observabilidade. **Evidência:** `docs/operacao/latencia-YYYY-MM-DD.md` com p50/p95 por etapa, dashboard e log de alerta.

### AT-035 — Painel por cargo e orçamento de payload (RF-021 · RNF-PERF-06, RNF-PERF-08)
> **Dado** um município com cargos em disputa
> **Quando** o painel abre e o usuário troca de aba
> **Então** a abertura carrega apenas o cargo em destaque; cada troca de aba faz exatamente uma consulta daquele cargo, nunca a lista completa do município.
> **E** cada resposta é ≤ 12 KB gz, cacheável por `(pleito, turno, escopo, cargo, versão)`, e trocar de aba não refaz a consulta do mapa nem o download da malha.
> **E** o painel expõe no máximo 5 abas por município; cargos excedentes vão para "Outros cargos", no mesmo padrão de consulta única.
> **E** durante o carregamento da aba há esqueleto de 5 linhas e os números da aba anterior não são reaproveitados.
> **E** a troca de aba conclui em ≤ 100 ms quando a resposta está em cache.
**Tipo:** contrato + e2e + desempenho. **Evidência:** medição de gzip por payload, HAR do teste de troca de abas com contagem de requisições e trace do painel.

## Pleitos, geometria e conectividade

### AT-036 — Pleitos passados e arquivados (RF-001, RF-002, RF-046 · RN-012, RN-037)
> **Dado** um catálogo com um pleito em apuração, um finalizado e um `arquivado`
> **Quando** o seletor de pleitos é aberto
> **Então** os grupos "Em apuração", "Finalizados" e "Arquivados" aparecem nessa ordem; o `arquivado` aparece só no seu grupo e nunca é escolhido como pleito padrão.
> **E** ao abrir o pleito finalizado, a tela mostra o selo "Resultado final", não se apresenta como apuração ao vivo, a coleta no servidor passa a 30 min e a atualização no cliente a 60 s.
> **E** a cena final roda uma única vez por aba e o botão "Rever cena" continua disponível.
> **E** a URL inclui `pleito=`, inclusive quando é o padrão de RN-002.
> **E** o pleito `arquivado` exibe o selo "Arquivado", não faz polling de apuração e continua acessível por URL direta.
**Tipo:** contrato + e2e. **Evidência:** catálogo com os três grupos, teste de URL com `pleito=`, HAR provando a cadência de 30 min/60 s e screenshot dos selos.

### AT-037 — Município sem geometria (RF-010, RF-042 · RN-028)
> **Dado** um estado em que 2 municípios do catálogo não têm malha
> **Quando** o estado é aberto
> **Então** os dois aparecem na tabela e na busca com números e status normais, com "Geometria indisponível para este município." na linha da tabela e no `aria-label` ("sem geometria no mapa").
> **E** eles não geram `<path>`: não são clicáveis nem focáveis no mapa; abrir pela busca ou pela tabela abre o painel com o selo "Geometria indisponível" e faz o zoom do estado sem destacar polígono.
> **E** o recorte do estado mostra a faixa discreta "<N> município(s) sem geometria — ver tabela", sem âmbar, vermelho ou `role="alert"`.
> **E** o município continua contando nos totais do estado e nunca vira `sem_dado`; se faltar a malha do estado inteiro, ele é listado na tabela, aberto pela busca e o Brasil mostra a mesma faixa discreta.
**Tipo:** componente + e2e. **Evidência:** fixture de malha incompleta, screenshot da faixa e relatório `build/geo-missing.json`.

### AT-038 — Eleição suplementar isolada (RF-005 · RN-031)
> **Dado** um catálogo com um pleito geral em apuração e um pleito suplementar no município X
> **Quando** o pleito suplementar é selecionado
> **Então** ele aparece no seletor com o nome do município e abre apenas no escopo de X, com Prefeito e Vereador.
> **E** a cor de nenhum estado, o ranking nacional, o cargo em destaque nacional nem a corrida nacional mudam em relação ao pleito geral.
> **E** os votos do suplementar não entram em nenhum agregado de UF ou de país.
> **E** voltar ao pleito geral restaura exatamente o estado anterior da tela.
**Tipo:** integração + contrato. **Evidência:** teste com os dois pleitos no mesmo catálogo comparando panorama, ranking e `g` da corrida antes/depois.

### AT-039 — Offline e reconexão (RF-032, RF-045 · RN-012, RN-013, RN-039)
> **Dado** a página aberta com dados carregados
> **Quando** a conexão cai (`navigator.onLine = false` ou falha de rede)
> **Então** o polling para, números e cavalos congelam na última posição, a faixa "Você está offline. Mostrando os últimos dados de <data>." aparece e a pista mostra "Sem conexão — corrida pausada"; nenhum número é zerado.
> **E** durante o offline nenhuma requisição é feita; aba oculta não é offline (vale RN-012).
> **E** ao reconectar, exatamente uma atualização condicional (`If-None-Match`) é feita, o polling normal retoma e um `304` não muda nada na tela.
> **E** ultrapassagens e viradas do intervalo não são reproduzidas: nenhum balão e nenhum anúncio por evento perdido; se a liderança mudou, anuncia-se só o líder atual, uma vez.
> **E** a mola é reancorada no alvo com velocidade 0 e transição de 400 ms `ease-out`, sem salto, e a pausa escolhida pelo usuário é preservada.
> **E** cena final perdida no offline não é exibida retroativamente, mas "Rever cena" fica disponível se o pleito estava finalizado.
**Tipo:** e2e. **Evidência:** `e2e/offline.spec.ts` com `context.setOffline`, contagem de requisições na reconexão, trace da mola e log de anúncios.

### AT-040 — Ciclo de vida do catálogo (RF-001, RF-002, RF-046 · RN-037)
> **Dado** uma `catalogVersion` publicada e snapshots gravados
> **Quando** um pleito, turno ou cargo desaparece do catálogo
> **Então** por 24 h o último snapshot continua sendo servido com o selo "catálogo atualizado" e o item permanece no seletor.
> **E** depois de 24 h o turno passa a `arquivado`, sai do seletor (fica só em "Arquivados") e continua acessível por URL direta enquanto o snapshot existir na retenção.
> **E** um turno ou pleito novo entra automaticamente, sem deploy, e é marcado como o mais recente na ordenação.
> **E** catálogo inválido ou indisponível mantém a `catalogVersion` anterior e não remove nada do seletor.
> **E** `catalogVersion` aparece em todo snapshot e no log de ingestão; divergência entre catálogo e snapshot é erro de ingestão, não de tela.
**Tipo:** integração + contrato. **Evidência:** teste com dois catálogos e janela de 24 h controlada por relógio injetado, mais asserção de `catalogVersion` no JSON de snapshot e no log.
