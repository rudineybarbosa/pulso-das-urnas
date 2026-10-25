import { loadMunicipalities, parseResult } from "../../packages/tse/src/index.ts"
import { GoogleSnapshotRepository } from "../../packages/cloud/src/index.ts"

const projectId = process.env.GCP_PROJECT ?? "pulso-das-urnas"
const bucketName = process.env.SNAPSHOT_BUCKET ?? "pulso-snapshots-prod"
const election = process.env.ELECTION_ID ?? "6257"
const cargo = process.env.CARGO_ID ?? "1"
const cycle = "ele2026"
const municipalities = loadMunicipalities()
const repository = new GoogleSnapshotRepository({ projectId, bucketName })

interface StateAudit {
  uf: string
  total: number
  present: number
  withOffice: number
  oldest: string | null
  missing: string[]
}

async function auditState(uf: string, cities: Array<{ tse: string }>): Promise<StateAudit> {
  const result: StateAudit = {
    uf,
    total: cities.length,
    present: 0,
    withOffice: 0,
    oldest: null,
    missing: [],
  }
  for (let index = 0; index < cities.length; index += 16) {
    const batch = cities.slice(index, index + 16)
    const rows = await Promise.all(
      batch.map(async (city) => {
        const key = {
          ciclo: cycle,
          pleito: election,
          escopo: `${uf.toLowerCase()}${city.tse}`,
          cargo,
        }
        const current = await repository.getCurrent(key).catch(() => null)
        if (!current) return { city, ok: false, office: false, collectedAt: null }
        const parsed = parseResult(current.body as never)
        return {
          city,
          ok: true,
          office: parsed.offices.some((entry) => entry.office.id === cargo),
          collectedAt: current.pointer.collectedAt,
        }
      }),
    )
    for (const row of rows) {
      if (!row.ok) {
        result.missing.push(row.city.tse)
        continue
      }
      result.present += 1
      if (row.office) result.withOffice += 1
      if (row.collectedAt && (!result.oldest || row.collectedAt < result.oldest)) {
        result.oldest = row.collectedAt
      }
    }
  }
  return result
}

const onlyUf = process.env.UF?.toUpperCase()
const states: StateAudit[] = []
for (const [uf, cities] of Object.entries(municipalities.ufs)) {
  if (cities.length === 0) continue
  if (onlyUf && uf !== onlyUf) continue
  states.push(await auditState(uf, cities))
}

const complete = states.every((state) => state.withOffice === state.total)
console.log(
  [
    "UF  total  com arquivo  com cargo  coletado mais antigo",
    ...states.map(
      (state) =>
        `${state.uf.padEnd(3)} ${String(state.total).padEnd(6)} ${String(state.present).padEnd(11)} ${String(
          state.withOffice,
        ).padEnd(10)} ${state.oldest ?? "-"}`,
    ),
  ].join("\n"),
)
const totals = states.reduce(
  (acc, state) => ({
    total: acc.total + state.total,
    present: acc.present + state.present,
    withOffice: acc.withOffice + state.withOffice,
  }),
  { total: 0, present: 0, withOffice: 0 },
)
console.log(JSON.stringify({ election, cargo, complete, ...totals }))
process.exit(complete ? 0 : 1)
