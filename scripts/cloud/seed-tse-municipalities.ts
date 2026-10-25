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
const dataElection =
  cargo === "1" ? election : election === "6257" ? "6259" : "6260"
let saved = 0
let skipped = 0
let failed = 0

function url(uf: string, tse: string): string {
  const lower = uf.toLowerCase()
  return `${base}/${cycle}/${dataElection}/dados/${lower}/${lower}${tse}-c000${cargo}-e00${dataElection}-u.json`
}

async function collect(uf: string, tse: string): Promise<void> {
  const key = {
    ciclo: cycle,
    pleito: dataElection,
    escopo: `${uf.toLowerCase()}${tse}`,
    cargo,
  }
  const pointer = await repository.getPointer?.(key)
  const result = await fetchTseJson(url(uf, tse), { etag: pointer?.etag, retries: 2 })
  if (result.notModified || !result.body) {
    skipped += 1
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
  saved += 1
  if (saved % 100 === 0) console.log(`municipios processados: ${saved}`)
}

const groups = Object.entries(municipalities.ufs).filter(([, cities]) => cities.length > 0)
for (const [uf, cities] of groups) {
  const before = saved
  for (let index = 0; index < cities.length; index += 4) {
    const batch = cities.slice(index, index + 4)
    const results = await Promise.allSettled(batch.map((city) => collect(uf, city.tse)))
    failed += results.filter((result) => result.status === "rejected").length
    if (index + 4 < cities.length) await new Promise((resolve) => setTimeout(resolve, 800))
  }
  console.log(`${uf}: ${cities.length} municípios, ${saved - before} gravados`)
}

console.log(
  JSON.stringify({
    election,
    dataElection,
    cargo,
    total: groups.reduce((total, [, cities]) => total + cities.length, 0),
    saved,
    skipped,
    failed,
  }),
)
