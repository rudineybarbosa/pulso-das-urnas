import { fetchTseJson, loadMunicipalities, parseResult, type FetchResult } from "@pulso/tse"
import type { SnapshotRepository } from "@pulso/cloud"
import type { ElectionConfig } from "./election-config"

const BASE = "https://resultados.tse.jus.br/oficial"
const FIRST_TURN_STATE_ELECTION = "6259"
const SECOND_TURN_STATE_ELECTION = "6260"
const CONCURRENCY = 4
const BATCH_PAUSE_MS = 800

export interface MunicipalClient {
  fetch(url: string, etag?: string | null): Promise<FetchResult>
}

export interface MunicipalSweepOptions {
  cargo?: string
  budgetMs?: number
  limit?: number
  client?: MunicipalClient
  pause?: (ms: number) => Promise<void>
}

export interface MunicipalSweepSummary {
  cargo: string
  election: string
  total: number
  start: number
  next: number
  completedCycle: boolean
  attempted: number
  updated: number
  unchanged: number
  missing: number
  failed: number
}

const defaultClient: MunicipalClient = {
  fetch: (url, etag) => fetchTseJson(url, { etag, retries: 2 }),
}

function dataElection(config: ElectionConfig, cargo: string): string {
  if (cargo === "1") return config.electionId
  return config.electionId === "6257" ? FIRST_TURN_STATE_ELECTION : SECOND_TURN_STATE_ELECTION
}

export function municipalUrl(
  config: ElectionConfig,
  election: string,
  uf: string,
  tse: string,
  cargo: string,
): string {
  const lower = uf.toLowerCase()
  return `${BASE}/${config.cycle}/${election}/dados/${lower}/${lower}${tse}-c000${cargo}-e00${election}-u.json`
}

function cursorKey(config: ElectionConfig, cargo: string): string {
  return `${config.cycle}:${config.electionId}:${cargo}`
}

/**
 * Percorre os municípios brasileiros em ciclo, continuando do cursor salvo.
 * Uma execução a cada cinco minutos mantém todo o país aquecido no Storage,
 * sem que cada visitante precise esperar o TSE.
 */
export async function sweepMunicipalities(
  config: ElectionConfig,
  repository: SnapshotRepository,
  options: MunicipalSweepOptions = {},
): Promise<MunicipalSweepSummary> {
  const cargo = options.cargo ?? "1"
  const election = dataElection(config, cargo)
  const client = options.client ?? defaultClient
  const pause =
    options.pause ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const budgetMs = options.budgetMs ?? 200_000
  const limit = options.limit ?? Number.POSITIVE_INFINITY
  const deadline = Date.now() + budgetMs
  const entries = Object.entries(loadMunicipalities().ufs)
    .filter(([, cities]) => cities.length > 0)
    .flatMap(([uf, cities]) => cities.map((city) => ({ uf, tse: city.tse })))
  const total = entries.length
  const savedCursor = (await repository.getCursor?.(cursorKey(config, cargo))) ?? 0
  const start = savedCursor >= 0 && savedCursor < total ? savedCursor : 0
  const summary: MunicipalSweepSummary = {
    cargo,
    election,
    total,
    start,
    next: start,
    completedCycle: false,
    attempted: 0,
    updated: 0,
    unchanged: 0,
    missing: 0,
    failed: 0,
  }
  if (total === 0) return summary
  let index = start
  while (summary.attempted < limit && Date.now() < deadline) {
    const batch: typeof entries = []
    for (let offset = 0; offset < Math.min(CONCURRENCY, total); offset += 1) {
      const entry = entries[(index + offset) % total]
      if (entry) batch.push(entry)
    }
    await Promise.all(
      batch.map(async (entry) => {
        summary.attempted += 1
        const key = {
          ciclo: config.cycle,
          pleito: election,
          escopo: `${entry.uf.toLowerCase()}${entry.tse}`,
          cargo,
        }
        try {
          const pointer = await repository.getPointer?.(key)
          const result = await client.fetch(
            municipalUrl(config, election, entry.uf, entry.tse, cargo),
            pointer?.etag,
          )
          if (result.notModified) {
            summary.unchanged += 1
            return
          }
          if (result.status === 404 || !result.body) {
            summary.missing += 1
            return
          }
          const parsed = parseResult(result.body as never)
          await repository.putIfNewer({
            ...key,
            idg: parsed.generationId,
            generatedAt: parsed.generatedAt,
            collectedAt: new Date().toISOString(),
            parserVersion: "1.0.0",
            etag: result.etag,
            body: result.body,
          })
          summary.updated += 1
        } catch {
          summary.failed += 1
        }
      }),
    )
    index = (index + batch.length) % total
    summary.next = index
    if (index === 0) summary.completedCycle = true
    await repository.setCursor?.(cursorKey(config, cargo), index)
    if (summary.attempted < limit && Date.now() < deadline) await pause(BATCH_PAUSE_MS)
  }
  return summary
}
