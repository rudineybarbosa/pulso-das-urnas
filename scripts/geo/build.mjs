#!/usr/bin/env node
/**
 * Gera as malhas geográficas do Pulso das Urnas (RF-008..RF-010, RNF-PERF-05).
 *
 * Baixa as malhas oficiais do IBGE em qualidade `intermediaria`, simplifica e
 * grava TopoJSON quantizado:
 *
 *   data/geo/br.topo.json        27 estados
 *   data/geo/uf/{id}.topo.json   municípios de uma UF (id IBGE, 2 dígitos)
 *   data/geo/meta.json           versão, centroides, bboxes e origem dos downloads
 *
 * Também copia o resultado para `apps/web/public/geo` (servido pelo Vite).
 * Depois de gerado, `pnpm build` não precisa de rede: os arquivos são versionados.
 *
 * Uso: pnpm geo:build
 */

import { Buffer } from "node:buffer"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import { fileURLToPath } from "node:url"
import { geoArea, geoBounds, geoCentroid } from "d3-geo"
import { feature as toGeoJson, quantize } from "topojson-client"
import { topology } from "topojson-server"
import { presimplify, quantile, simplify } from "topojson-simplify"
import { checkBudgets, formatKb, gzipBytes, printBudget } from "./budget.mjs"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, "../..")
const GEO_DIR = path.join(ROOT, "data/geo")
const WEB_GEO_DIR = path.join(ROOT, "apps/web/public/geo")

const IBGE_ESTADOS = "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome"
const IBGE_MALHA_BR =
  "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo%2Bjson&qualidade=intermediaria&intrarregiao=UF"
const ibgeMalhaUf = (id) =>
  `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${id}?formato=application/vnd.geo%2Bjson&qualidade=intermediaria&intrarregiao=municipio`

/** Fração de pontos mantida na simplificação (ADR-003: ~8–12%). */
const KEEP = 0.08
/** Resolução da quantização: 1e5 ≈ 11 m no equador. */
const QUANTIZATION = 1e5
/** Área mínima (esferorradianos) para restaurar um anel colapsado; ~40 mil m². */
const MIN_RING_AREA_SR = 1e-9
const TIMEOUT_MS = 120_000
const RETRIES = 3
/** Pausa entre requisições, para não abusar da API pública do IBGE. */
const DELAY_MS = 150

