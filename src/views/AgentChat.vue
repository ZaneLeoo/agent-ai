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
    <aside class="hidden w-64 shrink-0 flex-col border-r bg-muted/20 p-3 md:flex">
      <div class="mb-3 flex items-center justify-between px-2">
        <span class="font-semibold">智能助手</span>
        <Button class="size-8" variant="ghost" size="icon" title="新建对话" @click="startNewConversation">
          <PlusIcon class="size-4" />
        </Button>
      </div>
      <Button class="mb-3 w-full justify-start gap-2" variant="outline" @click="startNewConversation">
        <PlusIcon class="size-4" /> 新建对话
      </Button>
      <div class="min-h-0 flex-1 space-y-1 overflow-y-auto">
        <Button
          v-for="item in history"
          :key="item.id"
          class="h-auto w-full justify-start truncate px-3 py-2 text-left text-sm font-normal"
          :class="item.id === activeHistoryId ? 'bg-accent font-medium' : 'text-muted-foreground'"
          variant="ghost"
          type="button"
          @click="openHistory(item)"
        >
          {{ item.title }}
        </Button>
        <p v-if="history.length === 0" class="px-3 py-4 text-xs text-muted-foreground">暂无历史对话</p>
      </div>
      <div class="mt-3 border-t pt-3">
        <div class="flex items-center gap-2 px-2 py-2">
          <div class="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {{ userInitial }}
          </div>
          <div class="min-w-0 flex-1 truncate text-sm">{{ bootstrap.state.userName }}</div>
          <Button variant="ghost" size="sm" class="px-2" @click="handleLogout">退出</Button>
        </div>
      </div>
    </aside>
    <main class="relative mx-auto flex min-w-0 flex-1 flex-col p-4 md:p-6">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-sm font-medium text-muted-foreground">{{ activeTitle || '新对话' }}</div>
        <Button class="gap-2" variant="ghost" size="sm" @click="startNewConversation">
          <PlusIcon class="size-4" />
          新建对话
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
import { PlusIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createBootstrapStore } from '@/lib/bootstrap'
import { Button } from '@/components/ui/button'
import AssistantMessage from '@/features/agent/AssistantMessage.vue'
import type { AgentChatMessage } from '@/features/agent/AssistantMessage.vue'
import ChatComposer from '@/features/agent/ChatComposer.vue'
import ChatWelcome from '@/features/agent/ChatWelcome.vue'
import LoginPanel from '@/features/agent/LoginPanel.vue'
import { useAgentAuth } from '@/features/agent/useAgentAuth'
import { useAgentChat } from '@/features/agent/useAgentChat'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Loader } from '@/components/ai-elements/loader'

const bootstrap = createBootstrapStore()
const {
  messages,
  status,
  copiedMessageId,
  handleSuggestionClick,
  handleSubmit,
  retryMessage,
  copyMessageContent,
  stopStream,
  clearMessages,
  loadConversation,
  getConversationId,
  cleanupChat,
} = useAgentChat(bootstrap, { onAuthExpired: handleAuthExpired })
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
} = useAgentAuth(bootstrap)

const tips = [
  '帮我总结一下本月经营情况',
  '分析销售趋势，生成图表和明细表',
  '根据知识库，销售人员跟进客户时需要注意什么？',
]

interface ConversationHistory {
  id: string
  title: string
  conversationId?: string
  messages: AgentChatMessage[]
  updatedAt: number
}

const history = ref<ConversationHistory[]>([])
const activeHistoryId = ref('')
const historyStorageKey = computed(() => `agent-ui:history:${bootstrap.state.userName || 'anonymous'}`)
const activeTitle = computed(() => history.value.find(item => item.id === activeHistoryId.value)?.title || '')
const userInitial = computed(() => (bootstrap.state.userName || '用').slice(0, 1).toUpperCase())

function loadHistory() {
  try { history.value = JSON.parse(localStorage.getItem(historyStorageKey.value) || '[]') } catch { history.value = [] }
}
function persistHistory() {
  if (!messages.value.length) return
  const firstUser = messages.value.find(message => message.role === 'user')
  const title = firstUser?.content?.slice(0, 32) || '新对话'
  const item: ConversationHistory = {
    id: activeHistoryId.value || `${Date.now()}`,
    title,
    conversationId: getConversationId(),
    messages: JSON.parse(JSON.stringify(messages.value)),
    updatedAt: Date.now(),
  }
  activeHistoryId.value = item.id
  history.value = [item, ...history.value.filter(entry => entry.id !== item.id)].slice(0, 50)
  localStorage.setItem(historyStorageKey.value, JSON.stringify(history.value))
}
function openHistory(item: ConversationHistory) {
  loadConversation(item.messages, item.conversationId)
  activeHistoryId.value = item.id
}
function handleAuthExpired() {
  stopStream()
  clearAuth()
  clearMessages()
  activeHistoryId.value = ''
}

function startNewConversation() {
  stopStream()
  clearMessages()
  activeHistoryId.value = ''
}

function handleLogout() {
  stopStream()
  clearAuth()
  clearMessages()
}

onMounted(() => {
  bootstrap.start()
  loadHistory()
  if (!bootstrap.state.token) refreshCaptcha()
})
watch(() => bootstrap.state.ready, (ready) => {
  if (ready && !bootstrap.state.token) refreshCaptcha()
})
watch(() => bootstrap.state.token, (token) => {
  if (!token) refreshCaptcha()
})
watch(messages, () => persistHistory(), { deep: true })
watch(historyStorageKey, () => loadHistory())
onBeforeUnmount(() => { cleanupChat(); bootstrap.stop() })
</script>
