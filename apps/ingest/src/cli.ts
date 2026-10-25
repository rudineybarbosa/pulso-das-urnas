import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fetchTseJson, findRepoRoot } from "@pulso/tse"
import { GoogleSnapshotRepository } from "@pulso/cloud"
import { collectElection } from "./collector"
import { electionConfigFromEnv } from "./election-config"
import { sweepMunicipalities } from "./municipalities"
import { INGEST_ACTIVATION_AT, INGEST_DEACTIVATION_AT, isIngestActive } from "./window"

const BASE = "https://resultados.tse.jus.br/oficial"
const ROOT = join(findRepoRoot(), "data", "snapshots", "raw")
const UFS =
  "ac al ap am ba ce df es go ma mt ms mg pa pb pr pe pi rj rn rs ro rr sc sp se to".split(" ")

async function save(path: string, body: unknown): Promise<void> {
  const target = join(ROOT, path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, JSON.stringify(body))
}

async function main(): Promise<void> {
  if (!isIngestActive(new Date())) {
    console.log(
      `ingestão fora da janela (${INGEST_ACTIVATION_AT} até ${INGEST_DEACTIVATION_AT}); nada a fazer`,
    )
    return
  }

  if (process.env.DATA_MODE === "real") {
    const bucketName = process.env.SNAPSHOT_BUCKET
    if (!bucketName) throw new Error("SNAPSHOT_BUCKET é obrigatório em DATA_MODE=real")
    const repository = new GoogleSnapshotRepository({
      projectId: process.env.GCP_PROJECT,
      bucketName,
    })
    const config = electionConfigFromEnv()
    if (process.env.MUNICIPAL_SWEEP_ONLY === "1") {
      const summary = await sweepMunicipalities(config, repository, {
        cargo: process.env.CARGO_ID ?? "1",
        budgetMs: Number(process.env.MUNICIPAL_BUDGET_MS ?? 200_000),
        limit: Number(process.env.MUNICIPAL_LIMIT ?? Number.POSITIVE_INFINITY),
      })
      console.log(`aquecimento municipal concluído: ${JSON.stringify(summary)}`)
      return
    }
    const summary = await collectElection(config, undefined, repository)
    console.log(`coleta real concluída: ${JSON.stringify(summary)}`)
    return
  }

  const started = Date.now()
  const catalog = await fetchTseJson(`${BASE}/comum/config/ele-c.json`)
  await save("catalog/ele-c.json", catalog.body)

  let requests = 1
  for (const uf of UFS) {
    const president = await fetchTseJson(
      `${BASE}/ele2026/6257/dados/${uf}/${uf}-c0001-e006257-u.json`,
    )
    await save(`2026/6257/${uf}-c0001-e006257-u.json`, president.body)
    requests += 1

    for (const code of ["3", "5", "6", "7", "8"]) {
      const stateOffice = await fetchTseJson(
        `${BASE}/ele2026/6259/dados/${uf}/${uf}-c000${code}-e006259-u.json`,
      )
      if (stateOffice.status === 200) {
        await save(`2026/6259/${uf}-c000${code}-e006259-u.json`, stateOffice.body)
      }
      requests += 1
    }
  }

  const national = await fetchTseJson(`${BASE}/ele2026/6257/dados/br/br-c0001-e006257-u.json`)
  await save("2026/6257/br-c0001-e006257-u.json", national.body)
  requests += 1

  console.log(
    `ingestão concluída: ${requests} requisições em ${((Date.now() - started) / 1000).toFixed(1)}s`,
  )
  console.log(`arquivos em ${ROOT}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
