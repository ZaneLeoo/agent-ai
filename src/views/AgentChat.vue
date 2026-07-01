<template>
  <LoginPanel
    v-if="bootstrap.state.ready && !bootstrap.state.token"
    v-model:show-password="showPassword"
    :captcha-enabled="captchaEnabled"
    :captcha-image="captchaImage"
    :form="loginForm"
    :logging-in="loggingIn"
    :login-error="loginError"
    @refresh-captcha="refreshCaptcha"
    @submit="handleLogin"
  />

  <div v-else class="flex size-full h-screen bg-background">
    <ConversationSidebar
      v-model:mobile-open="mobileSidebarOpen"
      :active-conversation-id="activeConversationId"
      :conversation-error="conversationError"
      :conversations="conversations"
      :loading-conversations="loadingConversations"
      :user-initial="userInitial"
      :user-name="bootstrap.state.userName"
      @delete="removeConversation"
      @logout="handleLogout"
      @new="startNewConversation"
      @select="selectConversation"
    />

    <main class="relative mx-auto flex min-w-0 flex-1 flex-col p-4 md:p-6">
      <div class="mb-3 flex items-center justify-between md:hidden">
        <Button class="gap-2" variant="outline" size="sm" @click="mobileSidebarOpen = true">
          <PanelLeftIcon class="size-4" />
          会话
        </Button>
        <Button class="gap-2" variant="ghost" size="sm" @click="startNewConversation">
          <PlusIcon class="size-4" />
          新建
        </Button>
      </div>
      <Conversation class="h-full">
      <ConversationContent>
        <!-- 空状态 -->
        <ChatWelcome
          v-if="messages.length === 0"
          :tips="tips"
          @select="handleSuggestionClick"
        />

        <!-- 消息列表 -->
        <template v-for="message in messages" :key="message.id">
          <ThinkingSteps
            v-if="message.role === 'assistant' && message.steps.length"
            v-model:open="message.thinkingOpen"
            :failed="message.failed"
            :steps="message.steps"
            :stopped="message.stopped"
          />

          <AssistantMessage
            :copied="copiedMessageId === message.id"
            :message="message"
            :retry-disabled="status !== 'ready'"
            @copy="copyMessageContent"
            @retry="retryMessage"
          />
        </template>

        <Loader v-if="status === 'submitted'" class="mx-auto mt-4" />
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>

    <!-- 输入区域 -->
    <ChatComposer :status="status" @submit="handleSubmit" />

    <!-- Token 提示 -->
    <div v-if="!bootstrap.state.token" class="mt-2 text-center text-xs text-muted-foreground">
      ⚠ 未配置 token，请设置 VITE_AGENT_TOKEN 环境变量
    </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { ChatStatus } from 'ai'
import { PanelLeftIcon, PlusIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createBootstrapStore } from '@/lib/bootstrap'
import { Button } from '@/components/ui/button'
import AssistantMessage, { type AgentChatMessage } from '@/features/agent/AssistantMessage.vue'
import ChatComposer from '@/features/agent/ChatComposer.vue'
import ChatWelcome from '@/features/agent/ChatWelcome.vue'
import ConversationSidebar from '@/features/agent/ConversationSidebar.vue'
import LoginPanel from '@/features/agent/LoginPanel.vue'
import ThinkingSteps from '@/features/agent/ThinkingSteps.vue'
import { useAgentAuth } from '@/features/agent/useAgentAuth'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Loader } from '@/components/ai-elements/loader'
import {
  deleteConversation,
  listConversations,
  listMessages,
  stopChat,
  streamAgentChat,
  type ConversationItem,
  type MessageItem,
} from '@/api/agent'
import type { AgentStreamEvent } from '@/types/agent'
import {
  getArtifactsFromStreamData,
  type ArtifactItem,
} from '@/lib/artifacts'
import {
  getSourcesFromStreamData,
  type AgentSourceItem,
} from '@/lib/sources'
import { applyArtifactStep, applyNodeEvent } from '@/lib/steps'

type ChatMessage = AgentChatMessage

const bootstrap = createBootstrapStore()
const messages = ref<ChatMessage[]>([])
const status = ref<ChatStatus>('ready')
const conversations = ref<ConversationItem[]>([])
const loadingConversations = ref(false)
const loadingMessages = ref(false)
const conversationError = ref('')
const abortController = ref<AbortController | null>(null)
const activeConversationId = ref<number | undefined>()
const copiedMessageId = ref('')
const mobileSidebarOpen = ref(false)
let copiedResetTimer: ReturnType<typeof setTimeout> | undefined
const {
  loggingIn,
  loginError,
  showPassword,
  captchaEnabled,
  captchaImage,
  loginForm,
  handleLogin,
  refreshCaptcha,
  clearAuth,
} = useAgentAuth(bootstrap, { onLoginSuccess: loadConversationList })

