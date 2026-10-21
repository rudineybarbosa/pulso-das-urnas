import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { listSnapshots, readSnapshot, saveSnapshot, snapshotKey } from "./snapshots"

const dirs: string[] = []

async function temp(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pulso-snap-"))
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe("snapshots", () => {
  it("grava uma vez por geração e lê de volta", async () => {
    const root = await temp()
    const record = {
      cycle: "ele2026",
      electionId: "6257",
      scopeId: "sp",
      officeId: "1",
      generationId: "2837533",
      capturedAt: "2026-10-21T12:00:00-03:00",
      payload: { ok: true },
    }
    const first = await saveSnapshot(root, record)
    const second = await saveSnapshot(root, record)
    expect(first.written).toBe(true)
    expect(second.written).toBe(false)
    expect(await readSnapshot(root, snapshotKey(record))).toEqual(record)
    expect(await listSnapshots(root)).toEqual([snapshotKey(record)])
  })

  it("devolve null para chave inexistente", async () => {
    const root = await temp()
    expect(await readSnapshot(root, "nada.json")).toBeNull()
    expect(await listSnapshots(join(root, "ausente"))).toEqual([])
  })
})
