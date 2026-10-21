# 03 — Requisitos funcionais

Convenções: **DEVE** é obrigatório, **PODE** é opcional, **NÃO DEVE** é proibido. Cada requisito referencia as regras de negócio ([04](04-regras-de-negocio.md)) e os critérios de aceite ([11](11-criterios-de-aceite.md)). "Escopo" é a abrangência selecionada: país, UF ou município.

## A. Catálogo e seleção

### RF-001 — Descobrir pleitos
O sistema DEVE obter o catálogo oficial de pleitos do TSE e apresentar apenas os pleitos com pelo menos uma eleição utilizável.
- Entrada: `oficial/comum/config/ele-c.json`.
- Saída: lista `pleitos[]` com `id`, `nome`, `data`, `ciclo` e `turnos[]`.
- Regras: RN-001, RN-002. Aceite: AT-001.

### RF-002 — Descobrir turnos
Para cada pleito, o sistema DEVE listar os turnos e o estado de cada um: `nao_iniciada`, `em_apuracao`, `finalizada` ou `arquivado`.
- Fonte do estado: `tf` e `s.pst` dos arquivos do turno (RN-003).
- Ciclo do catálogo: o catálogo DEVE carregar `catalogVersion`. Se um pleito ou cargo desaparecer do catálogo, o sistema DEVE manter o último snapshot por 24 h com o selo "catálogo atualizado"; passadas as 24 h, DEVE marcar o turno como `arquivado` e removê-lo do seletor (RN-037).
- Um turno novo no catálogo DEVE entrar automaticamente e ser marcado como o mais recente.
- Aceite: AT-001, AT-031.

### RF-003 — Descobrir cargos do pleito
O sistema DEVE listar os cargos de cada eleição a partir de `e[].abr[].cp[]`, sem lista fixa no código, com `id`, `nome`, `tipo` (`majoritario`/`proporcional`).
- Aceite: AT-002.

### RF-004 — Cargos por escopo
O sistema DEVE informar quais cargos estão em disputa em um escopo, inclusive por município, derivados do catálogo:
- país: cargos com abrangência `br`;
- UF: cargos da eleição estadual aplicáveis à UF + cargos nacionais; `Deputado Distrital` só no DF, `Deputado Estadual` nos demais;
- município: os cargos da UF (eleições gerais) ou `Prefeito`/`Vereador` (eleições municipais).
- Saída: `GET /escopos/{uf}/cargos?pleito=` e `GET /municipios/{ibge}/cargos?pleito=` devolvem, na ordem de RN-005, `{id, nome, tipo, emDisputa}` — a lista é sempre derivada do catálogo, nunca de lista fixa no código.
- Cargo `tp = 3` (consulta popular) NÃO aparece nos endpoints de escopo.
- Regra: RN-004, RN-005. Aceite: AT-002.

### RF-005 — Selecionar pleito
O usuário DEVE poder escolher o pleito e o turno. A escolha altera cargos, mapa e votos, e é refletida na URL (`?pleito=`).
- Padrão: pleito mais recente com apuração iniciada; se nenhum, o mais recente do catálogo.
- Persistência do cargo: ao trocar pleito ou escopo, o cargo selecionado DEVE ser mantido se existir no novo escopo; se não existir, o sistema DEVE voltar ao cargo em destaque com o aviso não bloqueante "Cargo X não está em disputa aqui; exibindo Y" (RN-036).
- Com um município aberto: se ele participar do novo pleito, o painel é mantido e recarregado; se não participar, o painel fecha, o estado permanece, o município sai da URL e aparece o toast "Município não participa deste pleito".
- A URL só muda por ação explícita do usuário.
- Aceite: AT-003, AT-026.

### RF-006 — Selecionar cargo
O usuário DEVE poder escolher o cargo exibido por chips. O chip padrão é o maior cargo em disputa (RN-005). A escolha é refletida na URL (`?cargo=`).
- O cabeçalho, o painel, a tabela e a legenda reagem à troca. O mapa permanece colorido pelo cargo em destaque (RN-006); a corrida continua no maior cargo nacional.
- Deep link com `?cargo=` inválido para o escopo ou pleito DEVE redirecionar para o cargo em destaque, com o mesmo aviso não bloqueante de RF-005, sem erro de página e sem alterar o restante da URL (RN-036).
- Aceite: AT-003.

