import { config } from '../config'

/** Corpo de erro padrão da API: { statusCode, error, message, details }. */
interface ApiErrorBody {
  statusCode: number
  error: string
  message: string
  details: unknown
}

/** A API respondeu com erro (4xx/5xx). */
export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(status: number, message: string, details: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/**
 * A API não respondeu: rede, CORS, timeout ou servidor dormindo.
 * O plano gratuito do Koyeb hiberna sem tráfego, então este é o erro típico do "cold start".
 */
export class NetworkError extends Error {
  constructor(message = 'Não foi possível falar com o servidor.') {
    super(message)
    this.name = 'NetworkError'
  }
}

const REQUEST_TIMEOUT_MS = 15_000

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'message' in value && 'statusCode' in value
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

  let response: Response
  try {
    response = await fetch(`${config.apiUrl}${path}`, { signal: combined })
  } catch (error) {
    // Cancelamento pelo React Query (troca de filtro) deve continuar sendo cancelamento
    if (signal?.aborted) throw error
    throw new NetworkError()
  }

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    if (isApiErrorBody(body)) throw new ApiError(response.status, body.message, body.details)
    // Proxies costumam responder 502/503/504 enquanto o servidor acorda
    if (response.status >= 502) throw new NetworkError()
    throw new ApiError(response.status, 'O servidor respondeu com um erro inesperado.')
  }

  return body as T
}
