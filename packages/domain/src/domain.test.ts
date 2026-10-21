import { describe, expect, it } from "vitest"
import type { Candidate, Office } from "@pulso/contracts"
import { featuredOffice, markFeatured, compareOffices } from "./offices"
import { isEligible, orderCandidates, pickLeader, sumValidVotes } from "./leader"
import { computeShare, sumShares } from "./share"
import { resolveStatus } from "./absence"
import { contrastRatio, nextLeader, pickTextColor, resolvePartyColor } from "./color"
import { rankLocalidades, normalizeText, slugify } from "./search"
import { detectOvertake, racePositions } from "./race"

const offices: Office[] = [
  { id: "7", nome: "Deputado Estadual", tipo: "proporcional" },
  { id: "3", nome: "Governador", tipo: "majoritario" },
  { id: "1", nome: "Presidente", tipo: "majoritario" },
]

function candidate(overrides: Partial<Candidate> & { id: string; votos: number }): Candidate {
  return {
    numero: "22",
    nome: "Candidato",
    nomeUrna: "Candidato",
    partido: "PL",
    percentual: 0,
    percentualBase: "oficial_validos",
    calculado: false,
    situacao: "Não eleito",
    destinacao: "Válido",
    eleito: false,
    ...overrides,
  }
}

describe("RN-005 hierarquia", () => {
  it("escolhe presidente sobre governador e deputado", () => {
    expect(featuredOffice(offices)?.id).toBe("1")
  })

  it("desconhecido pesa 90 e ordena por nome", () => {
    const unknown: Office[] = [
      { id: "99", nome: "Zebra", tipo: "majoritario" },
      { id: "98", nome: "Alfa", tipo: "majoritario" },
    ]
    expect([...unknown].sort(compareOffices)[0]?.nome).toBe("Alfa")
  })

  it("marca exatamente um destaque", () => {
    const marked = markFeatured(offices)
    expect(marked.filter((office) => office.destaque)).toHaveLength(1)
    expect(marked.find((office) => office.destaque)?.id).toBe("1")
  })
})

describe("RN-021 e RN-026 líder", () => {
  it("só Válido define líder", () => {
    const candidates = [
      candidate({ id: "a", votos: 900, destinacao: "Anulado" }),
      candidate({ id: "b", votos: 100 }),
      candidate({ id: "c", votos: 50, destinacao: "Válido (legenda)" }),
    ]
    expect(pickLeader(candidates).candidate?.id).toBe("b")
    expect(isEligible(candidates[0]!)).toBe(false)
  })

  it("empate devolve todos os empatados", () => {
    const candidates = [candidate({ id: "a", votos: 10 }), candidate({ id: "b", votos: 10 })]
    expect(pickLeader(candidates).tie).toHaveLength(2)
  })

  it("ordena por votos, depois nome e número", () => {
    const ordered = orderCandidates([
      candidate({ id: "a", votos: 10, nomeUrna: "Zeca" }),
      candidate({ id: "b", votos: 10, nomeUrna: "Ana" }),
    ])
    expect(ordered.map((item) => item.nomeUrna)).toEqual(["Ana", "Zeca"])
  })

  it("soma válidos com legenda e ignora anulados", () => {
    const total = sumValidVotes([
      candidate({ id: "a", votos: 10 }),
      candidate({ id: "b", votos: 5, destinacao: "Válido (legenda)" }),
      candidate({ id: "c", votos: 7, destinacao: "Anulado" }),
    ])
    expect(total).toBe(15)
  })
})

describe("RN-010 percentual", () => {
  it("fecha 100 com uma casa", () => {
    const shares = [60, 40].map((votes) => computeShare(votes, 100))
    expect(sumShares(shares)).toBe(100)
  })

  it("válidos zero não divide por zero", () => {
    expect(computeShare(10, 0)).toBe(0)
  })
})

describe("RN-035 ausência", () => {
  it("segue a precedência", () => {
    expect(
      resolveStatus({ hasFile: false, applies: false, validVotes: 0, hasEligibleLeader: false }),
    ).toBe("nao_aplicavel")
    expect(
      resolveStatus({ hasFile: false, applies: true, validVotes: 0, hasEligibleLeader: false }),
    ).toBe("sem_dado")
    expect(
      resolveStatus({ hasFile: true, applies: true, validVotes: 0, hasEligibleLeader: false }),
    ).toBe("sem_voto")
    expect(
      resolveStatus({ hasFile: true, applies: true, validVotes: 10, hasEligibleLeader: false }),
    ).toBe("sem_lider_elegivel")
    expect(
      resolveStatus({ hasFile: true, applies: true, validVotes: 10, hasEligibleLeader: true }),
    ).toBe("ok")
  })
})

