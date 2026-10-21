# CONTEXT — glossário e modelo mental

Vocabulário único do projeto. Se um termo não estiver aqui, consulte o TSE antes de criar sinônimo. Nomes de código usam o termo em inglês indicado entre parênteses.

## Eleição

| Termo | Definição | Código |
|---|---|---|
| **Pleito** | O conjunto de eleições de uma mesma data (ex.: 04/10/2026, código 3220). Um pleito tem um ou mais turnos. | `pleito` (`electionRound` no TSE; `pleito` no domínio) |
| **Eleição** | A disputa de um conjunto de cargos em um turno (ex.: 6257, Eleição Geral Federal 2026 1º turno). Guarda `ciclo` (`ele2026`), `codigo` (`6257`) e `turno` (`1`). | `election` |
| **Ciclo** | Pasta do ano eleitoral no TSE (`ele2026`, `ele2024`). | `cycle` |
| **Turno** | 1º ou 2º turno. O 2º turno é uma eleição distinta (`cdt2` aponta para ela). | `round` |
| **Abrangência** | Recorte territorial de uma eleição: país (`br`), UF (`sp`) ou município (`71072`). | `scope` |
| **Cargo** | Posição em disputa (Presidente, Governador, Senador, Deputado Federal, Deputado Estadual, Deputado Distrital, Prefeito, Vereador). No catálogo, `cd` é o código e `tp` indica majoritário (`1`) ou proporcional (`2`). | `office` |
| **Cargo majoritário** | Elegível por maioria: Presidente, Governador, Senador, Prefeito. | `majorityOffice` |
| **Cargo proporcional** | Elegível por quociente: Deputado Federal, Estadual, Distrital, Vereador. | `proportionalOffice` |
| **Chapa** | Candidato a titular + vice (majoritário) ou titular + suplentes (Senador). | `ticket` |
| **Coligação** | Aliança de partidos em uma eleição; aparece no campo `agr` quando o agrupamento é coligação. | `coalition` |
| **Federação** | Agrupamento partidário permanente (ex.: PT/PC do B/PV). Aparece em `fed`. | `federation` |
| **Partido** | Agremiação do candidato (`par.sg`). É a unidade da cor do mapa. | `party` |

## Apuração

| Termo | Definição | Código |
|---|---|---|
| **Totalização** | Processo oficial de somar os boletins de urna. Produz os arquivos que consumimos. | `count` |
| **Apuração** | Grau de conclusão da totalização: seções totalizadas / seções instaladas. Na tela, "% apurado". | `progress` |
| **Seção eleitoral** | Menor unidade de votação. `s.ts` = total, `s.st` = totalizadas, `s.pst` = percentual. | `section` |
| **Zona eleitoral** | Agrupamento de seções dentro de um município. | `zone` |
| **BU (Boletim de Urna)** | Registro impresso/digital de cada urna; origem dos votos. | `ballot` |
| **Voto válido** | Voto nominal + voto de legenda, excluindo brancos e nulos. Base do percentual do candidato. | `validVotes` |
| **Voto nominal** | Voto dado diretamente a um candidato (`vap` no arquivo). | `nominalVotes` |
| **Voto de legenda** | Voto no partido, sem candidato. | `partyVotes` |
| **Voto branco / nulo** | Não contam para candidato; aparecem no resumo do cargo. | `blank` / `null` |
| **Anulado** | Voto invalidado por decisão judicial (`dvt = Anulado`). Não define líder. | `annulled` |
| **Anulado sub judice** | Voto válido sob condição judicial (`dvt = Anulado sub judice`). Não define líder. | `subJudice` |
| **Válido (legenda)** | Voto de legenda atribuído ao partido (`dvt = Válido (legenda)`). Não define líder de cargo majoritário. | `partyOnly` |
| **Destinação do voto** | Classificação oficial do voto do candidato (`dvt`). | `voteDestination` |
| **Eleito** | Candidato com `e = s` no arquivo de resultados. | `elected` |
| **2º turno** | Situação do candidato (`st = 2º turno`) quando se classificou. | `runoff` |
| **Totalização finalizada** | Indicador `tf = s` no arquivo. Todos os arquivos ativos com `tf = s` significa fim da apuração daquele cargo/escopo. | `countFinished` |
| **Geração** | `idg` (id) e `dg`/`hg` (data/hora de geração) identificam uma versão do arquivo. Use para detectar mudança. | `generation` |

## Nosso sistema

