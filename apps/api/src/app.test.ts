import { describe, expect, it } from "vitest"
import { createApp } from "./app"
import { DataStore } from "./store"

function app(scenario: "parcial" | "fim" | "sem-votos" = "parcial") {
  return createApp({ store: new DataStore({ scenario, speed: 600 }), rateLimit: 10_000 })
}

describe("API", () => {
  it("serve saúde", async () => {
    const response = await app().inject({ method: "GET", url: "/healthz" })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: "ok" })
  })

  it("serve panorama com 27 estados", async () => {
    const response = await app().inject({ method: "GET", url: "/api/v1/panorama?cargo=1" })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.estados).toHaveLength(27)
    expect(body.estados.find((state: { uf: string }) => state.uf === "SP").status).toBe("ok")
    expect(response.headers["cache-control"]).toContain("s-maxage=3")
    expect(response.headers.etag).toBeTruthy()
  })

  it("responde 304 com o mesmo ETag", async () => {
    const instance = app()
    const first = await instance.inject({ method: "GET", url: "/api/v1/panorama?cargo=1" })
    const second = await instance.inject({
      method: "GET",
      url: "/api/v1/panorama?cargo=1",
      headers: { "if-none-match": first.headers.etag as string },
    })
    expect(second.statusCode).toBe(304)
  })

  it("serve escopo de UF com municípios", async () => {
    const response = await app().inject({ method: "GET", url: "/api/v1/escopos/sp?cargo=1" })
    const body = response.json()
    expect(body.escopo.uf).toBe("SP")
    expect(body.dados.municipios.length).toBeGreaterThan(600)
    expect(body.status).toBe("ok")
  })

  it("serve município e cargos", async () => {
    const response = await app().inject({
      method: "GET",
      url: "/api/v1/municipios/3550308?cargo=1",
    })
    const body = response.json()
    expect(response.statusCode).toBe(200)
    expect(body.escopo.nome).toBe("SÃO PAULO")
    expect(body.dados.candidatos.length).toBeGreaterThan(3)
    const cargos = await app().inject({ method: "GET", url: "/api/v1/municipios/3550308/cargos" })
    expect(cargos.json().cargos.length).toBeGreaterThanOrEqual(5)
  })

  it("404 com Problem Details", async () => {
    const response = await app().inject({ method: "GET", url: "/api/v1/municipios/9999999" })
    expect(response.statusCode).toBe(404)
    expect(response.headers["content-type"]).toContain("application/problem+json")
    expect(response.json().code).toBe("MUNICIPIO_NAO_ENCONTRADO")
  })

  it("corrida finalizada anuncia o fim", async () => {
    const response = await app("fim").inject({ method: "GET", url: "/api/v1/corrida" })
    expect(response.json().interesses).toBe("finalizado")
    expect(response.json().apuracao.finalizada).toBe(true)
  })

  it("corrida sem votos não inventa cavalos", async () => {
    const response = await app("sem-votos").inject({ method: "GET", url: "/api/v1/corrida" })
    expect(response.json().cavalos).toEqual([])
  })

  it("rejeita cargo e pleito inexistentes", async () => {
    const cargo = await app().inject({ method: "GET", url: "/api/v1/panorama?cargo=99" })
    expect(cargo.statusCode).toBe(404)
    expect(cargo.json().code).toBe("CARGO_NAO_ENCONTRADO")
    const pleito = await app().inject({ method: "GET", url: "/api/v1/panorama?pleito=9999" })
    expect(pleito.statusCode).toBe(404)
    expect(pleito.json().code).toBe("PLEITO_NAO_ENCONTRADO")
  })

  it("cargo inexistente no DF é não aplicável", async () => {
    const response = await app().inject({ method: "GET", url: "/api/v1/escopos/df?cargo=7" })
    expect(response.json().status).toBe("nao_aplicavel")
  })

  it("a cor do mapa não muda ao trocar o cargo selecionado", async () => {
    const first = await app().inject({ method: "GET", url: "/api/v1/panorama?cargo=1" })
    const second = await app().inject({ method: "GET", url: "/api/v1/panorama?cargo=3" })
    const colors = (body: { estados: Array<{ cor: unknown }> }) =>
      body.estados.map((state) => state.cor)
    expect(colors(first.json())).toEqual(colors(second.json()))
  })

  it("ausência devolve null, não zero", async () => {
    const response = await app().inject({ method: "GET", url: "/api/v1/escopos/df?cargo=7" })
    const body = response.json()
    expect(body.status).toBe("nao_aplicavel")
    expect(body.dados).toBeNull()
  })

  it("corrida tem dois cavalos", async () => {
    const response = await app().inject({ method: "GET", url: "/api/v1/corrida" })
    const body = response.json()
    expect(body.cavalos).toHaveLength(2)
    expect(body.cavalos[0].cor).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it("sem votos deixa estados sem líder", async () => {
    const response = await app("sem-votos").inject({ method: "GET", url: "/api/v1/panorama" })
    const body = response.json()
    expect(body.estados.every((state: { status: string }) => state.status === "sem_voto")).toBe(
      true,
    )
    expect(body.estados.every((state: { cor: unknown }) => state.cor === null)).toBe(true)
  })

  it("fim marca apuração finalizada", async () => {
    const response = await app("fim").inject({ method: "GET", url: "/api/v1/panorama" })
    expect(response.json().apuracao.finalizada).toBe(true)
  })

  it("busca localidades", async () => {
    const response = await app().inject({ method: "GET", url: "/api/v1/localidades?q=sao%20paulo" })
    const body = response.json()
    expect(body.resultados.length).toBeGreaterThan(0)
    expect(body.resultados[0].uf).toBe("SP")
  })
})
