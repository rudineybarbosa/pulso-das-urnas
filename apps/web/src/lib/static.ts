import type { Localidade, Office, ScopeSnapshot } from "@pulso/contracts"
import { ApiError } from "./errors"

interface MunicipalityBundle {
  [election: string]: {
    cargos: Office[]
    snapshots: Record<string, ScopeSnapshot>
  }
}

interface LocalidadesIndex {
  items: Localidade[]
}

const OFFICE_NAMES: Record<string, string> = {
  "1": "Presidente",
  "3": "Governador",
  "5": "Senador",
  "6": "Deputado Federal",
  "7": "Deputado Estadual",
  "8": "Deputado Distrital",
}

const cache = new Map<string, Promise<unknown>>()

function fetchStatic<T>(file: string): Promise<T> {
  const existing = cache.get(file)
  if (existing) return existing as Promise<T>
  const promise = fetch(`/static${file}`, { headers: { Accept: "application/json" } }).then(
    async (response) => {
      if (!response.ok) throw new ApiError(response.status, "Dado estático indisponível")
      return (await response.json()) as unknown
    },
  )
  cache.set(file, promise)
  promise.catch(() => cache.delete(file))
  return promise as Promise<T>
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function fallbackSnapshot(base: ScopeSnapshot, cargo: string): ScopeSnapshot {
  return {
    ...base,
    cargo: {
      ...base.cargo,
      id: cargo,
      nome: OFFICE_NAMES[cargo] ?? `Cargo ${cargo}`,
      tipo: ["6", "7", "8"].includes(cargo) ? "proporcional" : "majoritario",
    },
    status: "sem_dado",
    dados: null,
    versao: `${base.versao}:estatico-sem-dado:${cargo}`,
  }
}

function localidades(index: LocalidadesIndex, query: string) {
  const term = normalize(query.trim())
  if (term.length < 2) return []
  const exact = query.trim().toLowerCase()
  return index.items
    .filter((item) => {
      const name = normalize(item.nome)
      return name.startsWith(term) || name.includes(term) || item.uf.toLowerCase() === term
    })
    .sort((left, right) => {
      const leftExact = left.nome.toLowerCase() === exact ? 0 : 1
      const rightExact = right.nome.toLowerCase() === exact ? 0 : 1
      if (leftExact !== rightExact) return leftExact - rightExact
      if (left.tipo !== right.tipo) return left.tipo === "estado" ? -1 : 1
      return left.nome.localeCompare(right.nome, "pt-BR")
    })
    .slice(0, 10)
}

export async function staticJson<T>(path: string): Promise<T> {
  const url = new URL(path, "https://static.local")
  const pathname = url.pathname
  const params = url.searchParams
  const election = params.get("pleito") ?? "6258"
  const cargo = params.get("cargo") ?? "1"

  if (pathname === "/pleitos") return fetchStatic<T>("/pleitos.json")
  if (pathname === "/panorama") {
    return fetchStatic<T>(`/panorama/${election}-${cargo}.json`)
  }
  if (pathname === "/corrida") return fetchStatic<T>(`/corrida/${election}.json`)
  if (pathname === "/localidades") {
    const index = await fetchStatic<LocalidadesIndex>("/localidades.json")
    return { apiVersion: "1", resultados: localidades(index, params.get("q") ?? "") } as T
  }
  if (pathname.startsWith("/escopos/")) {
    const uf = pathname.split("/")[2]?.toLowerCase() ?? ""
    return fetchStatic<T>(`/escopos/${uf}-${election}.json`)
  }

  const cargosMatch = pathname.match(/^\/municipios\/(\d+)\/cargos$/)
  if (cargosMatch) {
    const ibge = cargosMatch[1] ?? ""
    const bundle = await fetchStatic<MunicipalityBundle>(`/municipios/${ibge}.json`)
    const entry = bundle[election]
    const base = entry?.snapshots["1"]
    const escopo = base?.escopo ?? {
      tipo: "municipio",
      id: "",
      nome: "",
      uf: "",
      ibge: Number.parseInt(ibge, 10),
    }
    return { apiVersion: "1", escopo, cargos: entry?.cargos ?? [] } as T
  }

  const cityMatch = pathname.match(/^\/municipios\/(\d+)$/)
  if (cityMatch) {
    const ibge = cityMatch[1] ?? ""
    const bundle = await fetchStatic<MunicipalityBundle>(`/municipios/${ibge}.json`)
    const entry = bundle[election]
    const snapshot = entry?.snapshots[cargo] ?? entry?.snapshots["1"]
    if (!snapshot) throw new ApiError(404, "Dados deste município não estão na versão estática")
    return (entry?.snapshots[cargo] ? snapshot : fallbackSnapshot(snapshot, cargo)) as T
  }

  throw new ApiError(404, `Rota estática desconhecida: ${pathname}`)
}
