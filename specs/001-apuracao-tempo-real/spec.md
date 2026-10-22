# Feature Specification: Apuração em tempo real

**Feature Branch**: `001-apuracao-tempo-real`

**Created**: 2026-10-20

**Status**: Approved

**Input**: Acompanhar a apuração das eleições brasileiras em tempo real, com mapa do Brasil clicável, votos por cidade, cores por partido e um monitor de pulso animado.

> Esta é a spec canônica do Spec Kit para a v1. Os detalhes normativos por requisito estão em [docs/requisitos](../../docs/requisitos/), e o design aprovado em [docs/superpowers/specs](../../docs/superpowers/specs/2026-10-20-pulso-das-urnas-design.md).

## Recorte desta implementação

Decidido no [grill-me](grilling.md):

- **Entrega vertical end-to-end**: contratos, domínio, parser do TSE, API, mapa, painel, busca, monitor de pulso e testes, com infraestrutura pronta para aplicar.
- **Dois modos de dados**: `fake` (replay e cenários, padrão local) e `real` (TSE apenas no servidor).
- **Sem deploy em nuvem nesta execução**: Terraform é validado com `fmt`/`validate`/`plan`; o apply é humano (Q-02).
- **Fora**: login, admin, fotos, áudio, SSE/telão, CSV, push, outros idiomas e dados por zona/seção.
- **Prova**: ATs da fatia verdes, convergência, revisão sem bloqueio e `prova-de-entrega` na URL local.

## Decisões de aceite

1. A primeira tela útil é o mapa do Brasil com os 27 estados e a cor do líder do maior cargo (US1).
2. O drill-down completo (estado → município → painel) é obrigatório na entrega, não opcional (US2).
3. O monitor de pulso e a cena final são parte da entrega, não "fase futura" (US3).
4. Acessibilidade e modo fake são critérios de aceite, não polish (US4).
5. Nenhum número exibido pode existir fora do snapshot com fonte e horário (US5).

## User Scenarios & Testing

### User Story 1 — Entender o país e o meu estado (Priority: P1)

Como eleitor, quero abrir o site e ver, no mapa do Brasil, qual partido lidera o maior cargo em disputa em cada estado, para entender o cenário em segundos.

**Why this priority**: é o valor central do produto; sem isso não há painel.

**Independent Test**: abrir a página raiz em modo de demonstração e conferir que 27 estados são coloridos (ou brancos/cinza) e que o tooltip mostra líder, partido, votos, percentual e apuração.

**Acceptance Scenarios**:

1. **Given** que a apuração não começou, **When** abro a página, **Then** todos os estados estão brancos e há a mensagem de espera do primeiro boletim.
2. **Given** que há votos para presidente e governador em um estado, **When** o mapa é exibido, **Then** a cor é a do líder de presidente, o maior cargo.
3. **Given** um estado sem arquivo de resultado, **When** o mapa é exibido, **Then** ele aparece cinza com "sem dados", nunca com número inventado.

---

### User Story 2 — Chegar à minha cidade e ver os votos (Priority: P1)

Como eleitor, quero buscar minha cidade, dar zoom no estado e ver os votos de cada candidato, para saber quem ganhou onde eu moro.

**Why this priority**: é a segunda pergunta de todo eleitor e justifica o drill-down.

**Independent Test**: buscar "São Paulo", escolher o município, conferir o painel com candidatos ordenados e voltar dois níveis com o botão "Voltar".

**Acceptance Scenarios**:

1. **Given** o campo de busca, **When** digito "sao paulo", **Then** vejo estado e município com UF, no máximo 10 sugestões.
2. **Given** um município selecionado, **When** o painel abre, **Then** os candidatos estão ordenados por votos, com partido, percentual e situação.
3. **Given** que estou em um município, **When** aciono "Voltar", **Then** retorno ao estado; ao acionar de novo, ao Brasil.

---

### User Story 3 — Acompanhar a virada no monitor de pulso (Priority: P2)

Como espectador, quero deixar a página aberta e ver as cores mudarem e as linhas de pulso disputarem, para sentir a apuração acontecendo.

**Why this priority**: diferencia o produto e torna a espera compreensível, mas depende do mapa e dos dados.

**Independent Test**: rodar o cenário de virada, observar a mudança de cor, a inversão de liderança e o selo "PULSO!"; ao final, a cena de encerramento.

**Acceptance Scenarios**:

