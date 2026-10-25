# Prova da entrega — mapa municipal sem cores

Data: 25/10/2026, antes do segundo turno.
Ambiente: produção (`https://pulso-das-urnas.web.app`).
Ticket: mapa estadual mostrava votos no painel municipal, mas vários estados continuavam sem
cores ou presos em `0/N`.

Commit publicado em `dev` e `main`: `a01ee3b`.
Imagem ativa: `southamerica-east1-docker.pkg.dev/pulso-das-urnas/pulso/api@sha256:93d7a5a7…`.

## Causa raiz

O endpoint estadual devolvia ETag calculado apenas por `versao`, que não mudava quando os
municípios chegavam. O navegador revalidava com `If-None-Match` e recebia `304`, mantendo para
sempre o primeiro retrato (`0/N`), mesmo com a API já tendo carregado centenas de municípios.
Havia ainda três agravantes:

1. o cache municipal vivia só na memória da instância Cloud Run;
2. um município com arquivo ausente era contado como carregado e não era tentado de novo;
3. a CDN usava `s-maxage=5`, igual ao polling de 5 s, podendo repetir o `0/N`.

## Correções entregues

| Item                                     | Evidência                                                                           |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| ETag muda quando os municípios chegam    | teste `modo real pinta municípios do cache compartilhado e muda o ETag ao carregar` |
| Cache compartilhado em Storage/Firestore | `readCitySnapshot` + `putIfNewer`; auditoria 5571/5571                              |
| Primeira pintura rápida                  | leitura em lotes de 16 no cache; 27 estados completos em até 8 s                    |
| Município ausente continua pendente      | `municipalityRow` só conta quando o cargo existe no arquivo                         |
| Revalidação do painel                    | TTL de 15 s, `stale-while-revalidate`; limite de ~2,5 req/s por instância ao TSE    |
| CDN não repete o `0/N`                   | `s-maxage=1` enquanto `municipiosCarregando=true`                                   |
| Aquecimento contínuo                     | job `pulso-municipios` + Scheduler `pulso-municipios-5m`                            |
| API aquecida                             | `min_instances=1` e `cpu_idle=false` no serviço `pulso-api`                         |

## Verificação em produção

Auditoria do cache oficial do primeiro turno (Presidente):

```text
{"election":"6257","cargo":"1","complete":true,"total":5571,"present":5571,"withOffice":5571}
```

Os 27 estados responderam com todos os municípios e todas as cores:

```text
ac 22/22 · al 102/102 · ap 16/16 · am 62/62 · ba 417/417 · ce 184/184 · df 1/1
es 78/78 · go 246/246 · ma 217/217 · mt 142/142 · ms 79/79 · mg 853/853
pa 144/144 · pb 223/223 · pr 399/399 · pe 185/185 · pi 224/224 · rj 92/92
rn 167/167 · rs 497/497 · ro 52/52 · rr 15/15 · sc 295/295 · sp 645/645
se 75/75 · to 139/139
```

Navegador (Firefox, produção, Mato Grosso):

```text
Líderes municipais de 00:33 · Clique em um município para ver os votos por candidato.
cores: 141/141 · rolagem: não
```

ETag durante a carga (São Paulo, API pública):

```text
0 s   0/645   carregando
5 s   463/645 carregando
10 s  489/645 carregando
15 s  509/645 carregando
20 s  532/645 carregando
```

Antes da correção o navegador permanecia em `0/645`; agora cada resposta traz ETag novo e o mapa
pinta os municípios conforme chegam.

## Testes executados

```text
pnpm lint                     ok
pnpm typecheck                ok
pnpm test                     96 testes, 19 arquivos
playwright e2e/jornadas       13 jornadas
playwright e2e/a11y           2 cenários
terraform validate            ok
```

Primeira pintura de um estado grande (São Paulo, 645 municípios, instância recém-reiniciada):
primeira resposta imediata com `0/645` e progresso; `645/645` com cor em 8,1 s. Com 14 estados
abertos ao mesmo tempo, a primeira resposta levou 1,4 s e os estados menores terminaram em até
10 s; a leitura do cache é limitada a 24 operações simultâneas por instância.

## Incidente de escrita corrigido no mesmo dia

O primeiro preenchimento de São Paulo falhou em 645 municípios: o `putIfNewer` do Storage
recusava a gravação com `412` quando o objeto já existia (corrida entre API e script), e a
mensagem não era reconhecida como "já existe". O ponteiro no Firestore não era gravado.

Correção: tratar `412`/`pre-condition` como objeto existente, repetir a transação do ponteiro e
registrar falhas de escrita no log. São Paulo foi reparado com nova execução do seed
(`601` gravados, `44` já atuais) e a auditoria passou a `645/645`.

## Janela eleitoral

- Job de estados: `pulso-ingest` (a cada minuto).
- Job municipal: `pulso-municipios` (a cada 5 minutos, orçamento de 180 s por execução, cursor no
  Firestore). O ciclo completo do país fica em torno de 30–40 minutos.
- A cor do mapa usa o cache do job. O município aberto no painel revalida sob demanda (até ~15 s).
- O mapa declara o horário dos dados municipais; nunca inventa voto quando o arquivo ainda não
  existe.
- Depois da apuração: voltar `min_instances` para `0` e pausar os três Scheduler jobs.

## Rollback

```bash
gcloud run services update-traffic pulso-api \
  --project pulso-das-urnas --region southamerica-east1 \
  --to-revisions=<revisao-anterior>=100
```

O frontend anterior continua no Firebase Hosting e pode ser republicado pelo histórico de
versões. O cache no Storage/Firestore é imutável por `idg`; nenhum dado é apagado no rollback.