| Termo | Definição | Código |
|---|---|---|
| **Snapshot** | Retrato normalizado e imutável de um escopo/cargo em uma geração do TSE. Tem `versao`, `geradoEm`, `fonte` e `parserVersion`. | `snapshot` |
| **Origem de fallback** | Objeto `{ pleito, turno, generationId, generatedAt }` que identifica de onde veio o snapshot quando o turno/pleito vigente não tem o cargo. `null` = dado vigente. | `origem` |
| **catalogVersion** | Hash do catálogo normalizado; muda quando muda o conjunto de pleitos, turnos, cargos ou abrangências. Governa a vida útil (24 h → `arquivado`) de pleito/cargo que desaparece. | `catalogVersion` |
| **parserVersion** | Versão semver do parser que produziu o snapshot; permite fixar a versão anterior por flag e fazer rollback. | `parserVersion` |
| **Panorama** | Snapshot nacional com todos os estados e a cor calculada de cada um. | `panorama` |
| **Líder** | Candidato com mais votos válidos no escopo/cargo, após as regras RN-005 a RN-009 e RN-021. | `leader` |
| **Cargo em destaque** | Maior cargo em disputa no escopo, pela hierarquia de RN-005. Define a cor do estado. | `featuredOffice` |
| **Cor do estado** | Preenchimento do polígono com a cor do partido do líder do cargo em destaque; não existe cor de identidade por UF. Sem líder, segue RN-035; a troca obedece à histerese de RN-038. | `stateColor` |
| **Sem voto** (`sem_voto`) | O arquivo existe e não há voto válido. Preenchimento branco, rótulo "Aguardando o primeiro boletim". Diferente de `0` sem arquivo. | `status: "sem_voto"` |
| **Sem dado** (`sem_dado`) | O cargo se aplica ao escopo/turno, mas nenhum arquivo foi coletado. Cinza médio, "Sem dados"; API devolve `dados: null`. | `status: "sem_dado"` |
| **Não aplicável** (`nao_aplicavel`) | O cargo não existe naquele escopo/turno e não há fallback. Cinza claro com diagonal, "Não se aplica". | `status: "nao_aplicavel"` |
| **Sem líder elegível** (`sem_lider_elegivel`) | Há votos válidos, mas nenhum candidato com `dvt = "Válido"`. Cinza escuro, "Aguardando definição judicial". | `status: "sem_lider_elegivel"` |
| **Retificado** (`retificado`) | Geração do TSE com diminuição de votos aceita como oficial. Flag acumulável, badge "dados retificados pelo TSE" por 60 min ou 3 gerações sem regressão. | `retificado` |
| **Frescor** | Três idades independentes: geração do TSE (`sourceAge`), nossa coleta (`collectedAge`) e snapshot servido (`snapshotAge`); o estado é derivado de RN-039. | `freshness` |
| **sourceAge** | `agora − fonte.generatedAt`: há quanto tempo o TSE gerou o arquivo. | `sourceAge` |
| **collectedAge** | `agora − fonte.collectedAt`: há quanto tempo coletamos com sucesso. | `collectedAge` |
| **snapshotAge** | `agora − snapshot.gravadoEm`: idade do objeto imutável servido. | `snapshotAge` |
| **Modo real** | Coleta dos arquivos oficiais do TSE. | `DATA_MODE=real` |
| **Modo fake** | Simulador local com replay ou dados sintéticos; mesmo contrato da API. | `DATA_MODE=fake` |
| **Replay** | Reprodução acelerada de uma apuração real gravada em fixtures. | `replay` |
| **Cenário** | Roteiro do simulador (virada, empate, fim, sem votos). | `scenario` |
| **Corrida** | Animação do rodapé com dois cavalos. | `race` |
| **Ultrapassagem** | Inversão sustentada da liderança que dispara o balão de relincho. | `overtake` |

## Mapa TSE → domínio

Arquivo unificado (`*-u.json`), por escopo e cargo:

| TSE | Significado | Nosso campo |
|---|---|---|
| `ele` | código da eleição | `election.code` |
| `t` | turno | `election.round` |
| `f` | fase (`o` = oficial) | `election.phase` |
| `tpabr` / `cdabr` | tipo e código da abrangência | `scope.type` / `scope.id` |
| `dg` / `hg` | data/hora de geração | `source.generatedAt` |
| `idg` | id da geração | `source.generationId` |
| `dt` / `ht` | data/hora da última atualização de dados | `source.updatedAt` |
| `dv` | divulgação habilitada | `source.published` |
| `tf` | totalização finalizada | `count.finished` |
| `and` | andamento | `count.status` |
| `s.st` / `s.ts` / `s.pst` | seções totalizadas / total / % | `count.sections` |
| `e.*` | eleitorado e comparecimento | `electorate` |
| `v.*` | votos (válidos, brancos, nulos) | `votes.summary` |
| `carg[].cd` / `nmn` | código e nome do cargo | `office.id` / `office.name` |
| `carg[].agr[].par[]` | partido/coligação | `party` |
| `par[].sg` | sigla do partido | `party.acronym` |
| `par[].cand[]` | candidatos do partido | `candidates[]` |
| `cand[].n` | número do candidato | `candidate.number` |
| `cand[].nm` / `nmu` | nome completo / nome de urna | `candidate.name` / `candidate.ballotName` |
| `cand[].sqcand` | sequencial do candidato | `candidate.id` |
| `cand[].vap` / `pvap` | votos e percentual | `candidate.votes` / `candidate.share` |
| `cand[].dvt` | destinação do voto | `candidate.voteDestination` |
| `cand[].e` / `st` | eleito / situação | `candidate.elected` / `candidate.status` |
| `cand[].vs[]` | vice/suplentes | `candidate.runningMates[]` |
| `npar` / `com` | partidos da federação/coligação | `party.composition` |

Arquivo de abrangência (`*-ab.json`): `abr[].cdabr`, `abr[].s.pst`, `abr[].munf`, `abr[].dt/ht` → progresso por UF.

Arquivo de municípios (`mun-e*.json`): `abr[].cd` (UF), `mu[].cd` (código TSE de 5 dígitos), `mu[].cdi` (código IBGE de 7 dígitos), `mu[].nm` → catálogo territorial.

Catálogo (`oficial/comum/config/ele-c.json`): `pl[].cd`, `pl[].c`, `pl[].e[].cd`, `pl[].e[].t`, `pl[].e[].abr[].cp[]` → pleitos, turnos e cargos.
