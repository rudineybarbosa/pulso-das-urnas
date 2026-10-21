# Feature Specification: Apuração em tempo real

**Feature Branch**: `001-apuracao-tempo-real`

**Created**: 2026-10-20

**Status**: Approved

**Input**: Acompanhar a apuração das eleições brasileiras em tempo real, com mapa do Brasil clicável, votos por cidade, cores por partido e animação de corrida de cavalinhos.

> Esta é a spec canônica do Spec Kit para a v1. Os detalhes normativos por requisito estão em [docs/requisitos](../../docs/requisitos/), e o design aprovado em [docs/superpowers/specs](../../docs/superpowers/specs/2026-10-20-pulso-das-urnas-design.md).

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

### User Story 3 — Acompanhar a virada e a corrida (Priority: P2)

Como espectador, quero deixar a página aberta e ver as cores mudarem e os cavalinhos disputarem, para sentir a apuração acontecendo.

**Why this priority**: diferencia o produto e torna a espera compreensível, mas depende do mapa e dos dados.

**Independent Test**: rodar o cenário de virada, observar a mudança de cor, a ultrapassagem e o balão de relincho; ao final, a cena de encerramento.

**Acceptance Scenarios**:

1. **Given** dois candidatos no maior cargo nacional, **When** a apuração avança, **Then** os cavalos avançam e a distância reflete a diferença de votos.
2. **Given** que a liderança inverte de forma sustentada, **When** o snapshot chega, **Then** o cavalo que assumiu a frente solta o balão "Relincho!" por até 1,2 s.
3. **Given** que a apuração terminou, **When** a última geração é recebida, **Then** o vencedor dá uma lambida carinhosa, o perdedor deita e o texto anuncia o resultado sem ofensa.

---

### User Story 4 — Usar sem enxergar cor e sem movimento (Priority: P2)

Como pessoa com baixa visão ou sensibilidade a movimento, quero navegar por teclado e ler os mesmos dados em tabela, sem animação obrigatória.

**Why this priority**: acessibilidade é requisito legal e de produto, não um extra.

**Independent Test**: percorrer busca → estado → cidade apenas com teclado, com `prefers-reduced-motion` ativo, e ler a tabela alternativa.

**Acceptance Scenarios**:

1. **Given** o teclado, **When** navego pelo mapa, **Then** cada estado/município recebe foco visível e anuncia nome, líder e percentual.
2. **Given** `prefers-reduced-motion: reduce`, **When** a página abre, **Then** não há corrida nem zoom animado, e os números continuam disponíveis.
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
- Mudança de pleito/cargo com a página aberta: URL, mapa, painel e corrida se atualizam juntos.
- Voto diminuindo entre gerações: aceitar retificação oficial, marcar e nunca exibir negativo.

## Requirements

### Functional Requirements

- **FR-001**: O sistema DEVE descobrir pleitos, turnos e cargos a partir do catálogo oficial, sem lista fixa (RF-001..RF-004).
- **FR-002**: O sistema DEVE determinar o maior cargo em disputa por escopo e usá-lo para a cor do estado (RF-007, RN-005).
- **FR-003**: O sistema DEVE pintar cada estado com a cor do partido do líder em votos válidos, branco sem votos e cinza sem dado (RF-013..RF-017).
- **FR-004**: O usuário DEVE poder dar zoom do Brasil para o estado e do estado para o município, com botão "Voltar" por nível (RF-009..RF-012).
- **FR-005**: O painel DEVE listar candidatos por votos, com partido, percentual sobre válidos, situação e resumo do cargo (RF-020..RF-024).
- **FR-006**: A busca DEVE aceitar nome de estado, sigla e nome de município, ignorando caixa e acento, com desambiguação por UF (RF-026..RF-029).
- **FR-007**: A página DEVE se atualizar automaticamente e mostrar fonte, horário, percentual apurado e estado do dado (RF-030..RF-034).
- **FR-008**: A corrida DEVE usar dois candidatos do maior cargo nacional, avanço pela apuração e distância pela diferença de votos, com relincho na ultrapassagem e cena final afetuosa (RF-035..RF-038).
- **FR-009**: O usuário DEVE poder pausar a animação, e `prefers-reduced-motion` DEVE substituí-la por uma barra estática (RF-039, RF-040).
- **FR-010**: Todo o fluxo DEVE ser operável por teclado e ter alternativa em tabela (RF-041, RF-042).
- **FR-011**: O estado da tela DEVE ser reproduzível por URL e as metatags OG DEVEM refletir o recorte (RF-043).
- **FR-012**: Toda tela com dado DEVE atribuir a fonte, informar o horário e declarar não oficialidade (RF-044).
- **FR-013**: O sistema DEVE degradar com mensagem e ação quando a fonte falhar ou o escopo não existir (RF-045).
- **FR-014**: O produto NÃO DEVE coletar dados pessoais, usar cookies de rastreio ou exigir login.

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
- **SC-007**: Uma pessoa que não distingue cor ou não quer movimento conclui a mesma tarefa que as demais.
- **SC-008**: Nenhum número exibido diverge do arquivo oficial da geração informada em auditoria por amostragem.

## Assumptions

- A fonte oficial é pública, sem autenticação e com latência de dezenas de segundos.
- O catálogo oficial identifica pleitos, turnos e cargos de forma suficiente.
- O pico de acesso ocorre nas primeiras horas e no encerramento.
- O produto é somente leitura e não há dado pessoal.
- A v1 cobre granularidade de município, não de zona/seção.
- A arte dos cavalos é original e não usa personagens de terceiros.
