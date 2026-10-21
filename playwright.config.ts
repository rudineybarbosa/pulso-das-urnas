import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }],
  webServer: [
    {
      command: "pnpm --filter @pulso/api dev",
      port: 8787,
      reuseExistingServer: true,
      env: { DATA_MODE: "fake", PORT: "8787", SCENARIO: "parcial", REPLAY_SPEED: "600" },
    },
    {
      command: "pnpm --filter @pulso/web dev --port 4173 --host 127.0.0.1",
      port: 4173,
      reuseExistingServer: true,
    },
  ],
})