### RF-007 — Identificar o maior cargo em disputa
O sistema DEVE calcular, para cada escopo, o cargo em destaque pela hierarquia de RN-005, considerando apenas cargos presentes naquele escopo.
- Se o cargo em destaque não tiver votos e outro tiver, a cor continua sendo a do cargo em destaque (branco), nunca a de um cargo menor.
- Aceite: AT-004.

## B. Mapa e navegação

### RF-008 — Panorama nacional
O sistema DEVE exibir o mapa do Brasil com as 27 unidades e, para cada uma, a cor do partido líder do cargo em destaque na UF (RN-006).
- Tooltip/aria: nome, sigla do partido líder, candidato líder, votos, % dos válidos, % apurado.
- Aceite: AT-005, AT-006.

### RF-009 — Zoom para estado
Ao clicar/tocar em um estado, o mapa DEVE aplicar zoom animado e exibir os municípios daquele estado.
- A transição dura 600 ms e não recarrega a página (DESIGN.md §6).
- Aceite: AT-007.

### RF-010 — Municípios clicáveis
Cada município DEVE ser um alvo focável e clicável, com nome, partido líder e votos no tooltip/aria.
- Município sem geometria disponível DEVE aparecer na tabela e na busca, mas NÃO DEVE ser clicável no mapa; tooltip "geometria indisponível" (RN-028). Isso é distinto de `sem_dado`.
- Estados com muitos municípios DEVEM permanecer fluidos (orçamento: render ≤ 300 ms).
- Aceite: AT-007, AT-018.

### RF-011 — Painel do município
Ao clicar em um município, o sistema DEVE abrir o painel de votos daquele município, mantendo o zoom.
- Desktop: painel lateral. Mobile: bottom sheet com três alturas.
- Aceite: AT-008.

### RF-012 — Voltar
Após qualquer zoom, um botão com o texto **"Voltar"** DEVE aparecer acima do mapa. Cada acionamento sobe exatamente um nível: município → estado → Brasil.
- `Esc` produz o mesmo efeito.
- O botão NÃO DEVE aparecer no nível Brasil.
- Aceite: AT-009.

### RF-013 — Estado sem votos
Enquanto não houver voto válido no cargo em destaque, o estado DEVE ser preenchido com branco puro (`--map-empty`) e contorno visível.
- Aceite: AT-010.

### RF-014 — Cor do líder
Havendo voto válido, o estado DEVE ser preenchido com a cor do partido do líder (RN-007), com transição de 400 ms quando a cor mudar.
- Aceite: AT-006, AT-011.

### RF-015 — Virada de liderança
Quando o líder do cargo em destaque mudar em um escopo, o sistema DEVE repintar o estado e anunciar a mudança em `aria-live` (máx. 1 anúncio/10 s por escopo).
- Aceite: AT-011.

### RF-016 — Empate
Em empate exato de votos válidos, o estado DEVE usar hachura neutra e tooltip "Empate" (RN-008); nunca a cor de um dos partidos.
- Aceite: AT-012.

### RF-017 — Estado sem dado
Se não existir arquivo para um estado/cargo, o estado DEVE aparecer em `--map-nodata`, com rótulo "Sem dados para este cargo" e sem inventar número.
- A tela DEVE distinguir os estados de ausência e nunca confundi-los com erro de fonte (RN-028, RN-035), usando os mesmos nomes de `status` da API:
  - `sem_voto`: arquivo existe com 0 voto válido — branco (`--map-empty`);
  - `sem_dado`: o cargo se aplica ao escopo, mas o arquivo está ausente — cinza médio (`--map-nodata`);
  - `nao_aplicavel`: o cargo não existe naquele escopo/turno e não há fallback de RN-009 — cinza claro com diagonal, rótulo "Não se aplica";
  - `sem_lider_elegivel`: há votos válidos e nenhum candidato elegível (RN-021) — cinza escuro, rótulo "Aguardando definição judicial";
  - `retificado`: geração com correção oficial — mantém a cor do líder com a marca "dados retificados pelo TSE" (RN-017).
- Aceite: AT-010, AT-012.

