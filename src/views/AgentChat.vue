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
import { PanelLeftIcon, PlusIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createBootstrapStore } from '@/lib/bootstrap'
import { Button } from '@/components/ui/button'
import AssistantMessage from '@/features/agent/AssistantMessage.vue'
import ChatComposer from '@/features/agent/ChatComposer.vue'
import ChatWelcome from '@/features/agent/ChatWelcome.vue'
import ConversationSidebar from '@/features/agent/ConversationSidebar.vue'
import LoginPanel from '@/features/agent/LoginPanel.vue'
import ThinkingSteps from '@/features/agent/ThinkingSteps.vue'
import { useAgentAuth } from '@/features/agent/useAgentAuth'
import { useAgentChat } from '@/features/agent/useAgentChat'
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
  type ConversationItem,
} from '@/api/agent'

const bootstrap = createBootstrapStore()
const conversations = ref<ConversationItem[]>([])
const loadingConversations = ref(false)
const loadingMessages = ref(false)
const conversationError = ref('')
const activeConversationId = ref<number | undefined>()
const mobileSidebarOpen = ref(false)
const {
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
} = useAgentChat(bootstrap, {
  activeConversationId,
  onConversationListChanged: loadConversationList,
})
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
  clearMessages()
  activeConversationId.value = undefined
  conversationError.value = ''
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
  clearMessages()
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
onBeforeUnmount(() => { cleanupChat(); bootstrap.stop() })
</script>
