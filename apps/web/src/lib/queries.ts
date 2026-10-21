import { useQuery } from "@tanstack/react-query"
import type { Panorama, Pleito, Race, ScopeSnapshot } from "@pulso/contracts"
import { getJson } from "./api"

const live = (active: boolean) => (active ? 5_000 : 60_000)

export function usePleitos() {
  return useQuery({
    queryKey: ["pleitos"],
    queryFn: () => getJson<{ pleitos: Pleito[] }>("/pleitos"),
    staleTime: 60_000,
  })
}

export function usePanorama(cargo: string, active = true) {
  return useQuery({
    queryKey: ["panorama", cargo],
    queryFn: () => getJson<Panorama>(`/panorama?cargo=${cargo}`),
    refetchInterval: live(active),
  })
}

export function useScope(uf: string, cargo: string, active = true) {
  return useQuery({
    queryKey: ["scope", uf, cargo],
    queryFn: () => getJson<ScopeSnapshot>(`/escopos/${uf}?cargo=${cargo}`),
    enabled: Boolean(uf),
    refetchInterval: live(active),
  })
}

export function useMunicipality(ibge: number, cargo: string, active = true) {
  return useQuery({
    queryKey: ["municipio", ibge, cargo],
    queryFn: () => getJson<ScopeSnapshot>(`/municipios/${ibge}?cargo=${cargo}`),
    enabled: Number.isFinite(ibge) && ibge > 0,
    refetchInterval: live(active),
  })
}

export function useCargos(ibge: number) {
  return useQuery({
    queryKey: ["cargos", ibge],
    queryFn: () =>
      getJson<{ cargos: Array<{ id: string; nome: string; tipo: string }> }>(
        `/municipios/${ibge}/cargos`,
      ),
    enabled: Number.isFinite(ibge) && ibge > 0,
    staleTime: 60_000,
  })
}

export function useRace(active = true) {
  return useQuery({
    queryKey: ["race"],
    queryFn: () => getJson<Race>("/corrida"),
    refetchInterval: active ? 1_000 : 60_000,
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
