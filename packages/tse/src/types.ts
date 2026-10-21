import type { Candidate, Office, ScopeRef } from "@pulso/contracts"

export interface ParsedOffice {
  office: Office
  candidates: Candidate[]
  validVotes: number
  blank: number
  nullVotes: number
  totalVotes: number
}

export interface ParsedScope {
  electionId: string
  round: number
  scope: ScopeRef
  generatedAt: string
  updatedAt: string
  generationId: string
  finished: boolean
  progress: number
  sections: { total: number; counted: number }
  electorate: { total: number; turnout: number; abstention: number }
  votes: {
    valid: number
    nominal: number
    party: number
    blank: number
    null: number
    total: number
  }
  offices: ParsedOffice[]
}

export interface RawCandidate {
  n?: string
  sqcand?: string
  nm?: string
  nmu?: string
  dvt?: string
  st?: string
  e?: string
  vap?: string
  pvap?: string
  vs?: Array<{ nm?: string; nmu?: string; sgp?: string; tp?: string }>
}

export interface RawParty {
  n?: string
  sg?: string
  nm?: string
  cand?: RawCandidate[]
}

export interface RawAgreement {
  n?: string
  nm?: string
  tp?: string
  par?: RawParty[]
}

export interface RawOffice {
  cd?: string
  nmn?: string
  nmf?: string
  nv?: string
  agr?: RawAgreement[]
}

export interface RawResult {
  ele?: string
  t?: string
  f?: string
  tpabr?: string
  cdabr?: string
  dg?: string
  hg?: string
  idg?: string
  dt?: string
  ht?: string
  tf?: string
  and?: string
  s?: Record<string, string>
  e?: Record<string, string>
  v?: Record<string, string>
  carg?: RawOffice[]
  abr?: Array<{
    cdabr?: string
    dt?: string
    ht?: string
    s?: Record<string, string>
    e?: Record<string, string>
  }>
}

export interface RawCatalogOffice {
  cd?: string
  ds?: string
  tp?: string
}

export interface RawCatalogElection {
  cd?: string
  cdt2?: string
  nm?: string
  t?: string
  tp?: string
  abr?: Array<{ cd?: string; cp?: RawCatalogOffice[] }>
}

export interface RawCatalogPleito {
  cd?: string
  c?: string
  dt?: string
  e?: RawCatalogElection[]
}

export interface RawCatalog {
  dg?: string
  hg?: string
  idg?: string
  pl?: RawCatalogPleito[]
}

export interface CatalogOffice extends Office {
  distrital?: boolean
}

export interface CatalogElection {
  id: string
  turno: number
  cycle: string
  name: string
  offices: CatalogOffice[]
}

export interface CatalogPleito {
  id: string
  name: string
  date: string
  cycle: string
  elections: CatalogElection[]
}

export interface Catalog {
  version: string
  generatedAt: string
  pleitos: CatalogPleito[]
}

export interface MunicipalityEntry {
  tse: string
  ibge: number
  nome: string
  capital: boolean
}

export interface MunicipalityCatalog {
  ufs: Record<string, MunicipalityEntry[]>
}

export interface ProgressEntry {
  uf: string
  generatedAt: string
  percentile: number
  sections: { total: number; counted: number }
  electorate: { total: number; turnout: number; abstention: number }
}

export interface ProgressCatalog {
  electionId: string
  round: number
  generatedAt: string
  byUf: Record<string, ProgressEntry>
}
