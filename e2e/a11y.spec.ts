import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  )
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
}

test("acessibilidade do mapa do Brasil", async ({ page }) => {
  await page.goto("/br")
  await expect(page.locator("path.map__state")).toHaveCount(27)
  await expectNoSeriousViolations(page)
})

test("acessibilidade do estado e do painel", async ({ page }) => {
  await page.goto("/br/sp/3550308")
  await expect(page.locator("aside.panel")).toBeVisible()
  await expectNoSeriousViolations(page)
})
