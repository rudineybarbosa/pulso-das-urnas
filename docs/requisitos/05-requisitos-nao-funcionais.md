# 05 — Requisitos não funcionais

Metas verificáveis. Cada uma tem como ser medida e um gate no CI ou no runbook.

## Desempenho — RNF-PERF

| ID | Requisito | Verificação |
|---|---|---|
| RNF-PERF-01 | LCP p75 ≤ 2,5 s em 4G (Moto G4 / throttling 1,6 Mbps, RTT 150 ms) | Lighthouse CI no build de produção |
| RNF-PERF-02 | INP p75 ≤ 200 ms; TBT ≤ 200 ms | Lighthouse CI |
| RNF-PERF-03 | CLS ≤ 0,1 | Lighthouse CI |
| RNF-PERF-04 | JS inicial ≤ 200 KB gz; CSS ≤ 30 KB gz; fontes ≤ 32 KB gz; primeira carga total ≤ 400 KB gz | `size-limit` no CI |
| RNF-PERF-05 | TopoJSON do Brasil ≤ 120 KB gz; de qualquer estado ≤ 80 KB gz | script `geo:budget` |
| RNF-PERF-06 | Resposta do panorama ≤ 8 KB gz; painel de município ≤ 12 KB gz; 304 ≤ 400 B | teste de contrato |
| RNF-PERF-07 | Zoom e troca de cor a 60 fps em aparelho intermediário (≥ 50 fps p95) | Playwright trace + DevTools |
| RNF-PERF-08 | Troca de aba de cargo no painel ≤ 100 ms (sem refazer download) | teste de componente |
| RNF-PERF-09 | Latência **fim a fim** da geração do TSE ao pixel ≤ **30 s p95** e ≤ **15 s mediana**, durante apuração ativa | medição por ciclo no ambiente publicado, com o orçamento abaixo; AT-034 |

**Rotas e dispositivo de medição (RNF-PERF-01..03):** `/br`, `/br/sp` e `/br/sp/sao-paulo`, no build de produção. O perfil **primário é mobile Moto G4 em 4G (1,6 Mbps, RTT 150 ms)**; desktop é perfil secundário e não substitui a aprovação. O número reportado é o **p75 de 5 execuções** do Lighthouse CI por rota — nenhuma execução isolada aprova ou reprova.

**Orçamento de latência fim a fim (RNF-PERF-09, p95), da geração do TSE ao pixel:**

| Etapa | Orçamento |
|---|---|
| Ingestão (espera pelo próximo ciclo de 10 s) | 10 s |
| Processamento e publicação do snapshot | 2 s |
| Propagação na CDN até o edge | 3 s |
| Polling do cliente | 5 s |
| Render | 2 s |
| **Total** | **≈ 22 s** (margem de 8 s para o teto de 30 s) |

O orçamento acima é o pior caso aceitável (p95); a mediana é medida na mesma série. Medição: registrar `generatedAt`, `collectAt` e horário do render por ciclo e reportar p50/p95 por escopo.

**Teto de cache nas rotas de leitura (D-017):** durante a apuração, `s-maxage + stale-while-revalidate + stale-if-error` ≤ **30 s no total** por rota; após o pleito finalizar, até **6 h**. Nenhuma etapa do orçamento acima pode ser compensada aumentando o cache além desse teto.

**Orçamento de latência de interação (p95), do clique ao número na tela:**

| Etapa | Orçamento |
|---|---|
| Rede até a CDN | 80 ms |
| CDN (hit) | 20 ms |
| API (miss) | 150 ms |
| Parse + render do painel | 100 ms |
| **Total (hit)** | **≤ 200 ms** |

## Escala — RNF-ESC

| ID | Requisito |
|---|---|
| RNF-ESC-01 | Suportar **10.000 usuários simultâneos ativos** e **500 req/s** no pico, sem erro e com p95 ≤ 150 ms na CDN. Definição executável e critérios de aprovação abaixo. |
| RNF-ESC-02 | Suportar **1 milhão de visualizações/dia** no dia da eleição. |
| RNF-ESC-03 | Disponibilidade ≥ 99,9% na janela eleitoral (17h–23h59). |
| RNF-ESC-04 | Origin (Cloud Run) absorvendo ≤ 5% das requisições de leitura em regime de pico, graças a cache de CDN e `ETag`. |
| RNF-ESC-05 | Degradação graciosa: se a API cair, a CDN continua servindo o último snapshot público por até **30 s durante a apuração** e até **6 h após finalizada** (RN-040). |
| RNF-ESC-06 | Auto-scaling: Cloud Run `min-instances=0` fora da janela e `min-instances=1` nas 4 h ao redor da votação; máximo configurado por orçamento. |
| RNF-ESC-07 | Nenhum estado/arquivo é buscado por cliente individual: toda leitura passa pela API cacheada; o navegador nunca chama o TSE. |

**Definição do teste de carga (RNF-ESC-01, D-041):**

