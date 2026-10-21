#!/usr/bin/env node
/**
 * Verifica o orçamento de bytes das malhas geográficas (RNF-PERF-05, ADR-003).
 *
 * Falha com código 1 se:
 * - `br.topo.json` passar de 120 KB gzip;
 * - qualquer `uf/{id}.topo.json` passar de 80 KB gzip;
 * - faltar arquivo, `meta.json` não casar com as UFs ou algum JSON não parsear.
 *
 * Uso:
 *   pnpm geo:budget
 *   node scripts/geo/budget.mjs --dir data/geo
 */

import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const DEFAULT_GEO_DIR = path.resolve(HERE, "../../data/geo")

/** Limites em bytes. 1 KB = 1024 B. */
export const LIMITS = {
  br: 120 * 1024,
  uf: 80 * 1024,
}

/** Quantidade esperada de UFs na malha do IBGE. */
export const EXPECTED_STATES = 27

export function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function gzipBytes(buffer) {
  return gzipSync(buffer, { level: 9 }).byteLength
}

/**
 * Mede um arquivo e valida que é JSON.
 * @returns {Promise<{ bytes: number, gz: number }>}
 */
export async function measureFile(file) {
  const raw = await readFile(file)
  JSON.parse(raw.toString("utf8"))
  return { bytes: raw.byteLength, gz: gzipBytes(raw) }
}

/**
 * Lê `meta.json` e confere que existe uma malha por estado.
 * @returns {Promise<{ problems: string[], ids: string[] }>}
 */
async function checkMeta(dir) {
  const problems = []
  const file = path.join(dir, "meta.json")
  let meta
  try {
    meta = JSON.parse(await readFile(file, "utf8"))
  } catch (error) {
    return { problems: [`meta.json ausente ou inválido: ${error.message}`], ids: [] }
  }
  const estados = Array.isArray(meta?.estados) ? meta.estados : []
  if (estados.length !== EXPECTED_STATES) {
    problems.push(`meta.json tem ${estados.length} estados (esperado ${EXPECTED_STATES})`)
  }
  const ids = []
  for (const estado of estados) {
    if (typeof estado?.id !== "string" || !/^\d{2}$/.test(estado.id)) {
      problems.push(`meta.json com id inválido: ${JSON.stringify(estado?.id)}`)
      continue
    }
    ids.push(estado.id)
    if (!Array.isArray(estado.centroide) || estado.centroide.some((n) => !Number.isFinite(n))) {
      problems.push(`meta.json: ${estado.id} sem centroide válido`)
    }
    if (!Array.isArray(estado.bbox) || estado.bbox.length !== 4) {
      problems.push(`meta.json: ${estado.id} sem bbox válido`)
    }
  }
  if (!/^\d+\.\d+\.\d+-[0-9a-f]{12}$/.test(String(meta?.versao))) {
    problems.push(`meta.json: versão inesperada ${JSON.stringify(meta?.versao)}`)
  }
  if (Number.isNaN(Date.parse(meta?.geradoEm))) {
    problems.push("meta.json: geradoEm não é ISO 8601")
  }
  return { problems, ids }
}

/**
 * Confere os orçamentos e devolve as linhas da tabela.
 * @param {string} dir
 * @returns {Promise<{ rows: Array<{ nome: string, bytes: number, gz: number, limit: number, ok: boolean }>, problems: string[] }>}
 */
export async function checkBudgets(dir = DEFAULT_GEO_DIR) {
  const problems = []
  const rows = []

  async function addRow(nome, file, limit) {
    try {
      const { bytes, gz } = await measureFile(file)
      rows.push({ nome, bytes, gz, limit, ok: gz <= limit })
      if (gz > limit) {
        problems.push(`${nome}: ${formatKb(gz)} excede o limite de ${formatKb(limit)}`)
      }
    } catch (error) {
      rows.push({ nome, bytes: 0, gz: 0, limit, ok: false })
      problems.push(`${nome}: ${error.code === "ENOENT" ? "arquivo ausente" : error.message}`)
    }
  }

  await addRow("br.topo.json", path.join(dir, "br.topo.json"), LIMITS.br)

  const ufDir = path.join(dir, "uf")
  let entries = []
  try {
    entries = (await readdir(ufDir)).filter((name) => name.endsWith(".topo.json")).sort()
  } catch {
    problems.push(`pasta ausente: ${path.relative(process.cwd(), ufDir)}`)
  }

  const { problems: metaProblems, ids } = await checkMeta(dir)
  problems.push(...metaProblems)

  if (entries.length !== EXPECTED_STATES) {
    problems.push(`${entries.length} malhas de UF encontradas (esperado ${EXPECTED_STATES})`)
  }
  const fileIds = entries.map((name) => name.slice(0, 2))
  for (const id of ids) {
    if (!fileIds.includes(id)) problems.push(`falta uf/${id}.topo.json`)
  }
  for (const id of fileIds) {
    if (ids.length > 0 && !ids.includes(id)) problems.push(`uf/${id}.topo.json fora do meta.json`)
  }

  for (const name of entries) {
    await addRow(`uf/${name}`, path.join(ufDir, name), LIMITS.uf)
  }

  return { rows, problems }
}

/**
 * Imprime a tabela de orçamento.
 * @param {Array<{ nome: string, bytes: number, gz: number, limit: number, ok: boolean }>} rows
 */
export function printBudget(rows) {
  const nomeWidth = Math.max(13, ...rows.map((row) => row.nome.length))
  const header = [
    "Malha".padEnd(nomeWidth),
    "Bruto".padStart(10),
    "Gzip".padStart(10),
    "Limite".padStart(10),
    "Uso".padStart(6),
    "Situação",
  ].join("  ")
  console.log(header)
  console.log("-".repeat(header.length))
  for (const row of rows) {
    const uso = row.limit > 0 ? `${((row.gz / row.limit) * 100).toFixed(0)}%` : "—"
    console.log(
      [
        row.nome.padEnd(nomeWidth),
        formatKb(row.bytes).padStart(10),
        formatKb(row.gz).padStart(10),
        formatKb(row.limit).padStart(10),
        uso.padStart(6),
        row.ok ? "ok" : "ACIMA",
      ].join("  "),
    )
  }
  const total = rows.reduce((sum, row) => sum + row.gz, 0)
  console.log("-".repeat(header.length))
  console.log(`${rows.length} malhas · ${formatKb(total)} gzip no total · 1 KB = 1024 B`)
}

async function main() {
  const argIndex = process.argv.indexOf("--dir")
  const dir = argIndex >= 0 ? path.resolve(process.argv[argIndex + 1]) : DEFAULT_GEO_DIR
  const { rows, problems } = await checkBudgets(dir)

  printBudget(rows)

  if (problems.length > 0) {
    console.error(`\n✗ geo:budget falhou (${problems.length})`)
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exitCode = 1
    return
  }
  console.log("\n✓ geo:budget verde")
}

const invokedDirectly =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
  main().catch((error) => {
    console.error(`✗ geo:budget falhou: ${error.stack ?? error.message}`)
    process.exitCode = 1
  })
}
