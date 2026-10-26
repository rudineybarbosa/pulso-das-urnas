import { mkdir, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { Office, ScopeSnapshot } from "@pulso/contracts"
import { GoogleSnapshotRepository } from "@pulso/cloud"
import { findRepoRoot, loadMunicipalities, UF_CODES, UF_NAMES } from "@pulso/tse"
import { DataStore } from "./store"

const ELECTIONS = ["6257", "6258"] as const
const PANORAMA_CARGOS = ["1", "3", "5", "6", "7", "8"]
const STATIC_CARGOS = ["1"]

interface CityBundle {
  [election: string]: {
    cargos: Office[]
    snapshots: Record<string, ScopeSnapshot>
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function outDirectory(): string {
  const argument = process.argv.find((item) => item.startsWith("--out="))
  if (argument) return argument.slice("--out=".length)
  return join(findRepoRoot(), "apps", "web", "dist", "static")
}

const out = outDirectory()
const projectId = process.env.GCP_PROJECT ?? "pulso-das-urnas"
const bucketName = process.env.SNAPSHOT_BUCKET ?? "pulso-snapshots-prod"

async function writeJson(path: string, data: unknown): Promise<void> {
  const target = join(out, path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, JSON.stringify(data))
}

async function main(): Promise<void> {
  await rm(out, { recursive: true, force: true })
  await mkdir(out, { recursive: true })
  const store = new DataStore({
    mode: "real",
    live: false,
    repository: new GoogleSnapshotRepository({ projectId, bucketName }),
  })
  for (const election of ELECTIONS) await store.refresh(election)

  await writeJson("pleitos.json", store.pleitos())
  for (const election of ELECTIONS) {
    for (const cargo of PANORAMA_CARGOS) {
      await writeJson(`panorama/${election}-${cargo}.json`, store.panorama(cargo, election))
    }
    await writeJson(`corrida/${election}.json`, store.race(election))
  }

  const municipalities = loadMunicipalities()
  const entries = Object.entries(municipalities.ufs).flatMap(([uf, cities]) =>
    cities.map((city) => ({ uf, city })),
  )
  let cursor = 0
  let written = 0
  async function writer(): Promise<void> {
    while (true) {
      const entry = entries[cursor]
      cursor += 1
      if (!entry) return
      const { uf, city } = entry
      const bundle: CityBundle = {}
      for (const election of ELECTIONS) {
        const snapshot = await store.municipality(city.ibge, "1", election)
        if (!snapshot) continue
        bundle[election] = {
          cargos: store.cargos(uf, election).filter((office) => STATIC_CARGOS.includes(office.id)),
          snapshots: { "1": snapshot },
        }
      }
      await writeJson(`municipios/${city.ibge}.json`, bundle)
      written += 1
      if (written % 250 === 0) console.log(`municípios exportados: ${written}/${entries.length}`)
    }
  }
  await Promise.all(Array.from({ length: 12 }, () => writer()))

  for (const election of ELECTIONS) {
    for (const [uf] of UF_CODES) {
      const snapshot = await store.scopeSnapshot(uf, "1", election)
      snapshot.municipiosCarregando = false
      snapshot.municipiosCarregados =
        snapshot.municipiosTotal ?? snapshot.dados?.municipios?.length ?? 0
      await writeJson(`escopos/${uf.toLowerCase()}-${election}.json`, snapshot)
    }
  }

  const localidades = [
    ...UF_CODES.map(([uf]) => ({
      tipo: "estado" as const,
      nome: UF_NAMES[uf] ?? uf,
      uf,
      slug: uf.toLowerCase(),
    })),
    ...Object.entries(municipalities.ufs).flatMap(([uf, cities]) =>
      cities.map((city) => ({
        tipo: "municipio" as const,
        nome: city.nome,
        uf,
        slug: slugify(city.nome),
        ibge: city.ibge,
        capital: city.capital,
      })),
    ),
  ]
  await writeJson("localidades.json", { apiVersion: "1", items: localidades })
  console.log(
    JSON.stringify({
      out,
      elections: ELECTIONS,
      municipalities: entries.length,
      localidades: localidades.length,
    }),
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
