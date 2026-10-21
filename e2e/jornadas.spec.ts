import { test, expect } from "@playwright/test"

test.describe("Jornadas do Pulso das Urnas", () => {
  test("J-01: mapa do Brasil com 27 estados e fonte", async ({ page }) => {
    await page.goto("/br")
    await expect(page.getByRole("heading", { name: "O país em um mapa" })).toBeVisible()
    await expect(page.locator("path.map__state")).toHaveCount(27)
    await expect(page.getByText("Fonte: Tribunal Superior Eleitoral")).toBeVisible()
    await expect(page.getByText("Este site não é um serviço oficial do TSE.")).toBeVisible()
  })

  test("J-02: drill-down estado → município → voltar", async ({ page }) => {
    await page.goto("/br")
    await page.locator('path[aria-label^="São Paulo:"]').click()
    await expect(page).toHaveURL(/\/br\/sp$/)
    await expect(page.getByRole("heading", { name: "São Paulo" })).toBeVisible()
    await expect(page.locator("path.map__city").first()).toBeVisible()

    await page.locator("path.map__city").first().click()
    await expect(page).toHaveURL(/\/br\/sp\/\d+$/)
    await expect(page.locator("aside.panel")).toBeVisible()
    await expect(page.locator("aside.panel").getByRole("heading")).toBeVisible()

    await page.getByRole("button", { name: "← Voltar" }).click()
    await expect(page).toHaveURL(/\/br\/sp$/)
    await page.getByRole("button", { name: "← Voltar" }).click()
    await expect(page).toHaveURL(/\/br$/)
  })

  test("busca por cidade", async ({ page }) => {
    await page.goto("/br")
    await page.getByLabel("digite o nome do estado ou da cidade:").fill("sao paulo")
    const options = page.getByRole("option")
    await expect(options.first()).toBeVisible()
    await options.filter({ hasText: "cidade" }).first().click()
    await expect(page).toHaveURL(/\/br\/sp\/3550308$/)
    await expect(page.locator("aside.panel")).toBeVisible()
    await expect(page.getByText("SÃO PAULO").first()).toBeVisible()
  })

  test("corrida tem dois cavalos e números", async ({ page }) => {
    await page.goto("/br")
    await expect(page.getByRole("heading", { name: "A corrida da apuração" })).toBeVisible()
    await expect(page.locator("svg.horse")).toHaveCount(2)
    await expect(page.locator(".race__number")).toHaveCount(2)
  })

  test("prefers-reduced-motion desliga a animação", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/br")
    await expect(page.locator("svg.horse").first()).toBeVisible()
    const animation = await page.locator("svg.horse").first().evaluate((element) => {
      return getComputedStyle(element).animationName
    })
    expect(animation).toBe("none")
  })

  test("troca de cargo repinta o mapa", async ({ page }) => {
    await page.goto("/br")
    await page.getByRole("button", { name: "Governador" }).click()
    await expect(page).toHaveURL(/cargo=3/)
    await expect(page.locator("path.map__state")).toHaveCount(27)
  })

  test("rota desconhecida mostra mensagem", async ({ page }) => {
    await page.goto("/br/xx/9999999")
    await expect(page.getByText(/Não foi possível consultar os dados|Não encontramos/)).toBeVisible()
  })
})
