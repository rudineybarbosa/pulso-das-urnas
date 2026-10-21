import { geoMercator, geoPath } from "d3-geo"
import type { GeoPath, GeoProjection } from "d3-geo"
import type { FeatureCollection, Geometry } from "geojson"

/** Projeção pronta para render: use `path(feature)` para gerar o atributo `d`. */
export interface MapProjection {
  readonly projection: GeoProjection
  readonly path: GeoPath
}

/**
 * Projeta uma malha (Brasil ou uma UF) numa caixa `width` × `height`.
 *
 * Usa `geoMercator().fitSize`, que preserva a forma e enquadra a coleção
 * inteira. O resultado não deve ser recalculado por frame: recalcule apenas
 * em resize (com throttle).
 */
export function projectBrazil(
  features: FeatureCollection<Geometry>,
  width: number,
  height: number,
): MapProjection {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError(`Dimensões inválidas para projeção: ${width} × ${height}`)
  }
  const projection = geoMercator().fitSize([width, height], features)
  return { projection, path: geoPath(projection) }
}
