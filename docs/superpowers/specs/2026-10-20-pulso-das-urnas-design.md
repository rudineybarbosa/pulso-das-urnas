# Pulso das Urnas — design aprovado

- **Data:** 20/10/2026
- **Status:** aprovado para especificação; implementação depende do plano
- **Autoria:** sessão de brainstorming com o mantenedor
- **Documentos derivados:** [requisitos](../../requisitos/00-visao-e-objetivos.md), [ADRs](../../decisoes/)

## 1. Intenção

Transformar a apuração pública em leitura imediata: um mapa do Brasil que muda de cor conforme os votos são contados, com zoom até o município, votos por candidato e uma corrida de cavalinhos que traduz a diferença de votos em movimento — incluindo um encerramento afetuoso.

Sucesso: entender o cenário nacional em menos de 10 s, chegar à própria cidade em até 3 cliques, confiar no número (fonte + hora), suportar 10.000 pessoas simultâneas com custo próximo de zero e funcionar para quem não enxerga cor ou não quer movimento.

## 2. Decisões de produto

| Tema | Decisão |
|---|---|
| Cobertura | Genérica por pleito, dirigida pelo catálogo do TSE; 2026 e 2024 validados |
| Cor do estado | Partido do líder do **maior cargo em disputa** no estado, pela hierarquia Presidente > Governador > Senador > Dep. Federal > Dep. Estadual/Distrital > Prefeito > Vereador |
| Antes dos votos | Branco; sem dado = cinza; empate = hachura |
| Navegação | Brasil → estado → município, com "Voltar" por nível e `Esc` |
| Busca | Label literal "digite o nome do estado ou da cidade:", normalizada, com UF nos homônimos |
| Animação | Dois cavalos dos dois candidatos mais votados do maior cargo nacional; avanço = % apurado; separação = diferença normalizada; relincho na ultrapassagem; fim carinhoso |
| Acessibilidade | WCAG 2.2 AA, tabela alternativa, teclado, reduced motion |
| Dados | TSE oficial apenas; nunca inventar número em modo real; modo fake explícito |
| Legal | Sem vínculo oficial; fonte e horário em toda tela; sem dados pessoais |

## 3. Arquitetura aprovada

```
SPA React/Vite (SVG + d3-geo)
   → Firebase Hosting (CDN) → /api → Cloud Run (Fastify)
                                  → Firestore (config) + GCS (snapshots)
Cloud Run Job (1/min, ciclos de 10 s) → resultados.tse.jus.br
```

- Ingestão condicional com `ETag`, single-flight, ≤ 5 rps, backoff e circuit breaker.
- Snapshot imutável por geração (`idg`) com ponteiro atômico.
- Cache em três níveis (navegador, CDN, memória), com `s-maxage` de 2–5 s nas rotas de leitura.
- Sem banco relacional, sem load balancer, sem serviço de simulador separado.

## 4. Escopo da v1

Mapa, busca, painel, votos, cores, corrida, cena final, acessibilidade, API cacheada, ingestão real, simulador local, Terraform dev/prod e documentação AI-first.

Fora: login, comentários, apostas, push, app nativo, outros idiomas, pesquisas, projeção, edição manual, anúncios, granularidade por zona/seção, fotos de candidatos.

## 5. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| TSE muda formato no meio do pleito | parser quebra | schema tolerante, fixtures, `parserVersion`, snapshot anterior |
| TSE indisponível no pico | mapa congela | snapshot + selo de frescor + alerta |
| Custo de banda estoura | fatura | payload ≤ 8 KB, 304, orçamento e limite de instâncias |
| Cores partidárias imprecisas | credibilidade | tabela versionada com fonte e revisão editorial |
| Animação ofensiva | dano reputacional | checklist de neutralidade + revisão no PR |
| Acessibilidade tratada no fim | retrabalho | testes axe/teclado desde a fase 3 |
| Firestore/Hosting com limite | indisponibilidade | cache em memória + `stale-if-error` |

## 6. Alternativas descartadas

- **Next.js/SSR**: custo e complexidade sem ganho de SEO relevante.
- **MapLibre/Leaflet**: peso e acessibilidade pior.
- **Chamar o TSE do navegador**: CORS, rate limit, sem agregação e sem histórico.
- **LB + Cloud CDN**: custo fixo mensal.
- **Postgres/Redis**: custo fixo e complexidade desnecessária para leitura de snapshots.
- **Biblioteca de animação**: bytes sem retorno; mola própria resolve.
- **Cavalinhos copiados da Globo**: risco de marca; arte original inspirada.

## 7. Critérios de sucesso do design

- Um requisito, uma regra e um teste para cada comportamento relevante ([12-rastreabilidade](../../requisitos/12-rastreabilidade.md)).
- Nenhum número sem fonte, hora e base de cálculo.
- Nenhum estado de tela sem tratamento (carregando, vazio, erro, desatualizado, finalizado).
- Custo e escala justificados por conta, não por adjetivo.
- Documentação suficiente para uma IA implementar sem perguntar o óbvio.

## 8. Perguntas em aberto

Q-01 domínio próprio; Q-02 conta GCP de produção; Q-03 revisão das cores; Q-04 modo telão. Nenhuma bloqueia as fases 1 e 2.
