export interface ApiErrorBody {
  title?: string
  detail?: string
  code?: string
  status?: number
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message)
  }
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { headers: { Accept: "application/json" } })
  if (!response.ok) {
    let body: ApiErrorBody = {}
    try {
      body = (await response.json()) as ApiErrorBody
    } catch {
      /* corpo não JSON */
    }
    throw new ApiError(
      response.status,
      body.detail ?? body.title ?? "Falha ao consultar",
      body.code,
    )
  }
  return (await response.json()) as T
}

export async function getAsset<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) throw new ApiError(response.status, "Falha ao carregar a geometria")
  return (await response.json()) as T
}
