import { describe, expect, it } from 'vitest'
import { normalizeAgentStreamEvent } from './stream-events'

describe('normalizeAgentStreamEvent', () => {
  it('normalizes known message events', () => {
    expect(normalizeAgentStreamEvent({
      event: 'message',
      data: { content: '你好', extra: true },
    })).toEqual({
      event: 'message',
      data: { content: '你好', extra: true },
    })
  })

  it('normalizes plain text message payloads', () => {
    expect(normalizeAgentStreamEvent({
      event: 'message',
      data: '你好',
    })).toEqual({
      event: 'message',
      data: { content: '你好' },
    })
  })

  it('normalizes node events and keeps extra fields', () => {
    expect(normalizeAgentStreamEvent({
      event: 'node',
      data: {
        event: 'node_finished',
        title: '[知识] 销售知识检索',
        nodeType: 'knowledge-retrieval',
        elapsedTime: 1.25,
        raw: { id: 'node-id' },
      },
    })).toEqual({
      event: 'node',
      data: {
        event: 'node_finished',
        title: '[知识] 销售知识检索',
        nodeType: 'knowledge-retrieval',
        elapsedTime: 1.25,
        raw: { id: 'node-id' },
      },
    })
  })

  it('keeps unknown events inspectable', () => {
    expect(normalizeAgentStreamEvent({
      event: 'custom_event',
      data: { value: 1 },
    })).toEqual({
      event: 'unknown',
      originalEvent: 'custom_event',
      data: { value: 1 },
    })
  })
})
