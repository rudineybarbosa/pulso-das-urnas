import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [["apps/web/**", "jsdom"]],
    setupFiles: ["apps/web/src/test/setup.ts"],
    include: ["packages/**/*.test.ts", "apps/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/domain/src/**", "packages/tse/src/**"],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
})
