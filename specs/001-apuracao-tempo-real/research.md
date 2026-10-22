# Research — decisões para fechar o checklist v1

**Feature**: `001-apuracao-tempo-real` · **Data**: 2026-10-20 · **Status**: decidido pelo mantenedor na revisão do checklist

Cada decisão fecha um item do checklist `checklists/requisitos-v1.md` (CHK001–CHK052). A coluna "Aplica em" indica onde a decisão vira requisito normativo. Nenhum item do checklist é marcado por agente; esta é a fonte da resolução.

## Decisões de produto, escopo e catálogo

| ID | Decisão | Aplica em |
|---|---|---|
| **D-001** (CHK001) | Adotar cinco estados de ausência: `sem_voto` (arquivo existe, 0 válido), `sem_dado` (cargo se aplica, arquivo ausente), `nao_aplicavel` (cargo não existe naquele escopo/turno e não há fallback), `sem_lider_elegivel` (há válidos, nenhum candidato elegível) e `retificado` (geração com correção). Nunca confundir com erro de fonte. | RN-009, RN-028, RF-013, RF-017, AT-010 |
| **D-002** (CHK002) | "Cor predominante do estado" é o **preenchimento** com a cor do partido do líder; não existe cor de identidade por estado. Registrar como definição normativa. | RN-006, DESIGN §5, Spec FR-003 |
| **D-003** (CHK003) | Expor cargos por município, derivados do catálogo: eleição geral = cargos da UF; municipal = Prefeito/Vereador; DF = Distrital. Endpoints `GET /escopos/{uf}/cargos` e `GET /municipios/{ibge}/cargos`. | RF-004, Contrato §3, RN-004 |
| **D-004** (CHK004) | Ao trocar pleito/estado, manter o cargo se ele existir no novo escopo; senão voltar ao cargo em destaque com aviso não bloqueante "Cargo X não está em disputa aqui; exibindo Y". A URL só muda por ação explícita do usuário. Deep link com cargo inválido → redireciona para o destaque com aviso. | RN-036, RF-005, RF-006 |
| **D-005** (CHK005) | Catálogo tem `catalogVersion`. Se um pleito/cargo desaparecer: manter o último snapshot por 24 h com selo "catálogo atualizado"; depois marcar `arquivado` e remover do seletor. Turno novo entra automaticamente e é marcado como mais recente. | RN-037, RF-001, RF-002 |
| **D-006** (CHK006) | Seletor agrupa "Em apuração", "Finalizados" e "Arquivados". Pleito passado exibe selo "Resultado final", não faz polling de 5 s (usa 30 min) e a cena final roda uma vez. URL sempre inclui `pleito=`. | RF-046, UX §1, RN-012 |
| **D-007** (CHK007) | Hierarquia de cargos exaustiva: Presidente 10, Governador 20, Senador 30, Dep. Federal 40, Dep. Estadual 50, Dep. Distrital 51, Prefeito 60, Vereador 70, Conselheiro Distrital 80, desconhecido 90 (nome asc). Cargo `tp=3` (consulta popular) fica fora do mapa e do monitor. | RN-005, AT-004 |
| **D-008** (CHK008) | Cor com histerese: a liderança só muda se o novo líder superar o anterior por ≥ 0,5% dos válidos **ou** ≥ 500 votos, sustentado por 2 snapshots consecutivos (≥ 10 s). Abaixo disso, mantém a cor e marca "disputa acirrada" no detalhe; empate exato usa hachura. | RN-006, RN-038, AT-011 |
| **D-009** (CHK009) | Se há votos válidos e nenhum candidato elegível, o estado é `sem_lider_elegivel`: cinza com rótulo "Aguardando definição judicial". Voto de legenda conta no total válido, mas nunca elege líder sozinho. | RN-021, RN-028, AT-010 |
| **D-010** (CHK010) | Base do percentual é única por tela: `v.vv` oficial quando existir; senão soma dos `vap` válidos + legenda, rotulada "calculado". A API expõe `percentualBase: "oficial_validos" \| "calculado_validos"`. `pvap` oficial prevalece e é rotulado "percentual oficial do TSE". Nunca misturar bases. | RN-010, Contrato §3, AT-014 |
| **D-021** (CHK021) | Matriz de estados da tela inclui: carregando, `sem_voto`, parcial, finalizado, empate, `sem_dado`, `nao_aplicavel`, `sem_lider_elegivel`, `retificado`, desatualizado, fonte indisponível, 2º turno não iniciado, erro de escopo, offline e arquivado. | UX §1, RF-045 |
| **D-022** (CHK022) | 2º turno parcial: estados com disputa usam o arquivo do turno; estados sem disputa usam o resultado final do turno anterior com selo "1º turno". O monitor nacional usa apenas presidente do turno vigente. | RN-030, RN-009, AT-013 |
| **D-023** (CHK023) | Eleição suplementar aparece só no seletor e no escopo do próprio município; não altera cor nacional, ranking nacional nem monitor. | RN-031, RF-005 |
| **D-024** (CHK024) | Trocar pleito com cidade aberta: se o município participa, mantém e recarrega; se não, fecha o painel, mantém o estado, remove a cidade da URL e mostra toast "Município não participa deste pleito". | RN-036, RF-011, AT-026 |

