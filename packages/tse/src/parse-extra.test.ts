import { describe, expect, it } from "vitest"
import { parseCatalog, parseMunicipalities, parseProgress, parseResult } from "./parse"

describe("bordas do parser", () => {
  it("ignora pleito sem eleição e cargo de consulta", () => {
    const catalog = parseCatalog({
      dg: "01/01/2026",
      hg: "10:00:00",
      pl: [
        { cd: "1", c: "ele2026", e: [] },
        {
          cd: "2",
          c: "ele2026",
          e: [
            {
              cd: "6257",
              nm: "Federal",
              t: "1",
              abr: [
                {
                  cp: [
                    { cd: "1", ds: "Presidente", tp: "1" },
                    { cd: "99", ds: "Consulta", tp: "3" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(catalog.pleitos).toHaveLength(1)
    expect(catalog.pleitos[0]?.elections[0]?.offices.map((office) => office.id)).toEqual(["1"])
  })

  it("descarta município sem código", () => {
    const municipalities = parseMunicipalities({
      abr: [
        {
          cd: "SP",
          mu: [
            { cd: "71072", cdi: "3550308", nm: "SÃO PAULO" },
            { cd: "1", nm: "SEM IBGE" },
          ],
        },
      ],
    })
    expect(municipalities.ufs.SP).toHaveLength(1)
    expect(municipalities.ufs.SP?.[0]?.ibge).toBe(3550308)
  })

  it("progresso vazio não quebra", () => {
    const progress = parseProgress({ ele: "6257", t: "1" })
    expect(progress.byUf).toEqual({})
  })

  it("resultado sem campos usa fallback", () => {
    const parsed = parseResult({})
    expect(parsed.offices).toEqual([])
    expect(parsed.progress).toBe(0)
    expect(parsed.generationId).toBe("")
  })
})
