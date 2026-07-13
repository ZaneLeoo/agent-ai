import type { BootstrapState } from '@/lib/bootstrap'

export const AUTH_EXPIRED_EVENT = 'agent-ui:auth-expired'

/** 通知页面统一清理登录态并显示登录面板。 */
export function notifyAuthExpired() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
}

/** 判断 HTTP 或 SSE 结构化错误是否代表 RuoYi 登录态失效。 */
export function isAuthExpiredStatus(value: unknown) {
  return value === 401 || value === 403 || value === '401' || value === '403'
}

export function isAuthExpiredPayload(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const data = value as Record<string, unknown>
  if (isAuthExpiredStatus(data.status) || isAuthExpiredStatus(data.code) || isAuthExpiredStatus(data.httpStatus)) return true
  return typeof data.message === 'string' && /认证失败|登录状态已失效|token.*(失效|过期)|未登录/i.test(data.message)
}

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
    if (isAuthExpiredStatus(response.status)) notifyAuthExpired()
    throw new ApiError(response.statusText || '请求失败', response.status)
  }

  const json = await response.json()
  // RuoYi 统一响应格式: { code, msg, data }
  if (json && typeof json === 'object' && 'code' in json) {
    if (json.code !== 200) {
      if (isAuthExpiredStatus(json.code)) notifyAuthExpired()
      throw new ApiError(json.msg || '请求失败', json.code)
    }
    return json.data as T
  }
  return json as T
}
