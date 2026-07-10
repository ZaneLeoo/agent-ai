import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AgentChat from './AgentChat.vue'

const createAgentRunMock = vi.fn()
const streamAgentRunMock = vi.fn()

vi.mock('@/api/agent', () => ({
  deleteConversation: vi.fn(),
  listConversations: vi.fn().mockResolvedValue([]),
  listMessages: vi.fn().mockResolvedValue([]),
  cancelAgentRun: vi.fn().mockResolvedValue(undefined),
  createAgentRun: (...args: unknown[]) => createAgentRunMock(...args),
  streamAgentRun: (...args: unknown[]) => streamAgentRunMock(...args),
}))

vi.mock('@/api/auth', () => ({
  getCaptcha: vi.fn().mockResolvedValue({ captchaEnabled: false }),
  getUserInfo: vi.fn().mockResolvedValue({ nickName: '测试用户' }),
  login: vi.fn().mockResolvedValue({ token: 'token' }),
}))

beforeEach(() => {
  localStorage.setItem('agent-ui:auth', JSON.stringify({ token: 'token', userName: '测试用户' }))
  createAgentRunMock.mockResolvedValue({ runId: 9, conversationId: 3, status: 'RUNNING' })
})

afterEach(() => {
  createAgentRunMock.mockReset()
  streamAgentRunMock.mockReset()
  localStorage.clear()
})

describe('AgentChat', () => {
  it('renders the welcome screen when no messages', () => {
    const wrapper = mount(AgentChat)
    expect(wrapper.text()).toContain('今天想分析什么？')
    expect(wrapper.text()).toContain('帮我总结一下本月经营情况')
  })

  it('allows retrying a failed stream with the original query', async () => {
    streamAgentRunMock
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

    expect(createAgentRunMock).toHaveBeenCalledTimes(2)
    expect(createAgentRunMock.mock.calls[1][1]).toMatchObject({ query: '你好' })
  })

  it('shows thinking immediately while waiting for stream events', async () => {
    let resolveStream: (() => void) | undefined
    streamAgentRunMock.mockImplementationOnce(() => new Promise<void>(resolve => {
      resolveStream = resolve
    }))

    const wrapper = mount(AgentChat)
    await flushPromises()

    await wrapper.find('textarea').setValue('延迟测试')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('思考中 · 正在理解需求')
    expect(wrapper.text()).toContain('正在理解需求')
    expect(wrapper.text()).toContain('准备选择下一步...')

    resolveStream?.()
    await flushPromises()
  })

  it('copies assistant response content', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    streamAgentRunMock.mockImplementationOnce(async (...args: unknown[]) => {
      const onEvent = args[2] as (event: unknown) => void
      onEvent({ event: 'message.delta', runId: 9, sequence: 2, timestamp: 1, data: { content: '这是一段可复制回答' } })
      onEvent({ event: 'run.completed', runId: 9, sequence: 3, timestamp: 2, data: {} })
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

  it('opens and closes the mobile conversation drawer', async () => {
    const wrapper = mount(AgentChat)
    await flushPromises()

    expect(wrapper.find('[data-testid="mobile-sidebar"]').exists()).toBe(false)

    const openButton = wrapper.findAll('button').find(button => button.text() === '会话')
    expect(openButton).toBeTruthy()
    await openButton!.trigger('click')

    expect(wrapper.find('[data-testid="mobile-sidebar"]').exists()).toBe(true)

    await wrapper.find('[data-testid="mobile-sidebar-close"]').trigger('click')
    expect(wrapper.find('[data-testid="mobile-sidebar"]').exists()).toBe(false)
  })
})
