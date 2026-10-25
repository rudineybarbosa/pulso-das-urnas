import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const sourceFiles = [
  "../features/map/Legend.tsx",
  "../features/panel/ScopePanel.tsx",
  "../features/race/PulseMonitor.tsx",
]

describe("CSP inline-style boundary", () => {
  it("does not use React inline style props", () => {
    for (const relativePath of sourceFiles) {
      const source = readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8")
      expect(source, relativePath).not.toMatch(/\bstyle\s*=\s*\{\{/)
    }
  })
})