## Clareza de dados, cor e frescor

| ID | Decisão | Aplica em |
|---|---|---|
| **D-011** (CHK011) | Distinguir visualmente: branco = sem voto; cinza médio = sem dado; cinza claro com diagonal = não aplicável; cinza escuro = sem líder elegível; cor + faixa âmbar = dado desatualizado; faixa vermelha = fonte indisponível. Erro de fonte nunca troca a cor do estado. | RN-028, RN-013, UX §1, DESIGN §5 |
| **D-012** (CHK012) | Cada estado muda de cor no máximo uma vez a cada 10 s; mudanças no mesmo ciclo são coalescidas. Transição de 400 ms; nada pisca mais de 3×/s. | RN-006, RNF-A11Y-05 |
| **D-013** (CHK013) | Escopo válido sem arquivo retorna **200** com `dados: null` e `status: "sem_dado"` (cacheável); `404` só para pleito/cargo/escopo inexistente. Remover `SEM_DADOS` da tabela de erros e usar o campo `status`. | Contrato §3–§4, RF-017, AT-010 |
| **D-014** (CHK014) | Frescor em três idades: `sourceAge` (agora − geração do TSE), `collectedAge` (agora − nossa coleta) e `snapshotAge`. "Ao vivo" exige coleta ≤ 90 s **e** geração ≤ 5 min durante a apuração. Coleta fresca de arquivo parado → "Fonte sem atualização há X" (âmbar). | RN-013, RF-031, AT-017 |
| **D-015** (CHK015) | Meta fim a fim: geração do TSE → pixel ≤ 30 s p95 e ≤ 15 s mediana, durante apuração ativa. Orçamento: ingestão 10 s + processamento 2 s + CDN 3 s + polling 5 s + render 2 s ≈ 22 s. | RNF-PERF-09, RN-040, AT-034 |
| **D-016** (CHK016) | Painel carrega **um cargo por vez** (≤ 12 KB gz por resposta); pré-busca apenas o cargo em destaque. Cada aba é uma consulta cacheável; trocar de aba não refaz o mapa. Cinco abas no máximo por município. | RF-021, Contrato §3.5, RNF-PERF-06 |
| **D-017** (CHK017) | Durante a apuração, `s-maxage + stale-while-revalidate + stale-if-error` ≤ 30 s no total. Após finalizar, até 6 h. | Contrato §3, RN-012 |
| **D-018** (CHK018) | Snapshot de fallback carrega `origem: { pleito, turno, generationId, generatedAt }`; a tela mostra selo "1º turno" e tooltip com a origem, sem esconder o horário do snapshot atual. | RN-009, Contrato §3.3 |
| **D-019** (CHK019) | Retificação: qualquer diminuição aceita o valor oficial e marca `retificado` por 60 min **ou** até 3 gerações consecutivas sem regressão (o que durar mais). Badge "dados retificados pelo TSE"; nunca exibir negativo. | RN-017, AT-029 |
| **D-020** (CHK020) | Nunca recalcular totais oficiais. Só derivar percentual quando `pvap` não existir, rotulado "calculado". A API expõe `calculado: true/false`. | RN-020, RN-010, Contrato |
| **D-028** (CHK028) | Município sem geometria aparece na tabela e na busca, mas não é clicável no mapa; tooltip "geometria indisponível"; faixa discreta no estado. Distinto de `sem_dado`. | RN-028, RF-010, RF-042 |
| **D-040** (CHK040) | URL canônica: `/br/{uf}/{slug}` com UF minúscula e slug ASCII (`NFD`, sem acento, minúsculas, hífens, sem pontuação, ≤ 80 chars). Código IBGE é aceito e redireciona 301 para o slug; homônimos sempre com UF; alias antigo 301; desconhecido → 404 com busca. | RN-018, RN-041, AT-026 |

