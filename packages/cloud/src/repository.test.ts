import { describe, expect, it } from "vitest"
import { InMemorySnapshotRepository } from "./in-memory-repository"
import { pointerDocumentName, snapshotObjectName } from "./types"

describe("snapshot repository", () => {
  const base = {
    ciclo: "ele2026",
    pleito: "6258",
    escopo: "br",
    cargo: "1",
    parserVersion: "1.0.0",
  }

  it("writes immutable object and current pointer", async () => {
    const repository = new InMemorySnapshotRepository()
    const pointer = await repository.putIfNewer({
      ...base,
      idg: "10",
      generatedAt: "2026-10-25T20:00:00Z",
      collectedAt: "2026-10-25T20:00:01Z",
      body: { idg: "10" },
    })

    expect(pointer.objectName).toBe(snapshotObjectName({ ...base, idg: "10" }))
    expect(pointerDocumentName(base)).toBe("6258__br__1")
    expect(await repository.getCurrent(base)).toEqual({ pointer, body: { idg: "10" } })
  })

  it("does not move pointer backwards or overwrite an existing generation", async () => {
    const repository = new InMemorySnapshotRepository()
    await repository.putIfNewer({
      ...base,
      idg: "20",
      generatedAt: "2026-10-25T20:01:00Z",
      collectedAt: "2026-10-25T20:01:01Z",
      body: { value: "new" },
    })
    const pointer = await repository.putIfNewer({
      ...base,
      idg: "19",
      generatedAt: "2026-10-25T20:00:00Z",
      collectedAt: "2026-10-25T20:00:01Z",
      body: { value: "old" },
    })

    expect(pointer.idg).toBe("20")
    expect(await repository.getCurrent(base)).toMatchObject({ body: { value: "new" } })
  })
})
