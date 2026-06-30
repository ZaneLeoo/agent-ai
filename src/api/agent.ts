import type { BootstrapState } from '@/lib/bootstrap'
import type { AgentChatRequest, AgentStreamEvent } from '@/types/agent'
import { requestJson, withBaseApi } from './http'

export interface ConversationItem {
  id: number
  title: string
  createdAt: string
}

export interface MessageItem {
  id: number
  role: 'user' | 'assistant'
  content: string
  metadata?: string
  createdAt: string
}

export function listConversations(bootstrap: BootstrapState) {
  return requestJson<ConversationItem[]>(bootstrap, '/agent/conversations')
}

export function listMessages(bootstrap: BootstrapState, conversationId: number) {
  return requestJson<MessageItem[]>(bootstrap, `/agent/conversations/${conversationId}/messages`)
}

export function deleteConversation(bootstrap: BootstrapState, conversationId: number) {
  return requestJson<void>(bootstrap, `/agent/conversations/${conversationId}`, { method: 'DELETE' })
}

export function stopChat(bootstrap: BootstrapState, conversationId: number) {
  return requestJson<void>(bootstrap, '/agent/chat/stop', {
    method: 'POST',
    body: JSON.stringify({ conversationId }),
  })
}

export async function streamAgentChat(
  bootstrap: BootstrapState,
  body: AgentChatRequest,
  onEvent: (event: AgentStreamEvent) => void,
  signal?: AbortSignal,
) {
  const response = await fetch(withBaseApi(bootstrap.baseApi, '/agent/chat/stream'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(bootstrap.token ? { Authorization: `Bearer ${bootstrap.token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(response.statusText || 'Stream request failed')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split(/\r?\n\r?\n/)
    buffer = frames.pop() ?? ''

    for (const frame of frames) {
      const parsed = parseSseFrame(frame)
      if (parsed) onEvent(parsed)
    }
  }

  const parsed = parseSseFrame(buffer)
  if (parsed) onEvent(parsed)
}

export function parseSseFrame(frame: string): AgentStreamEvent | null {
  const lines = frame.split(/\r?\n/).filter(Boolean)
  if (!lines.length) return null

  let event = 'message'
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  const dataText = dataLines.join('\n')

  if (!dataText) {
    return { event, data: null }
  }

  try {
    return { event, data: JSON.parse(dataText) }
  } catch {
    return { event, data: dataText }
  }
}
