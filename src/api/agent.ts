import type { BootstrapState } from '@/lib/bootstrap'
import type {
  AgentRawSseEvent,
  AgentRunCreated,
  AgentRunRequest,
  AgentV2EventName,
  AgentV2StreamEvent,
} from '@/types/agent'
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
  status?: string
  errorMessage?: string
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

export function createAgentRun(bootstrap: BootstrapState, request: AgentRunRequest) {
  return requestJson<AgentRunCreated>(bootstrap, '/agent/v2/runs', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function cancelAgentRun(bootstrap: BootstrapState, runId: number) {
  return requestJson<void>(bootstrap, `/agent/v2/runs/${runId}/cancel`, { method: 'POST' })
}

export async function streamAgentRun(
  bootstrap: BootstrapState,
  runId: number,
  onEvent: (event: AgentV2StreamEvent) => void,
  signal?: AbortSignal,
  afterSequence = 0,
) {
  let cursor = Math.max(0, afterSequence)
  let reconnects = 0
  while (!signal?.aborted) {
    try {
      const result = await readAgentRunStream(bootstrap, runId, cursor, onEvent, signal)
      cursor = result.lastSequence
      if (result.terminal) return
      throw new Error('Agent 事件流意外中断')
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) throw error
      if (!isRetryableStreamError(error) || reconnects >= 5) throw error
      await waitForReconnect(Math.min(2000, 200 * 2 ** reconnects), signal)
      reconnects += 1
    }
  }
  throw new DOMException('Agent 事件流已取消', 'AbortError')
}

async function readAgentRunStream(
  bootstrap: BootstrapState,
  runId: number,
  afterSequence: number,
  onEvent: (event: AgentV2StreamEvent) => void,
  signal?: AbortSignal,
) {
  const path = `/agent/v2/runs/${runId}/events?afterSequence=${afterSequence}`
  const response = await fetch(withBaseApi(bootstrap.baseApi, path), {
    headers: bootstrap.token ? { Authorization: `Bearer ${bootstrap.token}` } : {},
    signal,
  })
  if (!response.ok || !response.body) {
    throw new AgentStreamHttpError(response.status, response.statusText || '无法连接 Agent 事件流')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let lastSequence = afterSequence
  let terminal = false
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      buffer += decoder.decode()
      break
    }
    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split(/\r?\n\r?\n/)
    buffer = frames.pop() ?? ''
    for (const frame of frames) {
      const result = deliverAgentEvent(frame, lastSequence, onEvent)
      lastSequence = result.lastSequence
      terminal ||= result.terminal
    }
  }
  const result = deliverAgentEvent(buffer, lastSequence, onEvent)
  return { lastSequence: result.lastSequence, terminal: terminal || result.terminal }
}

function deliverAgentEvent(
  frame: string,
  lastSequence: number,
  onEvent: (event: AgentV2StreamEvent) => void,
) {
  const event = parseAgentV2SseFrame(frame)
  if (!event || event.sequence <= lastSequence) {
    return { lastSequence, terminal: false }
  }
  onEvent(event)
  return { lastSequence: event.sequence, terminal: isTerminalEvent(event.event) }
}

function isTerminalEvent(event: AgentV2EventName) {
  return event === 'run.completed' || event === 'run.failed' || event === 'run.cancelled'
}

function isRetryableStreamError(error: unknown) {
  return !(error instanceof AgentStreamHttpError) || error.status >= 500 || error.status === 408 || error.status === 429
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function waitForReconnect(delay: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Agent 事件流已取消', 'AbortError'))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, delay)
    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException('Agent 事件流已取消', 'AbortError'))
    }
    signal?.addEventListener('abort', abort, { once: true })
  })
}

class AgentStreamHttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'AgentStreamHttpError'
  }
}

export function parseAgentV2SseFrame(frame: string): AgentV2StreamEvent | null {
  const raw = parseRawSseFrame(frame)
  if (!raw || !isRecord(raw.data)) return null
  const data = raw.data
  const event = typeof data.event === 'string' ? data.event : raw.event
  if (!isV2EventName(event)) return null
  const runId = toNumber(data.runId)
  const sequence = toNumber(data.sequence) ?? Number(raw.id)
  const timestamp = toNumber(data.timestamp)
  if (runId === undefined || !Number.isFinite(sequence) || timestamp === undefined) return null
  return {
    event,
    runId,
    sequence,
    timestamp,
    data: isRecord(data.data) ? data.data : {},
  }
}

export function parseRawSseFrame(frame: string): AgentRawSseEvent | null {
  const lines = frame.split(/\r?\n/).filter(Boolean)
  if (!lines.length) return null
  let id: string | undefined
  let event = 'message'
  const dataLines: string[] = []
  for (const line of lines) {
    if (line.startsWith('id:')) id = line.slice(3).trim()
    if (line.startsWith('event:')) event = line.slice(6).trim()
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
  }
  const text = dataLines.join('\n')
  if (!text) return { id, event, data: null }
  try {
    return { id, event, data: JSON.parse(text) }
  } catch {
    return { id, event, data: text }
  }
}

function isV2EventName(value: string): value is AgentV2EventName {
  return [
    'run.created', 'message.delta', 'message.replaced',
    'step.started', 'step.completed', 'step.failed',
    'tool.started', 'tool.completed', 'tool.failed',
    'artifact.created', 'citation.created', 'approval.required',
    'run.completed', 'run.failed', 'run.cancelled',
  ].includes(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