1. **Given** dois candidatos no maior cargo nacional, **When** a apuração avança, **Then** as linhas de pulso rolam e a linha do líder fica mais alta, com distância proporcional à diferença de votos.
2. **Given** que a liderança inverte de forma sustentada, **When** o snapshot chega, **Then** as linhas trocam de altura e o selo "PULSO!" aparece por até 1,6 s.
3. **Given** que a apuração terminou, **When** a última geração é recebida, **Then** um coração na cor do vencedor é desenhado e o texto anuncia o resultado sem ofensa.

---

### User Story 4 — Usar sem enxergar cor e sem movimento (Priority: P2)

Como pessoa com baixa visão ou sensibilidade a movimento, quero navegar por teclado e ler os mesmos dados em tabela, sem animação obrigatória.

**Why this priority**: acessibilidade é requisito legal e de produto, não um extra.

**Independent Test**: percorrer busca → estado → cidade apenas com teclado, com `prefers-reduced-motion` ativo, e ler a tabela alternativa.

**Acceptance Scenarios**:

1. **Given** o teclado, **When** navego pelo mapa, **Then** cada estado/município recebe foco visível e anuncia nome, líder e percentual.
2. **Given** `prefers-reduced-motion: reduce`, **When** a página abre, **Then** não há rolagem de pulso nem zoom animado, e os números continuam disponíveis.
3. **Given** a tabela alternativa, **When** a abro, **Then** encontro os mesmos dados do mapa com fonte e horário.

---

### User Story 5 — Conferir e citar (Priority: P3)

Como jornalista, quero conferir a fonte, o horário e o percentual apurado, e compartilhar uma URL que reproduza o recorte.

**Why this priority**: confiança e circulação, depois do essencial.

**Independent Test**: abrir `/br/sp/salvador?pleito=6259&cargo=3` em outra sessão e verificar o mesmo estado, município, pleito e cargo, com metatags corretas.

**Acceptance Scenarios**:

1. **Given** uma tela com números, **When** leio o rodapé, **Then** encontro "Fonte: Tribunal Superior Eleitoral", horário do dado e o aviso de não oficialidade.
2. **Given** uma URL compartilhada, **When** outra pessoa abre, **Then** vê o mesmo recorte e o mesmo cargo.
3. **Given** que a fonte atrasou, **When** o dado tem mais de 90 s, **Then** o selo indica "desatualizado" e mantém os números.

### Edge Cases

- Fonte indisponível por mais de 10 min: serve o último snapshot com selo vermelho; nunca zera.
- Empate exato: hachura neutra e rótulo "Empate".
- Todos os candidatos anulados/sub judice: "Aguardando definição judicial", sem líder.
- 2º turno sem disputa em um estado: usa o resultado final do 1º turno, sinalizado.
- Municípios homônimos: sempre acompanhados da UF.
- Mudança de pleito/cargo com a página aberta: URL, mapa, painel e monitor se atualizam juntos.
- Voto diminuindo entre gerações: aceitar retificação oficial, marcar e nunca exibir negativo.

## Requirements

### Functional Requirements

