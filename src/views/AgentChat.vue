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
    <main class="relative mx-auto flex min-w-0 flex-1 flex-col p-4 md:p-6">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-sm font-medium text-muted-foreground">{{ bootstrap.state.userName || '智能助手' }}</div>
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
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createBootstrapStore } from '@/lib/bootstrap'
import { Button } from '@/components/ui/button'
import AssistantMessage from '@/features/agent/AssistantMessage.vue'
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
  cleanupChat,
} = useAgentChat(bootstrap)
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

function startNewConversation() {
  stopStream()
  clearMessages()
}

function handleLogout() {
  stopStream()
  clearAuth()
  clearMessages()
}

onMounted(() => {
  bootstrap.start()
  if (!bootstrap.state.token) refreshCaptcha()
})
watch(() => bootstrap.state.ready, (ready) => {
  if (ready && !bootstrap.state.token) refreshCaptcha()
})
watch(() => bootstrap.state.token, (token) => {
  if (!token) refreshCaptcha()
})
onBeforeUnmount(() => { cleanupChat(); bootstrap.stop() })
</script>