const tips = [
  '帮我总结一下本月经营情况',
  '分析销售趋势，生成图表和明细表',
  '根据知识库，销售人员跟进客户时需要注意什么？',
]

const userInitial = computed(() => bootstrap.state.userName.slice(0, 1).toUpperCase() || '用')

function handleLogout() {
  stopStream()
  clearAuth()
  conversations.value = []
  messages.value = []
  activeConversationId.value = undefined
  conversationError.value = ''
}

function handleSuggestionClick(tip: string) {
  if (status.value !== 'ready') return
  messages.value.push(createUserMessage(tip))
  sendMessage(tip)
}

function createUserMessage(content: string): ChatMessage {
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

function createAssistantMessage(content = '', retryQuery = ''): ChatMessage {
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

async function loadConversationList() {
  if (!bootstrap.state.ready || !bootstrap.state.token) return
  loadingConversations.value = true
  conversationError.value = ''
  try {
    conversations.value = await listConversations(bootstrap.state)
  } catch (e: unknown) {
    conversationError.value = e instanceof Error ? e.message : '会话加载失败'
  } finally {
    loadingConversations.value = false
  }
}

async function loadConversation(conversationId: number) {
  if (status.value !== 'ready' || loadingMessages.value) return
  loadingMessages.value = true
  conversationError.value = ''
  try {
    const items = await listMessages(bootstrap.state, conversationId)
    activeConversationId.value = conversationId
    messages.value = items.map(toChatMessage)
  } catch (e: unknown) {
    conversationError.value = e instanceof Error ? e.message : '消息加载失败'
  } finally {
    loadingMessages.value = false
  }
}

async function selectConversation(conversationId: number) {
  await loadConversation(conversationId)
  mobileSidebarOpen.value = false
}

function startNewConversation() {
  if (status.value !== 'ready') return
  activeConversationId.value = undefined
  messages.value = []
  mobileSidebarOpen.value = false
}

async function removeConversation(conversationId: number) {
  if (status.value !== 'ready') return
  conversationError.value = ''
  try {
    await deleteConversation(bootstrap.state, conversationId)
    conversations.value = conversations.value.filter(item => item.id !== conversationId)
    if (activeConversationId.value === conversationId) startNewConversation()
  } catch (e: unknown) {
    conversationError.value = e instanceof Error ? e.message : '删除会话失败'
  }
}

function toChatMessage(item: MessageItem): ChatMessage {
  const msg: ChatMessage = {
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

async function handleSubmit(event: { text: string }) {
  if (status.value === 'streaming') { stopStream(); return }
  if (status.value !== 'ready') return
  const text = event.text?.trim()
  if (!text) return

  messages.value.push(createUserMessage(text))

  await sendMessage(text)
}

async function retryMessage(message: ChatMessage) {
  if (status.value !== 'ready' || !message.retryQuery) return
  messages.value.push(createUserMessage(message.retryQuery))
  await sendMessage(message.retryQuery)
}

async function copyMessageContent(message: ChatMessage) {
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
      { conversationId: activeConversationId.value, query: text, inputs: {} },
      (event) => handleStreamEvent(idx, event),
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
    loadConversationList()
  }
}

function handleStreamEvent(idx: number, event: AgentStreamEvent) {
  const msg = messages.value[idx]
  if (!msg) return

  // 首个事件到达，切换为流式状态
  if (status.value === 'submitted') status.value = 'streaming'

  const { event: type, data } = event

  switch (type) {
    case 'conversation': {
      if (data.conversationId) activeConversationId.value = data.conversationId
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
        // 全部完成后自动折叠
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
      // 标记全部步骤完成
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

function completeActiveSteps(msg: ChatMessage) {
  for (const step of msg.steps) {
    if (step.status === 'active') step.status = 'complete'
  }
}

function appendArtifacts(msg: ChatMessage, artifacts: ArtifactItem[]) {
  for (const artifact of artifacts) {
    msg.artifacts.push(artifact)
    applyArtifactStep(msg.steps, artifact)
  }
}

function appendSources(msg: ChatMessage, sources: AgentSourceItem[]) {
  const existing = new Set(msg.sources.map(source => source.id))
  for (const source of sources) {
    if (!existing.has(source.id)) {
      msg.sources.push(source)
      existing.add(source.id)
    }
  }
}

function stopStream() {
  abortController.value?.abort()
  const conversationId = activeConversationId.value
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

onBeforeUnmount(() => {
  if (copiedResetTimer) clearTimeout(copiedResetTimer)
})

function findLastAssistantIndex(): number {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].role === 'assistant') return i
  }
  return -1
}

onMounted(() => {
  bootstrap.start()
  loadConversationList()
  if (!bootstrap.state.token) refreshCaptcha()
})
watch(() => bootstrap.state.ready, (ready) => {
  if (ready) loadConversationList()
})
watch(() => bootstrap.state.token, (token) => {
  if (!token) refreshCaptcha()
})
onBeforeUnmount(() => { stopStream(); bootstrap.stop() })
</script>
