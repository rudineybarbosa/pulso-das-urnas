# 06 — Contrato de dados do TSE e contrato interno da API

Este documento fixa o que consumimos da fonte oficial e o que publicamos. Os exemplos foram validados contra o TSE em **20/10/2026**. O parser é versionado: mudança de formato exige `parserVersion` nova e fixtures novas.

## 1. Fonte oficial

### 1.1 Base e ambientes
```
https://resultados.tse.jus.br/{ambiente}/{ciclo}/{codigo}/{tipo}/{...}
ambiente = oficial
ciclo    = ele2026 | ele2024 | ...
```
O catálogo declara os diretórios em `arq[]`:
```json
{"tp":"u","dir":"<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>"}
```

### 1.2 Catálogo de pleitos e cargos
`GET https://resultados.tse.jus.br/oficial/comum/config/ele-c.json` (≈ 26 KB)

```json
{
  "dg": "18/10/2026", "hg": "12:38:11", "f": "o",
  "pl": [{
    "cd": "3220", "c": "ele2026", "dt": "04/10/2026",
    "e": [{
      "cd": "6257", "cdt2": "6258", "nm": "Eleição Ordinária Federal - 2026 1º Turno", "t": "1", "tp": "8",
      "abr": [{ "cd": "br", "cp": [{ "cd": "1", "ds": "Presidente", "tp": "1" }] }]
    }, {
      "cd": "6259", "cdt2": "6260", "nm": "Eleição Ordinária Estadual - 2026 1º Turno", "t": "1", "tp": "1",
      "abr": [{ "cd": "br", "cp": [
        { "cd": "3", "ds": "Governador", "tp": "1" },
        { "cd": "5", "ds": "Senador", "tp": "1" },
        { "cd": "6", "ds": "Deputado Federal", "tp": "2" },
        { "cd": "7", "ds": "Deputado Estadual", "tp": "2" },
        { "cd": "8", "ds": "Deputado Distrital", "tp": "2" }
      ]}]
    }]
  }]
}
```

Códigos de 2026 confirmados: pleito 3220 (1º turno) → 6257 federal, 6259 estadual, 6261 distrital; pleito 3221 (2º turno) → 6258 federal, 6260 estadual, 6282–6284 suplementares.

### 1.3 Resultado unificado por escopo e cargo (`-u.json`)
```
país:       oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json
UF:         oficial/ele2026/6257/dados/sp/sp-c0001-e006257-u.json
município:  oficial/ele2026/6257/dados/sp/sp71072-c0001-e006257-u.json
```

Exemplo real (recortado):
```json
{
  "ele":"6257","t":"1","f":"o","tpabr":"uf","cdabr":"sp",
  "dg":"05/10/2026","hg":"12:51:59","idg":"2837533",
  "dt":"05/10/2026","ht":"12:51:05","dv":"s","tf":"s","and":"f",
  "s": {"ts":"499248","st":"499248","pst":"100,00","si":"499207"},
  "e": {"te":"158745502","c":"125275835","a":"33469244"},
  "v": {"vv":"119300788","vnom":"119300788","vb":"2300798","vvc":"...","tvn":"..."},
  "carg": [{
    "cd":"1","nmn":"Presidente",
    "agr":[{"n":"280001801177","nm":"PARTIDO LIBERAL","tp":"i","com":"PL",
      "par":[{"n":"22","sg":"PL","nm":"PARTIDO LIBERAL",
        "cand":[{"n":"22","sqcand":"280002551544","nm":"FLAVIO NANTES BOLSONARO",
                 "nmu":"FLAVIO BOLSONARO","dvt":"Válido","st":"2º turno",
                 "vap":"56104503","pvap":"47,03","pvapn":"47,027772356",
                 "vs":[{"tp":"v","nm":"ALFREDO GASPAR DE MENDONÇA NETO","nmu":"ALFREDO GASPAR","sgp":"PL"}]}]}]}]
  }]
}
```

