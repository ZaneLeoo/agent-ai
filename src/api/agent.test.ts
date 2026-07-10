import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseAgentV2SseFrame, parseRawSseFrame, streamAgentRun } from './agent'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Agent V2 SSE', () => {
  it('parses a versioned event with sequence id', () => {
    const frame = [
      'id: 3',
      'event: message.delta',
      'data: {"event":"message.delta","runId":8,"sequence":3,"timestamp":100,"data":{"content":"你好"}}',
    ].join('\n')
    expect(parseAgentV2SseFrame(frame)).toEqual({
      event: 'message.delta',
      runId: 8,
      sequence: 3,
      timestamp: 100,
      data: { content: '你好' },
    })
  })

  it('keeps plain text in the raw parser', () => {
    expect(parseRawSseFrame('data: hello')).toEqual({
      id: undefined,
      event: 'message',
      data: 'hello',
    })
  })

  it('rejects events outside the V2 contract', () => {
    expect(parseAgentV2SseFrame('event: node\ndata: {"event":"node"}')).toBeNull()
  })

  it('reconnects with the last sequence and removes replayed duplicates', async () => {
    const first = sseResponse([
      eventFrame(1, 'message.delta', { content: '你' }),
    ])
    const second = sseResponse([
      eventFrame(1, 'message.delta', { content: '你' }),
      eventFrame(2, 'run.completed', { messageId: 9 }),
    ])
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second)
    const received: string[] = []

    await streamAgentRun(
      { baseApi: '/dev-api', token: 'token', ready: true, embedded: false, userName: '测试用户' },
      7,
      event => received.push(`${event.sequence}:${event.event}`),
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('afterSequence=0')
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('afterSequence=1')
    expect(received).toEqual(['1:message.delta', '2:run.completed'])
  })
})

function eventFrame(sequence: number, event: string, data: Record<string, unknown>) {
  return [
    `id: ${sequence}`,
    `event: ${event}`,
    `data: ${JSON.stringify({ event, runId: 7, sequence, timestamp: 100 + sequence, data })}`,
  ].join('\n')
}

function sseResponse(frames: string[]) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`${frames.join('\n\n')}\n\n`))
      controller.close()
    },
  })
  return { ok: true, status: 200, statusText: 'OK', body } as Response
}
