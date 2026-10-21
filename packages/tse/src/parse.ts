import type { Candidate, Office, ScopeRef, VoteDestination } from "@pulso/contracts"
import { computeShare } from "@pulso/domain"
import type {
  ParsedOffice,
  ParsedScope,
  ProgressCatalog,
  RawAgreement,
  RawCatalog,
  RawCatalogElection,
  RawCatalogOffice,
  RawResult,
  Catalog,
  CatalogElection,
  CatalogOffice,
  CatalogPleito,
  MunicipalityCatalog,
} from "./types"

const MAJORITY = new Set(["1", "3", "5", "11"])

function toNumber(value: string | undefined, fallback = 0): number {
  if (!value) return fallback
  const parsed = Number.parseFloat(value.replace(/\./g, "").replace(",", "."))
  return Number.isFinite(parsed) ? parsed : fallback
}

function toInteger(value: string | undefined, fallback = 0): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value.replace(/\./g, ""), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeDestination(value: string | undefined): VoteDestination {
  switch (value) {
    case "Válido":
      return "Válido"
    case "Anulado":
    case "Anulado sub judice":
    case "Válido (legenda)":
    case "Desconhecido":
      return value
    default:
      return "Desconhecido"
  }
}

function toIso(date: string | undefined, time: string | undefined): string {
  if (!date) return new Date().toISOString()
  const [day, month, year] = date.split("/")
  const safeTime = time && time.trim() ? time : "00:00:00"
  const iso = `${year}-${month}-${day}T${safeTime}-03:00`
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

export function officeType(code: string): Office["tipo"] {
  return MAJORITY.has(code) ? "majoritario" : "proporcional"
}

export function scopeFromRaw(raw: RawResult): ScopeRef {
  const type = raw.tpabr === "br" ? "pais" : raw.tpabr === "mu" ? "municipio" : "uf"
  const id = (raw.cdabr ?? "br").toLowerCase()
  return {
    tipo: type,
    id,
    nome: id.toUpperCase(),
  }
}

function candidatesOf(agreements: RawAgreement[], validVotes: number): Candidate[] {
  const output: Candidate[] = []
  for (const agreement of agreements) {
    for (const party of agreement.par ?? []) {
      for (const raw of party.cand ?? []) {
        const votes = toInteger(raw.vap)
        const officialShare = raw.pvap ? toNumber(raw.pvap) : null
        const destination = normalizeDestination(raw.dvt)
        output.push({
          id: raw.sqcand ?? `${party.n ?? ""}-${raw.n ?? ""}`,
          numero: raw.n ?? "",
          nome: raw.nm ?? raw.nmu ?? "Candidato",
          nomeUrna: raw.nmu ?? raw.nm ?? "Candidato",
          partido: party.sg ?? "SEM PARTIDO",
          votos: votes,
          percentual: officialShare ?? computeShare(votes, validVotes),
          percentualBase: officialShare === null ? "calculado_validos" : "oficial_validos",
          calculado: officialShare === null,
          situacao: raw.st || (raw.e === "s" ? "Eleito" : "Não eleito"),
          destinacao: destination,
          eleito: raw.e === "s",
          vices: raw.vs?.map((vice) => ({
            nome: vice.nmu ?? vice.nm ?? "Vice",
            partido: vice.sgp,
          })),
        })
      }
    }
  }
  return output
}

export function parseResult(raw: RawResult, _cycle = "ele2026"): ParsedScope {
  const electionId = raw.ele ?? ""
  const round = toInteger(raw.t, 1)
  const validVotes = toInteger(raw.v?.vv)
  const offices: ParsedOffice[] = (raw.carg ?? []).map((rawOffice) => {
    const code = rawOffice.cd ?? ""
    const candidates = candidatesOf(rawOffice.agr ?? [], validVotes)
    return {
      office: {
        id: code,
        nome: rawOffice.nmn ?? rawOffice.nmf ?? code,
        tipo: officeType(code),
      },
      candidates,
      validVotes,
      blank: toInteger(raw.v?.vb),
      nullVotes: toInteger(raw.v?.vn),
      totalVotes: toInteger(raw.v?.tvn),
    }
  })

  return {
    electionId,
    round,
    scope: scopeFromRaw(raw),
    generatedAt: toIso(raw.dg, raw.hg),
    updatedAt: toIso(raw.dt || raw.dg, raw.ht || raw.hg),
    generationId: raw.idg ?? "",
    finished: raw.tf === "s",
    progress: raw.s?.pst ? toNumber(raw.s.pst) : 0,
    sections: {
      total: toInteger(raw.s?.ts),
      counted: toInteger(raw.s?.st),
    },
    electorate: {
      total: toInteger(raw.e?.te),
      turnout: toInteger(raw.e?.c),
      abstention: toInteger(raw.e?.a),
    },
    votes: {
      valid: validVotes,
      nominal: toInteger(raw.v?.vnom),
      party: toInteger(raw.v?.vb),
      blank: toInteger(raw.v?.vvb ?? raw.v?.vb),
      null: toInteger(raw.v?.vn),
      total: toInteger(raw.v?.tvn),
    },
    offices,
  }
}

function catalogOffice(raw: RawCatalogOffice): CatalogOffice | null {
  if (!raw.cd || !raw.ds) return null
  if (raw.tp === "3") return null
  return {
    id: raw.cd,
    nome: raw.ds,
    tipo: officeType(raw.cd),
  }
}

function catalogElection(raw: RawCatalogElection, cycle: string): CatalogElection | null {
  if (!raw.cd) return null
  const offices = (raw.abr ?? [])
    .flatMap((scope) => scope.cp ?? [])
    .map(catalogOffice)
    .filter((office): office is CatalogOffice => office !== null)
  const unique = new Map(offices.map((office) => [office.id, office]))
  return {
    id: raw.cd,
    turno: toInteger(raw.t, 1),
    cycle,
    name: raw.nm ?? `Eleição ${raw.cd}`,
    offices: [...unique.values()],
  }
}

export function parseCatalog(raw: RawCatalog): Catalog {
  const pleitos: CatalogPleito[] = []
  for (const rawPleito of raw.pl ?? []) {
    if (!rawPleito.cd || !rawPleito.c) continue
    const elections = (rawPleito.e ?? [])
      .map((election) => catalogElection(election, rawPleito.c ?? ""))
      .filter((election): election is CatalogElection => election !== null)
    if (elections.length === 0) continue
    pleitos.push({
      id: rawPleito.cd,
      name: `Eleições ${rawPleito.c.replace("ele", "")}`,
      date: rawPleito.dt ?? "",
      cycle: rawPleito.c,
      elections,
    })
  }
  return {
    version: `${raw.dg ?? ""}-${raw.hg ?? ""}-${raw.idg ?? ""}`,
    generatedAt: toIso(raw.dg, raw.hg),
    pleitos,
  }
}

export function parseProgress(raw: RawResult): ProgressCatalog {
  const byUf: ProgressCatalog["byUf"] = {}
  for (const entry of raw.abr ?? []) {
    if (!entry.cdabr) continue
    byUf[entry.cdabr.toUpperCase()] = {
      uf: entry.cdabr.toUpperCase(),
      generatedAt: toIso(entry.dt, entry.ht),
      percentile: toNumber(entry.s?.pst),
      sections: { total: toInteger(entry.s?.ts), counted: toInteger(entry.s?.st) },
      electorate: {
        total: toInteger(entry.e?.te),
        turnout: toInteger(entry.e?.c),
        abstention: toInteger(entry.e?.a),
      },
    }
  }
  return {
    electionId: raw.ele ?? "",
    round: toInteger(raw.t, 1),
    generatedAt: toIso(raw.dg, raw.hg),
    byUf,
  }
}

export function parseMunicipalities(raw: {
  dg?: string
  hg?: string
  abr?: Array<{
    cd?: string
    ds?: string
    mu?: Array<{ cd?: string; cdi?: string; nm?: string; c?: string }>
  }>
}): MunicipalityCatalog {
  const ufs: MunicipalityCatalog["ufs"] = {}
  for (const uf of raw.abr ?? []) {
    const key = (uf.cd ?? "").toUpperCase()
    if (!key) continue
    ufs[key] = (uf.mu ?? []).flatMap((city) => {
      if (!city.cd || !city.cdi || !city.nm) return []
      return [
        {
          tse: city.cd.padStart(5, "0"),
          ibge: Number.parseInt(city.cdi, 10),
          nome: city.nm,
          capital: city.c === "s",
        },
      ]
    })
  }
  return { ufs }
}

export type { Catalog, CatalogPleito, CatalogElection }