Notas de campo:
- `cand[]` fica dentro de `agr[].par[].cand[]`. Em coligação, `par[]` são os partidos; em partido isolado, há um `par`.
- `vap` e `pvap` são strings; converter para inteiro/float na borda.
- `dvt` ∈ {`Válido`, `Válido (legenda)`, `Anulado`, `Anulado sub judice`}.
- `e` = `s` quando eleito; `st` pode ser `2º turno`.
- `vs[]` traz vice (`tp = v`) e suplentes.

### 1.4 Progresso por UF (`-ab.json`)
```
oficial/ele2026/6257/dados/br/br-e006257-ab.json
oficial/ele2026/6257/dados/sp/sp-e006257-ab.json
```
```json
{"ele":"6257","t":"1","dg":"05/10/2026","hg":"12:51:41","idg":"2835808",
 "abr":[{"cdabr":"ac","tpabr":"uf","dt":"04/10/2026","ht":"18:54:23",
         "s":{"ts":"2270","st":"2270","pst":"100,00"},
         "e":{"te":"613742","c":"488330","a":"125412"}}]}
```

### 1.5 Municípios (`mun-e*.json`)
```
oficial/ele2026/6257/config/mun-e006257-cm.json  (≈ 534 KB)
```
```json
{"dg":"02/10/2026","hg":"18:30:22","abr":[
  {"cd":"sp","ds":"SÃO PAULO","mu":[
    {"cd":"71072","cdi":"3550308","nm":"SÃO PAULO","c":"n","z":["0001"]}
  ]}
]}
```
- `cd` = código TSE (5 dígitos, completar com zero à esquerda).
- `cdi` = código IBGE (7 dígitos) — **chave canônica**.
- `c` = capital (`s`/`n`).

### 1.6 Cabeçalhos e cache observados
| Cabeçalho | Valor observado | Uso |
|---|---|---|
| `ETag` | ex.: `"ee370ba1..."` | `If-None-Match` → `304` |
| `Cache-Control` | `max-age=57` | respeito ao cache |
| `Last-Modified` | data UTC | diagnóstico |
| `x-ratelimit-limit` | `2000, 2000;w=1` | cortesia: usamos ≤ 5 rps |

O app oficial do TSE revalida a cada 30 s durante apuração parcial e a cada 3 min após o fim. Adotamos cadência igual ou mais conservadora (RN-012).

## 2. Algoritmo de ingestão

```
a cada ciclo (RN-012):
  catalogo = GET ele-c.json (cache 10 min; validar schema)
  para cada eleicao ativa E:
    para cada cargo C de E:
      para cada escopo S (br + 27 UFs):
        chave = (E.ciclo, E.codigo, S, C, idg)
        corpo, etag = GET condicional(url(E,S,C))
        se 304: pular
        validar schema do TSE
        normalizar -> Snapshot
        se snapshot.idg já existe: pular gravação
        gravar imutável + avançar ponteiro current (atômico)
  municipios: somente sob demanda (API) ou hot set (capitais + > 200k hab.)
  publicar versao = hash(currentes)
```

- **Single-flight:** uma coleta por URL, mesmo com N instâncias (lock no Firestore com TTL 30 s).
- **Fila:** municípios sob demanda entram em fila com prioridade e deduplicação; resposta usa `stale-while-revalidate`.
- **Hot set:** capitais e municípios com > 200 mil eleitores são pré-aquecidos a cada 30 s na janela eleitoral.
- **Falha:** mantém o último snapshot; registra `source_http_status` e `ingest_lag_seconds`.

## 3. Contrato interno da API

Base: `https://pulso-das-urnas.web.app/api/v1` (dev/prod). JSON, `charset=utf-8`.

Toda resposta de resultado respeita o teto de staleness de RN-040: durante a apuração `s-maxage + stale-while-revalidate + stale-if-error ≤ 30 s`; após `finalizada`, ≤ 6 h.

