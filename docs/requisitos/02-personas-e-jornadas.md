# 02 — Personas e jornadas

## Personas

### P-1. Marina, 34, professora — "quero saber quem ganhou no meu estado"
Acompanha pelo celular, conexão 4G instável, usa o transporte público. Não conhece termos eleitorais. Precisa de resposta em segundos e de uma tela que não pese.

### P-2. Caio, 27, jornalista de dados — "preciso citar o número certo, com hora"
Trabalha no desktop com duas telas. Confere o percentual apurado, compara estados, precisa de URL estável e de saber quando o dado foi gerado. Desconfia de número sem fonte.

### P-3. Dona Lourdes, 68, aposentada — "quero entender sem enxergar cor"
Tem baixa visão e usa leitor de tela. Navega por teclado. Precisa de rótulos completos, contraste e uma tabela com os mesmos dados do mapa.

### P-4. Professor Elias, 45, ciência política — "quero mostrar o fenômeno geográfico"
Projeta o mapa em sala. Quer ver a mancha de cores mudar, comparar pleitos e explicar o monitor de pulso. Precisa de legenda clara e de um modo sem animação para alunos com sensibilidade a movimento.

## Jornadas

### J-01. Abrir e entender o país (P-1, P-4)

1. Abre a URL raiz.
2. Vê o mapa do Brasil; estados ainda brancos (ou coloridos, se a apuração já começou), o relógio da fonte e o % apurado.
3. Lê a legenda e entende que a cor é do partido que lidera o maior cargo.
4. Passa o dedo/mouse sobre o seu estado e vê "São Paulo — PL lidera — 48,2% dos válidos — 100% apurado".
5. Toca no estado.

**Sucesso:** entendeu o cenário nacional em menos de 10 s, sem tocar em "ajuda".
**Falha:** cor sem legenda, número sem hora, mapa que abre cinza sem explicação.

### J-02. Chegar à própria cidade (P-1)

1. Na busca, digita "são paulo" ou "SP".
2. O autocomplete mostra "São Paulo — SP (estado)" e "São Paulo — SP (município)".
3. Escolhe o município; o mapa dá zoom no estado e abre o painel com os votos.
4. Confere o candidato mais votado e a aba do cargo que lhe interessa.
5. Toca em "Voltar" e retorna ao estado; toca de novo e volta ao Brasil.

**Sucesso:** ≤ 3 cliques até os votos da cidade.
**Falha:** cidade homônima sem UF, painel que cobre o mapa no desktop, "Voltar" que volta ao início do site.

### J-03. Conferir e citar (P-2)

1. Abre `/br/sp`.
2. Confere no cabeçalho: "Atualizado às 21h14 (TSE) · 100% das seções".
3. Abre a tabela alternativa e copia os números.
4. Troca o cargo para Governador e vê a cor do estado mudar.
5. Copia a URL e compartilha; quem abre vê o mesmo recorte.

**Sucesso:** números batem com o arquivo do TSE da mesma geração; URL reproduz o estado da tela.
**Falha:** percentual calculado sobre base errada; URL sem o cargo selecionado.

### J-04. Acompanhar a virada no monitor de pulso (P-1, P-4)

1. Deixa a página aberta durante a apuração.
2. A cada ciclo, o mapa repinta os estados que viraram e o relógio avança.
3. No rodapé, as linhas de pulso rolam; a linha do líder fica mais alta e a distância acompanha a diferença de votos.
4. Em uma inversão, as linhas trocam de altura e o selo "PULSO!" aparece por até 1,6 s.
5. Ao final, o vencedor dá uma lambida carinhosa; o perdedor se deita; três corações sobem. O leitor de tela anuncia o resultado.

**Sucesso:** a animação não atrapalha a leitura e reflete o dado; nada é ofensivo.
**Falha:** linhas que saltam, selo que cobre números, animação que continua depois do fim.

### J-05. Usar sem enxergar cor (P-3)

1. Chega pelo teclado, com Tab.
2. O foco entra na busca, depois nos chips de cargo, depois no mapa (anunciado como "mapa dos estados; use as setas para navegar").
3. Navega até "Bahia" e ouve "Bahia, 417 municípios, PT lidera com 51,3% dos votos válidos, 100% apurado".
4. Pressiona Enter, ouve os municípios e escolhe Salvador.
5. Abre "Ver dados em tabela" e lê a lista completa.

**Sucesso:** conclui a tarefa sem mouse e sem depender de cor.
**Falha:** mapa só com `div` clicável, `aria-label` vazio, foco invisível.

## Princípios derivados das jornadas

- A resposta mais importante (quem lidera no meu estado) deve estar a um toque.
- Toda tela responde "de quando é esse número?".
- O caminho de volta é sempre previsível e não recarrega a página.
- A animação é um plus; a informação nunca depende dela.
