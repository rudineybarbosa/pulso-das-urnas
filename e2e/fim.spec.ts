import { test, expect } from "@playwright/test"

test("cena final e resultado", async ({ page }) => {
  await page.goto("/br")
  await expect(page.locator(".pulse__result")).toBeVisible()
  await expect(page.locator(".pulse__channel")).toHaveCount(2)
  await expect(page.locator(".pulse__result")).toContainText(/venceu/)

  await page.reload()
  await expect(page.locator(".pulse__result")).toBeVisible()
  await expect(page.getByRole("button", { name: "Rever cena" })).toBeVisible()
})