### 3.1 Envelope comum
```json
{
  "apiVersion": "1",
  "versao": "6257:br:1:2837533",
  "catalogVersion": "9f3c1a0b7d21",
  "geradoEm": "2026-10-20T19:22:10-03:00",
  "fonte": {
    "nome": "Tribunal Superior Eleitoral",
    "url": "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/sp/sp-c0001-e006257-u.json",
    "generationId": "2837533",
    "generatedAt": "2026-10-05T12:51:59-03:00",
    "updatedAt": "2026-10-05T12:51:05-03:00",
    "collectedAt": "2026-10-20T19:22:08-03:00",
    "sourceAgeSeconds": 45,
    "collectedAgeSeconds": 2,
    "snapshotAgeSeconds": 61,
    "status": "ao_vivo",
    "parserVersion": "1.2.0"
  }
}
```

Campos de envelope e semântica (RN-013/RN-039):

| Campo | Tipo | Regra |
|---|---|---|
| `versao` | string | `{eleicao}:{escopo}:{cargo}:{idg}`; base do `ETag` |
| `catalogVersion` | string | `sha256(JSON canônico do catálogo)[0:12]` (RN-037) |
| `fonte.sourceAgeSeconds` | inteiro \| `null` | `agora − generatedAt` |
| `fonte.collectedAgeSeconds` | inteiro \| `null` | `agora − collectedAt` |
| `fonte.snapshotAgeSeconds` | inteiro \| `null` | `agora − gravadoEm` do snapshot servido |
| `fonte.status` | enum | `ao_vivo`, `fonte_sem_atualizacao`, `desatualizado`, `fonte_indisponivel`, `finalizado` (RN-039) |
| `fonte.parserVersion` | semver | versão do parser que gerou o snapshot (RN-042) |

`origem` (presente em estado, escopo e município quando há fallback) é sempre:
```json
{ "pleito": "6257", "turno": 1, "generationId": "2837411", "generatedAt": "2026-10-05T12:48:02-03:00" }
```
`origem: null` significa dado do pleito/turno vigente.

`status` (por escopo/cargo ou por estado do panorama) usa os estados de ausência de RN-035 — `retificado` é o quinto e vem como flag abaixo — mais `ok`:

| `status` | HTTP | `dados` | Significado |
|---|---|---|---|
| `ok` | 200 | objeto | há informação; pode haver líder ou empate |
| `sem_voto` | 200 | objeto com zeros | arquivo existe, nenhum voto válido |
| `sem_dado` | 200 | `null` | cargo se aplica, nenhum arquivo coletado |
| `nao_aplicavel` | 200 | `null` | cargo não existe no escopo/turno e não há fallback |
| `sem_lider_elegivel` | 200 | objeto | há válidos, nenhum candidato com `dvt = "Válido"` |

`retificado: true` é o quinto estado de RN-035, acumulável: não substitui `status` e exige badge "dados retificados pelo TSE" (RN-017).

Quando `dados: null` não há snapshot: `versao` e `fonte` são `null`; o `ETag` deriva de `apiVersion + catalogVersion + rota` e a resposta continua cacheável (D-013).

### 3.2 `GET /pleitos`
```json
{ "apiVersion":"1", "catalogVersion":"9f3c1a0b7d21", "pleitos":[
  { "id":"3221", "nome":"Eleições Gerais 2026 — 2º turno", "data":"2026-10-25",
    "turnos":[{ "eleicao":"6258", "turno":2, "nome":"Eleição Geral Federal",
                "estado":"nao_iniciada", "percentualApurado":0, "cargos":["1"] }] }
]}
```
`catalogVersion` muda quando o catálogo muda (RN-037); pleito `arquivado` não é listado. `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600`

