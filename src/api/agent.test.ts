import { describe, expect, it } from 'vitest'
import { parseRawSseFrame, parseSseFrame } from './agent'

describe('parseSseFrame', () => {
  it('parses named JSON events', () => {
    expect(parseSseFrame('event: message\ndata: {"content":"你好"}')).toEqual({
      event: 'message',
      data: { content: '你好' },
    })
  })

  it('keeps plain text payloads in raw parsing', () => {
    expect(parseRawSseFrame('data: hello')).toEqual({
      event: 'message',
      data: 'hello',
    })
  })

  it('normalizes unknown events', () => {
    expect(parseSseFrame('event: custom\ndata: {"value":1}')).toEqual({
      event: 'unknown',
      originalEvent: 'custom',
      data: { value: 1 },
    })
  })
})
