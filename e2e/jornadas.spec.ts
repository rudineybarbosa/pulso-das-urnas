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

    await page.locator("path.map__city").first().click({ force: true })
    await expect(page).toHaveURL(/\/br\/sp\/[a-z0-9-]+$/)
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
    const options = page.locator('.search__list [role="option"]')
    await expect(options.first()).toBeVisible()
    await options.filter({ hasText: "cidade" }).first().click()
    await expect(page).toHaveURL(/\/br\/sp\/[a-z0-9-]+$/)
    await expect(page.locator("aside.panel")).toBeVisible()
    await expect(page.getByText("SÃO PAULO").first()).toBeVisible()
  })

  test("seleciona o primeiro turno pela URL", async ({ page }) => {
    await page.goto("/br")
    await expect(page.getByRole("combobox", { name: "Pleito" })).toHaveValue("6257")
    await page.getByRole("combobox", { name: "Pleito" }).selectOption("6258")
    await expect(page).toHaveURL(/pleito=6258/)
    await expect(page.getByRole("combobox", { name: "Pleito" })).toHaveValue("6258")
  })

  test("URL canônica por slug abre o painel", async ({ page }) => {
    await page.goto("/br/sp/sao-paulo")
    await expect(page.locator("aside.panel")).toBeVisible()
    await expect(page.getByText("SÃO PAULO").first()).toBeVisible()
  })

  test("código IBGE redireciona para o slug canônico", async ({ page }) => {
    await page.goto("/br/sp/3550308")
    await expect(page).toHaveURL(/\/br\/sp\/sao-paulo$/)
    await expect(page.locator("aside.panel")).toBeVisible()
  })

  test("modo telão mostra o mapa sem cabeçalho", async ({ page }) => {
    await page.goto("/telao")
    await expect(page.getByRole("heading", { name: /telão/i })).toBeVisible()
    await expect(page.locator("path.map__state")).toHaveCount(27)
  })

  test("monitor tem duas linhas e números", async ({ page }) => {
    await page.goto("/br")
    await expect(page.getByRole("heading", { name: /Monitor da apuração/ })).toBeVisible()
    await expect(page.locator(".pulse__channel")).toHaveCount(2)
    await expect(page.locator(".pulse__readout")).toHaveCount(2)
  })

  test("desktop cabe na janela sem rolagem", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/br")
    await expect(page.locator(".pulse__channel")).toHaveCount(2)
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
    ).toBe(true)

    await page.goto("/br/sp/sao-paulo")
    await expect(page.locator("aside.panel")).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
    ).toBe(true)
  })

  test("mobile não cria overflow e organiza o cabeçalho", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/br")
    await expect(page.getByRole("combobox", { name: "Pleito" })).toBeVisible()
    await expect(page.getByLabel("digite o nome do estado ou da cidade:")).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    expect(await page.locator(".pulse").boundingBox()).not.toBeNull()
  })

  test("prefers-reduced-motion desliga a animação", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/br")
    await expect(page.locator(".pulse__scroll").first()).toBeVisible()
    const animation = await page.locator(".pulse__scroll").first().evaluate((element) => {
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
