import { describe, expect, it } from "vitest"
import {
  computeShare,
  contrastRatio,
  ensureContrast,
  isAbsent,
  nextLeader,
  pickLeader,
  racePositions,
  rankLocalidades,
} from "./index"

describe("bordas de cor", () => {
  it("calcula contraste e ajusta até o mínimo", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0)
    const adjusted = ensureContrast("#FFFF00", 4.5)
    expect(
      Math.max(contrastRatio(adjusted, "#FFFFFF"), contrastRatio(adjusted, "#0B1220")),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it("troca com 0,5% dos válidos ou 500 votos, nunca com ambos exigidos", () => {
    const first = nextLeader({ id: "a", votos: 1000 }, { id: "b", votos: 1051 }, 10_000, 0, 1000, 0)
    const second = nextLeader(
      { id: "a", votos: 1000 },
      { id: "b", votos: 1051 },
      10_000,
      first.streak,
      11_000,
      first.lastAt,
    )
    expect(first.changed).toBe(false)
    expect(second.changed).toBe(true)
    const below = nextLeader(
      { id: "a", votos: 1000 },
      { id: "b", votos: 1400 },
      100_000,
      0,
      1000,
      0,
    )
    expect(below.changed).toBe(false)
  })

  it("aceita líder ausente e repetido", () => {
    expect(nextLeader(null, null, 0, 0).changed).toBe(false)
    expect(nextLeader(null, { id: "a", votos: 1 }, 10, 0).changed).toBe(true)
    expect(nextLeader({ id: "a", votos: 1 }, { id: "a", votos: 1 }, 10, 0).changed).toBe(false)
  })
})

describe("bordas de ausência e busca", () => {
  it("identifica presença", () => {
    expect(isAbsent("ok")).toBe(false)
    expect(isAbsent("sem_dado")).toBe(true)
  })

  it("ranqueia por UF e por trecho, ignorando termo curto", () => {
    const items = [
      { tipo: "municipio" as const, nome: "Salvador", uf: "BA", slug: "salvador", ibge: 1 },
      { tipo: "estado" as const, nome: "Bahia", uf: "BA", slug: "ba" },
      { tipo: "municipio" as const, nome: "Feira de Santana", uf: "BA", slug: "feira", ibge: 2 },
    ]
    expect(rankLocalidades("BA", items)[0]?.tipo).toBe("estado")
    expect(rankLocalidades("santana", items)[0]?.nome).toBe("Feira de Santana")
    expect(rankLocalidades("s", items)).toHaveLength(0)
  })
})

describe("bordas de corrida e líder", () => {
  it("não divide por zero e limita o progresso", () => {
    expect(computeShare(0, 0)).toBe(0)
    const position = racePositions({ progress: 120, votesA: 0, votesB: 0, validVotes: 0 })
    expect(position.g).toBe(0)
    expect(position.base).toBeGreaterThan(0)
  })

  it("devolve vazio quando não há candidato", () => {
    expect(pickLeader([]).candidate).toBeNull()
    expect(pickLeader([]).tie).toEqual([])
  })
})
