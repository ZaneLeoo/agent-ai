import type { BootstrapState } from '@/lib/bootstrap'
import { ApiError, isAuthExpiredStatus, notifyAuthExpired, withBaseApi } from './http'
import { AGENT_STREAM_EVENT_TYPES, type AgentStreamEvent } from '@/types/agent-stream'

export type ChatStreamEvent = AgentStreamEvent

export async function streamChat(bootstrap: BootstrapState, query: string, difyConversationId: string | undefined,
  onEvent: (event: ChatStreamEvent) => void, signal?: AbortSignal) {
  const response = await fetch(withBaseApi(bootstrap.baseApi, '/agent/chat/stream'), {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', ...(bootstrap.token ? { Authorization: `Bearer ${bootstrap.token}` } : {}) },
    body: JSON.stringify({ query, difyConversationId, inputs: {} }),
  })
  if (!response.ok) {
    if (isAuthExpiredStatus(response.status)) notifyAuthExpired()
    throw new ApiError(response.status === 401 || response.status === 403 ? '登录状态已失效，请重新登录' : (response.statusText || '无法连接智能助手'), response.status)
  }
  if (!response.body) throw new Error('无法连接智能助手')
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
  while (true) {
    const { done, value } = await reader.read(); buffer += decoder.decode(value, { stream: !done })
    const frames = buffer.split(/\r?\n\r?\n/); buffer = frames.pop() ?? ''
    for (const frame of frames) { const event = parseChatSseFrame(frame); if (event) onEvent(event) }
    if (done) break
  }
  const event = parseChatSseFrame(buffer); if (event) onEvent(event)
}

export function parseChatSseFrame(frame: string): ChatStreamEvent | null {
  const lines = frame.split(/\r?\n/); const event = lines.find(line => line.startsWith('event:'))?.slice(6).trim()
  const text = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n')
  if (!event) return null
  let data: unknown = {}; try { data = text ? JSON.parse(text) : {} } catch { data = {} }
  if (!AGENT_STREAM_EVENT_TYPES.includes(event as typeof AGENT_STREAM_EVENT_TYPES[number]) || !data || typeof data !== 'object' || Array.isArray(data)) return null
  return { event: event as ChatStreamEvent['event'], data: data as Record<string, unknown> }
}
