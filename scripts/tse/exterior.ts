import { writeFileSync } from "node:fs"
import {
  fetchTseJson,
  fixturePath,
  parseResult,
  readJson,
  type ParsedScope,
} from "../../packages/tse/src/index.ts"

const BASE = "https://resultados.tse.jus.br/oficial"
const CYCLE = "ele2026"
const CONFIG = "config/mun-e006257-cm.json"

interface Arguments {
  election: string
  cargo: string
  top: number
  csv?: string
  locais: boolean
  concurrency: number
}

interface Consulate {
  tse: string
  nome: string
}

interface ConsulateResult extends Consulate {
  ok: boolean
  electorate: number
  turnout: number
  counted: number
  sections: number
  valid: number
  leader: { nome: string; partido: string; votos: number; percentual: number } | null
}

const numberFormat = new Intl.NumberFormat("pt-BR")
const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "America/Sao_Paulo",
})
const percentFormat = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function int(value: number): string {
  return numberFormat.format(value)
}

function percent(value: number): string {
  return `${percentFormat.format(value)}%`
}

function dataElection(election: string, cargo: string): string {
  if (cargo === "1") return election
  return election === "6257" ? "6259" : "6260"
}

function url(data: string, scope: string, cargo: string): string {
  return `${BASE}/${CYCLE}/${data}/dados/zz/${scope}-c000${cargo}-e00${data}-u.json`
}

function parseArgs(argv: string[]): Arguments {
  const args: Arguments = {
    election: "6258",
    cargo: "1",
    top: 15,
    locais: true,
    concurrency: 4,
  }
  for (const item of argv) {
    const [key, value] = item.split("=")
    if (key === "--election" || key === "--pleito") args.election = value ?? args.election
    else if (key === "--cargo") args.cargo = value ?? args.cargo
    else if (key === "--top") args.top = Number.parseInt(value ?? "", 10) || args.top
    else if (key === "--csv") args.csv = value
    else if (key === "--sem-locais") args.locais = false
    else if (key === "--concurrency") args.concurrency = Math.max(1, Number(value) || 4)
  }
  return args
}

function loadConsulates(): Consulate[] {
  const config = readJson<{
    abr?: Array<{ cd?: string; mu?: Array<{ cd?: string; nm?: string }> }>
  }>(fixturePath(CONFIG))
  return (config.abr?.find((entry) => entry.cd === "zz")?.mu ?? []).flatMap((city) =>
    city.cd && city.nm ? [{ tse: city.cd.padStart(5, "0"), nome: city.nm }] : [],
  )
}

function officeOf(parsed: ParsedScope, cargo: string) {
  return parsed.offices.find((entry) => entry.office.id === cargo) ?? null
}

function leaderOf(parsed: ParsedScope, cargo: string): ConsulateResult["leader"] {
  const office = officeOf(parsed, cargo)
  if (!office || office.validVotes === 0) return null
  const candidate = [...office.candidates].sort((left, right) => right.votos - left.votos)[0]
  if (!candidate || candidate.votos === 0) return null
  return {
    nome: candidate.nomeUrna,
    partido: candidate.partido,
    votos: candidate.votos,
    percentual: candidate.percentual,
  }
}

async function readConsulate(
  city: Consulate,
  data: string,
  cargo: string,
): Promise<ConsulateResult> {
  try {
    const result = await fetchTseJson(url(data, `zz${city.tse}`, cargo), { retries: 1 })
    if (!result.body) {
      return {
        ...city,
        ok: false,
        electorate: 0,
        turnout: 0,
        counted: 0,
        sections: 0,
        valid: 0,
        leader: null,
      }
    }
    const parsed = parseResult(result.body as never)
    return {
      ...city,
      ok: true,
      electorate: parsed.electorate.total,
      turnout: parsed.electorate.turnout,
      counted: parsed.sections.counted,
      sections: parsed.sections.total,
      valid: officeOf(parsed, cargo)?.validVotes ?? 0,
      leader: leaderOf(parsed, cargo),
    }
  } catch {
    return {
      ...city,
      ok: false,
      electorate: 0,
      turnout: 0,
      counted: 0,
      sections: 0,
      valid: 0,
      leader: null,
    }
  }
}