## Animação e encerramento

| ID | Decisão | Aplica em |
|---|---|---|
| **D-025** (CHK025) | Candidato anulado/removido no meio: recalcular líder; a linha afetada é marcada "indisponível" e não disputa altura; se o conjunto dos dois primeiros mudar por 2 snapshots, o monitor reancora e anuncia "A leitura recomeçou: A e B". | RN-015, RN-021, AT-022 |
| **D-026** (CHK026) | Tabela alternativa paginada em 100 linhas com busca no escopo atual; sem exportação CSV na v1; impressão ignora a paginação. | RF-042, UX §6 |
| **D-027** (CHK027) | Offline congela os dados e mostra faixa; ao reconectar, uma única atualização condicional, sem reproduzir ultrapassagens perdidas e com reset suave da mola (velocidade 0 em 400 ms). | RF-032, UX §7.7 |
| **D-029** (CHK029) | Desempate para escolher as duas linhas: votos desc → nome de urna (`pt-BR`) → número. Determinístico e documentado. | RN-015 |
| **D-030** (CHK030) | Dupla fixa na sessão; troca só quando o conjunto muda por 2 snapshots (≥ 10 s), com reinício na posição atual e anúncio acessível. | RN-015, RF-035 |
| **D-031** (CHK031) | Fim por estabilidade exige: `p = 100` em todos os escopos ativos, 6 ciclos sem novo `idg` (≥ 60 s) **e** ≥ 10 min desde a última mudança de `idg`. Antes disso, "aguardando confirmação"; a cena não roda. | RN-014, AT-019 |
| **D-032** (CHK032) | Cena final roda uma vez por **aba** (`sessionStorage` `pulso:final-scene:{pleito}:{cargo}`); recarregar não repete; nova aba repete; botão "Rever cena" sempre disponível. `localStorage` guarda só a pausa. | RF-038, UX §7.4 |
| **D-033** (CHK033) | Ultrapassagem: `|g| ≥ 0,01`, sinal invertido em 2 snapshots consecutivos (≥ 5 s), cooldown 30 s por par. Oscilação abaixo de 0,01 não dispara. | RN-016, AT-022 |
| **D-034** (CHK034) | Lista de palavras proibidas: "derrotou", "arrasou", "humilhou", "esmagou", "vexame", "fraude", "roubo". Tratamento simétrico: mesmo tamanho, mesma saturação e mesma posição de destaque; perdedor não é dessaturado. Revisão editorial assina o checklist no PR. | RN-033, UX §8, AT-023 |
| **D-051** (CHK051) | O monitor de pulso é arte original do projeto, sem marca de terceiro (ADR-006); a arte de cavalos foi retirada. | UX §7, Spec Assumptions |

## Acessibilidade e conteúdo

