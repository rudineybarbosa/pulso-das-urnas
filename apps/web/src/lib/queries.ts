import { useQuery } from "@tanstack/react-query"
import type { Panorama, Pleito, Race, ScopeSnapshot } from "@pulso/contracts"
import { getJson } from "./api"

const live = (active: boolean) => (active ? 5_000 : 60_000)
export const DEFAULT_ELECTION = import.meta.env.VITE_DEFAULT_ELECTION ?? "6257"

export function usePleitos() {
  return useQuery({
    queryKey: ["pleitos"],
    queryFn: () => getJson<{ pleitos: Pleito[] }>("/pleitos"),
    staleTime: 60_000,
  })
}

export function usePanorama(cargo: string, election = DEFAULT_ELECTION, active = true) {
  return useQuery({
    queryKey: ["panorama", election, cargo],
    queryFn: () => getJson<Panorama>(`/panorama?pleito=${election}&cargo=${cargo}`),
    refetchInterval: (query) =>
      query.state.data?.fonte.status === "finalizado" ? 60_000 : live(active),
  })
}

export function useScope(uf: string, cargo: string, election = DEFAULT_ELECTION, active = true) {
  return useQuery({
    queryKey: ["scope", election, uf, cargo],
    queryFn: () => getJson<ScopeSnapshot>(`/escopos/${uf}?pleito=${election}&cargo=${cargo}`),
    enabled: Boolean(uf),
    refetchInterval: (query) => {
      if (query.state.data?.municipiosCarregando) return active ? 5_000 : 60_000
      return query.state.data?.fonte.status === "finalizado" ? 60_000 : live(active)
    },
  })
}

export function useMunicipality(
  ibge: number,
  cargo: string,
  election = DEFAULT_ELECTION,
  active = true,
) {
  return useQuery({
    queryKey: ["municipio", election, ibge, cargo],
    queryFn: () => getJson<ScopeSnapshot>(`/municipios/${ibge}?pleito=${election}&cargo=${cargo}`),
    enabled: Number.isFinite(ibge) && ibge > 0,
    refetchInterval: (query) =>
      query.state.data?.fonte.status === "finalizado" ? 60_000 : live(active),
  })
}

export function useCargos(ibge: number, election = DEFAULT_ELECTION) {
  return useQuery({
    queryKey: ["cargos", election, ibge],
    queryFn: () =>
      getJson<{ cargos: Array<{ id: string; nome: string; tipo: string }> }>(
        `/municipios/${ibge}/cargos?pleito=${election}`,
      ),
    enabled: Number.isFinite(ibge) && ibge > 0,
    staleTime: 60_000,
  })
}

export function useRace(election = DEFAULT_ELECTION, active = true) {
  return useQuery({
    queryKey: ["race", election],
    queryFn: () => getJson<Race>(`/corrida?pleito=${election}&cargo=1`),
    refetchInterval: (query) =>
      query.state.data?.interesses === "finalizado" ? 60_000 : active ? 5_000 : 60_000,
  })
}

export function useLocalidades(term: string) {
  return useQuery({
    queryKey: ["localidades", term],
    queryFn: () =>
      getJson<{
        resultados: Array<{
          tipo: "estado" | "municipio"
          nome: string
          uf: string
          slug: string
          ibge?: number
        }>
      }>(`/localidades?q=${encodeURIComponent(term)}`),
    enabled: term.trim().length >= 2,
    staleTime: 60_000,
  })
}
