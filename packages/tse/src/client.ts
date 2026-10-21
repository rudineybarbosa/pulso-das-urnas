export interface FetchOptions {
  etag?: string | null
  timeoutMs?: number
  retries?: number
  userAgent?: string
}

export interface FetchResult {
  status: number
  notModified: boolean
  etag: string | null
  body: unknown | null
}

export class TseHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
  ) {
    super(`TSE respondeu ${status} para ${url}`)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Cliente condicional e educado com a fonte (RN-032). */
export async function fetchTseJson(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const retries = options.retries ?? 3
  const timeoutMs = options.timeoutMs ?? 15_000
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent":
      options.userAgent ?? "PulsoDasUrnas/1.0 (+https://github.com/rudineybarbosa/pulso-das-urnas)",
  }
  if (options.etag) headers["If-None-Match"] = options.etag

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) })
      if (response.status === 304) {
        return { status: 304, notModified: true, etag: options.etag ?? null, body: null }
      }
      if (!response.ok) throw new TseHttpError(response.status, url)
      const body = (await response.json()) as unknown
      return {
        status: response.status,
        notModified: false,
        etag: response.headers.get("etag"),
        body,
      }
    } catch (error) {
      lastError = error
      if (attempt === retries) break
      await sleep(1000 * 2 ** attempt)
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Falha ao consultar o TSE")
}
