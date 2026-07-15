import type { ChatStatus } from 'ai'
import { ref } from 'vue'
import { streamChat, uploadAgentInputFile } from '@/api/agent'
import type { AgentInputFileUpload } from '@/api/agent'
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input'
import { ApiError, isAuthExpiredPayload } from '@/api/http'
import type { createBootstrapStore } from '@/lib/bootstrap'
import type { AgentChatMessage } from './AssistantMessage.vue'
import type { AgentPurchaseOrderDraft, PurchaseOrderDraft } from '@/types/automation'

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

export interface AgentKnowledgeCall {
  callId: string
  datasetId: string
  datasetLabel: string
  phase: 'started' | 'finished'
  position?: number
  query?: string
  output?: unknown
  sources?: AgentKnowledgeSource[]
}

export interface AgentKnowledgeSource {
  sourceId: string
  segmentId?: string
  documentId?: string
  documentName: string
  content: string
  score?: number
}

export interface AgentChart {
  callId: string
  toolName: string
  chartType: 'bar' | 'line' | 'pie'
  phase: 'started' | 'finished'
  title?: string
  option?: Record<string, unknown>
}

export interface AgentFile {
  resourceId: string
  name: string
  filename?: string
  extension?: string
  mediaType?: string
  kind?: 'spreadsheet' | 'document' | 'pdf' | 'presentation' | 'image' | 'file' | string
  size?: number
  downloadUrl?: string
  preview?: 'browser' | 'download' | string
  phase: 'available' | 'failed'
  error?: string
  toolName?: string
  sourceFileId?: string
  sourceFilename?: string
}