### RF-018 — Fallback entre turnos
Quando o turno vigente não tiver disputa em um estado (ex.: governador decidido no 1º turno), o sistema DEVE usar o último resultado final disponível daquele cargo no estado e sinalizar "1º turno" no detalhe (RN-009).
- Aceite: AT-013.

### RF-019 — Legenda
O mapa DEVE ter legenda com: partidos visíveis (sigla + cor), branco = sem voto, cinza = sem dado, hachura = empate, e a explicação do cargo em destaque.
- A legenda DEVE ser navegável e textual (não só visual).
- Aceite: AT-005.

## C. Votos e detalhes

### RF-020 — Votos por candidato
No painel de município (e de estado/país, quando aplicável), o sistema DEVE listar os candidatos do cargo selecionado em ordem decrescente de votos válidos, com: nome de urna, número, partido, votos, % dos válidos, situação (eleito, 2º turno, não eleito) e marcação de empate.
- Candidatos com `dvt` diferente de `Válido` DEVEM aparecer em seção separada ou com rótulo explícito.
- Aceite: AT-008, AT-014.

### RF-021 — Abas por cargo
O painel DEVE ter uma aba por cargo em disputa no escopo, com o maior cargo aberto por padrão.
- A troca de aba NÃO DEVE refazer o download do mapa.
- O painel DEVE carregar um cargo por vez, com no máximo 12 KB gz por resposta (RNF-PERF-06); a pré-busca é feita apenas para o cargo em destaque.
- Cada aba é uma consulta cacheável; no máximo cinco abas por município (RNF-PERF-06).
- Aceite: AT-008.

### RF-022 — Resumo do cargo
O painel DEVE mostrar votos válidos, brancos, nulos, total apurado, comparecimento e abstenção, com a base de cálculo explícita.
- Aceite: AT-014.

### RF-023 — Percentual correto
O percentual de cada candidato DEVE ser calculado sobre os votos válidos do escopo/cargo, e o total dos percentuais DEVE fechar em 100% (tolerância de arredondamento de 0,1 p.p.), salvo quando o TSE informar percentual oficial — nesse caso, usar o oficial e exibir a mesma base.
- Regra: RN-010. Aceite: AT-014.

### RF-024 — Detalhe do candidato
Ao acionar um candidato, o sistema DEVE mostrar: nome completo, número, partido/federação, vice ou suplentes (quando houver), votos e situação.
- Não DEVE exibir foto na v1.
- Aceite: AT-014.

### RF-025 — Ranking nacional
Para cargos nacionais, o sistema DEVE mostrar o ranking nacional dos candidatos no painel do país, com os mesmos campos do RF-020.
- Aceite: AT-015.

## D. Busca

### RF-026 — Campo de busca
A tela DEVE ter um campo com o rótulo literal **"digite o nome do estado ou da cidade:"**, visível acima do mapa.
- O campo DEVE ter `label` associado, `role="combobox"`, `aria-expanded` e lista de opções navegável.
- Aceite: AT-016.

### RF-027 — Busca normalizada
A busca DEVE ignorar caixa, acentos e pontuação, e aceitar:
- nome completo do estado ("São Paulo"), sigla ("SP") e nome do município ("São Paulo", "Salvador");
- prefixo a partir de 2 caracteres;
- no máximo 10 sugestões, ordenadas por: correspondência exata > prefixo > contém.
- Regra: RN-011. Aceite: AT-016.

### RF-028 — Desambiguação
Municípios homônimos DEVEM ser exibidos com a UF ("Santa Luzia — MG", "Santa Luzia — PB"). Selecionar um município DEVE levar ao estado correto e abrir o painel.
- Aceite: AT-016.

### RF-029 — Busca sem resultado
Sem correspondência, o sistema DEVE exibir "Nenhum estado ou cidade encontrado para '<termo>'." e manter o mapa atual.
- Aceite: AT-016.

## E. Atualização e estado do dado

### RF-030 — Atualização automática
Com a página aberta, o sistema DEVE atualizar os dados automaticamente conforme a cadência de RN-012 (5 s na janela eleitoral, 15 s em apuração fora da janela, 60 s após o fim e 5 min sem pleito ativo), usando requisições condicionais (ETag) e pausando quando a aba estiver oculta.
- Aceite: AT-017, AT-028.

