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

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
  streaming?: boolean
}

export interface AgentStreamEvent {
  event: string
  data: unknown
}

export interface AgentChatRequest {
  conversationId?: number | string
  query: string
  inputs?: Record<string, unknown>
}