| Parâmetro | Valor |
|---|---|
| Ferramenta | k6, **3 runners**: São Paulo, Virgínia (us-east) e Frankfurt (eu-west) |
| Ambiente | **dev com CDN real** (Firebase Hosting + rewrite) e `s-maxage` de produção; teste sem CDN não é evidência |
| Carga | 5 min de **platô com 10.000 VUs** (além de rampa de subida e descida) |
| Mix | **70% panorama (`/api/v1/panorama`) · 20% município · 10% estático** |
| Execução | manual, agendada fora da janela eleitoral; disparo e resultado no runbook (09 §7.8) |

Critérios de aprovação (todos, simultaneamente):

1. `http_req_failed` **< 0,1%** no total e em cada runner.
2. **p95 na borda (CDN) < 150 ms**.
3. Origin (Cloud Run) absorvendo **≤ 5%** das requisições no platô.
4. CPU do `pulso-api` **< 80%** durante o platô.
5. **Nenhum 5xx** no origin no período do teste.

Falhou qualquer critério, o relatório é anexado com o diagnóstico e o teste não aprova a release. Relatório em `docs/operacao/carga-YYYY-MM-DD.md` (data, commit, runners, mix, números e conclusão).

**Conta de capacidade (justificativa):**

```
10.000 clientes × 1 req/5 s = 2.000 req/s no edge
CDN com s-maxage=3 e ETag: origin ≈ (nº de recursos únicos) / 3 s ≈ 50/3 ≈ 17 req/s
Egress: 10.000 × 304 de ~300 B × 12/min ≈ 2,2 GB/h (≈ US$ 0,33/h na banda do Hosting)
Sem CDN: 2.000 req/s × 8 KB ≈ 16 MB/s (≈ 58 GB/h) — inviável no free tier
```

Conclusão normativa: **a CDN é parte da arquitetura, não otimização opcional**. Nenhuma release pode desligar `Cache-Control` público das rotas de leitura.

## Acessibilidade — RNF-A11Y

| ID | Requisito |
|---|---|
| RNF-A11Y-01 | Conformidade WCAG 2.2 nível AA; zero violações críticas/sérias no axe. |
| RNF-A11Y-02 | Fluxo completo por teclado, com foco visível (3 px, contraste ≥ 3:1) e ordem lógica. |
| RNF-A11Y-03 | Mapa navegável por setas; `Enter`/`Space` ativa; `Esc` sobe um nível; atalhos anunciados. |
| RNF-A11Y-04 | Nenhuma informação transmitida só por cor; sigla e rótulo sempre presentes. |
| RNF-A11Y-05 | `prefers-reduced-motion` respeitado em 100% das animações; controle de pausa disponível. |
| RNF-A11Y-06 | Alternativa em tabela para todo mapa e para o monitor; `aria-live` com no máximo 1 anúncio/10 s. |
| RNF-A11Y-07 | Testado com NVDA (Windows) e VoiceOver (iOS/Safari) nos fluxos J-01, J-02 e J-05. |

## Segurança — RNF-SEC

