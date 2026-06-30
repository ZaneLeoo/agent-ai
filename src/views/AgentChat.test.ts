import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AgentChat from './AgentChat.vue'

const streamAgentChatMock = vi.fn()

vi.mock('@/api/agent', () => ({
  deleteConversation: vi.fn(),
  listConversations: vi.fn().mockResolvedValue([]),
  listMessages: vi.fn().mockResolvedValue([]),
  stopChat: vi.fn().mockResolvedValue(undefined),
  streamAgentChat: (...args: unknown[]) => streamAgentChatMock(...args),
}))

vi.mock('@/api/auth', () => ({
  getCaptcha: vi.fn().mockResolvedValue({ captchaEnabled: false }),
  getUserInfo: vi.fn().mockResolvedValue({ nickName: '测试用户' }),
  login: vi.fn().mockResolvedValue({ token: 'token' }),
}))

beforeEach(() => {
  localStorage.setItem('agent-ui:auth', JSON.stringify({ token: 'token', userName: '测试用户' }))
})

afterEach(() => {
  streamAgentChatMock.mockReset()
  localStorage.clear()
})

describe('AgentChat', () => {
  it('renders the welcome screen when no messages', () => {
    const wrapper = mount(AgentChat)
    expect(wrapper.text()).toContain('今天想分析什么？')
    expect(wrapper.text()).toContain('帮我总结一下本月经营情况')
  })

  it('allows retrying a failed stream with the original query', async () => {
    streamAgentChatMock
      .mockRejectedValueOnce(new Error('网络断开'))
      .mockResolvedValueOnce(undefined)

    const wrapper = mount(AgentChat)
    await flushPromises()

    await wrapper.find('textarea').setValue('你好')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('网络断开')
    const retryButton = wrapper.findAll('button').find(button => button.text() === '重试')
    expect(retryButton).toBeTruthy()

    await retryButton!.trigger('click')
    await flushPromises()

    expect(streamAgentChatMock).toHaveBeenCalledTimes(2)
    expect(streamAgentChatMock.mock.calls[1][1]).toMatchObject({ query: '你好' })
  })

  it('copies assistant response content', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    streamAgentChatMock.mockImplementationOnce(async (...args: unknown[]) => {
      const onEvent = args[2] as (event: { event: string, data: unknown }) => void
      onEvent({ event: 'message', data: { content: '这是一段可复制回答' } })
      onEvent({ event: 'done', data: {} })
    })

    const wrapper = mount(AgentChat)
    await flushPromises()

    await wrapper.find('textarea').setValue('复制测试')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const copyButton = wrapper.findAll('button').find(button => button.text() === '复制')
    expect(copyButton).toBeTruthy()
    await copyButton!.trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('这是一段可复制回答')
    expect(wrapper.text()).toContain('已复制')
  })
})
