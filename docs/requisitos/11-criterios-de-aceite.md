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

### AT-005 — Panorama e legenda (RF-008, RF-019)
> **Dado** uma apuração parcial
> **Quando** o panorama é exibido
> **Então** os 27 estados têm cor (ou branco/cinza), a legenda lista os partidos visíveis com sigla e as três situações especiais, e tudo é legível por leitor de tela.
**Tipo:** componente + a11y. **Evidência:** screenshot e árvore de acessibilidade.

### AT-006 — Cor do líder (RF-014 · RN-006, RN-007)
> **Dado** o arquivo real de São Paulo (presidente, 1º turno)
> **Quando** o estado é renderizado
> **Então** a cor é a do partido do candidato com maior `vap` elegível e o tooltip mostra nome, partido, votos, % e apurado.
**Tipo:** unitário + contrato. **Evidência:** golden file com o resultado esperado.

### AT-011 — Virada (RF-015)
> **Dado** o cenário `virada` em que o líder muda
> **Quando** chega o snapshot com a nova liderança
> **Então** o estado repinta em 400 ms, o `aria-live` anuncia uma única vez e nenhum outro estado muda sem motivo.
**Tipo:** e2e. **Evidência:** vídeo/GIF + log de anúncios.

### AT-012 — Empate (RF-016 · RN-008)
> **Dado** dois candidatos com exatamente os mesmos votos válidos
> **Quando** o estado é pintado
> **Então** aparece hachura neutra, o tooltip diz "Empate" e nenhuma cor de partido é usada.
**Tipo:** unitário + visual. **Evidência:** screenshot aprovado.

### AT-013 — Fallback entre turnos (RF-018 · RN-009)
> **Dado** o 2º turno em que o estado de SP não tem disputa de governador
> **Quando** o mapa de governador é exibido
> **Então** SP usa o resultado final do 1º turno, marcado "1º turno", sem aparecer como "sem dado".
**Tipo:** unitário. **Evidência:** caso com fixture 6260 ausente.

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

### AT-010 — Branco e sem dado (RF-013, RF-017 · RN-028)
> **Dado** um estado sem votos (`0`) e outro sem arquivo (`null`)
> **Quando** o mapa é exibido
> **Então** o primeiro é branco com "Aguardando o primeiro boletim" e o segundo é cinza com "Sem dados", sem número inventado em nenhum dos dois.
**Tipo:** componente + visual. **Evidência:** screenshot dos dois estados.

## Votos e detalhes

### AT-014 — Votos, percentual e resumo (RF-020, RF-022, RF-023, RF-024 · RN-020, RN-021, RN-025)
> **Dado** o arquivo real de São Paulo
> **Quando** o painel calcula os percentuais
> **Então** a soma fecha em 100% ± 0,1 p.p., a base é "votos válidos", candidatos com `dvt` inválido ficam fora da liderança e o detalhe mostra vice/suplentes.
**Tipo:** unitário + contrato. **Evidência:** golden file + teste de soma.

### AT-015 — Ranking nacional (RF-025)
> **Dado** o cargo Presidente no escopo Brasil
> **Quando** o painel nacional é aberto
> **Então** os candidatos aparecem na ordem nacional real, com os mesmos campos e a mesma hora do panorama.
**Tipo:** contrato. **Evidência:** comparação com fixture `br-c0001-e006257-u.json`.

## Busca

### AT-016 — Busca por estado e cidade (RF-026 a RF-029 · RN-011)
> **Dado** o campo com o rótulo "digite o nome do estado ou da cidade:"
> **Quando** o usuário digita "sao paulo"
> **Então** vê no máximo 10 sugestões, com estado e município distinguidos pela UF; ao escolher o município, o mapa vai para SP e o painel abre.
> **E** "santa luzia" mostra os homônimos com UF.
> **E** um termo sem resultado mostra a mensagem e não fecha o mapa.
**Tipo:** e2e + unitário. **Evidência:** teste de busca com tabela de casos.

## Atualização

### AT-017 — Atualização e frescor (RF-030, RF-031, RF-034 · RN-012, RN-013)
> **Dado** a página aberta durante a apuração
> **Quando** passa um ciclo de 5 s
> **Então** o cliente faz uma requisição condicional; se o snapshot não mudou, recebe 304 e nada pisca; o bloco de frescor mostra hora do TSE, hora da coleta e % apurado.
> **E** com a aba oculta, não há polling.
**Tipo:** e2e. **Evidência:** HAR do teste + contagem de requisições.

### AT-018 — Falha e degradação (RF-032, RF-045 · RN-013)
> **Dado** o cenário `erro-fonte`
> **Quando** a fonte falha por mais de 90 s
> **Então** os números permanecem, o selo fica âmbar com o horário, e após 10 min vira vermelho com "Tentar novamente"; nenhuma cor vira branco.
> **E** um 404 de município mostra cartão com ação de busca.
**Tipo:** e2e. **Evidência:** teste `erros.spec.ts`.