describe("RN-024 e RN-038 cor", () => {
  it("escolhe texto com contraste", () => {
    expect(contrastRatio("#0B4EA2", pickTextColor("#0B4EA2"))).toBeGreaterThanOrEqual(4.5)
    expect(pickTextColor("#FFFFFF")).toBe("#0B1220")
  })

  it("fallback é estável", () => {
    const table = { PL: { hex: "#0B4EA2" } }
    expect(resolvePartyColor("PL", table).origem).toBe("tabela")
    expect(resolvePartyColor("XYZ", table).hex).toBe(resolvePartyColor("XYZ", table).hex)
  })

  it("só troca com limiar e dois snapshots", () => {
    const first = nextLeader({ id: "a", votos: 1000 }, { id: "b", votos: 2100 }, 100_000, 0)
    expect(first.changed).toBe(false)
    const second = nextLeader(
      { id: "a", votos: 1000 },
      { id: "b", votos: 2100 },
      100_000,
      first.streak,
    )
    expect(second.changed).toBe(true)
  })

  it("diferença abaixo do limiar não troca", () => {
    const result = nextLeader({ id: "a", votos: 1000 }, { id: "b", votos: 1001 }, 100_000, 0)
    expect(result.changed).toBe(false)
    expect(result.acirrada).toBe(true)
  })
})

describe("RN-011 busca e RN-041 slug", () => {
  it("normaliza acento e caixa", () => {
    expect(normalizeText("  SÃO   Paulo ")).toBe("sao paulo")
    expect(slugify("São Paulo")).toBe("sao-paulo")
  })

  it("ranqueia estado e município com homônimos", () => {
    const items = [
      { tipo: "estado" as const, nome: "São Paulo", uf: "SP", slug: "sp" },
      { tipo: "municipio" as const, nome: "São Paulo", uf: "SP", slug: "sao-paulo", ibge: 3550308 },
      {
        tipo: "municipio" as const,
        nome: "Santa Luzia",
        uf: "MG",
        slug: "santa-luzia",
        ibge: 3157807,
      },
      {
        tipo: "municipio" as const,
        nome: "Santa Luzia",
        uf: "PB",
        slug: "santa-luzia",
        ibge: 2513802,
      },
    ]
    expect(rankLocalidades("sao paulo", items)).toHaveLength(2)
    expect(rankLocalidades("santa luzia", items)).toHaveLength(2)
    expect(rankLocalidades("s", items)).toHaveLength(0)
  })
})

describe("RN-015 e RN-016 corrida", () => {
  it("empate fica no centro", () => {
    const position = racePositions({ progress: 50, votesA: 10, votesB: 10, validVotes: 100 })
    expect(position.g).toBe(0)
    expect(position.xA).toBe(position.xB)
  })

  it("inverte posições ao inverter votos", () => {
    const a = racePositions({ progress: 50, votesA: 60, votesB: 40, validVotes: 100 })
    const b = racePositions({ progress: 50, votesA: 40, votesB: 60, validVotes: 100 })
    expect(a.xA).toBeGreaterThan(a.xB)
    expect(b.xB).toBeGreaterThan(b.xA)
    expect(a.base).toBeCloseTo(b.base)
  })

  it("não divide por zero", () => {
    expect(racePositions({ progress: 0, votesA: 0, votesB: 0, validVotes: 0 }).g).toBe(0)
  })

  it("exige dois snapshots e cooldown", () => {
    const first = detectOvertake({ previousG: -0.05, streak: 0, lastAt: 0 }, 0.05, 10_000)
    expect(first.overtake).toBe(false)
    const second = detectOvertake(first, 0.06, 20_000)
    expect(second.overtake).toBe(true)
    const third = detectOvertake({ previousG: -0.05, streak: 0, lastAt: 20_000 }, 0.05, 25_000)
    expect(third.overtake).toBe(false)
  })
})
