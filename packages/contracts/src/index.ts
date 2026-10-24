import { z } from "zod"

export type ScopeType = "pais" | "uf" | "municipio"
export type OfficeType = "majoritario" | "proporcional"
export type AbsenceStatus = "ok" | "sem_voto" | "sem_dado" | "nao_aplicavel" | "sem_lider_elegivel"
export type FreshnessStatus =
  "ao_vivo" | "desatualizado" | "fonte_indisponivel" | "finalizado" | "arquivado"
export type VoteDestination =
  "Válido" | "Válido (legenda)" | "Anulado" | "Anulado sub judice" | "Desconhecido"

export interface Office {
  id: string
  nome: string
  tipo: OfficeType
  destaque?: boolean
}

export interface PartyColor {
  sigla: string
  hex: string
  texto: "#FFFFFF" | "#0B1220"
  origem: "tabela" | "fallback"
}

export interface Candidate {
  id: string
  numero: string
  nome: string
  nomeUrna: string
  partido: string
  votos: number
  percentual: number
  percentualBase: "oficial_validos" | "calculado_validos"
  calculado: boolean
  situacao: string
  destinacao: VoteDestination
  eleito: boolean
  vices?: Array<{ nome: string; partido?: string }>
}

export interface SourceInfo {
  nome: string
  url: string
  generationId: string
  generatedAt: string
  collectedAt: string
  parserVersion: string
  status: FreshnessStatus
  sourceAgeSeconds: number
  collectedAgeSeconds: number
  snapshotAgeSeconds: number
}

export interface Apuracao {
  secoesTotalizadas: number
  secoesTotal: number
  percentual: number
  finalizada: boolean
}

export interface Resumo {
  votosValidos: number
  brancos: number
  nulos: number
  comparecimento: number
  abstencao: number
  eleitorado: number
  basePercentual: "validos"
}

export interface ScopeRef {
  tipo: ScopeType
  id: string
  nome: string
  uf?: string
  ibge?: number
}

export interface ScopeData {
  apuracao: Apuracao
  resumo: Resumo
  candidatos: Candidate[]
  municipios?: Array<{
    ibge: number
    nome: string
    uf: string
    cor: PartyColor | null
    lider: { candidatoId: string; nome: string; partido: string; votos: number } | null
    percentual: number | null
  }>
}

export interface FallbackOrigin {
  pleito: string
  turno: number
  generationId: string
  generatedAt: string
}

export interface ScopeSnapshot {
  apiVersion: "1"
  modo?: "fake" | "real"
  eleicao: string
  versao: string
  catalogVersion: string
  status: AbsenceStatus
  retificado: boolean
  geradoEm: string
  fonte: SourceInfo
  escopo: ScopeRef
  cargo: Office
  origem: FallbackOrigin | null
  dados: ScopeData | null
}

export interface StateSummary {
  uf: string
  nome: string
  ibge: number
  cor: PartyColor | null
  lider: {
    candidatoId: string
    nome: string
    partido: string
    votos: number
    percentual: number
  } | null
  votosValidos: number | null
  percentualApurado: number | null
  status: AbsenceStatus
  origem: FallbackOrigin | null
  disputaAcirrada: boolean
  empate?: boolean
}

export interface Panorama {
  apiVersion: "1"
  modo?: "fake" | "real"
  eleicao: string
  versao: string
  catalogVersion: string
  geradoEm: string
  fonte: SourceInfo
  pleito: { id: string; nome: string; turno: number }
  cargoEmDestaque: Office
  cargoSelecionado: Office
  apuracao: Apuracao
  resumo: Resumo
  estados: StateSummary[]
}

export interface RaceHorse {
  posicao: number
  candidatoId: string
  nomeUrna: string
  partido: string
  cor: string
  votos: number
  percentual: number
}

export interface Race {
  apiVersion: "1"
  modo?: "fake" | "real"
  versao: string
  cargo: Office & { escopo: "br" }
  pleito: { id: string; turno: number }
  apuracao: Apuracao
  cavalos: RaceHorse[]
  diferenca: { votos: number; normalizada: number; lider: string | null }
  ultimaUltrapassagem: string | null
  interesses: "ao_vivo" | "finalizado" | "sem_voto"
}