| ID | Decisão | Aplica em |
|---|---|---|
| **D-035** (CHK035) | `aria-live` agrega por ciclo com prioridade: (1) líder do escopo selecionado, (2) líder nacional, (3) fim da apuração. Máximo 1 anúncio/10 s; o restante vai para uma região "resumo" sem interrupção. | RNF-A11Y-06, RF-041, UX §7 |
| **D-036** (CHK036) | Contraste não textual ≥ 3:1 entre preenchimentos adjacentes; se a cor do partido não atingir, aplicar contorno de 1 px com 3:1. Hachura de empate também ≥ 3:1. Texto sobre cor mantém 4,5:1. | RN-024, DESIGN §5 |
| **D-037** (CHK037) | Após zoom para estado, foco vai ao título do mapa do estado (`tabindex="-1"`); Tab alcança o primeiro município. Ao abrir cidade, foco vai ao título do painel. "Voltar" devolve o foco ao polígono que foi ativado. | RF-041, UX §4 |
| **D-038** (CHK038) | Microcopy completa para `nao_aplicavel`, `sem_lider_elegivel`, `retificado`, `arquivado`, `fonte_sem_atualizacao`, `municipio_fora_do_pleito`, `geometria_indisponivel`, `monitor_reiniciado`. | UX §8 |
| **D-039** (CHK039) | Atribuição e aviso de não oficialidade também no HTML estático inicial (fora do React), visíveis sem JS e para crawlers. | RF-044, AT-027 |
| **D-042** (CHK042) | CWV medido em `/br`, `/br/sp` e `/br/sp/sao-paulo`, mobile Moto G4 (4G 1,6 Mbps, RTT 150 ms) e desktop como secundário; p75 de 5 execuções no Lighthouse CI. | RNF-PERF-01..03, 10 §7 |
| **D-048** (CHK048) | Criar AT-033 para FR-014: nenhuma requisição a domínio de terceiro, nenhum cookie, `localStorage` só com chaves `pulso:*`, sem PII na API. Mapear na matriz. | Spec FR-014, AT-033, 12 |
| **D-049** (CHK049) | SC-007 vira tarefa mensurável: "abrir `/br`, identificar o líder do próprio estado e abrir os votos da própria cidade", 5/5 participantes com teclado e reduced motion, ≤ 3 ações, ≤ 60 s. | Spec SC-007, 10 |
| **D-052** (CHK052) | OG/Twitter: pré-renderizar `/br` e 27 UFs no build; 100 maiores municípios por eleitorado também; demais municípios usam OG genérico com nome no `<title>` via HTML estático por rewrite. Documentar o limite. | RF-043, 08 |

## NFRs, segurança, custo e operação

| ID | Decisão | Aplica em |
|---|---|---|
| **D-041** (CHK041) | Carga: k6 com 3 runners (São Paulo, Virgínia, Frankfurt), ambiente dev com CDN real, 5 min de platô, 10.000 VUs, mix 70% panorama / 20% município / 10% estático. Aprovação: erro < 0,1%, p95 edge < 150 ms, origin ≤ 5%, CPU < 80%, sem 5xx. | 10 §6, AT-032, RNF-ESC-01 |
| **D-043** (CHK043) | Tetos: dev ≤ US$ 1/mês; prod ≤ US$ 2/mês fora da eleição e ≤ US$ 10 na semana eleitoral. Alertas 50/80/100%. Kill switch documentado: `max-instances=0` na API e pausar o Scheduler; responsável e comando no runbook. | RNF-COST, 09 §6–§7 |
| **D-044** (CHK044) | Rate limit no **origin**: 300 req/min por IP, burst 600; clientes normais fazem ≤ 12/min e a CDN absorve o resto. NAT compartilhado não é penalizado no caminho cacheado. | RNF-SEC-04, 08 §8 |
| **D-045** (CHK045) | Logs de provedor/CDN com retenção de 30 dias, sem exportação; logs da aplicação sem IP completo. Página de privacidade cita provedores e retenção. | RNF-LGPD-03/05, 09 |
| **D-046** (CHK046) | SLO 99,9% na janela eleitoral; error budget de 43 min/mês; alerta com dono nominal (plantão) e escalonamento em 15 min. | RNF-OBS-06, 09 §7 |
| **D-047** (CHK047) | Cada Q abertas ganha impacto, padrão e prazo: Q-01 host padrão até decisão; Q-02 bloqueia só apply de prod; Q-03 bloqueia só lançamento público da paleta (dev usa rascunho); Q-04 fora da v1. | 00-visao §7 |
| **D-050** (CHK050) | `parserVersion` semver por fixture; falha de schema mantém último snapshot, alerta e permite fixar parser anterior por flag; rollback no runbook. | Contrato §5, 09 §7, 10 §2 |

## Fechamento

- 52 decisões, 52 itens do checklist cobertos.
- Nenhuma decisão altera a arquitetura aprovada (ADR-001..005); altera semântica, estados, limites e critérios de aceite.
- O checklist permanece não marcado; a avaliação é do revisor.
