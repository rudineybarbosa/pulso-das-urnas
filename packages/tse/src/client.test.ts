import { createServer, type Server } from "node:http"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { fetchTseJson, TseHttpError } from "./client"

let server: Server
let base = ""

beforeAll(async () => {
  server = createServer((request, response) => {
    if (request.url === "/etag") {
      if (request.headers["if-none-match"] === '"v1"') {
        response.writeHead(304)
        response.end()
        return
      }
      response.writeHead(200, { "content-type": "application/json", etag: '"v1"' })
      response.end(JSON.stringify({ ok: true }))
      return
    }
    response.writeHead(500)
    response.end("erro")
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (typeof address === "object" && address) base = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe("cliente do TSE", () => {
  it("lê JSON e ETag", async () => {
    const result = await fetchTseJson(`${base}/etag`)
    expect(result.status).toBe(200)
    expect(result.etag).toBe('"v1"')
    expect(result.body).toEqual({ ok: true })
  })

  it("respeita 304", async () => {
    const result = await fetchTseJson(`${base}/etag`, { etag: '"v1"' })
    expect(result.notModified).toBe(true)
    expect(result.body).toBeNull()
  })

  it("lança erro em 5xx sem retry", async () => {
    await expect(fetchTseJson(`${base}/erro`, { retries: 0 })).rejects.toBeInstanceOf(TseHttpError)
  })
})