- **FR-001**: O sistema DEVE descobrir pleitos, turnos e cargos a partir do catálogo oficial, sem lista fixa, incluindo os cargos de cada escopo — país, UF e município (RF-001..RF-004, RN-001, RN-004).
- **FR-002**: O sistema DEVE determinar o maior cargo em disputa por escopo e usá-lo para a cor do estado (RF-007, RN-005).
- **FR-003**: "Cor do estado" significa o **preenchimento** com a cor do partido do líder em votos válidos; não existe cor de identidade por estado. Branco é ausência de voto, cinza é ausência de dado (RF-013..RF-017, RN-006).
- **FR-004**: O usuário DEVE poder dar zoom do Brasil para o estado e do estado para o município, com botão "Voltar" por nível; cada nível DEVE oferecer apenas os cargos em disputa naquele escopo (RF-004, RF-009..RF-012, RN-004).
- **FR-005**: O painel DEVE listar candidatos por votos, com partido, percentual sobre válidos, situação e resumo do cargo; o cargo selecionado persiste ao trocar de pleito ou escopo quando existe no novo escopo e, quando não existe, a tela volta ao cargo em destaque com aviso não bloqueante (RF-005, RF-006, RF-020..RF-024, RN-036).
- **FR-006**: A busca DEVE aceitar nome de estado, sigla e nome de município, ignorando caixa e acento, com desambiguação por UF (RF-026..RF-029).
- **FR-007**: A página DEVE se atualizar automaticamente e mostrar fonte, horário, percentual apurado e estado do dado, distinguindo as três idades de frescor — geração no TSE, coleta própria e idade do snapshot (RF-030..RF-034, RN-013, RN-039).
- **FR-008**: O monitor de pulso DEVE usar dois candidatos do maior cargo nacional, duas linhas de ECG com a do líder mais alta, distância derivada da diferença de votos, selo "PULSO!" na inversão e coração no encerramento (RF-035..RF-038).
- **FR-009**: O usuário DEVE poder pausar a animação, e `prefers-reduced-motion` DEVE substituí-la por uma barra estática (RF-039, RF-040).
- **FR-010**: Todo o fluxo DEVE ser operável por teclado, com foco gerenciado após cada mudança de nível, e ter alternativa em tabela; anúncios de mudança DEVEM ir para `aria-live` agregado (no máximo 1 anúncio/10 s, prioridade: líder do escopo selecionado, líder nacional, fim da apuração), com o restante em uma região de resumo sem interrupção (RF-041, RF-042, RNF-A11Y-06).
- **FR-011**: O estado da tela DEVE ser reproduzível por URL canônica, e as metatags OG/Twitter DEVEM refletir o recorte nos escopos pré-renderizados (RF-043, RN-018, RN-041).
- **FR-012**: Toda tela com dado DEVE atribuir a fonte, informar o horário e declarar não oficialidade, inclusive no HTML estático inicial (RF-044).
- **FR-013**: O sistema DEVE degradar com mensagem e ação quando a fonte falhar ou o escopo não existir, e DEVE distinguir `sem_dado`, `nao_aplicavel` e `sem_lider_elegivel` de erro de fonte (RF-017, RF-045, RN-021, RN-028).
- **FR-014**: O produto NÃO DEVE coletar dados pessoais, usar cookies de rastreio ou exigir login; nenhuma requisição a domínio de terceiro e `localStorage` só com chaves `pulso:*` (AT-033).
- **FR-015**: O produto DEVE exibir pleitos passados e arquivados, agrupados no seletor e sinalizados como "Resultado final", sem polling de 5 s e sem se apresentar como apuração ao vivo (RF-002, RF-046, RN-012, RN-037).
- **FR-016**: A URL canônica de município DEVE usar UF em minúsculas e slug ASCII, aceitar código IBGE com redirect `301` e responder `404` com busca para escopo desconhecido (RF-043, RN-018, RN-041).

### Key Entities

- **Pleito/Turno**: data eleitoral com eleições e cargos.
- **Escopo**: país, UF ou município, com código canônico.
- **Cargo**: posição em disputa, majoritária ou proporcional, com hierarquia.
- **Candidato**: nome, número, partido, votos, destinação e situação.
- **Snapshot**: retrato imutável de escopo/cargo em uma geração oficial, com fonte e horário.
- **Cor partidária**: associação versionada entre sigla e cor.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Uma pessoa entende quem lidera no próprio estado em menos de 10 segundos após abrir.
- **SC-002**: Chegar aos votos da própria cidade leva no máximo 3 ações a partir da abertura.
- **SC-003**: 100% das telas com número exibem fonte, horário e percentual apurado.
- **SC-004**: O mapa interativo aparece em até 2,5 s no percentil 75 em conexão 4G.
- **SC-005**: 10.000 pessoas conseguem acompanhar simultaneamente, com menos de 0,1% de erro.
- **SC-006**: O custo na semana eleitoral fica abaixo de US$ 10.
- **SC-007**: 5 de 5 participantes que usam apenas teclado e `prefers-reduced-motion` completam a tarefa "abrir `/br`, identificar o partido que lidera o próprio estado e abrir os votos da própria cidade" em ≤ 3 ações e ≤ 60 s, com os mesmos números que a versão com mouse e animação.
- **SC-008**: Nenhum número exibido diverge do arquivo oficial da geração informada em auditoria por amostragem.

## Assumptions

- A fonte oficial é pública, sem autenticação e com latência de dezenas de segundos.
- O catálogo oficial identifica pleitos, turnos e cargos de forma suficiente.
- O pico de acesso ocorre nas primeiras horas e no encerramento.
- O produto é somente leitura e não há dado pessoal.
- A v1 cobre granularidade de município, não de zona/seção.
- O monitor de pulso é uma ilustração original do projeto, sem marca de terceiro; a arte anterior de cavalos foi retirada em 22/10/2026 (ADR-006).
- OG/Twitter são pré-renderizados apenas para `/br`, as 27 UFs e os 100 municípios de maior eleitorado; os demais municípios usam metadado genérico com o nome no `<title>`. Esse limite é aceito e documentado em `08-arquitetura-e-stack.md`.
- Dados de pleitos passados são exibidos como resultado final, nunca como apuração ao vivo.