function sha256(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`
}

function round(value, digits = 4) {
  const factor = 10 ** digits
  const rounded = Math.round(value * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}

/**
 * Baixa e valida um JSON, com tentativas e backoff.
 * @returns {Promise<{ json: unknown, fonte: { escopo: string, url: string, hash: string, bytes: number } }>}
 */
async function download(url, escopo) {
  let lastError
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/json, application/vnd.geo+json;q=0.9",
          "user-agent": "pulso-das-urnas/0.1 (build geo)",
        },
        signal: globalThis.AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = Buffer.from(await response.arrayBuffer())
      return {
        json: JSON.parse(body.toString("utf8")),
        fonte: { escopo, url, hash: sha256(body), bytes: body.byteLength },
      }
    } catch (error) {
      lastError = error
      if (attempt < RETRIES) {
        const wait = 500 * 2 ** (attempt - 1)
        console.warn(`  ! ${escopo}: ${error.message} — nova tentativa em ${wait} ms`)
        await sleep(wait)
      }
    }
  }
  throw new Error(`${escopo}: ${lastError?.message ?? "falha desconhecida"}`)
}

/**
 * O d3-geo (e o desenho do mapa) considera o exterior no sentido horário.
 * O IBGE entrega no sentido do RFC 7946 (anti-horário); sem inverter, o d3
 * interpreta cada município como o complemento do globo — centroide no
 * antipoda e `path` cobrindo o mundo inteiro.
 */
function rewind(geometry) {
  const ringArea = (ring) => {
    let sum = 0
    for (let index = 0, last = ring.length - 1; index < last; index += 1) {
      const [x1, y1] = ring[index]
      const [x2, y2] = ring[index + 1]
      sum += x1 * y2 - x2 * y1
    }
    return sum / 2
  }
  const orient = (ring, exterior) => {
    const area = ringArea(ring)
    const shouldBeClockwise = exterior
    const isClockwise = area < 0
    return isClockwise === shouldBeClockwise ? ring : [...ring].reverse()
  }
  const polygon = (rings) =>
    rings.map((ring, index) => orient(ring, index === 0)).filter((ring) => ring.length >= 4)

  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: polygon(geometry.coordinates) }
  }
  return {
    type: "MultiPolygon",
    coordinates: geometry.coordinates.map(polygon).filter((rings) => rings.length > 0),
  }
}

/**
 * Reduz a resposta do IBGE ao mínimo: `properties.codarea` e geometria.
 * Ordena por código para o arquivo ser determinístico.
 */
function normalizeCollection(collection, { escopo, pattern, prefix }) {
  if (collection?.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    throw new Error(`${escopo}: resposta não é uma FeatureCollection`)
  }
  const features = collection.features.map((item, index) => {
    const codarea = String(item?.properties?.codarea ?? "")
    if (!pattern.test(codarea)) {
      throw new Error(
        `${escopo}: feição ${index} com codarea inválido (${JSON.stringify(codarea)})`,
      )
    }
    if (prefix !== undefined && !codarea.startsWith(prefix)) {
      throw new Error(`${escopo}: codarea ${codarea} não pertence à UF ${prefix}`)
    }
    const type = item?.geometry?.type
    if (type !== "Polygon" && type !== "MultiPolygon") {
      throw new Error(`${escopo}: geometria ${String(type)} em ${codarea}`)
    }
    return {
      type: "Feature",
      properties: { codarea },
      geometry: rewind(item.geometry),
    }
  })

  features.sort((a, b) => a.properties.codarea.localeCompare(b.properties.codarea))
  for (let index = 1; index < features.length; index += 1) {
    if (features[index].properties.codarea === features[index - 1].properties.codarea) {
      throw new Error(`${escopo}: codarea duplicado ${features[index].properties.codarea}`)
    }
  }
  if (features.length === 0) throw new Error(`${escopo}: nenhuma feição recebida`)
  return { type: "FeatureCollection", features }
}

/** TopoJSON quantizado e simplificado, com topologia preservada. */
function simplifyCollection(features, objectName) {
  let topo = topology({ [objectName]: features }, QUANTIZATION)
  topo = presimplify(topo)
  const unsimplified = { type: topo.type, objects: topo.objects, arcs: topo.arcs }
  topo = simplify(topo, quantile(topo, KEEP))
  topo = repairCollapsedRings(unsimplified, topo)
  return quantize(topo, QUANTIZATION)
}

/** Área esférica de um anel, em esferorradianos; 0 inválido, > 2π significa anel invertido. */
function ringArea(points) {
  if (points.length < 3) return 0
  return geoArea({ type: "Polygon", coordinates: [points] })
}

/**
 * Junta arcos em um anel, sem repetir o ponto de emenda. Aceita referência
 * negativa (arco percorrido no sentido inverso), como manda o TopoJSON.
 */
function joinArcs(arcs, refs) {
  const points = []
  for (const ref of refs) {
    const arc = ref < 0 ? [...arcs[~ref]].reverse() : arcs[ref]
    if (!arc) throw new Error(`arco ${ref} inexistente`)
    for (const point of arc) {
      const last = points[points.length - 1]
      if (last && last[0] === point[0] && last[1] === point[1]) continue
      points.push([point[0], point[1]])
    }
  }
  return points
}

/**
 * Municípios minúsculos com poucos vértices podem virar uma linha depois da
 * simplificação (o anel fechado perde todos os pontos internos). Aqui o anel
 * original é readicionado como um arco próprio.
 *
 * Cisco de malha (área abaixo de `MIN_RING_AREA_SR`, ~40 mil m²) não é
 * restaurado: é ruído do IBGE, invisível no mapa, e a orientação de um anel
 * quase degenerado é ambígua para o d3-geo.
 */
function repairCollapsedRings(original, simplified) {
  const arcs = [...simplified.arcs]
  const append = (points) => {
    arcs.push(points)
    return [[arcs.length - 1]]
  }
  const fixRing = (refs, sourceRefs) => {
    const points = joinArcs(simplified.arcs, refs)
    const area = ringArea(points)
    if (points.length >= 4 && area > MIN_RING_AREA_SR && area < 2 * Math.PI) return refs
    const source = joinArcs(original.arcs, sourceRefs)
    const sourceArea = ringArea(source)
    if (!(sourceArea > MIN_RING_AREA_SR && sourceArea < 2 * Math.PI)) return refs
    return append(source)
  }
  const fixPolygon = (rings, sourceRings) =>
    rings.map((ring, index) => fixRing(ring, sourceRings[index]))

  const objects = {}
  for (const [name, object] of Object.entries(simplified.objects)) {
    const sourceObject = original.objects[name]
    if (object?.type !== "GeometryCollection" || sourceObject?.type !== "GeometryCollection") {
      objects[name] = object
      continue
    }
    const geometries = object.geometries.map((geometry, index) => {
      const source = sourceObject.geometries[index]
      if (geometry.type === "Polygon") {
        return { ...geometry, arcs: fixPolygon(geometry.arcs, source.arcs) }
      }
      if (geometry.type === "MultiPolygon") {
        return {
          ...geometry,
          arcs: geometry.arcs.map((rings, polygonIndex) =>
            fixPolygon(rings, source.arcs[polygonIndex]),
          ),
        }
      }
      return geometry
    })
    objects[name] = { ...object, geometries }
  }
  return { ...simplified, objects, arcs }
}

/** Confere que a malha sobreviveu à simplificação e continua interpretável pelo d3. */
function validateTopology(topo, objectName, expectedFeatures) {
  const collection = toGeoJson(topo, topo.objects[objectName])
  if (collection.type !== "FeatureCollection") {
    throw new Error(`${objectName}: TopoJSON não gerou uma FeatureCollection`)
  }
  if (collection.features.length !== expectedFeatures) {
    throw new Error(
      `${objectName}: ${collection.features.length} feições após simplificar (esperado ${expectedFeatures})`,
    )
  }
  for (const item of collection.features) {
    const [[west, south], [east, north]] = geoBounds(item)
    const area = geoArea(item)
    if (![west, south, east, north].every(Number.isFinite) || !(area > 0 && area < 2 * Math.PI)) {
      throw new Error(`${objectName}: geometria inválida em ${item.properties?.codarea}`)
    }
  }
  return collection
}

/** Grava um TopoJSON minificado e devolve os tamanhos. */
async function writeTopology(file, topo) {
  const json = JSON.stringify(topo)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, json)
  const bytes = Buffer.byteLength(json)
  return { bytes, gz: gzipBytes(Buffer.from(json)) }
}

function reportFile(nome, size, detail) {
  console.log(
    `  ${nome.padEnd(22)} ${formatKb(size.bytes).padStart(9)} bruto · ${formatKb(size.gz).padStart(9)} gzip${detail ? ` · ${detail}` : ""}`,
  )
}

function parseEstados(payload) {
  if (!Array.isArray(payload) || payload.length !== 27) {
    throw new Error(
      `estados: esperado 27 registros, recebido ${Array.isArray(payload) ? payload.length : "?"}`,
    )
  }
  return payload
    .map((estado) => {
      const id = String(estado?.id ?? "").padStart(2, "0")
      if (!/^\d{2}$/.test(id)) throw new Error(`estados: id inválido ${JSON.stringify(estado?.id)}`)
      if (typeof estado?.sigla !== "string" || typeof estado?.nome !== "string") {
        throw new Error(`estados: ${id} sem sigla/nome`)
      }
      return { id, sigla: estado.sigla, nome: estado.nome }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
}

/**
 * Copia as malhas para `apps/web/public/geo`, que é o diretório servido pelo
 * Vite. A cópia é gerada, não versionada.
 */
async function copyToWeb(ufIds) {
  if (!existsSync(path.join(ROOT, "apps/web"))) {
    console.log("\n… apps/web ausente: cópia para public/geo ignorada")
    return
  }
  await rm(WEB_GEO_DIR, { recursive: true, force: true })
  await mkdir(path.join(WEB_GEO_DIR, "uf"), { recursive: true })
  await copyFile(path.join(GEO_DIR, "br.topo.json"), path.join(WEB_GEO_DIR, "br.topo.json"))
  await copyFile(path.join(GEO_DIR, "meta.json"), path.join(WEB_GEO_DIR, "meta.json"))
  for (const id of ufIds) {
    const name = `${id}.topo.json`
    await copyFile(path.join(GEO_DIR, "uf", name), path.join(WEB_GEO_DIR, "uf", name))
  }
  await writeFile(path.join(WEB_GEO_DIR, ".gitignore"), "*\n")
  console.log(`\n→ copiado para ${path.relative(ROOT, WEB_GEO_DIR)} (gerado, não versionado)`)
}

async function main() {
  const started = Date.now()
  const fontes = []
  const falhas = []
  const municipiosPorUf = new Map()

  console.log("→ IBGE: metadados dos estados")
  const estadosDownload = await download(IBGE_ESTADOS, "estados")
  const estados = parseEstados(estadosDownload.json)
  fontes.push(estadosDownload.fonte)

  console.log("→ IBGE: malha do Brasil (intrarregião UF)")
  const brDownload = await download(IBGE_MALHA_BR, "br")
  fontes.push(brDownload.fonte)
  const brFeatures = normalizeCollection(brDownload.json, {
    escopo: "br",
    pattern: /^\d{2}$/,
  })
  const idsEsperados = new Set(estados.map((estado) => estado.id))
  for (const feature of brFeatures.features) {
    if (!idsEsperados.has(feature.properties.codarea)) {
      throw new Error(`br: codarea ${feature.properties.codarea} não está na lista de estados`)
    }
  }
  if (brFeatures.features.length !== estados.length) {
    throw new Error(
      `br: ${brFeatures.features.length} estados na malha (esperado ${estados.length})`,
    )
  }

  await rm(path.join(GEO_DIR, "uf"), { recursive: true, force: true })
  await mkdir(path.join(GEO_DIR, "uf"), { recursive: true })

  const brTopo = simplifyCollection(brFeatures, "estados")
  validateTopology(brTopo, "estados", estados.length)
  const brSize = await writeTopology(path.join(GEO_DIR, "br.topo.json"), brTopo)
  reportFile("br.topo.json", brSize, `${estados.length} estados`)

  for (const [index, estado] of estados.entries()) {
    const progress = `[${String(index + 1).padStart(2)}/${estados.length}] ${estado.sigla}`
    try {
      const downloadUf = await download(ibgeMalhaUf(estado.id), `uf/${estado.id}`)
      fontes.push(downloadUf.fonte)
      const features = normalizeCollection(downloadUf.json, {
        escopo: `uf/${estado.id}`,
        pattern: /^\d{7}$/,
        prefix: estado.id,
      })
      const topo = simplifyCollection(features, "municipios")
      validateTopology(topo, "municipios", features.features.length)
      const size = await writeTopology(path.join(GEO_DIR, "uf", `${estado.id}.topo.json`), topo)
      municipiosPorUf.set(estado.id, features.features.length)
      console.log(`${progress} ${estado.nome}`)
      reportFile(`uf/${estado.id}.topo.json`, size, `${features.features.length} municípios`)
    } catch (error) {
      falhas.push({ estado, motivo: error.message })
      console.error(`${progress} ${estado.nome}: FALHOU — ${error.message}`)
    }
    await sleep(DELAY_MS)
  }

  if (falhas.length > 0) {
    console.error(`\n✗ ${falhas.length} UF(s) falharam; meta.json não foi gravado`)
    for (const falha of falhas) {
      console.error(
        `  - ${falha.estado.id} ${falha.estado.sigla} (${falha.estado.nome}): ${falha.motivo}`,
      )
    }
    process.exitCode = 1
    return
  }

  // Centroides e bboxes saem da malha simplificada: é a geometria que a tela desenha.
  const brCollection = validateTopology(brTopo, "estados", estados.length)
  const porCodigo = new Map(
    brCollection.features.map((item) => [String(item.properties?.codarea), item]),
  )
  const metadados = estados.map((estado) => {
    const item = porCodigo.get(estado.id)
    if (!item) throw new Error(`meta: estado ${estado.id} sem geometria`)
    const [lon, lat] = geoCentroid(item)
    const [[west, south], [east, north]] = geoBounds(item)
    return {
      id: estado.id,
      sigla: estado.sigla,
      nome: estado.nome,
      centroide: [round(lon), round(lat)],
      bbox: [round(west), round(south), round(east), round(north)],
      municipios: municipiosPorUf.get(estado.id) ?? 0,
    }
  })
  metadados.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))

  const versaoHash = createHash("sha256")
    .update(
      fontes
        .map((fonte) => `${fonte.escopo}:${fonte.hash}`)
        .sort()
        .join("\n"),
    )
    .digest("hex")
    .slice(0, 12)

  const meta = {
    versao: `1.0.0-${versaoHash}`,
    geradoEm: new Date().toISOString(),
    estados: metadados,
    fontes,
  }
  await writeFile(path.join(GEO_DIR, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`)
  console.log(`\n  meta.json              ${metadados.length} estados · versão ${meta.versao}`)

  await copyToWeb(estados.map((estado) => estado.id))

  console.log("\n→ orçamento (gzip -9)")
  const { rows, problems } = await checkBudgets(GEO_DIR)
  printBudget(rows)

  if (problems.length > 0) {
    console.error(`\n✗ geo:build falhou no orçamento (${problems.length})`)
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exitCode = 1
    return
  }

  const segundos = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`\n✓ geo:build concluído em ${segundos} s`)
}

main().catch((error) => {
  console.error(`\n✗ geo:build falhou: ${error.stack ?? error.message}`)
  process.exitCode = 1
})