export interface AgentInputAttachment {
  name: string
  mediaType?: string
  size?: number
  previewUrl?: string
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
      streaming: false, stopped: false, failed: false, error: '', retryQuery: '', tools: [], knowledges: [], charts: [], files: [], attachments: [], purchaseOrderDrafts: [] }
  }
  function createUserMessage(content: string) { return baseMessage('user', content) }
  function createAssistantMessage(content = '', retryQuery = '') { return { ...baseMessage('assistant', content), retryQuery } }

  function handleSuggestionClick(text: string) {
    if (status.value !== 'ready') return
    messages.value.push(createUserMessage(text)); void sendMessage(text)
  }
  async function handleSubmit(event: PromptInputMessage) {
    if (status.value !== 'ready') { stopStream(); return }
    const selectedFiles = event.files
      .map(item => (item as typeof item & { file?: File }).file)
      .filter((file): file is File => file instanceof File)
    const text = event.text?.trim() || (selectedFiles.length ? '请分析附件内容' : '')
    if (!text) return
    const userMessage = createUserMessage(text)
    userMessage.attachments = event.files.map((item, index) => ({
      name: selectedFiles[index]?.name || item.filename || '附件',
      mediaType: selectedFiles[index]?.type || item.mediaType,
      size: selectedFiles[index]?.size,
      previewUrl: item.url,
    }))
    messages.value.push(userMessage)
    const assistant = createAssistantMessage('', text)
    assistant.streaming = true
    messages.value.push(assistant)
    status.value = 'submitted'
    try {
      const uploadedFiles = await Promise.all(selectedFiles.map(file => uploadAgentInputFile(bootstrap.state, file)))
      await sendMessage(text, uploadedFiles, assistant)
    } catch (error) {
      assistant.failed = true
      assistant.error = error instanceof Error ? error.message : '附件上传失败'
      assistant.streaming = false
      status.value = 'ready'
    }
  }
  async function retryMessage(message: AgentChatMessage) {
    if (status.value !== 'ready' || !message.retryQuery) return
    messages.value.push(createUserMessage(message.retryQuery)); await sendMessage(message.retryQuery)
  }
  async function sendMessage(text: string, inputFiles: AgentInputFileUpload[] = [], existingAssistant?: AgentChatMessage) {
    const assistant = existingAssistant ?? createAssistantMessage('', text)
    assistant.streaming = true
    if (!existingAssistant) messages.value.push(assistant)
    const index = messages.value.indexOf(assistant)
    status.value = 'submitted'; abortController.value = new AbortController()
    try {
      status.value = 'streaming'
      await streamChat(bootstrap.state, text, difyConversationId, event => {
        const message = messages.value[index]; if (!message) return
        if (event.event === 'message' && typeof event.data.content === 'string') message.content += event.data.content
        if (event.event === 'metadata' || event.event === 'done') {
          if (typeof event.data.conversationId === 'string') difyConversationId = event.data.conversationId
          if (Array.isArray(event.data.files)) {
            event.data.files.forEach(value => {
              if (!value || typeof value !== 'object' || Array.isArray(value)) return
              const file = value as AgentFile
              if (typeof file.resourceId === 'string' && typeof file.name === 'string') upsertFile(message, file)
            })
          }
        }
        if (event.event === 'tool' && typeof event.data.callId === 'string') {
          const tool = event.data as unknown as AgentToolCall
          const existing = message.tools.find(item => item.callId === tool.callId)
          if (existing) Object.assign(existing, tool)
          else message.tools.push({ ...tool, phase: tool.phase === 'finished' ? 'finished' : 'started' })
          const draft = extractPurchaseOrderDraft(tool)
          if (draft && !message.purchaseOrderDrafts.some(item => item.callId === tool.callId)) {
            message.purchaseOrderDrafts.push({ ...draft, callId: tool.callId, requestId: createRequestId() })
          }
        }
        if (event.event === 'knowledge' && typeof event.data.callId === 'string') {
          const kb = event.data as unknown as AgentKnowledgeCall
          const existing = message.knowledges.find(item => item.callId === kb.callId)
          if (existing) Object.assign(existing, kb)
          else message.knowledges.push({ ...kb, phase: kb.phase === 'finished' ? 'finished' : 'started' })
        }
        if (event.event === 'chart' && typeof event.data.callId === 'string') {
          const chart = event.data as unknown as AgentChart
          const existing = message.charts.find(item => item.callId === chart.callId)
          if (existing) Object.assign(existing, chart)
          else message.charts.push({ ...chart, phase: chart.phase === 'finished' ? 'finished' : 'started' })
        }
        if (event.event === 'file' && typeof event.data.resourceId === 'string' && typeof event.data.name === 'string') {
          const file = event.data as unknown as AgentFile
          upsertFile(message, file)
        }
        if (event.event === 'error') {
          message.failed = true
          message.error = String(event.data.message ?? '请求失败')
          if (isAuthExpiredPayload(event.data)) options.onAuthExpired?.()
        }
      }, abortController.value.signal, inputFiles)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403) && bootstrap.state.token) {
          options.onAuthExpired?.()
        }
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
    messages.value = historyMessages.map(message => ({ ...message, streaming: false, tools: message.tools ?? [], knowledges: message.knowledges ?? [], charts: message.charts ?? [], files: message.files ?? [], attachments: message.attachments ?? [], purchaseOrderDrafts: message.purchaseOrderDrafts ?? [] }))
    difyConversationId = conversationId
  }
  function getConversationId() { return difyConversationId }
  function cleanupChat() { stopStream(); if (copiedResetTimer) clearTimeout(copiedResetTimer) }

  return { messages, status, copiedMessageId, handleSuggestionClick, handleSubmit, retryMessage,
    copyMessageContent, stopStream, clearMessages, loadConversation, getConversationId, cleanupChat }
}

function upsertFile(message: AgentChatMessage, file: AgentFile) {
  const existing = message.files.find(item => item.resourceId === file.resourceId)
  const normalized = { ...file, phase: file.phase === 'failed' ? 'failed' : 'available' } as AgentFile
  if (existing) Object.assign(existing, normalized)
  else message.files.push(normalized)
}

function extractPurchaseOrderDraft(tool: AgentToolCall): PurchaseOrderDraft | null {
  if (tool.phase !== 'finished') return null
  const output = parseOutput(tool.output)
  if (!output || typeof output !== 'object' || Array.isArray(output)) return null
  const envelope = output as Record<string, unknown>
  if (envelope.status !== 'SUCCESS' || envelope.nextAction !== 'CONFIRM_ACTION') return null
  const data = envelope.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const value = data as Record<string, unknown>
  if (!value.supplierCode || !Array.isArray(value.lines)) return null
  return value as unknown as PurchaseOrderDraft
}

function parseOutput(output: unknown): unknown {
  if (typeof output !== 'string') return output
  try {
    return JSON.parse(output)
  } catch {
    return null
  }
}

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `agent-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
