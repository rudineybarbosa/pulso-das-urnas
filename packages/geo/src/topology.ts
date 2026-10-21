import { feature as toGeoJson } from "topojson-client"
import type { FeatureCollection, Geometry } from "geojson"

/**
 * Tipo do TopoJSON derivado da assinatura da própria `topojson-client`.
 * Evita depender de `@types/topojson-specification` só para um alias.
 */
export type TopoTopology = Parameters<typeof toGeoJson>[0]

/**
 * Converte um objeto TopoJSON em `FeatureCollection`.
 *
 * Aceita o nome do objeto (`"estados"`, `"municipios"`) ou, sem argumento,
 * usa o primeiro objeto do arquivo. Preserva `properties`, incluindo
 * `codarea` (código IBGE), e funciona com malhas quantizadas.
 */
export function toFeatures(
  topology: TopoTopology,
  objectName?: string,
): FeatureCollection<Geometry> {
  const names = Object.keys(topology.objects)
  const name = objectName ?? names[0]
  if (!name) {
    throw new Error("TopoJSON sem objetos: não há malha para converter")
  }
  const object = topology.objects[name]
  if (!object) {
    throw new Error(`Objeto "${name}" não existe no TopoJSON`)
  }
  const converted = toGeoJson(topology, object)
  return converted.type === "FeatureCollection"
    ? converted
    : { type: "FeatureCollection", features: [converted] }
}
