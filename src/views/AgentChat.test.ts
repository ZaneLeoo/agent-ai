import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AgentChat from './AgentChat.vue'

describe('AgentChat', () => {
  it('renders the welcome screen when no messages', () => {
    const wrapper = mount(AgentChat)
    expect(wrapper.text()).toContain('今天想分析什么？')
    expect(wrapper.text()).toContain('帮我总结一下本月经营情况')
  })
})
