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

export interface AgentRunRequest {
  conversationId?: number
  query: string
  attachmentIds?: number[]
  contextRefs?: Record<string, unknown>
  inputs?: Record<string, unknown>
}

export interface AgentRunCreated {
  runId: number
  conversationId: number
  status: string
}

export type AgentV2EventName =
  | 'run.created'
  | 'message.delta'
  | 'message.replaced'
  | 'step.started'
  | 'step.completed'
  | 'step.failed'
  | 'tool.started'
  | 'tool.completed'
  | 'tool.failed'
  | 'artifact.created'
  | 'citation.created'
  | 'approval.required'
  | 'run.completed'
  | 'run.failed'
  | 'run.cancelled'

export interface AgentV2StreamEvent {
  event: AgentV2EventName
  runId: number
  sequence: number
  timestamp: number
  data: Record<string, unknown>
}

export interface AgentRawSseEvent {
  id?: string
  event: string
  data: unknown
}
