import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import type { SnapshotRepository, SnapshotKey } from "@pulso/cloud"
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

  it("seleciona o segundo turno sem reutilizar silenciosamente o primeiro", async () => {
    const first = await app().inject({ method: "GET", url: "/api/v1/panorama?pleito=6257&cargo=1" })
    const second = await app().inject({
      method: "GET",
      url: "/api/v1/panorama?pleito=6258&cargo=1",
    })

    expect(first.statusCode).toBe(200)
    expect(first.json().eleicao).toBe("6257")
    expect(second.statusCode).toBe(200)
    expect(second.json().eleicao).toBe("6258")
    expect(second.json().pleito.turno).toBe(2)
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

  it("modo real pinta municípios do cache compartilhado e muda o ETag ao carregar", async () => {
    const body = JSON.parse(
      readFileSync(
        join(process.cwd(), "data/fixtures/tse/2026/6257/ap06017-c0001-e006257-u.json"),
        "utf8",
      ),
    ) as unknown
    const key: SnapshotKey = {
      ciclo: "ele2026",
      pleito: "6257",
      escopo: "ap06017",
      cargo: "1",
    }
    const repository: SnapshotRepository = {
      getCurrent: async (requested) =>
        requested.pleito === key.pleito &&
        requested.escopo === key.escopo &&
        requested.cargo === key.cargo
          ? {
              pointer: {
                ...key,
                idg: "2839103",
                objectName: "snapshots/teste.json",
                generatedAt: "2026-10-25T02:00:00.000Z",
                collectedAt: "2026-10-25T02:00:01.000Z",
                parserVersion: "1.0.0",
              },
              body,
            }
          : null,
      putIfNewer: async (input) => input as never,
      acquireLease: async () => false,
    }
    const store = new DataStore({ mode: "real", scenario: "fim", repository })
    const instance = createApp({ store, rateLimit: 10_000 })
    const first = await instance.inject({ method: "GET", url: "/api/v1/escopos/ap?pleito=6257" })
    const firstBody = first.json()
    expect(firstBody.dados.municipios).toHaveLength(16)
    expect(firstBody.municipiosTotal).toBe(16)
    expect(firstBody.municipiosCarregando).toBe(true)
    expect(firstBody.dados.municipios.every((city: { cor: unknown }) => city.cor === null)).toBe(
      true,
    )

    let second = first
    await vi.waitFor(
      async () => {
        second = await instance.inject({ method: "GET", url: "/api/v1/escopos/ap?pleito=6257" })
        expect(second.json().municipiosCarregados).toBeGreaterThan(0)
      },
      { timeout: 3_000, interval: 25 },
    )
    const secondBody = second.json()
    expect(secondBody.municipiosCarregados).toBe(1)
    expect(secondBody.municipiosCarregando).toBe(true)
    expect(second.headers.etag).not.toBe(first.headers.etag)
    const loaded = secondBody.dados.municipios.find(
      (city: { ibge: number }) => city.ibge === 1600105,
    )
    expect(loaded.lider.partido).toBe("PT")
    expect(loaded.cor.hex).toBeTruthy()
    expect(loaded.percentual).toBeGreaterThan(0)
    const pending = secondBody.dados.municipios.find(
      (city: { ibge: number }) => city.ibge !== 1600105,
    )
    expect(pending.cor).toBeNull()
    expect(pending.lider).toBeNull()

    const cached = await instance.inject({
      method: "GET",
      url: "/api/v1/escopos/ap?pleito=6257",
      headers: { "if-none-match": second.headers.etag as string },
    })
    expect(cached.statusCode).toBe(304)
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

  it("corrida respeita o turno selecionado", async () => {
    const response = await app().inject({
      method: "GET",
      url: "/api/v1/corrida?pleito=6258&cargo=1",
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().pleito.id).toBe("6258")
  })

  it("mantém a liderança municipal oficial do Amapá", async () => {
    const response = await app("fim").inject({
      method: "GET",
      url: "/api/v1/escopos/ap?pleito=6257&cargo=1",
    })
    const cities = response.json().dados.municipios
    const parties = cities.reduce(
      (counts: Record<string, number>, city: { lider: { partido: string } }) => {
        counts[city.lider.partido] = (counts[city.lider.partido] ?? 0) + 1
        return counts
      },
      {},
    )

    expect(cities).toHaveLength(16)
    expect(parties).toEqual({ PT: 12, PL: 4 })
    expect(cities.find((city: { nome: string }) => city.nome === "MACAPÁ").lider.partido).toBe("PL")
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
