import { describe, expect, it } from "vitest"
import type { FetchResult } from "@pulso/tse"
import type { SnapshotInput, SnapshotRepository } from "@pulso/cloud"
import { collectElection, type TSECollectorClient } from "./collector"

function body(idg: string): Record<string, unknown> {
  return {
    ele: "6258",
    t: "2",
    tpabr: "br",
    cdabr: "br",
    dg: "25/10/2026",
    hg: "17:00:00",
    idg,
    carg: [],
  }
}

describe("collector do segundo turno", () => {
  it("não consulta antes da ativação", async () => {
    const calls: string[] = []
    const client: TSECollectorClient = {
      fetch: async (url) => {
        calls.push(url)
        return { status: 200, notModified: false, etag: null, body: body("1") }
      },
    }
    const repository: SnapshotRepository = {
      putIfNewer: async (input) => input as unknown as never,
      getCurrent: async () => null,
    }

    const result = await collectElection(
      {
        electionId: "6258",
        cycle: "ele2026",
        activationAt: "2026-10-25T16:55:00-03:00",
        deactivationAt: "2026-10-26T00:00:00-03:00",
      },
      client,
      repository,
      new Date("2026-10-25T19:54:59Z"),
    )

    expect(result).toEqual({ active: false, collected: 0, unchanged: 0, failed: 0 })
    expect(calls).toEqual([])
  })

  it("coleta Brasil e 27 UFs do presidente do segundo turno", async () => {
    const calls: string[] = []
    const saved: SnapshotInput[] = []
    const client: TSECollectorClient = {
      fetch: async (url) => {
        calls.push(url)
        return { status: 200, notModified: false, etag: null, body: body(String(calls.length)) }
      },
    }
    const repository: SnapshotRepository = {
      putIfNewer: async (input) => {
        saved.push(input)
        return input as unknown as never
      },
      getCurrent: async () => null,
    }

    const result = await collectElection(
      {
        electionId: "6258",
        cycle: "ele2026",
        activationAt: "2026-10-25T16:55:00-03:00",
        deactivationAt: "2026-10-26T00:00:00-03:00",
      },
      client,
      repository,
      new Date("2026-10-25T19:55:00Z"),
    )

    expect(result.collected).toBe(28)
    expect(saved).toHaveLength(28)
    expect(calls).toContain(
      "https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json",
    )
    expect(calls).toContain(
      "https://resultados.tse.jus.br/oficial/ele2026/6258/dados/sp/sp-c0001-e006258-u.json",
    )
  })

  it("não avança ponteiro quando TSE retorna 304", async () => {
    let writes = 0
    const client: TSECollectorClient = {
      fetch: async () =>
        ({ status: 304, notModified: true, etag: "etag", body: null }) satisfies FetchResult,
    }
    const repository: SnapshotRepository = {
      putIfNewer: async (input) => {
        writes += 1
        return input as unknown as never
      },
      getCurrent: async () => null,
    }

    const result = await collectElection(
      {
        electionId: "6258",
        cycle: "ele2026",
        activationAt: "2026-10-25T16:55:00-03:00",
        deactivationAt: "2026-10-26T00:00:00-03:00",
      },
      client,
      repository,
      new Date("2026-10-25T19:55:00Z"),
    )

    expect(result.unchanged).toBe(28)
    expect(writes).toBe(0)
  })
})
