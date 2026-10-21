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

**Orçamento de latência (p95), do clique ao número na tela:**

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
| RNF-ESC-01 | Suportar **10.000 usuários simultâneos ativos** e **500 req/s** no pico, sem erro e com p95 ≤ 150 ms na CDN. |
| RNF-ESC-02 | Suportar **1 milhão de visualizações/dia** no dia da eleição. |
| RNF-ESC-03 | Disponibilidade ≥ 99,9% na janela eleitoral (17h–23h59). |
| RNF-ESC-04 | Origin (Cloud Run) absorvendo ≤ 5% das requisições de leitura em regime de pico, graças a cache de CDN e `ETag`. |
| RNF-ESC-05 | Degradação graciosa: se a API cair, a CDN continua servindo o último snapshot público por até 10 min (`stale-if-error`). |
| RNF-ESC-06 | Auto-scaling: Cloud Run `min-instances=0` fora da janela e `min-instances=1` nas 4 h ao redor da votação; máximo configurado por orçamento. |
| RNF-ESC-07 | Nenhum estado/arquivo é buscado por cliente individual: toda leitura passa pela API cacheada; o navegador nunca chama o TSE. |

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
| RNF-A11Y-06 | Alternativa em tabela para todo mapa e para a corrida; `aria-live` com no máximo 1 anúncio/10 s. |
| RNF-A11Y-07 | Testado com NVDA (Windows) e VoiceOver (iOS/Safari) nos fluxos J-01, J-02 e J-05. |

## Segurança — RNF-SEC

| ID | Requisito |
|---|---|
| RNF-SEC-01 | CSP restritiva: `default-src 'self'`; sem scripts de terceiros; `frame-ancestors 'none'`. |
| RNF-SEC-02 | Cabeçalhos: HSTS (1 ano, preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` mínima. |
| RNF-SEC-03 | Toda entrada validada por schema (Zod) na borda; parâmetros desconhecidos rejeitados com 400. |
| RNF-SEC-04 | Rate limit de 60 req/min por IP nas rotas dinâmicas; 429 com `Retry-After`. |
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

## Custo — RNF-COST

| ID | Requisito |
|---|---|
| RNF-COST-01 | Regime normal: R$ 0/mês, dentro das cotas gratuitas. |
| RNF-COST-02 | Semana eleitoral: ≤ US$ 10 no total (banda do Hosting + Cloud Run + Storage). |
| RNF-COST-03 | Orçamento GCP com alertas em 50%, 80% e 100% de US$ 10; hard stop manual documentado no runbook. |
| RNF-COST-04 | Proibido introduzir recurso com custo fixo mensal (LB global, NAT, Cloud SQL, Memorystore) sem ADR e aprovação. |

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
| RNF-LGPD-02 | Sem cookies de rastreio; `localStorage` apenas para preferências (pausa da corrida, último escopo) e com aviso. |
| RNF-LGPD-03 | Métricas agregadas e anônimas; IP não persistido (truncado ou descartado). |
| RNF-LGPD-04 | Página de privacidade em linguagem simples, linkada no rodapé. |

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