### RF-031 — Indicador de frescor
O sistema DEVE exibir, de forma persistente: horário de geração do TSE, horário da última coleta bem-sucedida, % de seções apuradas e estado (`ao vivo`, `desatualizado`, `finalizado`).
- "Desatualizado" quando a última coleta bem-sucedida tiver mais de 90 s durante a apuração (RN-013).
- Aceite: AT-017.

### RF-032 — Degradação por falha da fonte
Se o TSE falhar, o sistema DEVE continuar servindo o último snapshot, com selo de advertência e horário; NÃO DEVE zerar números nem trocar cores para "sem voto".
- Sem conexão (`navigator.onLine = false`), a tela DEVE entrar em estado `offline`: mantém o último snapshot já carregado com o horário dele e impede ações que dependam de rede.
- Ao reconectar, o sistema DEVE fazer uma única atualização condicional e retomar a cadência de RN-012; o estado atual é aplicado de uma vez, sem reproduzir ultrapassagens, balões ou anúncios dos ciclos perdidos e sem salto na animação. Texto, faixa e reancoragem da corrida estão em [07](07-ux-mapa-e-animacoes.md) §7.7.
- Aceite: AT-018.

### RF-033 — Fim da apuração
O sistema DEVE detectar o fim (RN-014) e exibir o selo "Apuração encerrada", com data/hora e o vencedor do cargo em destaque no escopo.
- Aceite: AT-019.

### RF-034 — Recarregar manualmente
O usuário DEVE poder forçar uma atualização; o botão mostra o estado de carregamento e respeita um intervalo mínimo de 3 s.
- Aceite: AT-017.

## F. Animação

### RF-035 — Corrida de cavalinhos
O rodapé DEVE exibir uma pista com dois cavalinhos representando os dois candidatos mais votados do maior cargo nacional em disputa (presidente, quando houver; senão, o maior cargo do pleito).
- Cada cavalo usa a cor do partido, o número e a sigla; nomes acessíveis.
- Aceite: AT-020.

### RF-036 — Posição derivada dos votos
A posição DEVE ser derivada de: avanço na pista = % de seções apuradas; afastamento = diferença normalizada de votos (RN-015). O cavalo à frente NUNCA DEVE ser o de menor votação.
- Aceite: AT-021.

### RF-037 — Ultrapassagem e relincho
Quando a liderança inverter de forma sustentada (RN-016), o cavalo que assumiu a frente DEVE emitir um balão de quadrinho com "Relincho!" por até 1,2 s, sem cobrir números e sem texto ofensivo.
- Aceite: AT-022.

### RF-038 — Cena final
Quando a apuração do cargo terminar, o cavalo vencedor DEVE dar uma lambida carinhosa no perdedor, que se deita no chão; corações sobem; um texto neutro anuncia o resultado.
- A cena ocorre uma única vez por **aba** e por par (pleito, cargo), registrada em `sessionStorage` na chave `pulso:final-scene:{pleito}:{cargo}`: recarregar a página NÃO repete a cena, uma nova aba repete. `localStorage` guarda apenas a preferência de pausa (RF-039).
- O botão "Rever cena" DEVE estar sempre disponível no rodapé depois do encerramento.
- Aceite: AT-023.

### RF-039 — Controle de animação
O usuário DEVE poder pausar/retomar a corrida; a preferência é lembrada no armazenamento local (sem cookie).
- Aceite: AT-024.

### RF-040 — Movimento reduzido
Com `prefers-reduced-motion: reduce`, a corrida DEVE ser substituída por uma barra estática com os dois candidatos e os números; zoom vira troca instantânea com fade de 120 ms e a cena final NÃO é executada — o resultado aparece em texto (AT-024).
- Aceite: AT-024.

## G. Acessibilidade, compartilhamento e transparência

### RF-041 — Navegação por teclado
Todo o fluxo DEVE ser operável por teclado: busca, chips, mapa (setas + Enter), painel (abas), voltar, pausa e tabela. O foco DEVE ser visível (anel de 3 px).
- Aceite: AT-025.

