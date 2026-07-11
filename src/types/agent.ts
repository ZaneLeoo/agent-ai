export interface AgentUser {
  id?: number | string
  name?: string
  nickName?: string
}

export interface AgentBootstrapPayload {
  token?: string
  baseApi: string
  user?: AgentUser
}
