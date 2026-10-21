import { geoBounds, geoCentroid } from "d3-geo"
import type { Feature, Geometry } from "geojson"
import type { BBox, GeoMeta, LonLat, StateMeta } from "./types"

/** Índice `id IBGE → metadados`, para não varrer a lista a cada render. */
export function stateMetaById(meta: GeoMeta): ReadonlyMap<string, StateMeta> {
  return new Map(meta.estados.map((estado) => [estado.id, estado]))
}

/** Centroide geográfico de uma feição, em `[longitude, latitude]`. */
export function featureCentroid(feature: Feature<Geometry>): LonLat {
  const [lon, lat] = geoCentroid(feature)
  return [lon, lat]
}

/** Caixa envolvente de uma feição, em `[oeste, sul, leste, norte]`. */
export function featureBounds(feature: Feature<Geometry>): BBox {
  const [[west, south], [east, north]] = geoBounds(feature)
  return [west, south, east, north]
}
