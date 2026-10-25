import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import type { SnapshotInput, SnapshotRepository } from "@pulso/cloud"
import type { ElectionConfig } from "./election-config"
import { sweepMunicipalities } from "./municipalities"

const config: ElectionConfig = {
  electionId: "6257",
  cycle: "ele2026",
  activationAt: "2026-10-25T16:55:00-03:00",
  deactivationAt: "2026-10-26T00:00:00-03:00",
}

const body = JSON.parse(
  readFileSync(
    join(process.cwd(), "data/fixtures/tse/2026/6257/ap06017-c0001-e006257-u.json"),
    "utf8",
  ),
) as unknown

function repository(cursor: { value: number }): {
  repository: SnapshotRepository
  saved: SnapshotInput[]
} {
  const saved: SnapshotInput[] = []
  return {
    saved,
    repository: {
      getCurrent: async () => null,
      getPointer: async () => null,
      getCursor: async () => cursor.value,
      setCursor: async (_key, value) => {
        cursor.value = value
      },
      putIfNewer: async (input) => {
        saved.push(input)
        return input as never
      },
    },
  }
}

describe("aquecimento municipal", () => {
  it("continua do cursor e grava os arquivos oficiais", async () => {
    const cursor = { value: 0 }
    const { repository: repo, saved } = repository(cursor)
    const calls: string[] = []
    const summary = await sweepMunicipalities(config, repo, {
      limit: 8,
      requireNational: false,
      pause: async () => undefined,
      client: {
        fetch: async (url) => {
          calls.push(url)
          return { status: 200, notModified: false, etag: '"abc"', body }
        },
      },
    })

    expect(summary.attempted).toBe(8)
    expect(summary.updated).toBe(8)
    expect(summary.next).toBe(8)
    expect(cursor.value).toBe(8)
    expect(saved).toHaveLength(8)
    expect(saved[0]?.pleito).toBe("6257")
    expect(saved[0]?.cargo).toBe("1")
    expect(calls[0]).toContain("/ele2026/6257/dados/")
    expect(calls[0]).toContain("-c0001-e006257-u.json")
  })

  it("não rebaixa arquivo já atual e conta arquivo ausente sem travar", async () => {
    const cursor = { value: 100 }
    const { repository: repo, saved } = repository(cursor)
    const summary = await sweepMunicipalities(config, repo, {
      limit: 4,
      requireNational: false,
      pause: async () => undefined,
      client: {
        fetch: async () => ({ status: 304, notModified: true, etag: '"abc"', body: null }),
      },
    })

    expect(summary.start).toBe(100)
    expect(summary.unchanged).toBe(4)
    expect(summary.updated).toBe(0)
    expect(saved).toHaveLength(0)
    expect(cursor.value).toBe(104)
  })

  it("espera o arquivo nacional antes de varrer municípios", async () => {
    const cursor = { value: 0 }
    const { repository: repo } = repository(cursor)
    const calls: string[] = []
    const summary = await sweepMunicipalities(config, repo, {
      client: {
        fetch: async (url) => {
          calls.push(url)
          return { status: 200, notModified: false, etag: null, body }
        },
      },
    })

    expect(summary.waitingForNational).toBe(true)
    expect(summary.attempted).toBe(0)
    expect(calls).toHaveLength(0)
    expect(cursor.value).toBe(0)
  })

  it("usa o pleito estadual correto para cargos estaduais", async () => {
    const cursor = { value: 0 }
    const { repository: repo } = repository(cursor)
    const calls: string[] = []
    await sweepMunicipalities(config, repo, {
      cargo: "7",
      limit: 4,
      requireNational: false,
      pause: async () => undefined,
      client: {
        fetch: async (url) => {
          calls.push(url)
          return { status: 200, notModified: false, etag: null, body }
        },
      },
    })

    expect(calls[0]).toContain("/ele2026/6259/dados/")
    expect(calls[0]).toContain("-c0007-e006259-u.json")
  })
})
