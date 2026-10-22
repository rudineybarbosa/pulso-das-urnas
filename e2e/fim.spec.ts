import { test, expect } from "@playwright/test"

test("cena final e resultado", async ({ page }) => {
  await page.goto("/br")
  await expect(page.locator(".race__result")).toBeVisible()
  await expect(page.locator("svg.horse")).toHaveCount(2)
  await expect(page.locator(".race__result")).toContainText(/venceu/)
})
