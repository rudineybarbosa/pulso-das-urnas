import { describe, expect, it } from "vitest"
import { featureBounds, featureCentroid, projectBrazil, stateMetaById, toFeatures } from "./index"
import type { GeoMeta, TopoTopology } from "./index"

/**
 * Dois quadrados vizinhos (RO e AC fictícios), sem quantização,
 * compartilhando um vértice. Nada de rede: a malha é inline.
 */
const topology = {
  type: "Topology",
  objects: {
    estados: {
      type: "GeometryCollection",
      geometries: [
        { type: "Polygon", arcs: [[0]], properties: { codarea: "11" } },
        { type: "Polygon", arcs: [[1]], properties: { codarea: "12" } },
      ],
    },
    municipios: {
      type: "GeometryCollection",
      geometries: [{ type: "Polygon", arcs: [[0]], properties: { codarea: "1100015" } }],
    },
  },
  // Anéis no sentido horário, como o d3-geo espera para polígonos menores
  // que um hemisfério (o inverso do RFC 7946).
  arcs: [
    [
      [-63, -10],
      [-63, -8],
      [-60, -8],
      [-60, -10],
      [-63, -10],
    ],
    [
      [-60, -10],
      [-60, -8],
      [-57, -8],
      [-57, -10],
      [-60, -10],
    ],
  ],
} satisfies TopoTopology

const meta: GeoMeta = {
  versao: "1.0.0-000000000000",
  geradoEm: "2026-10-21T00:00:00.000Z",
  estados: [
    {
      id: "11",
      sigla: "RO",
      nome: "Rondônia",
      centroide: [-61.5, -9],
      bbox: [-63, -10, -60, -8],
      municipios: 1,
    },
    {
      id: "12",
      sigla: "AC",
      nome: "Acre",
      centroide: [-58.5, -9],
      bbox: [-60, -10, -57, -8],
      municipios: 0,
    },
  ],
}

describe("toFeatures", () => {
  it("converte o objeto nomeado preservando properties", () => {
    const features = toFeatures(topology, "estados")

    expect(features.type).toBe("FeatureCollection")
    expect(features.features).toHaveLength(2)
    expect(features.features[0]?.properties).toEqual({ codarea: "11" })
    expect(features.features[1]?.properties).toEqual({ codarea: "12" })
    expect(features.features[0]?.geometry.type).toBe("Polygon")
  })

  it("usa o primeiro objeto quando o nome é omitido", () => {
    const features = toFeatures(topology)

    expect(features.features).toHaveLength(2)
    expect(features.features.every((item) => item.geometry.type === "Polygon")).toBe(true)
  })

  it("falha com mensagem clara para objeto inexistente", () => {
    expect(() => toFeatures(topology, "distritos")).toThrow(/distritos/)
  })

  it("falha quando o TopoJSON não tem objetos", () => {
    const empty = { ...topology, objects: {} } satisfies TopoTopology

    expect(() => toFeatures(empty)).toThrow(/sem objetos/)
  })
})

describe("projectBrazil", () => {
  const features = toFeatures(topology, "estados")

  it("enquadra a malha na caixa pedida", () => {
    const { path } = projectBrazil(features, 400, 300)
    const [[west, south], [east, north]] = path.bounds(features)

    // Mercator preserva a proporção: encosta nas laterais e centraliza no eixo Y.
    expect(west).toBeCloseTo(0, 6)
    expect(east).toBeCloseTo(400, 6)
    expect(south).toBeGreaterThanOrEqual(0)
    expect(north).toBeLessThanOrEqual(300)
    expect(south + north).toBeCloseTo(300, 6)
  })

  it("gera caminho SVG não vazio por feição", () => {
    const { path } = projectBrazil(features, 800, 600)
    const first = features.features[0]

    expect(first).toBeDefined()
    const d = first ? path(first) : null
    expect(d).toMatch(/^M/)
    expect(d).not.toContain("NaN")
  })

  it("recalcula a projeção ao mudar o tamanho", () => {
    const small = projectBrazil(features, 100, 100).projection
    const large = projectBrazil(features, 1000, 1000).projection

    expect(large.scale()).toBeGreaterThan(small.scale())
  })

  it("rejeita dimensões inválidas", () => {
    expect(() => projectBrazil(features, 0, 300)).toThrow(RangeError)
    expect(() => projectBrazil(features, 400, Number.NaN)).toThrow(RangeError)
  })
})

describe("stateMetaById", () => {
  it("indexa por id IBGE", () => {
    const index = stateMetaById(meta)

    expect(index.get("11")?.sigla).toBe("RO")
    expect(index.get("12")?.nome).toBe("Acre")
    expect(index.get("35")).toBeUndefined()
  })
})

describe("helpers de centroide e caixa", () => {
  it("calcula centroide e bbox de uma feição", () => {
    const [square] = toFeatures(topology, "estados").features

    expect(square).toBeDefined()
    if (!square) return
    const [lon, lat] = featureCentroid(square)
    expect(lon).toBeCloseTo(-61.5, 4)
    expect(lat).toBeCloseTo(-9, 2)
    const [west, south, east, north] = featureBounds(square)
    expect(west).toBeCloseTo(-63, 4)
    expect(south).toBeCloseTo(-10, 2)
    expect(east).toBeCloseTo(-60, 4)
    expect(north).toBeCloseTo(-8, 4)
  })
})
