/** 前后端约定的 Agent SSE 事件名称。 */
export const AGENT_STREAM_EVENT_TYPES = ['message', 'metadata', 'tool', 'knowledge', 'chart', 'file', 'done', 'error'] as const

export type AgentStreamEventType = typeof AGENT_STREAM_EVENT_TYPES[number]

export interface AgentStreamEvent<T extends Record<string, unknown> = Record<string, unknown>> {
  event: AgentStreamEventType
  data: T
}

export interface AgentMessageEvent extends AgentStreamEvent<{ content: string }> {
  event: 'message'
}

export interface AgentErrorEvent extends AgentStreamEvent<{ message: string }> {
  event: 'error'
}