### 3.3 `GET /panorama?pleito=6257&cargo=1`
```json
{
  "apiVersion":"1","versao":"6257:br:1:2837531",
  "catalogVersion":"9f3c1a0b7d21",
  "status":"ok",
  "geradoEm":"2026-10-20T19:22:10-03:00",
  "fonte": { "...": "envelope comum do arquivo br" },
  "pleito": { "id":"6257","nome":"Eleição Geral Federal 2026 — 1º turno","turno":1 },
  "cargoEmDestaque": { "id":"1","nome":"Presidente","tipo":"majoritario" },
  "cargoSelecionado": { "id":"1","nome":"Presidente" },
  "apuracao": { "secoesTotalizadas":499248,"secoesTotal":499248,"percentual":100.0,
                "finalizada":true,"status":"finalizada" },
  "resumo": { "votosValidos":119300788,"brancos":2300798,"nulos":3674249,
              "comparecimento":125275835,"abstencao":33469244,
              "eleitorado":158745502,"percentualBase":"oficial_validos","calculado":false },
  "estados": [{
    "uf":"SP","nome":"São Paulo","ibge":35,
    "status":"ok","finalizado":true,"retificado":false,
    "cor": { "sigla":"PL","hex":"#0B4EA2","texto":"#FFFFFF","origem":"tabela","disputaAcirrada":false },
    "lider": { "candidatoId":"280002551544","nome":"Flavio Bolsonaro","partido":"PL",
               "votos":56104503,"percentual":47.03,
               "percentualBase":"oficial_validos","calculado":false },
    "votosValidos":119300788,"percentualApurado":100.0,
    "origem": null
  }, {
    "uf":"AC","nome":"Acre","ibge":12,
    "status":"sem_dado","finalizado":false,"retificado":false,
    "cor": null,"lider": null,
    "votosValidos":null,"percentualApurado":null,
    "origem": null
  }]
}
```
- `estados[].status` usa o domínio de RN-035; `ok` = há informação. `lider` é `null` em `sem_voto`, `sem_dado`, `nao_aplicavel` e `sem_lider_elegivel`.
- `estados[].finalizado` é booleano por estado; `apuracao` é o agregado nacional.
- `percentualBase` ∈ {`oficial_validos`, `calculado_validos`}; `calculado` ∈ {`true`, `false`} (RN-010/RN-020). Nunca misturar bases na mesma resposta. `calculado: false` sobre `pvap` do TSE é rotulado "percentual oficial do TSE".
- `cor.disputaAcirrada` reflete a histerese de RN-038 (cor mantida abaixo do limiar).
- `origem` preenchido quando o estado usa fallback de turno/pleito (RN-009); a tela mostra o selo "1º turno" e não esconde o horário do snapshot atual.
- Escopo válido sem arquivo é **200** com `status:"sem_dado"`; `404` é só para pleito/cargo/escopo inexistente (RN-035, D-013).
- Sem arquivo nacional para o cargo, o panorama responde **200** com `status:"sem_dado"`, `estados:[]` e sem `resumo`/`apuracao`; a resposta continua cacheável.

`Cache-Control: public, max-age=0, s-maxage=3, stale-while-revalidate=5, stale-if-error=22` + `ETag` (total 30 s durante a apuração; após `finalizada`, `s-maxage=300, stale-while-revalidate=900, stale-if-error=20400`, total 6 h).

### 3.4 `GET /escopos/{uf}?pleito=6257&cargo=1`
Usa o mesmo envelope de §3.5 e o mesmo `dados`; `dados.municipios` traz apenas agregados (líder + votos) dos municípios já coletados.
- `status` segue §3.1; UF sem arquivo para o cargo devolve **200** com `dados:null` e `status:"sem_dado"`.
- `origem` é preenchido quando a UF usa fallback (RN-009).
- `resumo.percentualBase` e `resumo.calculado` seguem RN-010.
`Cache-Control: public, max-age=0, s-maxage=5, stale-while-revalidate=10, stale-if-error=15`

