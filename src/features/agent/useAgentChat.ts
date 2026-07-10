import type { ChatStatus } from 'ai'
import type { Ref } from 'vue'
import { ref } from 'vue'
import {
  cancelAgentRun,
  createAgentRun,
  streamAgentRun,
  type MessageItem,
} from '@/api/agent'
import type { AgentV2StreamEvent } from '@/types/agent'
import type { createBootstrapStore } from '@/lib/bootstrap'
import {
  getArtifactsFromStreamData,
  normalizeArtifact,
  type ArtifactItem,
} from '@/lib/artifacts'
import {
  getSourcesFromStreamData,
  normalizeSource,
  type AgentSourceItem,
} from '@/lib/sources'
import {
  applyArtifactStep,
  applyStepFinished,
  applyStepStarted,
  applyToolFinished,
  applyToolStarted,
} from '@/lib/steps'
import type { AgentChatMessage } from './AssistantMessage.vue'

type BootstrapStore = ReturnType<typeof createBootstrapStore>
const PENDING_STEP_ID = 'step:pending-response'

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
  const activeRunId = ref<number>()
  const copiedMessageId = ref('')
  let copiedResetTimer: ReturnType<typeof setTimeout> | undefined

  function handleSuggestionClick(tip: string) {
    if (status.value !== 'ready') return
    messages.value.push(createUserMessage(tip))
    void sendMessage(tip)
  }

  async function handleSubmit(event: { text: string }) {
    if (status.value === 'streaming' || status.value === 'submitted') {
      stopStream()
      return
    }
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
    ensurePendingStep(assistant)
    messages.value.push(assistant)
    const idx = messages.value.length - 1
    status.value = 'submitted'
    abortController.value = new AbortController()

    try {
      const run = await createAgentRun(bootstrap.state, {
        conversationId: options.activeConversationId.value,
        query: text,
        inputs: {},
        contextRefs: {},
      })
      activeRunId.value = run.runId
      options.activeConversationId.value = run.conversationId
      status.value = 'streaming'
      await streamAgentRun(
        bootstrap.state,
        run.runId,
        event => handleStreamEvent(idx, event),
        abortController.value.signal,
      )
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = messages.value[idx]
      if (message && !message.stopped) {
        message.error = error instanceof Error ? error.message : '请求失败'
        message.failed = true
        completeActiveSteps(message)
      }
    } finally {
      const message = messages.value[idx]
      if (message) message.streaming = false
      status.value = 'ready'
      activeRunId.value = undefined
      abortController.value = null
      await options.onConversationListChanged?.()
    }
  }

  function stopStream() {
    const runId = activeRunId.value
    abortController.value?.abort()
    if (runId) void cancelAgentRun(bootstrap.state, runId).catch(() => {})
    const idx = findLastAssistantIndex()
    if (idx >= 0) markStopped(messages.value[idx])
    activeRunId.value = undefined
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
      stopped: item.status === 'stopped',
      failed: item.status === 'failed',
      error: item.errorMessage || '',
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

  function handleStreamEvent(idx: number, event: AgentV2StreamEvent) {
    const msg = messages.value[idx]
    if (!msg) return
    const data = event.data
    switch (event.event) {
      case 'run.created':
        if (typeof data.conversationId === 'number') options.activeConversationId.value = data.conversationId
        break
      case 'message.delta':
        removePendingStep(msg)
        if (typeof data.content === 'string') msg.content += data.content
        break
      case 'message.replaced':
        removePendingStep(msg)
        if (typeof data.content === 'string') msg.content = data.content
        break
      case 'step.started':
        removePendingStep(msg)
        applyStepStarted(msg.steps, data)
        break
      case 'step.completed':
        applyStepFinished(msg.steps, data)
        break
      case 'step.failed':
        applyStepFinished(msg.steps, data, true)
        msg.failed = true
        break
      case 'artifact.created': {
        const artifact = normalizeArtifact(data)
        if (artifact) appendArtifacts(msg, [artifact])
        break
      }
      case 'citation.created': {
        const source = normalizeSource(data)
        if (source) appendSources(msg, [source])
        break
      }
      case 'approval.required':
        msg.steps.push({
          id: `approval:${String(data.toolCallId ?? Date.now())}`,
          label: '等待确认',
          description: typeof data.summary === 'string' ? data.summary : '需要你的确认后才能继续',
          status: 'pending',
        })
        break
      case 'run.completed':
        finishMessage(msg)
        break
      case 'run.failed':
        msg.error = typeof data.message === 'string' ? data.message : 'Agent 执行失败'
        msg.failed = true
        finishMessage(msg)
        break
      case 'run.cancelled':
        markStopped(msg)
        break
      case 'tool.started':
        removePendingStep(msg)
        applyToolStarted(msg.steps, data)
        break
      case 'tool.completed':
        applyToolFinished(msg.steps, data)
        break
      case 'tool.failed':
        applyToolFinished(msg.steps, data, true)
        msg.failed = true
        break
    }
  }

  function createUserMessage(content: string): AgentChatMessage {
    return baseMessage('user', content)
  }

  function createAssistantMessage(content = '', retryQuery = ''): AgentChatMessage {
    return { ...baseMessage('assistant', content), retryQuery }
  }

  function baseMessage(role: 'user' | 'assistant', content: string): AgentChatMessage {
    return {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role,
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

  function finishMessage(msg: AgentChatMessage) {
    msg.streaming = false
    completeActiveSteps(msg)
    removePendingStep(msg)
    status.value = 'ready'
  }

  function markStopped(msg: AgentChatMessage) {
    msg.streaming = false
    msg.stopped = true
    msg.thinkingOpen = false
    completeActiveSteps(msg)
    removePendingStep(msg)
  }

  function completeActiveSteps(msg: AgentChatMessage) {
    for (const step of msg.steps) if (step.status === 'active') step.status = 'complete'
  }

  function ensurePendingStep(msg: AgentChatMessage) {
    msg.steps.push({ id: PENDING_STEP_ID, label: '正在理解需求', description: '准备选择下一步...', status: 'active' })
  }

  function removePendingStep(msg: AgentChatMessage) {
    const index = msg.steps.findIndex(step => step.id === PENDING_STEP_ID)
    if (index >= 0) msg.steps.splice(index, 1)
  }

  function appendArtifacts(msg: AgentChatMessage, artifacts: ArtifactItem[]) {
    const ids = new Set(msg.artifacts.map(item => `${item.type}:${item.title}:${JSON.stringify(item.payload)}`))
    for (const artifact of artifacts) {
      const key = `${artifact.type}:${artifact.title}:${JSON.stringify(artifact.payload)}`
      if (ids.has(key)) continue
      msg.artifacts.push(artifact)
      ids.add(key)
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

  function findLastAssistantIndex() {
    for (let i = messages.value.length - 1; i >= 0; i--) {
      if (messages.value[i].role === 'assistant') return i
    }
    return -1
  }

  return {
    messages,
    status,
    activeRunId,
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
