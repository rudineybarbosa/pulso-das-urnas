import { useMemo, useState } from "react"
import { geoMercator, geoPath } from "d3-geo"
import { feature } from "topojson-client"
import type { FeatureCollection, Geometry } from "geojson"
import { useQuery } from "@tanstack/react-query"
import type { Panorama, StateSummary } from "@pulso/contracts"
import { getAsset } from "../../lib/api"

interface GeoMeta {
  estados: Array<{ id: string; sigla: string; nome: string }>
}

interface TopologyLike {
  objects: Record<string, unknown>
}

type Props = {
  panorama: Panorama
  onSelect: (uf: string) => void
}

function featureCode(properties: Record<string, unknown> | null | undefined): string {
  const value = properties?.codarea ?? properties?.id ?? properties?.CD_UF ?? ""
  return String(value).padStart(2, "0").slice(0, 2)
}

function stateFill(state: StateSummary | undefined): string {
  if (!state) return "var(--map-nodata)"
  if (state.cor) return state.cor.hex
  if (state.status === "sem_voto") return "var(--map-empty)"
  if (state.status === "nao_aplicavel") return "var(--map-na)"
  if (state.status === "sem_lider_elegivel") return "var(--map-no-leader)"
  return "var(--map-nodata)"
}

export function BrazilMap({ panorama, onSelect }: Props) {
  const topology = useQuery({
    queryKey: ["geo", "br"],
    queryFn: () => getAsset<TopologyLike>("/geo/br.topo.json"),
    staleTime: Infinity,
  })
  const meta = useQuery({
    queryKey: ["geo", "meta"],
    queryFn: () => getAsset<GeoMeta>("/geo/meta.json"),
    staleTime: Infinity,
  })
  const [hover, setHover] = useState<StateSummary | null>(null)

  const collection = useMemo(() => {
    if (!topology.data) return null
    const object = Object.values(topology.data.objects)[0]
    if (!object) return null
    return feature(topology.data as never, object as never) as unknown as FeatureCollection<
      Geometry,
      Record<string, unknown>
    >
  }, [topology.data])

  const paths = useMemo(() => {
    if (!collection) return []
    const projection = geoMercator().fitSize([800, 560], collection)
    const path = geoPath(projection)
    return collection.features.map((item) => ({
      uf: featureCode(item.properties),
      d: path(item) ?? "",
    }))
  }, [collection])

  const siglaById = useMemo(() => {
    const map = new Map<string, string>()
    for (const state of meta.data?.estados ?? []) map.set(state.id.padStart(2, "0"), state.sigla)
    return map
  }, [meta.data])

  const byUf = useMemo(
    () => new Map(panorama.estados.map((state) => [state.uf, state])),
    [panorama],
  )

  if (!collection) {
    return <div className="map map--loading">Carregando a geometria do Brasil…</div>
  }

  return (
    <div className="map-wrap">
      <svg
        className="map map-enter"
        viewBox="0 0 800 560"
        role="group"
        aria-labelledby="map-title map-desc"
      >
        <title id="map-title">Mapa do Brasil por estado</title>
        <desc id="map-desc">
          Cada estado é preenchido com a cor do partido que lidera o maior cargo em disputa. Use as
          setas para navegar e Enter para abrir o estado.
        </desc>
        {paths.map(({ uf, d }) => {
          const sigla = siglaById.get(uf) ?? uf
          const state = byUf.get(sigla)
          const label = state
            ? `${state.nome}: ${state.lider ? `${state.lider.partido} lidera com ${state.lider.percentual.toFixed(1)}%` : state.status === "sem_voto" ? "sem votos apurados" : "sem dados"}`
            : `${sigla}: sem dados`
          return (
            <path
              key={uf}
              d={d}
              className="map__state"
              fill={stateFill(state)}
              tabIndex={0}
              role="button"
              aria-label={label}
              onMouseEnter={() => setHover(state ?? null)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(state ?? null)}
              onBlur={() => setHover(null)}
              onClick={() => state && onSelect(state.uf)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  if (state) onSelect(state.uf)
                }
              }}
            >
              <title>{label}</title>
            </path>
          )
        })}
      </svg>
      <div className="map__info" role="status">
        {hover ? (
          <>
            <strong>{hover.nome}</strong>
            {hover.lider ? (
              <span>
                {hover.lider.partido} · {hover.lider.nome} ·{" "}
                {hover.lider.votos.toLocaleString("pt-BR")} votos ·{" "}
                {hover.lider.percentual.toFixed(1)}%
              </span>
            ) : (
              <span>
                {hover.status === "sem_voto" ? "Aguardando o primeiro boletim" : "Sem dados"}
              </span>
            )}
            <span>{hover.percentualApurado.toFixed(1)}% apurado</span>
          </>
        ) : (
          <span>Passe o mouse ou use o teclado para ver o líder de cada estado.</span>
        )}
      </div>
    </div>
  )
}
