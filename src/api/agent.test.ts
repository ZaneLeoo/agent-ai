import { describe, expect, it } from 'vitest'
import { parseChatSseFrame } from './agent'

describe('parseChatSseFrame', () => {
  it('parses supported SSE frames', () => {
    const event = parseChatSseFrame('event: message\ndata: {"content":"hello"}')

    expect(event).toEqual({ event: 'message', data: { content: 'hello' } })
  })

  it('ignores unsupported events', () => {
    expect(parseChatSseFrame('event: node\ndata: {"event":"node_started"}')).toBeNull()
  })
})