### AT-019 — Fim da apuração (RF-033 · RN-014)
> **Dado** o cenário `fim`
> **Quando** `tf = s` em todos os arquivos ativos
> **Então** o selo "Apuração encerrada" aparece com data/hora e vencedor, o polling cai para 60 s e a cena final roda uma única vez.
**Tipo:** e2e. **Evidência:** teste `fim.spec.ts`.

## Animação

### AT-020 — Corrida (RF-035)
> **Dado** o cargo Presidente com dois candidatos
> **Quando** a página carrega
> **Então** dois cavalos aparecem com cor do partido, número e sigla, com `aria-label` e a pista visível sem cobrir o mapa.
**Tipo:** componente + visual. **Evidência:** screenshot.

### AT-021 — Posição derivada (RF-036 · RN-015)
> **Dado** `p = 0,6`, `V = 100.000`, candidato A com 60.000 e B com 40.000
> **Quando** a posição é calculada
> **Então** `d = 20.000`, `g = ln(20001)/ln(100001) ≈ 0,86`, A fica à frente e o avanço corresponde a 60% da pista; invertendo os votos (A = 40.000, B = 60.000), B passa à frente sem mudar o avanço.
**Tipo:** unitário. **Evidência:** tabela de casos com valores esperados.

### AT-022 — Ultrapassagem e relincho (RF-037 · RN-016)
> **Dado** o cenário `virada`
> **Quando** a liderança inverte e se sustenta por dois snapshots
> **Então** o cavalo que assumiu a frente mostra o balão "Relincho!" por até 1,2 s, o `aria-live` anuncia a virada e o balão não cobre números.
> **E** oscilações menores que 0,01 não disparam nada.
**Tipo:** e2e + unitário da histerese. **Evidência:** GIF + teste de cooldown.

### AT-023 — Cena final (RF-038 · RN-014, RN-033)
> **Dado** o fim da apuração
> **Quando** a cena roda
> **Então** em 2,4 s o vencedor lambe o perdedor, o perdedor deita sem impacto, corações sobem e o texto é neutro ("venceu", não "derrotou"), sem ofensa a pessoas.
> **E** recarregar a página não repete a cena na mesma sessão.
**Tipo:** e2e + revisão editorial. **Evidência:** vídeo + checklist de neutralidade assinado.

### AT-024 — Pausa e movimento reduzido (RF-039, RF-040)
> **Dado** `prefers-reduced-motion: reduce`
> **Quando** a página abre
> **Então** não há corrida, zoom animado nem cena; a barra estática mostra os dois candidatos e os números; o botão de pausa reflete o estado.
**Tipo:** e2e. **Evidência:** teste `reduced-motion.spec.ts`.

## Acessibilidade e transparência

### AT-025 — Teclado e tabela (RF-041, RF-042 · RNF-A11Y)
> **Dado** o uso exclusivo de teclado
> **Quando** a pessoa navega da busca até os votos de Salvador
> **Então** completa a tarefa sem mouse, com foco visível, `Esc` subindo um nível e a tabela alternativa disponível com os mesmos dados.
> **E** o axe não reporta violações sérias/críticas.
**Tipo:** e2e + a11y. **Evidência:** teste `j05-teclado.spec.ts` + relatório axe.

### AT-026 — URLs compartilháveis (RF-043)
> **Dado** a tela em `/br/sp/salvador?pleito=6259&cargo=3`
> **Quando** a URL é aberta em outra sessão
> **Então** o mesmo estado é reproduzido (estado, município, pleito, cargo) e as metatags OG descrevem o recorte.
**Tipo:** e2e. **Evidência:** teste de deep link + inspeção do HTML.

### AT-027 — Transparência (RF-044)
> **Dado** qualquer página
> **Quando** o rodapé é lido
> **Então** contém "Fonte: Tribunal Superior Eleitoral", link, horário do dado e "Este site não é um serviço oficial do TSE", sem marcas que sugiram endosso.
**Tipo:** e2e. **Evidência:** asserção de texto.

## Plataforma

### AT-028 — Polling e cache no cliente (RF-030 · RNF-ESC-04, RNF-ESC-07)
> **Dado** 10 clientes abertos por 60 s
> **Quando** se mede o tráfego
> **Então** cada cliente faz no máximo 12 requisições/min, a maioria 304, e nenhum cliente chama `resultados.tse.jus.br`.
**Tipo:** e2e + inspeção de rede. **Evidência:** HAR agregado.

### AT-029 — Ingestão idempotente e monotônica (RN-017, RN-027)
> **Dado** duas execuções com o mesmo `idg`
> **Quando** o job roda duas vezes
> **Então** apenas um snapshot é gravado, o ponteiro avança uma vez e nenhum voto diminui sem marcação de retificação.
**Tipo:** integração. **Evidência:** teste com emulador.

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

### AT-032 — Carga de 10.000 usuários (RNF-ESC-01, RNF-ESC-02)
> **Dado** o ambiente de dev com CDN
> **Quando** o k6 atinge 10.000 VUs por 5 min
> **Então** `http_req_failed < 0,1%`, p95 < 150 ms e o origin recebe ≤ 5% das requisições; o relatório é anexado.
**Tipo:** carga. **Evidência:** `docs/operacao/carga-*.md` + gráfico.
