import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { InMemorySnapshotRepository } from "@pulso/cloud"
import { findRepoRoot } from "@pulso/tse"
import { DataStore } from "./store"

describe("DataStore com snapshots remotos", () => {
  it("carrega o ponteiro nacional do segundo turno antes de montar o panorama", async () => {
    const repository = new InMemorySnapshotRepository()
    const body = JSON.parse(
      readFileSync(
        join(findRepoRoot(), "data/fixtures/tse/2026/6258/br-c0001-e006258-u.json"),
        "utf8",
      ),
    ) as unknown
    await repository.putIfNewer({
      ciclo: "ele2026",
      pleito: "6258",
      escopo: "br",
      cargo: "1",
      idg: "fixture-6258",
      generatedAt: "2026-10-25T20:00:00Z",
      collectedAt: "2026-10-25T20:00:01Z",
      parserVersion: "1.0.0",
      body,
    })

    const store = new DataStore({ mode: "real", repository })
    await store.refresh("6258")
    const panorama = store.panorama("1", "6258")

    expect(panorama.eleicao).toBe("6258")
    expect(panorama.fonte.generationId).not.toBe("")
  })
})