### RF-042 — Tabela alternativa
Cada tela com mapa DEVE oferecer "Ver dados em tabela" com as mesmas informações (escopo, líder, votos, %, apurado), em `<table>` semântica.
- A tabela DEVE ser paginada em 100 linhas por página e ter busca própria pelo nome do escopo; a paginação é anunciada em `aria-live` e navegável por teclado.
- Municípios sem geometria DEVEM constar da tabela, marcados com "geometria indisponível" (RF-010, RN-028).
- A v1 NÃO exporta CSV nem outro formato de arquivo.
- Aceite: AT-025.

### RF-043 — URLs compartilháveis
O estado da tela DEVE ser reproduzível por URL: `/br`, `/br/{uf}`, `/br/{uf}/{municipio}`, com `?pleito=` e `?cargo=` quando diferentes do padrão. Metadados OG/Twitter DEVEM refletir o escopo.
- Forma canônica: UF em minúsculas e município em slug ASCII (NFD, sem acento, minúsculas, hífens, sem pontuação, ≤ 80 caracteres). Código IBGE e alias antigo redirecionam com `301` para o slug; escopo desconhecido responde `404` com a busca aberta (RN-018, RN-041).
- Os metadados OG/Twitter DEVEM ser pré-renderizados no build para `/br`, as 27 UFs e os 100 municípios de maior eleitorado; os demais municípios usam metadado genérico, com o nome do município no `<title>` do HTML estático. Esse limite DEVE ser documentado em [08](08-arquitetura-e-stack.md).
- Aceite: AT-026.

### RF-044 — Transparência e não oficialidade
Toda página DEVE exibir: "Fonte: Tribunal Superior Eleitoral", link para a fonte, horário do dado e o aviso "Este site não é um serviço oficial do TSE." NÃO DEVE haver qualquer marca do TSE que sugira endosso.
- A atribuição e o aviso de não oficialidade DEVEM estar no HTML estático inicial, fora do JavaScript da aplicação, visíveis sem JS e para crawlers, em todas as rotas, inclusive nos deep links.
- Aceite: AT-027.

### RF-045 — Tratamento de erro
Falhas de rede, 404 de escopo inexistente e erros 5xx DEVEM produzir mensagens em pt-BR, sem tela branca, com ação de tentar novamente; 404 de município inexistente DEVE sugerir a busca.
- Os estados especiais também DEVEM ter texto próprio, sem tela branca e sem ação de "tentar novamente" quando não houver falha de fonte: `sem_voto`, `sem_dado`, `nao_aplicavel`, `sem_lider_elegivel`, `retificado`, `arquivado`, `fonte_sem_atualizacao`, `municipio_fora_do_pleito`, `geometria_indisponivel` e `corrida_reiniciada`. Os rótulos são os de RN-035 e os textos finais estão em [07](07-ux-mapa-e-animacoes.md) §1.2 e §8.
- Trocar de pleito com um município aberto que não participa do novo pleito DEVE produzir o toast não bloqueante "Município não participa deste pleito", além do comportamento de RF-005.
- Aceite: AT-018, AT-026.

## H. Pleitos passados e arquivados

### RF-046 — Pleitos passados e arquivados
O seletor DEVE agrupar os pleitos em "Em apuração", "Finalizados" e "Arquivados".
- Pleito finalizado ou passado DEVE exibir o selo "Resultado final" e nunca se apresentar como apuração ao vivo.
- Pleito finalizado NÃO DEVE usar a cadência de 5 s: a coleta no servidor passa a 30 min e a atualização no cliente a 60 s (RN-012).
- A cena final (RF-038) roda uma única vez por aba também em pleito passado, e o botão "Rever cena" continua disponível.
- A URL DEVE sempre incluir `pleito=`, inclusive quando o pleito exibido é o padrão de RN-002.
- Turno ou pleito `arquivado` (RF-002) aparece somente no grupo "Arquivados" e NUNCA é escolhido como pleito padrão.
- Aceite: AT-001, AT-023.

## Matriz resumida

| Grupo | Requisitos |
|---|---|
| Catálogo e seleção | RF-001 a RF-007 |
| Mapa e navegação | RF-008 a RF-019 |
| Votos e detalhes | RF-020 a RF-025 |
| Busca | RF-026 a RF-029 |
| Atualização e estado | RF-030 a RF-034 |
| Animação | RF-035 a RF-040 |
| Acessibilidade e transparência | RF-041 a RF-045 |
| Pleitos passados e arquivados | RF-046 |