async function readAll(
  consulates: Consulate[],
  data: string,
  cargo: string,
  concurrency: number,
): Promise<ConsulateResult[]> {
  const rows: ConsulateResult[] = []
  for (let index = 0; index < consulates.length; index += concurrency) {
    const batch = consulates.slice(index, index + concurrency)
    const results = await Promise.all(batch.map((city) => readConsulate(city, data, cargo)))
    rows.push(...results)
    process.stderr.write(
      `\rlocais: ${Math.min(index + concurrency, consulates.length)}/${consulates.length}`,
    )
    if (index + concurrency < consulates.length) {
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
  }
  process.stderr.write("\n")
  return rows
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const data = dataElection(args.election, args.cargo)
  const aggregateUrl = url(data, "zz", args.cargo)
  const aggregate = await fetchTseJson(aggregateUrl, { retries: 2 })
  if (!aggregate.body) {
    console.log(
      `O TSE ainda não publicou o exterior para o pleito ${args.election} (cargo ${args.cargo}).`,
    )
    console.log(`Tente novamente mais tarde: ${aggregateUrl}`)
    return
  }
  const parsed = parseResult(aggregate.body as never)
  const office = officeOf(parsed, args.cargo)
  const candidates = [...(office?.candidates ?? [])].sort((left, right) => right.votos - left.votos)

  console.log(`Exterior — pleito ${args.election} · ${parsed.round}º turno · cargo ${args.cargo}`)
  console.log(`Fonte: ${aggregateUrl}`)
  console.log(`Arquivo do TSE gerado em: ${dateFormat.format(new Date(parsed.generatedAt))}`)
  console.log(
    `Seções: ${int(parsed.sections.counted)}/${int(parsed.sections.total)} · ` +
      `eleitores: ${int(parsed.electorate.total)} · comparecimento: ${int(parsed.electorate.turnout)}`,
  )
  console.log("")
  console.log("Ranking nacional do exterior:")
  if (candidates.length === 0) {
    console.log("  (sem candidatos publicados)")
  } else {
    for (const [index, candidate] of candidates.slice(0, args.top).entries()) {
      console.log(
        `  ${String(index + 1).padStart(2, " ")}. ${candidate.nomeUrna} (${candidate.partido})` +
          ` — ${int(candidate.votos)} votos — ${percent(candidate.percentual)}`,
      )
    }
  }

  if (!args.locais) {
    console.log("")
    console.log("Use sem --sem-locais para ver o ranking por consulado.")
    return
  }

  const consulates = loadConsulates()
  console.log("")
  console.log(`Lendo ${consulates.length} consulados/representações...`)
  const rows = await readAll(consulates, data, args.cargo, args.concurrency)
  const withVotes = rows.filter((row) => row.valid > 0)
  const missing = rows.filter((row) => !row.ok)
  const ranking = [...rows].sort((left, right) => right.valid - left.valid)
  console.log("")
  console.log(
    `Locais com votos: ${withVotes.length}/${rows.length} · sem arquivo: ${missing.length}`,
  )
  console.log("")
  console.log(`Top ${args.top} por votos válidos:`)
  for (const [index, row] of ranking.slice(0, args.top).entries()) {
    if (row.valid === 0) break
    console.log(
      `  ${String(index + 1).padStart(2, " ")}. ${row.nome} — ${int(row.valid)} válidos` +
        ` · ${row.leader ? `${row.leader.nome} (${row.leader.partido}) ${percent(row.leader.percentual)}` : "sem líder"}` +
        ` · seções ${int(row.counted)}/${int(row.sections)}`,
    )
  }

  if (args.csv) {
    const header =
      "local,eleitores,comparecimento,secoes_totalizadas,secoes_total,validos,lider,partido,votos_lider\n"
    const body = ranking
      .map((row) =>
        [
          `"${row.nome.replaceAll('"', '""')}"`,
          row.electorate,
          row.turnout,
          row.counted,
          row.sections,
          row.valid,
          `"${(row.leader?.nome ?? "").replaceAll('"', '""')}"`,
          row.leader?.partido ?? "",
          row.leader?.votos ?? 0,
        ].join(","),
      )
      .join("\n")
    writeFileSync(args.csv, header + body + "\n")
    console.log("")
    console.log(`CSV gravado em: ${args.csv}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
