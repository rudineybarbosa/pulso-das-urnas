import { describe, expect, it } from "vitest"
import {
  loadCatalog,
  loadMunicipalities,
  loadProgress,
  loadResult,
  presidentFixture,
} from "../src/fixtures"
import { parseResult } from "../src/parse"

describe("parser do TSE", () => {
  it("lê o catálogo de 2026", () => {
    const catalog = loadCatalog()
    expect(catalog.pleitos.map((pleito) => pleito.id)).toEqual(
      expect.arrayContaining(["3220", "3221"]),
    )
    const federal = catalog.pleitos[0]?.elections.find((election) => election.id === "6257")
    expect(federal?.offices.map((office) => office.id)).toContain("1")
    const estadual = catalog.pleitos[0]?.elections.find((election) => election.id === "6259")
    expect(estadual?.offices.map((office) => office.id)).toEqual(["3", "5", "6", "7", "8"])
  })

  it("lê o resultado de São Paulo", () => {
    const result = loadResult(presidentFixture("sp"))
    expect(result.electionId).toBe("6257")
    expect(result.round).toBe(1)
    expect(result.scope.id).toBe("sp")
    expect(result.finished).toBe(true)
    expect(result.progress).toBeCloseTo(100)
    const office = result.offices[0]
    expect(office?.office.id).toBe("1")
    expect(office?.candidates.length).toBeGreaterThan(5)
    const valid = office?.candidates.find((candidate) => candidate.destinacao === "Válido")
    expect(valid?.votos).toBeGreaterThan(0)
    expect(valid?.percentualBase).toBe("oficial_validos")
  })

  it("não inventa voto: 2º turno zerado", () => {
    const runoff = loadResult("2026/6258/br-c0001-e006258-u.json")
    expect(runoff.finished).toBe(false)
    expect(runoff.offices[0]?.candidates.every((candidate) => candidate.votos === 0)).toBe(true)
  })

  it("lê progresso por UF", () => {
    const progress = loadProgress()
    expect(Object.keys(progress.byUf).length).toBeGreaterThanOrEqual(27)
    expect(progress.byUf.SP?.percentile).toBeCloseTo(100)
  })

  it("lê os 5.570 municípios", () => {
    const municipalities = loadMunicipalities()
    const total = Object.values(municipalities.ufs).reduce((sum, cities) => sum + cities.length, 0)
    expect(total).toBeGreaterThanOrEqual(5570)
    expect(municipalities.ufs.SP?.find((city) => city.ibge === 3550308)?.nome).toBe("SÃO PAULO")
  })
})

describe("parseResult cru", () => {
  it("normaliza destinação e vice", () => {
    const parsed = parseResult({
      ele: "6257",
      t: "1",
      tpabr: "uf",
      cdabr: "sp",
      dg: "05/10/2026",
      hg: "12:00:00",
      idg: "1",
      tf: "s",
      s: { ts: "10", st: "10", pst: "100,00" },
      v: { vv: "100", vnom: "90", vb: "10", vn: "5", tvn: "105" },
      carg: [
        {
          cd: "1",
          nmn: "Presidente",
          agr: [
            {
              par: [
                {
                  sg: "PL",
                  cand: [
                    {
                      n: "22",
                      sqcand: "1",
                      nm: "FULANO",
                      nmu: "FULANO",
                      dvt: "Válido",
                      vap: "100",
                      pvap: "100,00",
                      e: "s",
                      vs: [{ nmu: "VICE", sgp: "PL" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(parsed.offices[0]?.candidates[0]?.destinacao).toBe("Válido")
    expect(parsed.offices[0]?.candidates[0]?.vices?.[0]?.nome).toBe("VICE")
    expect(parsed.finished).toBe(true)
  })
})
