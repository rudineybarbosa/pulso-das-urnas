# Arte da corrida — autoria, licença e marcas

Registro exigido pela **D-051**: a arte dos cavalos é original, criada no projeto, licenciada com o repositório e sem marca de terceiro. Este arquivo é a prova documental; o desenho em si segue `docs/requisitos/07-ux-mapa-e-animacoes.md` §7.1.

## Regras

- Toda peça em `assets/race/` é criada **para o Pulso das Urnas**, dentro do repositório, por pessoa identificada na tabela abaixo.
- **Licença:** a mesma do repositório (`LICENSE` na raiz). Enquanto esse arquivo não existir, vale o padrão do projeto: uso restrito ao Pulso das Urnas, vedada a redistribuição isolada da arte.
- **Sem marca de terceiro:** nenhum personagem, traço, mascote, logotipo, fonte decorativa ou som copiado de outro produto, jogo, estúdio ou artista. Nada de referência a marcas esportivas, de apostas ou de entretenimento.
- **Sem pessoa real:** nenhum cavalo, manta ou adereço faz referência a candidato, partido, pessoa ou campanha.
- Arte gerada com apoio de ferramenta é permitida desde que a saída seja original; registrar ferramenta, data e versão na tabela.
- A paleta da manta e do número vem de `data/party-colors.json` em tempo de execução — a arte não embute cor de partido.

## Inventário

| Peça | Arquivo previsto | Autor(a) | Data | Licença |
|---|---|---|---|---|
| Cavalo (perfil, galope e trote) | `horse.svg` | _preencher no commit_ | _preencher_ | repositório |
| Cavalo indisponível (variante neutra) | `horse-unavailable.svg` | _preencher no commit_ | _preencher_ | repositório |
| Linha de chegada | `finish-line.svg` | _preencher no commit_ | _preencher_ | repositório |
| Cena final (lambida, deitar, corações) | `final-scene.svg` | _preencher no commit_ | _preencher_ | repositório |
| Poça de poeira (partícula) | `dust.svg` | _preencher no commit_ | _preencher_ | repositório |

- A tabela é atualizada no mesmo commit que adiciona ou substitui a peça; autoria vazia é erro de revisão.
- Nenhum arquivo entra por download de banco de imagens; se entrar, a licença compatível fica registrada aqui e no `LICENSE`.

## Checklist antes do lançamento

- [ ] Autoria e data preenchidas para **todos** os arquivos da pasta.
- [ ] `LICENSE` na raiz coerente com a licença declarada aqui.
- [ ] Revisão visual de marca: nenhum personagem, logo ou traço reconhecível de terceiro.
- [ ] Busca por nome de arquivo/metadado suspeito (`<title>`, `<desc>`, comentários de origem) nos SVGs.
- [ ] SVGs sem `<script>`, sem `<foreignObject>`, sem base64 embutido e sem metadado de editor.
- [ ] Orçamento de bytes conferido no build (a arte não pode estourar o orçamento de JS/CSS da página).
- [ ] Revisão de marca registrada no PR de lançamento, conforme D-051.
