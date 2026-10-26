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