export interface Pleito {
  id: string
  nome: string
  data: string
  estado: "em_apuracao" | "finalizado" | "nao_iniciada" | "arquivado"
  cargos: Office[]
  turnos: Array<{
    eleicao: string
    turno: number
    nome: string
    percentualApurado: number
  }>
}

export interface Localidade {
  tipo: "estado" | "municipio"
  nome: string
  uf: string
  slug: string
  ibge?: number
  capital?: boolean
}

export const candidateSchema = z.object({
  id: z.string(),
  numero: z.string(),
  nome: z.string(),
  nomeUrna: z.string(),
  partido: z.string(),
  votos: z.number().int().nonnegative(),
  percentual: z.number().min(0).max(100),
  percentualBase: z.enum(["oficial_validos", "calculado_validos"]),
  calculado: z.boolean(),
  situacao: z.string(),
  destinacao: z.enum([
    "Válido",
    "Válido (legenda)",
    "Anulado",
    "Anulado sub judice",
    "Desconhecido",
  ]),
  eleito: z.boolean(),
  vices: z.array(z.object({ nome: z.string(), partido: z.string().optional() })).optional(),
})

export const scopeSnapshotSchema = z.object({
  apiVersion: z.literal("1"),
  eleicao: z.string(),
  versao: z.string(),
  catalogVersion: z.string(),
  status: z.enum(["ok", "sem_voto", "sem_dado", "nao_aplicavel", "sem_lider_elegivel"]),
  retificado: z.boolean(),
  geradoEm: z.string(),
  fonte: z.object({
    nome: z.string(),
    url: z.string(),
    generationId: z.string(),
    generatedAt: z.string(),
    collectedAt: z.string(),
    parserVersion: z.string(),
    status: z.enum(["ao_vivo", "desatualizado", "fonte_indisponivel", "finalizado", "arquivado"]),
    sourceAgeSeconds: z.number(),
    collectedAgeSeconds: z.number(),
    snapshotAgeSeconds: z.number(),
  }),
  escopo: z.object({
    tipo: z.enum(["pais", "uf", "municipio"]),
    id: z.string(),
    nome: z.string(),
    uf: z.string().optional(),
    ibge: z.number().optional(),
  }),
  cargo: z.object({
    id: z.string(),
    nome: z.string(),
    tipo: z.enum(["majoritario", "proporcional"]),
    destaque: z.boolean().optional(),
  }),
  origem: z
    .object({
      pleito: z.string(),
      turno: z.number(),
      generationId: z.string(),
      generatedAt: z.string(),
    })
    .nullable(),
  dados: z
    .object({
      apuracao: z.object({
        secoesTotalizadas: z.number(),
        secoesTotal: z.number(),
        percentual: z.number(),
        finalizada: z.boolean(),
      }),
      resumo: z.object({
        votosValidos: z.number(),
        brancos: z.number(),
        nulos: z.number(),
        comparecimento: z.number(),
        abstencao: z.number(),
        eleitorado: z.number(),
        basePercentual: z.literal("validos"),
      }),
      candidatos: z.array(candidateSchema),
      municipios: z
        .array(
          z.object({
            ibge: z.number(),
            nome: z.string(),
            uf: z.string(),
            lider: z
              .object({
                candidatoId: z.string(),
                nome: z.string(),
                partido: z.string(),
                votos: z.number(),
              })
              .nullable(),
          }),
        )
        .optional(),
    })
    .nullable(),
})

export const panoramaSchema = z.object({
  apiVersion: z.literal("1"),
  eleicao: z.string(),
  versao: z.string(),
  catalogVersion: z.string(),
  geradoEm: z.string(),
  fonte: z.object({ nome: z.string(), url: z.string(), generationId: z.string() }).passthrough(),
  pleito: z.object({ id: z.string(), nome: z.string(), turno: z.number() }),
  cargoEmDestaque: z.object({ id: z.string(), nome: z.string() }),
  cargoSelecionado: z.object({ id: z.string(), nome: z.string() }),
  apuracao: z.object({ percentual: z.number(), finalizada: z.boolean() }).passthrough(),
  resumo: z.object({ votosValidos: z.number() }).passthrough(),
  estados: z.array(
    z
      .object({
        uf: z.string(),
        nome: z.string(),
        status: z.string(),
        votosValidos: z.number().nullable(),
      })
      .passthrough(),
  ),
})

export type ApiProblem = {
  type: string
  title: string
  status: number
  detail: string
  instance: string
  code: string
  requestId: string
}
