import type {
  AgentRawStreamEvent,
  AgentStreamEvent,
  AgentStreamRecord,
} from '@/types/agent'

export function normalizeAgentStreamEvent(raw: AgentRawStreamEvent): AgentStreamEvent {
  switch (raw.event) {
    case 'conversation':
      return { event: raw.event, data: normalizeRecord(raw.data, ['conversationId', 'title']) }
    case 'message':
    case 'message_replace':
      return { event: raw.event, data: normalizeRecord(raw.data, ['content']) }
    case 'node':
      return { event: raw.event, data: normalizeRecord(raw.data, ['event', 'title', 'nodeType', 'status', 'elapsedTime']) }
    case 'workflow':
      return { event: raw.event, data: normalizeRecord(raw.data, ['event', 'status']) }
    case 'artifact':
    case 'sources':
    case 'message_end':
    case 'done':
      return { event: raw.event, data: toRecord(raw.data) }
    case 'error':
      return { event: raw.event, data: normalizeRecord(raw.data, ['message', 'code']) }
    default:
      return { event: 'unknown', originalEvent: raw.event, data: raw.data }
  }
}

function normalizeRecord(data: unknown, knownKeys: string[]): AgentStreamRecord {
  if (typeof data === 'string') {
    if (knownKeys.includes('content')) return { content: data }
    if (knownKeys.includes('message')) return { message: data }
  }

  const record = toRecord(data)
  const normalized: AgentStreamRecord = { ...record }

  for (const key of knownKeys) {
    if (!(key in normalized)) continue

    if (key === 'conversationId') {
      normalized[key] = toNumber(normalized[key])
      continue
    }

    if (key === 'elapsedTime') {
      normalized[key] = toNumber(normalized[key])
      continue
    }

    if (key === 'code') {
      normalized[key] = toStringOrNumber(normalized[key])
      continue
    }

    normalized[key] = toString(normalized[key])
  }

  return normalized
}

function toRecord(data: unknown): AgentStreamRecord {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? data as AgentStreamRecord
    : {}
}

function toString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function toNumber(value: unknown) {
  return typeof value === 'number' ? value : undefined
}

function toStringOrNumber(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? value : undefined
}
