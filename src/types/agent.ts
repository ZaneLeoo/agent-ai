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

export interface AgentRawStreamEvent {
  event: string
  data: unknown
}

export type AgentStreamEvent =
  | AgentConversationStreamEvent
  | AgentMessageStreamEvent
  | AgentMessageReplaceStreamEvent
  | AgentNodeStreamEvent
  | AgentWorkflowStreamEvent
  | AgentArtifactStreamEvent
  | AgentSourcesStreamEvent
  | AgentMessageEndStreamEvent
  | AgentDoneStreamEvent
  | AgentErrorStreamEvent
  | AgentUnknownStreamEvent

export type AgentStreamEventName = AgentStreamEvent['event']

export interface AgentConversationStreamEvent {
  event: 'conversation'
  data: AgentConversationStreamData
}

export interface AgentMessageStreamEvent {
  event: 'message'
  data: AgentMessageStreamData
}

export interface AgentMessageReplaceStreamEvent {
  event: 'message_replace'
  data: AgentMessageStreamData
}

export interface AgentNodeStreamEvent {
  event: 'node'
  data: AgentNodeStreamData
}

export interface AgentWorkflowStreamEvent {
  event: 'workflow'
  data: AgentWorkflowStreamData
}

export interface AgentArtifactStreamEvent {
  event: 'artifact'
  data: AgentStreamRecord
}

export interface AgentSourcesStreamEvent {
  event: 'sources'
  data: AgentStreamRecord
}

export interface AgentMessageEndStreamEvent {
  event: 'message_end'
  data: AgentStreamRecord
}

export interface AgentDoneStreamEvent {
  event: 'done'
  data: AgentStreamRecord
}

export interface AgentErrorStreamEvent {
  event: 'error'
  data: AgentErrorStreamData
}

export interface AgentUnknownStreamEvent {
  event: 'unknown'
  originalEvent: string
  data: unknown
}

export interface AgentStreamRecord {
  [key: string]: unknown
}

export interface AgentConversationStreamData extends AgentStreamRecord {
  conversationId?: number
  title?: string
}

export interface AgentMessageStreamData extends AgentStreamRecord {
  content?: string
}

export interface AgentNodeStreamData extends AgentStreamRecord {
  event?: string
  title?: string
  nodeType?: string
  status?: string
  elapsedTime?: number
}

export interface AgentWorkflowStreamData extends AgentStreamRecord {
  event?: string
  status?: string
}

export interface AgentErrorStreamData extends AgentStreamRecord {
  message?: string
  code?: string | number
}

export interface AgentChatRequest {
  conversationId?: number | string
  query: string
  inputs?: Record<string, unknown>
}
