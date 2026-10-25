import { fetchTseJson, loadMunicipalities, parseResult } from "../../packages/tse/src/index.ts"
import { GoogleSnapshotRepository } from "../../packages/cloud/src/index.ts"

const projectId = process.env.GCP_PROJECT ?? "pulso-das-urnas"
const bucketName = process.env.SNAPSHOT_BUCKET ?? "pulso-snapshots-prod"
const election = process.env.ELECTION_ID ?? "6257"
const cargo = process.env.CARGO_ID ?? "1"
const cycle = "ele2026"
const base = "https://resultados.tse.jus.br/oficial"
const municipalities = loadMunicipalities()
const repository = new GoogleSnapshotRepository({ projectId, bucketName })
let saved = 0
let skipped = 0
let failed = 0

function url(uf: string, tse: string): string {
  const lower = uf.toLowerCase()
  return `${base}/${cycle}/${election}/dados/${lower}/${lower}${tse}-c000${cargo}-e00${election}-u.json`
}

async function collect(uf: string, tse: string): Promise<void> {
  const result = await fetchTseJson(url(uf, tse), { retries: 2 })
  if (result.notModified || !result.body) {
    skipped += 1
    return
  }
  const parsed = parseResult(result.body as never)
  await repository.putIfNewer({
    ciclo: cycle,
    pleito: election,
    escopo: `${uf.toLowerCase()}${tse}`,
    cargo,
    idg: parsed.generationId,
    generatedAt: parsed.generatedAt,
    collectedAt: new Date().toISOString(),
    parserVersion: "1.0.0",
    etag: result.etag,
    body: result.body,
  })
  saved += 1
  if (saved % 100 === 0) console.log(`municipios processados: ${saved}`)
}

const entries = Object.entries(municipalities.ufs).flatMap(([uf, cities]) =>
  cities.map((city) => [uf, city.tse] as const),
)
for (let index = 0; index < entries.length; index += 4) {
  const batch = entries.slice(index, index + 4)
  const results = await Promise.allSettled(batch.map(([uf, tse]) => collect(uf, tse)))
  failed += results.filter((result) => result.status === "rejected").length
  if (index + 4 < entries.length) await new Promise((resolve) => setTimeout(resolve, 800))
}

console.log(JSON.stringify({ election, cargo, total: entries.length, saved, skipped, failed }))
