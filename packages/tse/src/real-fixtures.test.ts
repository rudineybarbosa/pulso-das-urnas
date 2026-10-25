import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { findRepoRoot } from "./fixtures"

interface Manifest {
  source: string
  electionId: string
  round: number
  parserVersion: string
  files: Array<{
    path: string
    sha256: string
    parserVersion: string
    size: number
  }>
}

describe("fixtures reais de 2026", () => {
  it("mantém hashes oficiais do primeiro turno no manifest", async () => {
    const root = findRepoRoot()
    const manifest = JSON.parse(
      await readFile(join(root, "data/fixtures/tse/manifest.json"), "utf8"),
    ) as Manifest

    expect(manifest.source).toBe("Tribunal Superior Eleitoral")
    expect(manifest.electionId).toBe("6257")
    expect(manifest.round).toBe(1)
    expect(manifest.files.length).toBeGreaterThanOrEqual(28)

    for (const file of manifest.files) {
      const body = await readFile(join(root, "data/fixtures/tse", file.path))
      expect(createHash("sha256").update(body).digest("hex")).toBe(file.sha256)
      expect(body.byteLength).toBe(file.size)
      expect(file.parserVersion).toBe(manifest.parserVersion)
    }
  })
})
