import { withBaseApi } from './http'

export interface LoginResult {
  token: string
}

export interface UserInfo {
  userName?: string
  nickName?: string
}

export interface CaptchaInfo {
  captchaEnabled: boolean
  uuid?: string
  img?: string
}

export async function getCaptcha(baseApi: string): Promise<CaptchaInfo> {
  const response = await fetch(withBaseApi(baseApi, '/captchaImage'))
  const json = await response.json()
  if (!response.ok || json.code !== 200) {
    throw new Error(json.msg || response.statusText || '获取验证码失败')
  }

  return {
    captchaEnabled: Boolean(json.captchaEnabled),
    uuid: typeof json.uuid === 'string' ? json.uuid : undefined,
    img: typeof json.img === 'string' ? json.img : undefined,
  }
}

export async function login(baseApi: string, body: {
  username: string
  password: string
  code?: string
  uuid?: string
}): Promise<LoginResult> {
  const response = await fetch(withBaseApi(baseApi, '/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const json = await response.json()
  if (!response.ok || json.code !== 200 || !json.token) {
    throw new Error(json.msg || response.statusText || '登录失败')
  }

  return { token: json.token }
}

export async function getUserInfo(baseApi: string, token: string): Promise<UserInfo> {
  const response = await fetch(withBaseApi(baseApi, '/getInfo'), {
    headers: { Authorization: `Bearer ${token}` },
  })

  const json = await response.json()
  if (!response.ok || json.code !== 200) {
    throw new Error(json.msg || response.statusText || '获取用户信息失败')
  }

  return json.user ?? {}
}
