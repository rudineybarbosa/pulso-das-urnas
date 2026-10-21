# 00 — Visão e objetivos

## 1. Problema

A apuração brasileira é pública, mas não é *legível*. Os dados chegam em arquivos JSON por cargo e por abrangência, com nomes de campo abreviados, e os painéis oficiais são densos. Quem quer saber "quem está ganhando no meu estado e na minha cidade" precisa navegar por tabelas, escolher cargo, abrangência e turno, e interpretar percentuais sem contexto geográfico.

## 2. Objetivo do produto

Oferecer uma leitura geográfica e imediata da apuração:

- **O-1.** Descobrir automaticamente pleitos, turnos e cargos em disputa, sem lista fixa no código.
- **O-2.** Mostrar, no mapa do Brasil, a liderança de cada estado para o maior cargo em disputa, atualizada conforme o TSE publica.
- **O-3.** Permitir descer até o município e ver os votos por candidato, com dois cliques.
- **O-4.** Traduzir a diferença de votos em uma animação afetiva e neutra (a corrida dos cavalinhos), inclusive no encerramento da apuração.
- **O-5.** Sustentar milhares de acessos simultâneos com custo próximo de zero e latência baixa.

## 3. Resultados esperados

| Resultado | Indicador | Meta |
|---|---|---|
| Leitura rápida do cenário nacional | Tempo entre abrir e entender o líder do próprio estado | < 10 s (teste com 5 pessoas) |
| Descoberta da cidade | Cliques entre a abertura e o painel da cidade | ≤ 3 |
| Confiança no dado | Presença de fonte + horário + % apurado em toda tela com número | 100% |
| Desempenho | LCP p75 em 4G | ≤ 2,5 s |
| Escala | Usuários simultâneos | 10.000 |
| Custo | Fatura mensal em regime | R$ 0 |
| Acessibilidade | Lighthouse a11y / axe sem violações críticas | ≥ 95 / 0 |

## 4. Premissas

- **P-1.** Os arquivos do TSE são públicos, acessíveis por HTTPS e sem autenticação (validado em 20/10/2026).
- **P-2.** O catálogo `ele-c.json` lista pleitos, turnos, abrangências e cargos de forma suficiente para o produto.
- **P-3.** Os resultados por município existem em arquivo próprio por cargo (validado para São Paulo, 1º turno de 2026).
- **P-4.** A latência oficial de atualização é da ordem de dezenas de segundos; não é possível prometer tempo real melhor que a fonte.
- **P-5.** O produto é público e somente leitura; não há dado pessoal envolvido.
- **P-6.** O pico de acesso ocorre nas primeiras 3 horas após o início da divulgação e no encerramento.

## 5. Restrições

- **R-1.** Sem dependência de API paga ou de contrato comercial com o TSE.
- **R-2.** Infraestrutura como código em Terraform, provedor Google Cloud, priorizando serviços com cota gratuita.
- **R-3.** Frontend leve: orçamento de 200 KB gz de JS inicial.
- **R-4.** Sem login, sem banco relacional obrigatório, sem coleta de dados pessoais.
- **R-5.** Acessibilidade WCAG 2.2 AA e respeito a `prefers-reduced-motion`.
- **R-6.** Nenhum texto ou animação pode ser ofensivo, agressivo ou desrespeitoso com qualquer pessoa.

## 6. Partes interessadas

| Papel | Interesse |
|---|---|
| Público geral | Entender o resultado do seu estado/cidade |
| Imprensa | Fonte citável, URL estável, horário do dado |
| Equipe de produto e engenharia | Requisitos sem ambiguidade, testes automatizados, custo previsível |
| Órgão eleitoral (indireto) | Uso correto e atribuído dos dados públicos, sem sugerir vínculo oficial |

## 7. Perguntas em aberto

| ID | Pergunta | Impacto | Responsável | Estado |
|---|---|---|---|---|
| Q-01 | Teremos domínio próprio (`pulsodasurnas.com.br`) no lançamento? | SEO, e-mail, TLS | Product owner | aberta |
| Q-02 | O deploy em produção será feito na conta GCP pessoal do mantenedor? | Terraform, billing, orçamento | Product owner | aberta |
| Q-03 | A tabela de cores partidárias será revisada por alguém de comunicação antes do lançamento? | Precisão visual | Product owner | aberta |
| Q-04 | Queremos modo "telão" (tela cheia, sem interação) na v1? | Escopo, SSE | Product owner | decidir até o fim da fase 3 |

Nenhuma pergunta em aberto bloqueia a implementação das fases 1 e 2.
