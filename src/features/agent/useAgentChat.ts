import type { ChatStatus } from 'ai'
import { ref } from 'vue'
import { streamChat } from '@/api/agent'
import { ApiError } from '@/api/http'
import type { createBootstrapStore } from '@/lib/bootstrap'
import type { AgentChatMessage } from './AssistantMessage.vue'

type BootstrapStore = ReturnType<typeof createBootstrapStore>

export interface AgentToolCall {
  callId: string
  toolName: string
  toolLabel: string
  phase: 'started' | 'finished'
  position?: number
  input?: unknown
  output?: unknown
}

/** 基础聊天状态：只处理用户消息、Dify 文本流与停止。 */
export function useAgentChat(bootstrap: BootstrapStore, options: { onAuthExpired?: () => void } = {}) {
  const messages = ref<AgentChatMessage[]>([])
  const status = ref<ChatStatus>('ready')
  const abortController = ref<AbortController | null>(null)
  const copiedMessageId = ref('')
  let difyConversationId: string | undefined
  let copiedResetTimer: ReturnType<typeof setTimeout> | undefined

  function baseMessage(role: 'user' | 'assistant', content: string): AgentChatMessage {
    return { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`, role, content,
      streaming: false, stopped: false, failed: false, error: '', retryQuery: '', tools: [] }
  }
  function createUserMessage(content: string) { return baseMessage('user', content) }
  function createAssistantMessage(content = '', retryQuery = '') { return { ...baseMessage('assistant', content), retryQuery } }

  function handleSuggestionClick(text: string) {
    if (status.value !== 'ready') return
    messages.value.push(createUserMessage(text)); void sendMessage(text)
  }
  async function handleSubmit(event: { text: string }) {
    if (status.value !== 'ready') { stopStream(); return }
    const text = event.text?.trim(); if (!text) return
    messages.value.push(createUserMessage(text)); await sendMessage(text)
  }
  async function retryMessage(message: AgentChatMessage) {
    if (status.value !== 'ready' || !message.retryQuery) return
    messages.value.push(createUserMessage(message.retryQuery)); await sendMessage(message.retryQuery)
  }
  async function sendMessage(text: string) {
    const assistant = createAssistantMessage('', text); assistant.streaming = true
    messages.value.push(assistant); const index = messages.value.length - 1
    status.value = 'submitted'; abortController.value = new AbortController()
    try {
      status.value = 'streaming'
      await streamChat(bootstrap.state, text, difyConversationId, event => {
        const message = messages.value[index]; if (!message) return
        if (event.event === 'message' && typeof event.data.content === 'string') message.content += event.data.content
        if (event.event === 'metadata' && typeof event.data.conversationId === 'string') difyConversationId = event.data.conversationId
        if (event.event === 'tool' && typeof event.data.callId === 'string') {
          const tool = event.data as unknown as AgentToolCall
          const existing = message.tools.find(item => item.callId === tool.callId)
          if (existing) Object.assign(existing, tool)
          else message.tools.push({ ...tool, phase: tool.phase === 'finished' ? 'finished' : 'started' })
        }
        if (event.event === 'error') { message.failed = true; message.error = String(event.data.message ?? '请求失败') }
      }, abortController.value.signal)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) options.onAuthExpired?.()
        assistant.failed = true; assistant.error = error instanceof Error ? error.message : '请求失败'
      }
    } finally {
      const message = messages.value[index]
      if (message) message.streaming = false
      status.value = 'ready'; abortController.value = null
    }
  }
  function stopStream() {
    abortController.value?.abort(); abortController.value = null; status.value = 'ready'
    const message = [...messages.value].reverse().find(item => item.role === 'assistant')
    if (message) { message.streaming = false; message.stopped = true }
  }
  async function copyMessageContent(message: AgentChatMessage) {
    if (!message.content || !navigator.clipboard?.writeText) return
    await navigator.clipboard.writeText(message.content); copiedMessageId.value = message.id
    if (copiedResetTimer) clearTimeout(copiedResetTimer)
    copiedResetTimer = setTimeout(() => { copiedMessageId.value = '' }, 1600)
  }
  function clearMessages() { messages.value = []; difyConversationId = undefined }
  function loadConversation(historyMessages: AgentChatMessage[], conversationId?: string) {
    stopStream()
    messages.value = historyMessages.map(message => ({ ...message, streaming: false, tools: message.tools ?? [] }))
    difyConversationId = conversationId
  }
  function getConversationId() { return difyConversationId }
  function cleanupChat() { stopStream(); if (copiedResetTimer) clearTimeout(copiedResetTimer) }

  return { messages, status, copiedMessageId, handleSuggestionClick, handleSubmit, retryMessage,
    copyMessageContent, stopStream, clearMessages, loadConversation, getConversationId, cleanupChat }
}
