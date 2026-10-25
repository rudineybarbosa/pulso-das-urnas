import { createHash } from "node:crypto"
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify"
import { DataStore } from "./store"

const PROBLEM = "application/problem+json"

interface RateEntry {
  count: number
  reset: number
}

function problem(
  reply: FastifyReply,
  status: number,
  code: string,
  title: string,
  detail: string,
  instance: string,
  requestId: string,
) {
  return reply
    .code(status)
    .type(PROBLEM)
    .send({
      type: `https://pulso-das-urnas.dev/erros/${code.toLowerCase()}`,
      title,
      status,
      detail,
      instance,
      code,
      requestId,
    })
}

function numberParam(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export interface AppOptions {
  store?: DataStore
  rateLimit?: number
}

export function createApp(options: AppOptions = {}): FastifyInstance {
  const store = options.store ?? new DataStore()
  const limit = options.rateLimit ?? 300
  const buckets = new Map<string, RateEntry>()
  const app = Fastify({ logger: false, disableRequestLogging: true, trustProxy: true })

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header(
      "Content-Security-Policy",
      "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    )
    reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
    reply.header("X-Content-Type-Options", "nosniff")
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin")
    reply.header("Permissions-Policy", "geolocation=(), camera=(), microphone=()")
    return payload
  })

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id)
    if (request.url.startsWith("/healthz") || request.url.startsWith("/readyz")) return
    const ip = request.ip || "unknown"
    const now = Date.now()
    if (buckets.size > 10_000) buckets.clear()
    const entry = buckets.get(ip)
    if (!entry || entry.reset < now) {
      buckets.set(ip, { count: 1, reset: now + 60_000 })
      return
    }
    entry.count += 1
    if (entry.count > limit) {
      reply.header("Retry-After", "60")
      return problem(
        reply,
        429,
        "RATE_LIMITED",
        "Limite de requisições",
        "Aguarde antes de tentar novamente.",
        request.url,
        request.id,
      )
    }
  })

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error)
    return problem(
      reply,
      500,
      "ERRO_INTERNO",
      "Erro interno",
      "Não foi possível concluir a consulta.",
      request.url,
      request.id,
    )
  })

  function cached(request: FastifyRequest, reply: FastifyReply, data: unknown, cache: string) {
    const body = JSON.stringify(data)
    const version =
      typeof data === "object" && data !== null && "versao" in data
        ? String((data as { versao?: unknown }).versao)
        : body
    const etag = `"${createHash("sha1").update(version).digest("hex")}"`
    reply.header("Cache-Control", cache)
    reply.header("ETag", etag)
    if (request.headers["if-none-match"] === etag) {
      return reply.code(304).send()
    }
    return reply.type("application/json; charset=utf-8").send(body)
  }

  async function prepare(election: string): Promise<void> {
    await store.refresh(election)
  }

  function validScope(
    request: FastifyRequest,
    reply: FastifyReply,
    query: Record<string, string | undefined>,
  ): { cargo: string; election: string } | FastifyReply {
    const election = query.pleito ?? store.defaultElection()
    if (!store.hasPleito(election)) {
      return problem(
        reply,
        404,
        "PLEITO_NAO_ENCONTRADO",
        "Pleito não encontrado",
        "Não há pleito com esse código.",
        request.url,
        request.id,
      )
    }
    const cargo = query.cargo ?? "1"
    if (!store.hasCargo(cargo)) {
      return problem(
        reply,
        404,
        "CARGO_NAO_ENCONTRADO",
        "Cargo não encontrado",
        "Não há cargo com esse código.",
        request.url,
        request.id,
      )
    }
    return { cargo, election }
  }

  app.get("/healthz", async () => ({ status: "ok" }))
  app.get("/readyz", async (_request, reply) => {
    const panorama = store.panorama("1", store.defaultElection())
    if (panorama.estados.length < 1) {
      return reply.code(503).send({ status: "degraded" })
    }
    return { status: "ready", versao: panorama.versao }
  })

  app.get("/api/v1/pleitos", async (request, reply) =>
    cached(
      request,
      reply,
      { apiVersion: "1", pleitos: store.pleitos() },
      "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    ),
  )

  app.get("/api/v1/panorama", async (request, reply) => {
    const query = request.query as Record<string, string | undefined>
    const validated = validScope(request, reply, query)
    if ("code" in validated) return validated
    await prepare(validated.election)
    return cached(
      request,
      reply,
      store.panorama(validated.cargo, validated.election),
      "public, max-age=0, s-maxage=3, stale-while-revalidate=5, stale-if-error=22",
    )
  })

  app.get("/api/v1/escopos/:uf", async (request, reply) => {
    const params = request.params as { uf: string }
    const query = request.query as Record<string, string | undefined>
    const uf = params.uf.toUpperCase()
    const validated = validScope(request, reply, query)
    if ("code" in validated) return validated
    await prepare(validated.election)
    if (!/^[A-Z]{2}$/.test(uf)) {
      return problem(
        reply,
        400,
        "PARAMETRO_INVALIDO",
        "UF inválida",
        "A UF deve ter duas letras.",
        request.url,
        request.id,
      )
    }
    if (!store.hasUf(uf)) {
      return problem(
        reply,
        404,
        "ESCOPO_NAO_ENCONTRADO",
        "UF não encontrada",
        "Não há estado com essa sigla.",
        request.url,
        request.id,
      )
    }
    return cached(
      request,
      reply,
      await store.scopeSnapshot(uf, validated.cargo, validated.election),
      "public, max-age=0, s-maxage=5, stale-while-revalidate=10, stale-if-error=15",
    )
  })

  app.get("/api/v1/municipios/:ibge", async (request, reply) => {
    const params = request.params as { ibge: string }
    const query = request.query as Record<string, string | undefined>
    const ibge = numberParam(params.ibge, 0)
    const validated = validScope(request, reply, query)
    if ("code" in validated) return validated
    await prepare(validated.election)
    const snapshot = await store.municipality(ibge, validated.cargo, validated.election)
    if (!snapshot) {
      return problem(
        reply,
        404,
        "MUNICIPIO_NAO_ENCONTRADO",
        "Município não encontrado",
        "Não há município com esse código IBGE.",
        request.url,
        request.id,
      )
    }
    return cached(
      request,
      reply,
      snapshot,
      "public, max-age=0, s-maxage=5, stale-while-revalidate=5, stale-if-error=20",
    )
  })

  app.get("/api/v1/municipios/:ibge/cargos", async (request, reply) => {
    const params = request.params as { ibge: string }
    const ibge = numberParam(params.ibge, 0)
    const query = request.query as Record<string, string | undefined>
    const election = query.pleito ?? store.defaultElection()
    if (!store.hasPleito(election)) {
      return problem(
        reply,
        404,
        "PLEITO_NAO_ENCONTRADO",
        "Pleito não encontrado",
        "Não há pleito com esse código.",
        request.url,
        request.id,
      )
    }
    await prepare(election)
    const snapshot = await store.municipality(ibge, "1", election)
    if (!snapshot) {
      return problem(
        reply,
        404,
        "MUNICIPIO_NAO_ENCONTRADO",
        "Município não encontrado",
        "Não há município com esse código IBGE.",
        request.url,
        request.id,
      )
    }
    return cached(
      request,
      reply,
      {
        apiVersion: "1",
        escopo: snapshot.escopo,
        cargos: store.cargos(snapshot.escopo.uf, election),
      },
      "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    )
  })

  app.get("/api/v1/corrida", async (request, reply) => {
    const query = request.query as Record<string, string | undefined>
    const election = query.pleito ?? store.defaultElection()
    if (!store.hasPleito(election)) {
      return problem(
        reply,
        404,
        "PLEITO_NAO_ENCONTRADO",
        "Pleito não encontrado",
        "Não há pleito com esse código.",
        request.url,
        request.id,
      )
    }
    await prepare(election)
    return cached(
      request,
      reply,
      store.race(election),
      "public, max-age=0, s-maxage=2, stale-while-revalidate=3, stale-if-error=5",
    )
  })

  app.get("/api/v1/stream", (request, reply) => {
    reply.hijack()
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    })
    const send = () => {
      if (reply.raw.writableEnded) return
      const panorama = store.panorama("1")
      reply.raw.write(`id: ${panorama.versao}\ndata: ${JSON.stringify(panorama)}\n\n`)
    }
    send()
    const timer = setInterval(send, 5_000)
    const heartbeat = setInterval(() => reply.raw.write(": keep-alive\n\n"), 15_000)
    request.raw.on("close", () => {
      clearInterval(timer)
      clearInterval(heartbeat)
    })
  })

  app.get("/api/v1/localidades", async (request, reply) => {
    const query = request.query as Record<string, string | undefined>
    return cached(
      request,
      reply,
      { apiVersion: "1", resultados: store.localidades(query.q ?? "") },
      "public, max-age=3600, s-maxage=86400",
    )
  })

  return app
}
