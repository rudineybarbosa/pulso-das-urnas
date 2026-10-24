import { access, readFile, readdir } from "node:fs/promises"
import { join } from "node:path"
import { GoogleSnapshotRepository } from "@pulso/cloud"
import { findRepoRoot, parseResult } from "@pulso/tse"

const args = new Map(
  process.argv.slice(2).map((value) => {
    const [key, ...rest] = value.replace(/^--/, "").split("=")
    return [key, rest.join("=")]
  }),
)
const projectId = args.get("project") ?? process.env.GCP_PROJECT
const bucketName = args.get("bucket") ?? process.env.SNAPSHOT_BUCKET
const electionId = args.get("election") ?? "6257"
const cycle = args.get("cycle") ?? "ele2026"

if (!projectId || !bucketName) {
  throw new Error("Uso: pnpm exec tsx scripts/cloud/seed-snapshots.ts --project=ID --bucket=NOME [--election=6257]")
}

const repositoryRoot = findRepoRoot()
const rawRoot = join(repositoryRoot, "data", "snapshots", "raw", "2026", electionId)
const fixtureRoot = join(repositoryRoot, "data", "fixtures", "tse", "2026", electionId)
let root = rawRoot
try {
  await access(root)
} catch {
  root = fixtureRoot
}
const files = (await readdir(root)).filter((file) => file.endsWith("-u.json"))
const repository = new GoogleSnapshotRepository({ projectId, bucketName })
let uploaded = 0
let skipped = 0

for (const file of files) {
  const raw = JSON.parse(await readFile(join(root, file), "utf8")) as unknown
  const parsed = parseResult(raw as never)
  const scope = parsed.scope.id.toLowerCase()
  const pointer = await repository.putIfNewer({
    ciclo: cycle,
    pleito: electionId,
    escopo: scope,
    cargo: parsed.offices[0]?.office.id ?? "1",
    idg: parsed.generationId,
    generatedAt: parsed.generatedAt,
    collectedAt: new Date().toISOString(),
    parserVersion: "1.0.0",
    body: raw,
  })
  if (pointer.idg === parsed.generationId) uploaded += 1
  else skipped += 1
}

console.log(JSON.stringify({ electionId, files: files.length, uploaded, skipped }))
