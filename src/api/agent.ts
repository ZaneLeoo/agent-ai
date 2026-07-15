import type { BootstrapState } from '@/lib/bootstrap'
import { ApiError, isAuthExpiredPayload, isAuthExpiredStatus, notifyAuthExpired, withBaseApi } from './http'
import { AGENT_STREAM_EVENT_TYPES, type AgentStreamEvent } from '@/types/agent-stream'

export type ChatStreamEvent = AgentStreamEvent

export interface AgentInputFileUpload {
  uploadFileId: string
  name: string
  type: 'image' | 'document' | 'audio' | 'video'
  mediaType: string
  size: number
}

export async function uploadAgentInputFile(bootstrap: BootstrapState, file: File): Promise<AgentInputFileUpload> {
  const form = new FormData()
  form.append('file', file, file.name)
  const response = await fetch(withBaseApi(bootstrap.baseApi, '/agent/files/upload'), {
    method: 'POST',
    headers: bootstrap.token ? { Authorization: `Bearer ${bootstrap.token}` } : {},
    body: form,
  })
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok || !payload || payload.code !== 200) {
    if (isAuthExpiredStatus(response.status) || isAuthExpiredPayload(payload)) notifyAuthExpired()
    throw new ApiError(String(payload?.msg ?? '附件上传失败'), response.status)
  }
  return payload.data as AgentInputFileUpload
}

export async function streamChat(bootstrap: BootstrapState, query: string, difyConversationId: string | undefined,
  onEvent: (event: ChatStreamEvent) => void, signal?: AbortSignal, files: AgentInputFileUpload[] = []) {
  const response = await fetch(withBaseApi(bootstrap.baseApi, '/agent/chat/stream'), {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', ...(bootstrap.token ? { Authorization: `Bearer ${bootstrap.token}` } : {}) },
    body: JSON.stringify({ query, difyConversationId, inputs: {}, files }),
  })
  if (!response.ok) {
    if (isAuthExpiredStatus(response.status)) notifyAuthExpired()
    throw new ApiError(response.status === 401 || response.status === 403 ? '登录状态已失效，请重新登录' : (response.statusText || '无法连接智能助手'), response.status)
  }
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('text/event-stream')) {
    const text = await response.text()
    let payload: unknown = null
    try { payload = text ? JSON.parse(text) : null } catch { payload = null }
    if (isAuthExpiredPayload(payload)) notifyAuthExpired()
    const data = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload as Record<string, unknown> : undefined
    const status = data?.code ?? response.status
    const message = data?.msg ?? data?.message ?? response.statusText ?? '无法连接智能助手'
    throw new ApiError(String(message), typeof status === 'number' ? status : response.status)
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
