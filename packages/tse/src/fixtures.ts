import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import type {
  Catalog,
  MunicipalityCatalog,
  ParsedScope,
  ProgressCatalog,
  RawCatalog,
  RawResult,
} from "./types"
import { parseCatalog, parseMunicipalities, parseProgress, parseResult } from "./parse"

export function findRepoRoot(start = process.cwd()): string {
  let current = resolve(start)
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(current, "data", "fixtures", "tse"))) return current
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  throw new Error("data/fixtures/tse não encontrado a partir de " + start)
}

export function fixturePath(...segments: string[]): string {
  return join(findRepoRoot(), "data", "fixtures", "tse", ...segments)
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

export function loadCatalog(path = fixturePath("catalog", "ele-c-2026.json")): Catalog {
  return parseCatalog(readJson<RawCatalog>(path))
}

export function loadResult(path: string, cycle = "ele2026"): ParsedScope {
  const full = path.includes("/") ? fixturePath(path) : fixturePath("2026", path)
  return parseResult(readJson<RawResult>(full), cycle)
}

export function loadResultFile(path: string, cycle = "ele2026"): ParsedScope {
  return parseResult(readJson<RawResult>(path), cycle)
}

export function loadProgress(path = "2026/6257/br-e006257-ab.json"): ProgressCatalog {
  return parseProgress(readJson<RawResult>(fixturePath(path)))
}

export function loadMunicipalities(path = "config/mun-e006257-cm.json"): MunicipalityCatalog {
  return parseMunicipalities(readJson(fixturePath(path)))
}

export function presidentFixture(uf: string): string {
  return `2026/6257/${uf.toLowerCase()}-c0001-e006257-u.json`
}

export function governorFixture(uf: string): string {
  return stateFixture(uf, "3")
}

export function stateFixture(uf: string, office: string): string {
  return `2026/6259/${uf.toLowerCase()}-c000${office}-e006259-u.json`
}

export const UF_CODES = [
  ["AC", 12],
  ["AL", 27],
  ["AP", 16],
  ["AM", 13],
  ["BA", 29],
  ["CE", 23],
  ["DF", 53],
  ["ES", 32],
  ["GO", 52],
  ["MA", 21],
  ["MT", 51],
  ["MS", 50],
  ["MG", 31],
  ["PA", 15],
  ["PB", 25],
  ["PR", 41],
  ["PE", 26],
  ["PI", 22],
  ["RJ", 33],
  ["RN", 24],
  ["RS", 43],
  ["RO", 11],
  ["RR", 14],
  ["SC", 42],
  ["SP", 35],
  ["SE", 28],
  ["TO", 17],
] as const

export const UF_NAMES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
}
