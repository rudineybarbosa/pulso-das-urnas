# PRODUCT — Pulso das Urnas

## Visão

Durante a apuração, a informação existe — mas chega espalhada em arquivos, tabelas e telas oficiais densas. O Pulso das Urnas transforma esses dados públicos em uma leitura imediata: **um mapa que muda de cor conforme o país conta os votos**, com a possibilidade de descer até a cidade e ver candidato por candidato, e uma corrida de cavalinhos que traduz a diferença de votos em movimento.

Uma frase: **"o país inteiro em um mapa, a disputa inteira em uma corrida."**

## Público

| Público | O que precisa | Como o produto atende |
|---|---|---|
| Cidadão acompanhando o resultado | Entender rápido quem está à frente no seu estado e na sua cidade | Cor por partido no mapa, busca por cidade, painel de votos |
| Jornalista e pesquisador | Conferir números, horário e fonte; citar com segurança | Snapshot com horário oficial, fonte, percentual apurado, URLs estáveis |
| Professor e estudante | Enxergar o processo de apuração e a geografia do voto | Zoom Brasil → estado → cidade, legenda e explicação do que é "apurado" |
| Pessoa com deficiência | Acessar a mesma informação sem depender de cor ou animação | Teclado, leitor de tela, tabela alternativa, redução de movimento |
| Pessoa em conexão lenta ou aparelho antigo | Abrir rápido e continuar usando | SPA leve, mapa SVG, orçamento de bytes, degradação graciosa |

## Princípios

1. **Neutro por construção.** O sistema não opina, não projeta e não ranqueia por preferência. Ordena por votos, nomeia empates, mostra todos os candidatos relevantes e nunca destaca um campo político.
2. **A fonte manda.** Todo número tem origem, horário e percentual apurado. Se o dado atrasou, diz que atrasou.
3. **Simples na superfície, rigoroso por baixo.** O usuário vê um mapa e uma corrida; por baixo há contrato de dados, cache, filas e testes.
4. **Rápido é requisito, não bônus.** Orçamento de bytes e de tempo por tela; nada de biblioteca pesada sem justificativa medida.
5. **Alegria sem deboche.** A corrida é esportiva e afetuosa; nunca humilha candidato, eleitor ou adversário.
6. **Acessível desde o primeiro commit.** Cor nunca é o único canal; movimento nunca é obrigatório.
7. **Custo previsível.** O pico de acesso não pode virar uma fatura surpresa.

## Tom de voz

- Claro, direto, cordial. "São Paulo — PL lidera com 48,2% dos votos válidos."
- Sem exclamação em dado, sem adjetivo político, sem ironia.
- Estados vazios falam do processo: "Aguardando o primeiro boletim de urna."
- A cena final é carinhosa: "A apuração terminou. PL venceu em São Paulo." Nada de "derrotou", "arrasou", "humilhou".

## Métricas de sucesso

| Métrica | Meta v1 |
|---|---|
| Tempo até o primeiro mapa interativo (4G, p75) | ≤ 2,5 s |
| Latência entre o arquivo do TSE mudar e a tela refletir | ≤ 20 s |
| Usuários simultâneos suportados sem degradação | 10.000 |
| Requisições por segundo no pico | 500 |
| Custo mensal em regime | R$ 0 (free tier) |
| Custo na semana eleitoral | ≤ US$ 10 |
| Lighthouse acessibilidade | ≥ 95 |
| Cobertura das regras de negócio e parsers | ≥ 90% |
| Erros 5xx no pico | < 0,1% |

## Não objetivos (v1)

Login, perfil, comentários, enquetes, apostas, push, app nativo, outros idiomas, pesquisas de intenção, projeção estatística de resultado, edição manual de números, painel administrativo, anúncios e coleta de dados pessoais.

## Restrições

- Depende de dados públicos do TSE; não há contrato de SLA com a fonte.
- O TSE pode mudar o formato dos arquivos entre pleitos: o parser é versionado e testado por fixture.
- A lei eleitoral e o período de silêncio não são afetados: o produto só exibe dado oficial já divulgado.
- Sem vínculo, endosso ou representação do TSE ou de qualquer partido.