| ID | Requisito |
|---|---|
| RNF-SEC-01 | CSP restritiva: `default-src 'self'`, **sem `unsafe-inline`** (estilos em arquivos; dinamismo por CSSOM/variáveis CSS), sem scripts de terceiros; `frame-ancestors 'none'`. |
| RNF-SEC-02 | Cabeçalhos: HSTS (1 ano, preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` mínima. |
| RNF-SEC-03 | Toda entrada validada por schema (Zod) na borda; parâmetros desconhecidos rejeitados com 400. |
| RNF-SEC-04 | Rate limit no **origin** (Cloud Run): **300 req/min por IP, burst 600**, contado **por instância** e sem estado compartilhado — o teto agregado é `instâncias × 300` (máx. 6 instâncias, 08 §8); excedente recebe 429 com `Retry-After`. Cliente normal faz ≤ 12 req/min; a CDN absorve o restante, então NAT compartilhado (escola, empresa, operadora) **não é penalizado no caminho cacheado** — só o tráfego que chega ao origin conta. |
| RNF-SEC-05 | Nenhum segredo no repositório; secret scanning no CI; dependências auditadas (Dependabot + `pnpm audit`). |
| RNF-SEC-06 | Imagens de container com usuário não-root, base distroless, SBOM gerado no build. |
| RNF-SEC-07 | Saída sempre escapada; nenhum `dangerouslySetInnerHTML` com dado de fonte externa. |

## Observabilidade — RNF-OBS

| ID | Requisito |
|---|---|
| RNF-OBS-01 | Métricas: `ingest_cycle_duration_ms`, `ingest_last_success_timestamp`, `ingest_lag_seconds`, `source_http_status`, `source_requests_total`, `snapshot_version`, `cache_hit_ratio`, `api_5xx_total`. |
| RNF-OBS-02 | Logs estruturados em JSON com `requestId`, rota, status, duração e versão do snapshot; sem IP completo nem dado pessoal. |
| RNF-OBS-03 | Alertas: lag > 5 min em janela eleitoral; 5xx > 1% por 5 min; falha de fonte > 10% em 5 min; orçamento em 80%. |
| RNF-OBS-04 | Dashboard com: lag, versão atual por pleito, erros por código, hit ratio e custo estimado do dia. |
| RNF-OBS-05 | Rastreamento distribuído amostrado em 1% (ou 100% em erro) entre API e ingestão. |
| RNF-OBS-06 | **SLO de 99,9%** de disponibilidade, medido em **janela móvel de 30 dias** — **error budget de 43 min/mês** (0,1% de 43 200 min). A janela eleitoral (17h–23h59) é o período crítico: ali 99,9% equivale a **~25 s**. O alerta de queima de budget tem **dono nominal** (plantão do dia) e **escalonamento em 15 min** sem reconhecimento (09 §7.6). |

## Custo — RNF-COST

| ID | Requisito |
|---|---|
| RNF-COST-01 | Regime normal: R$ 0/mês, dentro das cotas gratuitas. |
| RNF-COST-02 | Semana eleitoral: ≤ US$ 10 no total (banda do Hosting + Cloud Run + Storage). |
| RNF-COST-03 | Orçamento GCP com alertas em 50%, 80% e 100% do orçamento de cada ambiente (RNF-COST-05); hard stop manual documentado no runbook. |
| RNF-COST-04 | Proibido introduzir recurso com custo fixo mensal (LB global, NAT, Cloud SQL, Memorystore) sem ADR e aprovação. |
| RNF-COST-05 | **Tetos por ambiente**: dev ≤ **US$ 1/mês**; prod ≤ **US$ 2/mês** fora da eleição e ≤ **US$ 10 na semana eleitoral**. Orçamento GCP por ambiente com alertas em 50/80/100% e, em prod, limiar extra de 20% (US$ 2) para o teto fora da eleição (09 §6.1). |
| RNF-COST-06 | **Kill switch** documentado e testado: API com `max-instances=0` e Scheduler pausado; comando, responsável e critério de acionamento no runbook (09 §7.5). Acionar é decisão do plantão, não requer deploy. |

## Compatibilidade — RNF-COMPAT

| ID | Requisito |
|---|---|
| RNF-COMPAT-01 | Chrome, Edge, Firefox e Safari nas 2 últimas versões; iOS 16+; Android 10+. |
| RNF-COMPAT-02 | Largura mínima 320 px; layout funcional em 360×640. |
| RNF-COMPAT-03 | Funciona com JavaScript habilitado (requisito) e oferece conteúdo essencial em `<noscript>` (lista de estados com links). |

## Privacidade e LGPD — RNF-LGPD

| ID | Requisito |
|---|---|
| RNF-LGPD-01 | Nenhum dado pessoal coletado, armazenado ou compartilhado. |
| RNF-LGPD-02 | Sem cookies de rastreio; `localStorage` apenas para a preferência de pausa do monitor, com aviso; o escopo vive na URL (RN-036). |
| RNF-LGPD-03 | Métricas agregadas e anônimas; IP não persistido (truncado ou descartado). |
| RNF-LGPD-04 | Página de privacidade em linguagem simples, linkada no rodapé. |
| RNF-LGPD-05 | Logs do provedor/CDN retidos por **30 dias**, **sem exportação**; logs da aplicação **sem IP completo** (truncado ou descartado). A página de privacidade cita provedores e retenção. |

## Legal e editorial — RNF-LEGAL

| ID | Requisito |
|---|---|
| RNF-LEGAL-01 | Atribuição "Fonte: Tribunal Superior Eleitoral" com link e horário em toda tela com dados. |
| RNF-LEGAL-02 | Aviso "Este site não é um serviço oficial do TSE" no rodapé de todas as páginas. |
| RNF-LEGAL-03 | Termos de uso com isenção de garantia sobre a exatidão e a disponibilidade, e orientação para conferir na fonte oficial. |

## Manutenibilidade — RNF-MAINT

| ID | Requisito |
|---|---|
| RNF-MAINT-01 | TypeScript `strict`; `pnpm typecheck` sem erros. |
| RNF-MAINT-02 | Cobertura ≥ 90% em `packages/domain` e parsers; ≥ 80% global. |
| RNF-MAINT-03 | Nenhum arquivo de regra com I/O; regras puras e testáveis. |
| RNF-MAINT-04 | Toda mudança de comportamento atualiza o RF/RN correspondente e a matriz de rastreabilidade. |
| RNF-MAINT-05 | ADR para decisões que afetam contrato, custo ou arquitetura; ADR `proposed` não vira código sem aprovação. |
| RNF-MAINT-06 | `parserVersion` em **semver**, fixada por fixture e registrada em cada snapshot. Falha de schema mantém o último snapshot válido, alerta e permite **fixar a versão anterior do parser por flag**; procedimento de pin e rollback no runbook (09 §7.7). |
