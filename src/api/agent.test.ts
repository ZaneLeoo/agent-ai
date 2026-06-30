import { describe, expect, it } from 'vitest'
import { parseSseFrame } from './agent'

describe('parseSseFrame', () => {
  it('parses named JSON events', () => {
    expect(parseSseFrame('event: message\ndata: {"content":"你好"}')).toEqual({
      event: 'message',
      data: { content: '你好' },
    })
  })

  it('keeps plain text payloads', () => {
    expect(parseSseFrame('data: hello')).toEqual({
      event: 'message',
      data: 'hello',
    })
  })
})
