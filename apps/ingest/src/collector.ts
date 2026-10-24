import { parseResult, UF_CODES, fetchTseJson, type FetchResult } from "@pulso/tse"
import type { SnapshotInput, SnapshotRepository } from "@pulso/cloud"
import { isIngestActive } from "./window"
import type { ElectionConfig } from "./election-config"

const BASE = "https://resultados.tse.jus.br/oficial"
const CARGO = "1"

export interface TSECollectorClient {
  fetch(url: string, etag?: string | null): Promise<FetchResult>
}

export interface CollectionSummary {
  active: boolean
  collected: number
  unchanged: number
  failed: number
}

const defaultClient: TSECollectorClient = {
  fetch: (url, etag) => fetchTseJson(url, { etag, retries: 2 }),
}

function resultUrl(config: ElectionConfig, scope: string): string {
  const normalized = scope.toLowerCase()
  const filename =
    normalized === "br"
      ? `br-c0001-e00${config.electionId}-u.json`
      : `${normalized}-c0001-e00${config.electionId}-u.json`
  return `${BASE}/${config.cycle}/${config.electionId}/dados/${normalized}/${filename}`
}

async function collectOne(
  config: ElectionConfig,
  scope: string,
  client: TSECollectorClient,
  repository: SnapshotRepository,
): Promise<"collected" | "unchanged" | "failed"> {
  const key = { ciclo: config.cycle, pleito: config.electionId, escopo: scope, cargo: CARGO }
  const current = await repository.getCurrent(key)
  let result: FetchResult
  try {
    result = await client.fetch(resultUrl(config, scope), null)
    if (result.notModified) return "unchanged"
    if (!result.body) return "failed"
    const parsed = parseResult(result.body as never)
    await repository.putIfNewer({
      ...key,
      idg: parsed.generationId,
      generatedAt: parsed.generatedAt,
      collectedAt: new Date().toISOString(),
      parserVersion: "1.0.0",
      body: result.body,
    } satisfies SnapshotInput)
    return current?.pointer.idg === parsed.generationId ? "unchanged" : "collected"
  } catch {
    return "failed"
  }
}

export async function collectElection(
  config: ElectionConfig,
  client: TSECollectorClient = defaultClient,
  repository: SnapshotRepository,
  now = new Date(),
): Promise<CollectionSummary> {
  if (!isIngestActive(now, config.activationAt, config.deactivationAt)) {
    return { active: false, collected: 0, unchanged: 0, failed: 0 }
  }

  const scopes = ["br", ...UF_CODES.map(([uf]) => uf)]
  const summary: CollectionSummary = { active: true, collected: 0, unchanged: 0, failed: 0 }
  for (let index = 0; index < scopes.length; index += 4) {
    const batch = scopes.slice(index, index + 4)
    const results = await Promise.all(batch.map((scope) => collectOne(config, scope, client, repository)))
    for (const result of results) summary[result] += 1
  }
  return summary
}