### 3.5 `GET /municipios/{ibge}?pleito=6257&cargo=1`
```json
{
  "apiVersion":"1","versao":"6257:3550308:1:2837536",
  "catalogVersion":"9f3c1a0b7d21",
  "status":"sem_voto",
  "fonte": { "...": "envelope comum" },
  "escopo": { "tipo":"municipio","ibge":3550308,"tse":"71072","nome":"São Paulo","uf":"SP" },
  "cargo": { "id":"1","nome":"Presidente" },
  "origem": null,
  "dados": {
    "apuracao": { "percentual":0.0,"finalizada":false },
    "resumo": { "votosValidos":0,"brancos":0,"nulos":0,
                "percentualBase":"oficial_validos","calculado":false },
    "candidatos": [{
      "id":"280002551544","numero":"22","nome":"FLAVIO NANTES BOLSONARO",
      "nomeUrna":"FLAVIO BOLSONARO","partido":"PL","votos":0,"percentual":0,
      "percentualBase":"oficial_validos","calculado":false,
      "situacao":"nao_eleito","destinacao":"Válido","eleito":false,
      "vices":[{"nome":"ALFREDO GASPAR","partido":"PL"}]
    }]
  }
}
```
Ausência de arquivo (escopo válido): **200**, cacheável, sem erro:
```json
{
  "apiVersion":"1","versao":null,
  "status":"sem_dado",
  "fonte": null,
  "escopo": { "tipo":"municipio","ibge":3550308,"tse":"71072","nome":"São Paulo","uf":"SP" },
  "cargo": { "id":"1","nome":"Presidente" },
  "origem": null,
  "dados": null
}
```
`status` pode ser `ok`, `sem_voto`, `sem_dado`, `nao_aplicavel` ou `sem_lider_elegivel` (§3.1); `dados` é `null` só em `sem_dado` e `nao_aplicavel`. No exemplo acima, `sem_voto`: arquivo existe e não há voto válido, então `dados` vem com zeros — nunca `null`. `404` é reservado a município, pleito, turno ou cargo inexistente no catálogo.

#### 3.5.1 Painel por cargo (D-016)
- Cada resposta traz **um cargo**; o tamanho de `dados` ≤ **12 KB gzip** por cargo.
- A pré-busca carrega apenas o cargo em destaque (RN-005); as demais abas são consultas sob demanda.
- Cada aba é uma consulta cacheável com `ETag`; trocar de aba NÃO refaz o mapa nem recarrega o panorama.
- No máximo 5 abas de cargo por município; as abas são derivadas do catálogo (RN-004), não inventadas na tela.

`Cache-Control: public, max-age=0, s-maxage=5, stale-while-revalidate=5, stale-if-error=20`

### 3.6 `GET /corrida?pleito=6257&cargo=1` (rota legada do monitor)
```json
{
  "apiVersion":"1","versao":"6257:br:1:2837531",
  "catalogVersion":"9f3c1a0b7d21",
  "status":"ok",
  "cargo": { "id":"1","nome":"Presidente","escopo":"br" },
  "apuracao": { "percentual":0.0,"finalizada":false },
  "cavalos": [
    { "posicao":1,"candidatoId":"...","nomeUrna":"FLAVIO BOLSONARO","partido":"PL",
      "cor":"#0B4EA2","votos":56104503,"percentual":47.03 },
    { "posicao":2,"candidatoId":"...","nomeUrna":"...","partido":"PT",
      "cor":"#C8102E","votos":...,"percentual":... }
  ],
  "diferenca": { "votos": 1234567, "normalizada": 0.0842, "lider":"..." },
  "ultimaUltrapassagem": null
}
```
`cavalos` (nome legado do contrato; representa as duas linhas do monitor) é vazio quando o cargo está `sem_voto`, `sem_dado`, `nao_aplicavel` ou `sem_lider_elegivel` (RN-035); o monitor não inventa dupla. `ultimaUltrapassagem` só é preenchida com ultrapassagem válida (RN-016).
`Cache-Control: public, max-age=0, s-maxage=2, stale-while-revalidate=3, stale-if-error=5` + `ETag`.

### 3.7 `GET /localidades?q=sao`
```json
{ "apiVersion":"1","resultados":[
  { "tipo":"estado","uf":"SP","nome":"São Paulo","slug":"sp" },
  { "tipo":"municipio","ibge":3550308,"nome":"São Paulo","uf":"SP","slug":"sao-paulo",
    "capital":true }
]}
```
Catálogo servido da base local (IBGE + TSE), não do TSE em tempo real.
`Cache-Control: public, max-age=3600, s-maxage=86400`

