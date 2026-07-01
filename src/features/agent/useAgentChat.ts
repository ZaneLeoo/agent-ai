import type { ChatStatus } from 'ai'
import type { Ref } from 'vue'
import { ref } from 'vue'
import { stopChat, streamAgentChat, type MessageItem } from '@/api/agent'
import type { AgentStreamEvent } from '@/types/agent'
import type { createBootstrapStore } from '@/lib/bootstrap'
import {
  getArtifactsFromStreamData,
  type ArtifactItem,
} from '@/lib/artifacts'
import {
  getSourcesFromStreamData,
  type AgentSourceItem,
} from '@/lib/sources'
import { applyArtifactStep, applyNodeEvent } from '@/lib/steps'
import type { AgentChatMessage } from './AssistantMessage.vue'

type BootstrapStore = ReturnType<typeof createBootstrapStore>

export function useAgentChat(
  bootstrap: BootstrapStore,
  options: {
    activeConversationId: Ref<number | undefined>
    onConversationListChanged?: () => Promise<void> | void
  },
) {
  const messages = ref<AgentChatMessage[]>([])
  const status = ref<ChatStatus>('ready')
  const abortController = ref<AbortController | null>(null)
  const copiedMessageId = ref('')
  let copiedResetTimer: ReturnType<typeof setTimeout> | undefined

  function handleSuggestionClick(tip: string) {
    if (status.value !== 'ready') return
    messages.value.push(createUserMessage(tip))
    sendMessage(tip)
  }

  async function handleSubmit(event: { text: string }) {
    if (status.value === 'streaming') {
      stopStream()
      return
    }
    if (status.value !== 'ready') return
    const text = event.text?.trim()
    if (!text) return

    messages.value.push(createUserMessage(text))
    await sendMessage(text)
  }

  async function retryMessage(message: AgentChatMessage) {
    if (status.value !== 'ready' || !message.retryQuery) return
    messages.value.push(createUserMessage(message.retryQuery))
    await sendMessage(message.retryQuery)
  }

  async function copyMessageContent(message: AgentChatMessage) {
    if (!message.content || !navigator?.clipboard?.writeText) return
    await navigator.clipboard.writeText(message.content)
    copiedMessageId.value = message.id
    if (copiedResetTimer) clearTimeout(copiedResetTimer)
    copiedResetTimer = setTimeout(() => {
      if (copiedMessageId.value === message.id) copiedMessageId.value = ''
    }, 1600)
  }

  async function sendMessage(text: string) {
    const assistant = createAssistantMessage('', text)
    assistant.streaming = true
    assistant.thinkingOpen = true
    messages.value.push(assistant)
    const idx = messages.value.length - 1
    status.value = 'submitted'

    abortController.value = new AbortController()

    try {
      await streamAgentChat(
        bootstrap.state,
        { conversationId: options.activeConversationId.value, query: text, inputs: {} },
        event => handleStreamEvent(idx, event),
        abortController.value.signal,
      )
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      messages.value[idx].error = e instanceof Error ? e.message : '请求失败'
      messages.value[idx].failed = true
      completeActiveSteps(messages.value[idx])
    } finally {
      messages.value[idx].streaming = false
      status.value = 'ready'
      abortController.value = null
      options.onConversationListChanged?.()
    }
  }

  function stopStream() {
    abortController.value?.abort()
    const conversationId = options.activeConversationId.value
    if (conversationId) {
      stopChat(bootstrap.state, conversationId).catch(() => {})
    }
    const idx = findLastAssistantIndex()
    if (idx >= 0) {
      messages.value[idx].streaming = false
      messages.value[idx].stopped = true
      messages.value[idx].thinkingOpen = false
      for (const step of messages.value[idx].steps) {
        if (step.status === 'active') step.status = 'complete'
      }
    }
    status.value = 'ready'
  }

  function toChatMessage(item: MessageItem): AgentChatMessage {
    const msg: AgentChatMessage = {
      id: `${item.role}-${item.id}`,
      role: item.role,
      content: item.content || '',
      streaming: false,
      steps: [],
      thinkingOpen: false,
      stopped: false,
      failed: false,
      error: '',
      retryQuery: '',
      artifacts: [],
      sources: [],
    }

    const metadata = parseMetadata(item.metadata)
    if (metadata) {
      appendArtifacts(msg, getArtifactsFromStreamData(metadata))
      appendSources(msg, getSourcesFromStreamData(metadata))
    }
    return msg
  }

  function clearMessages() {
    messages.value = []
  }

  function cleanupChat() {
    stopStream()
    if (copiedResetTimer) clearTimeout(copiedResetTimer)
  }

  function handleStreamEvent(idx: number, event: AgentStreamEvent) {
    const msg = messages.value[idx]
    if (!msg) return

    if (status.value === 'submitted') status.value = 'streaming'

    const { event: type, data } = event

    switch (type) {
      case 'conversation': {
        if (data.conversationId) options.activeConversationId.value = data.conversationId
        appendArtifacts(msg, getArtifactsFromStreamData(data))
        appendSources(msg, getSourcesFromStreamData(data))
        break
      }
      case 'message': {
        if (data.content) msg.content += data.content
        break
      }
      case 'message_replace': {
        if (data.content) msg.content = data.content
        break
      }
      case 'node': {
        applyNodeEvent(msg.steps, data)
        break
      }
      case 'workflow': {
        if (data.event === 'workflow_finished') {
          for (const step of msg.steps) step.status = 'complete'
          setTimeout(() => { if (messages.value[idx]) messages.value[idx].thinkingOpen = false }, 1500)
        }
        break
      }
      case 'artifact': {
        appendArtifacts(msg, getArtifactsFromStreamData(data))
        break
      }
      case 'sources':
      case 'message_end': {
        appendSources(msg, getSourcesFromStreamData(data))
        break
      }
      case 'done': {
        msg.streaming = false
        status.value = 'ready'
        for (const step of msg.steps) step.status = 'complete'
        setTimeout(() => { if (messages.value[idx]) messages.value[idx].thinkingOpen = false }, 1000)
        break
      }
      case 'error': {
        msg.error = data.message || '服务端错误'
        msg.streaming = false
        msg.failed = true
        completeActiveSteps(msg)
        status.value = 'ready'
        break
      }
      case 'unknown':
        break
    }
  }

  function createUserMessage(content: string): AgentChatMessage {
    return {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      streaming: false,
      steps: [],
      thinkingOpen: false,
      stopped: false,
      failed: false,
      error: '',
      retryQuery: '',
      artifacts: [],
      sources: [],
    }
  }

  function createAssistantMessage(content = '', retryQuery = ''): AgentChatMessage {
    return {
      id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: 'assistant',
      content,
      streaming: false,
      steps: [],
      thinkingOpen: false,
      stopped: false,
      failed: false,
      error: '',
      retryQuery,
      artifacts: [],
      sources: [],
    }
  }

  function parseMetadata(metadata?: string): Record<string, unknown> | null {
    if (!metadata) return null
    try {
      const parsed = JSON.parse(metadata)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null
    } catch {
      return null
    }
  }

  function completeActiveSteps(msg: AgentChatMessage) {
    for (const step of msg.steps) {
      if (step.status === 'active') step.status = 'complete'
    }
  }

  function appendArtifacts(msg: AgentChatMessage, artifacts: ArtifactItem[]) {
    for (const artifact of artifacts) {
      msg.artifacts.push(artifact)
      applyArtifactStep(msg.steps, artifact)
    }
  }

  function appendSources(msg: AgentChatMessage, sources: AgentSourceItem[]) {
    const existing = new Set(msg.sources.map(source => source.id))
    for (const source of sources) {
      if (!existing.has(source.id)) {
        msg.sources.push(source)
        existing.add(source.id)
      }
    }
  }

  function findLastAssistantIndex(): number {
    for (let i = messages.value.length - 1; i >= 0; i--) {
      if (messages.value[i].role === 'assistant') return i
    }
    return -1
  }

  return {
    messages,
    status,
    copiedMessageId,
    handleSuggestionClick,
    handleSubmit,
    retryMessage,
    copyMessageContent,
    stopStream,
    toChatMessage,
    clearMessages,
    cleanupChat,
  }
}
