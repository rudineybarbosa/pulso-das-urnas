import { useMemo, useState } from "react"
import { geoMercator, geoPath } from "d3-geo"
import { feature } from "topojson-client"
import type { FeatureCollection, Geometry } from "geojson"
import { useQuery } from "@tanstack/react-query"
import type { ScopeSnapshot } from "@pulso/contracts"
import { getAsset } from "../../lib/api"

interface TopologyLike {
  objects: Record<string, unknown>
}

type Props = {
  uf: string
  ibge: number
  snapshot: ScopeSnapshot
  onSelect: (ibge: number) => void
}

function cityCode(properties: Record<string, unknown> | null | undefined): number {
  const value = properties?.codarea ?? properties?.id ?? properties?.CD_MUN ?? ""
  return Number.parseInt(String(value), 10)
}

export function StateMap({ uf, ibge, snapshot, onSelect }: Props) {
  const topology = useQuery({
    queryKey: ["geo", "uf", ibge],
    queryFn: () => getAsset<TopologyLike>(`/geo/uf/${ibge}.topo.json`),
    staleTime: Infinity,
  })
  const [hover, setHover] = useState<{ nome: string; lider?: string; cor?: string } | null>(null)

  const collection = useMemo(() => {
    if (!topology.data) return null
    const object = Object.values(topology.data.objects)[0]
    if (!object) return null
    return feature(topology.data as never, object as never) as unknown as FeatureCollection<
      Geometry,
      Record<string, unknown>
    >
  }, [topology.data])

  const path = useMemo(() => {
    if (!collection) return null
    const projection = geoMercator().fitSize([800, 620], collection)
    return geoPath(projection)
  }, [collection])

  const cities = useMemo(() => {
    const map = new Map<number, NonNullable<ScopeSnapshot["dados"]>["municipios"]>()
    for (const city of snapshot.dados?.municipios ?? []) map.set(city.ibge, [city])
    return map
  }, [snapshot])

  if (!collection || !path) {
    return <div className="map map--loading">Carregando os municípios de {uf}…</div>
  }

  return (
    <div className="map-wrap">
      <svg
        className="map map-enter"
        viewBox="0 0 800 620"
        role="group"
        aria-labelledby="state-title"
      >
        <title id="state-title">Municípios de {uf}</title>
        {collection.features.map((item) => {
          const code = cityCode(item.properties)
          const city = cities.get(code)?.[0]
          const fill = city?.cor?.hex ?? "var(--map-nodata)"
          const label = city
            ? `${city.nome}: ${city.lider ? `${city.lider.partido} lidera` : "sem dados"}`
            : `Município ${code}`
          return (
            <path
              key={code}
              d={path(item) ?? ""}
              className="map__city"
              fill={fill}
              tabIndex={0}
              role="button"
              aria-label={label}
              onMouseEnter={() =>
                setHover({ nome: city?.nome ?? String(code), lider: city?.lider?.nome, cor: fill })
              }
              onMouseLeave={() => setHover(null)}
              onFocus={() =>
                setHover({ nome: city?.nome ?? String(code), lider: city?.lider?.nome, cor: fill })
              }
              onBlur={() => setHover(null)}
              onClick={() => Number.isFinite(code) && onSelect(code)}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && Number.isFinite(code)) {
                  event.preventDefault()
                  onSelect(code)
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
            <span>{hover.lider ? `${hover.lider} lidera` : "Sem dados"}</span>
          </>
        ) : (
          <span>Clique em um município para ver os votos por candidato.</span>
        )}
      </div>
    </div>
  )
}
