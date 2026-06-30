import type { BootstrapState } from '@/lib/bootstrap'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function withBaseApi(baseApi: string, path: string) {
  const cleanBase = baseApi.replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanBase}${cleanPath}`
}

export async function requestJson<T>(
  bootstrap: BootstrapState,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(withBaseApi(bootstrap.baseApi, path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(bootstrap.token ? { Authorization: `Bearer ${bootstrap.token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new ApiError(response.statusText || '请求失败', response.status)
  }

  const json = await response.json()
  // RuoYi 统一响应格式: { code, msg, data }
  if (json && typeof json === 'object' && 'code' in json) {
    if (json.code !== 200) {
      throw new ApiError(json.msg || '请求失败', json.code)
    }
    return json.data as T
  }
  return json as T
}