### 3.8 `GET /stream` (opcional, fase 5)
`text/event-stream`; eventos `snapshot` com o mesmo envelope do panorama, `heartbeat` a cada 15 s, `id` = versão. Reconexão com `Last-Event-ID`. Limite de conexões por instância documentado no runbook.

### 3.9 Saúde
- `GET /healthz` → `200 {"status":"ok"}` (liveness).
- `GET /readyz` → `200` se catálogo e último snapshot legíveis; `503` caso contrário.

### 3.10 `GET /escopos/{uf}/cargos` e `GET /municipios/{ibge}/cargos`
Lista os cargos em disputa no escopo, derivada do catálogo (RN-004), com o cargo em destaque marcado.
```json
{
  "apiVersion":"1","catalogVersion":"9f3c1a0b7d21",
  "escopo": { "tipo":"municipio","ibge":3550308,"nome":"São Paulo","uf":"SP" },
  "pleito": "6257",
  "cargos": [
    { "id":"1","nome":"Presidente","tipo":"majoritario","emDisputa":true,"destaque":true },
    { "id":"3","nome":"Governador","tipo":"majoritario","emDisputa":true,"destaque":false },
    { "id":"5","nome":"Senador","tipo":"majoritario","emDisputa":true,"destaque":false },
    { "id":"6","nome":"Deputado Federal","tipo":"proporcional","emDisputa":true,"destaque":false },
    { "id":"7","nome":"Deputado Estadual","tipo":"proporcional","emDisputa":true,"destaque":false }
  ]
}
```
- `destaque=true` em exatamente um cargo, pelo menor peso de RN-005.
- Cargo `tp=3` (consulta popular) não é listado.
- `emDisputa=false` é omitido da lista; a ausência do cargo significa "não se aplica" (RN-035).
`Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600`

## 4. Erros

`Content-Type: application/problem+json`
```json
{
  "type":"https://pulso-das-urnas.dev/erros/municipio-nao-encontrado",
  "title":"Município não encontrado",
  "status":404,
  "detail":"Não há município com o código IBGE 9999999.",
  "instance":"/api/v1/municipios/9999999",
  "code":"MUNICIPIO_NAO_ENCONTRADO",
  "requestId":"01J..."
}
```

| Código | HTTP | Quando |
|---|---|---|
| `PARAMETRO_INVALIDO` | 400 | Query fora do schema |
| `PLEITO_NAO_ENCONTRADO` | 404 | Pleito, turno ou cargo inexistente no catálogo |
| `ESCOPO_NAO_ENCONTRADO` | 404 | UF ou município inexistente no catálogo |
| `FONTE_INDISPONIVEL` | 503 | Nenhum snapshot existe e a fonte está fora |
| `RATE_LIMITED` | 429 | Limite por IP |
| `ERRO_INTERNO` | 500 | Falha inesperada (nunca expõe stack) |

Sem `SEM_DADOS`: escopo válido sem arquivo é **200** com `dados:null` e `status:"sem_dado"` (§3.1, §3.5). Quando existe snapshot anterior, erro de fonte também é 200 com o último snapshot e `fonte.status = "desatualizado" | "fonte_indisponivel"`; `503` só quando não há nada para servir.

## 5. Versionamento

- `apiVersion` inteiro na URL (`/v1`), mudança incompatível cria `/v2` por 90 dias em paralelo.
- `parserVersion` semver (`MAJOR.MINOR.PATCH`), gravada em todo snapshot e no envelope; fixture nova por mudança de formato do TSE, com `url`, `capturedAt`, `sha256` e `parserVersion` no `manifest.json` (RN-042).
- Falha de schema não grava nem avança `current`: mantém o último snapshot, alerta e permite fixar o parser anterior com `PARSER_VERSION_PIN=<versao>`; o rollback está no runbook (D-050).
- `catalogVersion` identifica a versão do catálogo normalizado e muda quando muda o conjunto de pleitos, turnos, cargos ou abrangências (RN-037).
- `versao` do snapshot = `{eleicao}:{escopo}:{cargo}:{idg}`; usada como `ETag` e para detectar mudança.
- Campos novos são aditivos; campos removidos exigem nova `apiVersion`.
