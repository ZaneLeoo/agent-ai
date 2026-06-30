<template>
  <div
    v-if="bootstrap.state.ready && !bootstrap.state.token"
    class="flex size-full h-screen items-center justify-center bg-background px-6 py-10"
  >
    <div class="flex w-full max-w-[380px] flex-col items-center">
      <div class="mb-10 flex flex-col items-center gap-5">
        <div class="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <SparklesIcon class="size-6" />
        </div>
        <div class="space-y-2 text-center">
          <h1 class="text-3xl font-semibold tracking-normal text-foreground">登录</h1>
          <p class="text-sm text-muted-foreground">继续使用企业智能体</p>
        </div>
      </div>

      <form class="w-full space-y-4" @submit.prevent="handleLogin">
        <div class="space-y-3">
          <Input
            v-model="loginForm.username"
            class="login-input h-12 rounded-xl bg-background px-4 text-base"
            autocomplete="username"
            placeholder="用户名"
          />
          <div class="relative">
            <Input
              v-model="loginForm.password"
              class="login-input h-12 rounded-xl bg-background px-4 pr-12 text-base"
              autocomplete="current-password"
              placeholder="密码"
              :type="showPassword ? 'text' : 'password'"
            />
            <button
              class="absolute right-3 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              type="button"
              title="切换密码可见性"
              @click="showPassword = !showPassword"
            >
              <EyeOffIcon v-if="showPassword" class="size-4" />
              <EyeIcon v-else class="size-4" />
            </button>
          </div>
          <div v-if="captchaEnabled" class="flex gap-2">
            <Input
              v-model="loginForm.code"
              class="login-input h-11 rounded-xl bg-background px-4 text-sm"
              placeholder="验证码"
            />
            <button
              class="h-11 w-28 overflow-hidden rounded-xl border bg-muted text-xs text-muted-foreground"
              type="button"
              title="刷新验证码"
              @click="refreshCaptcha"
            >
              <img
                v-if="captchaImage"
                :src="captchaImage"
                alt="验证码"
                class="size-full object-cover"
              >
              <span v-else>刷新</span>
            </button>
          </div>
          <div v-if="loginError" class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {{ loginError }}
          </div>
        </div>
        <Button class="h-12 w-full rounded-xl text-base font-medium shadow-sm" type="submit" :disabled="loggingIn">
          {{ loggingIn ? '登录中...' : '登录' }}
        </Button>
      </form>
      <p class="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
        使用 RuoYi 账号访问你的会话、图表和知识库来源。
      </p>
    </div>
  </div>

  <div v-else class="flex size-full h-screen bg-background">
    <aside class="hidden w-72 shrink-0 border-r bg-muted/20 p-3 md:flex md:flex-col">
      <div class="mb-3 flex items-center justify-between gap-2">
        <div class="text-sm font-semibold">企业智能体</div>
        <button
          class="inline-flex size-8 items-center justify-center rounded-md border bg-background transition-colors hover:bg-accent"
          title="新建会话"
          @click="startNewConversation"
        >
          <PlusIcon class="size-4" />
        </button>
      </div>

      <div v-if="conversationError" class="mb-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        {{ conversationError }}
      </div>

      <div class="min-h-0 flex-1 space-y-1 overflow-y-auto">
        <div
          v-for="conversation in conversations"
          :key="conversation.id"
          class="group flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
          :class="conversation.id === activeConversationId ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'"
          role="button"
          tabindex="0"
          @click="loadConversation(conversation.id)"
          @keydown.enter="loadConversation(conversation.id)"
        >
          <MessageSquareIcon class="size-4 shrink-0" />
          <span class="min-w-0 flex-1 truncate">{{ conversation.title || '新会话' }}</span>
          <button
            class="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:bg-background hover:text-destructive group-hover:opacity-100"
            title="删除会话"
            @click.stop="removeConversation(conversation.id)"
          >
            <Trash2Icon class="size-3.5" />
          </button>
        </div>

        <div v-if="!conversations.length && !loadingConversations" class="px-3 py-8 text-center text-xs text-muted-foreground">
          暂无会话
        </div>
      </div>

      <div class="mt-3 border-t pt-3">
        <div class="flex items-center gap-2 rounded-md px-2 py-2">
          <Avatar class="size-8">
            <AvatarFallback>{{ userInitial }}</AvatarFallback>
          </Avatar>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">{{ bootstrap.state.userName }}</div>
            <div class="text-xs text-muted-foreground">已登录</div>
          </div>
          <Button variant="ghost" size="sm" class="px-2" @click="handleLogout">
            退出
          </Button>
        </div>
      </div>
    </aside>

    <main class="relative mx-auto flex min-w-0 flex-1 flex-col p-6">
      <Conversation class="h-full">
      <ConversationContent>
        <!-- 空状态 -->
        <div
          v-if="messages.length === 0"
          class="flex min-h-full flex-col items-center justify-center gap-6 p-8 text-center"
        >
          <SparklesIcon class="size-8 text-muted-foreground" />
          <div class="space-y-1">
            <h3 class="text-lg font-semibold">今天想分析什么？</h3>
            <p class="text-sm text-muted-foreground">可以提问业务问题、分析经营数据，或直接生成可视化图表。</p>
          </div>
          <div class="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              v-for="tip in tips"
              :key="tip"
              class="group flex flex-col items-start gap-2 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-accent"
              @click="handleSuggestionClick(tip)"
            >
              <span class="text-sm leading-relaxed">{{ tip }}</span>
              <span class="text-xs text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <template v-for="(message, msgIdx) in messages" :key="message.id">
          <ChainOfThought
            v-if="message.role === 'assistant' && message.steps.length"
            v-model="message.thinkingOpen"
            class="mb-3"
          >
            <ChainOfThoughtHeader>
              <template v-if="isThinking(msgIdx)">
                <Shimmer :duration="1.5">处理中...</Shimmer>
              </template>
              <template v-else-if="message.stopped">
                <span class="text-destructive">已取消</span>
              </template>
              <template v-else>
                <span>处理完成 · {{ doneCount(message) }}/{{ message.steps.length }} 步</span>
              </template>
            </ChainOfThoughtHeader>
            <ChainOfThoughtContent>
              <ChainOfThoughtStep
                v-for="step in message.steps"
                :key="step.id"
                :label="step.label"
                :description="step.description"
                :status="step.status"
              />
            </ChainOfThoughtContent>
          </ChainOfThought>

          <Message
            :from="message.role"
            :class="message.role === 'assistant' ? 'w-full max-w-none' : undefined"
          >
            <MessageContent
              :class="message.role === 'assistant' ? 'w-full max-w-full gap-3 overflow-visible' : 'min-w-0'"
            >
              <MessageResponse
                v-if="message.content"
                :content="message.content"
                class="h-auto min-h-0 w-full"
              />
              <div
                v-if="message.stopped"
                class="mt-2 flex items-center gap-1.5 text-xs text-destructive"
              >
                <span class="block size-1.5 rounded-full bg-destructive" />
                已停止生成
              </div>
              <div
                v-if="message.error"
                class="mt-2 text-xs text-destructive"
              >
                {{ message.error }}
              </div>
              <Sources
                v-if="message.sources.length"
                class="mt-4 w-full text-muted-foreground"
              >
                <SourcesTrigger
                  :count="message.sources.length"
                  class="group inline-flex w-fit rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/60"
                >
                  <BookOpenIcon class="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  <span class="font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-4 group-hover:text-primary group-hover:decoration-primary">
                    参考来源 {{ message.sources.length }}
                  </span>
                  <span class="text-xs text-muted-foreground">知识库召回</span>
                  <ChevronDownIcon class="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </SourcesTrigger>
                <SourcesContent class="w-full max-w-full">
                  <Source
                    v-for="source in message.sources.slice(0, 3)"
                    :key="source.id"
                    :href="`#${source.id}`"
                    :title="source.title"
                    class="block rounded-md border bg-background p-3 text-left no-underline transition-colors hover:bg-accent/40"
                    @click.prevent
                  >
                    <div class="flex flex-wrap items-center gap-2 text-sm">
                      <span class="font-medium text-foreground">{{ source.title }}</span>
                      <span v-if="formatSourceScore(source.score)" class="text-xs text-muted-foreground">
                        相关度 {{ formatSourceScore(source.score) }}
                      </span>
                    </div>
                    <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {{ source.content }}
                    </p>
                  </Source>
                  <div
                    v-if="message.sources.length > 3"
                    class="text-xs text-muted-foreground"
                  >
                    还有 {{ message.sources.length - 3 }} 条来源暂未展开展示
                  </div>
                </SourcesContent>
              </Sources>
              <!-- 产物展示 -->
              <Artifact
                v-for="(artifact, aIdx) in message.artifacts"
                :key="`${message.id}-artifact-${aIdx}`"
                class="mt-1 w-full max-w-full"
              >
                <ArtifactHeader>
                  <ArtifactTitle>{{ artifact.title }}</ArtifactTitle>
                </ArtifactHeader>
                <ArtifactContent class="p-4">
                  <div
                    v-if="artifact.type === 'chart'"
                    :ref="(el) => setChartRef(message.id, aIdx, el as HTMLElement)"
                    class="h-[300px] min-h-[280px] w-full"
                  />
                  <div v-else-if="artifact.type === 'table'" class="overflow-x-auto p-4">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="border-b">
                          <th
                            v-for="col in normalizeTablePayload(artifact.payload).columns"
                            :key="col"
                            class="px-3 py-2 text-left font-medium text-muted-foreground"
                          >
                            {{ col }}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(row, rIdx) in normalizeTablePayload(artifact.payload).rows"
                          :key="rIdx"
                          class="border-b last:border-0"
                        >
                          <td
                            v-for="col in normalizeTablePayload(artifact.payload).columns"
                            :key="col"
                            class="px-3 py-2"
                          >
                            {{ row[col] }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <pre v-else class="p-4 text-xs text-muted-foreground">{{ JSON.stringify(artifact.payload, null, 2) }}</pre>
                </ArtifactContent>
              </Artifact>
            </MessageContent>
          </Message>
        </template>

        <Loader v-if="status === 'submitted'" class="mx-auto mt-4" />
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>

    <!-- 输入区域 -->
    <PromptInput class="mt-4 w-full" @submit="handleSubmit">
      <PromptInputBody>
        <PromptInputTextarea
          placeholder="输入你的问题... (Enter 发送)"
          :disabled="status !== 'ready'"
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputSubmit :status="status" />
      </PromptInputFooter>
    </PromptInput>

    <!-- Token 提示 -->
    <div v-if="!bootstrap.state.token" class="mt-2 text-center text-xs text-muted-foreground">
      ⚠ 未配置 token，请设置 VITE_AGENT_TOKEN 环境变量
    </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { ChatStatus } from 'ai'
import * as echarts from 'echarts'
import { BookOpenIcon, ChevronDownIcon, EyeIcon, EyeOffIcon, MessageSquareIcon, PlusIcon, SparklesIcon, Trash2Icon } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { createBootstrapStore } from '@/lib/bootstrap'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thought'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input'
import { Artifact, ArtifactContent, ArtifactHeader, ArtifactTitle } from '@/components/ai-elements/artifact'
import { Loader } from '@/components/ai-elements/loader'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { Source, Sources, SourcesContent, SourcesTrigger } from '@/components/ai-elements/sources'
import {
  deleteConversation,
  listConversations,
  listMessages,
  stopChat,
  streamAgentChat,
  type ConversationItem,
  type MessageItem,
} from '@/api/agent'
import { getCaptcha, getUserInfo, login } from '@/api/auth'
import {
  getArtifactsFromStreamData,
  normalizeTablePayload,
  type ArtifactItem,
} from '@/lib/artifacts'
import {
  formatSourceScore,
  getSourcesFromStreamData,
  type AgentSourceItem,
} from '@/lib/sources'
import { applyArtifactStep, applyNodeEvent, type ThinkingStep } from '@/lib/steps'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming: boolean
  steps: ThinkingStep[]
  thinkingOpen: boolean
  stopped: boolean
  error: string
  artifacts: ArtifactItem[]
  sources: AgentSourceItem[]
}

const bootstrap = createBootstrapStore()
const messages = ref<ChatMessage[]>([])
const status = ref<ChatStatus>('ready')
const conversations = ref<ConversationItem[]>([])
const loadingConversations = ref(false)
const loadingMessages = ref(false)
const conversationError = ref('')
const loggingIn = ref(false)
const loginError = ref('')
const showPassword = ref(false)
const captchaEnabled = ref(false)
const captchaImage = ref('')
const loginForm = reactive({
  username: '',
  password: '',
  code: '',
  uuid: '',
})

const abortController = ref<AbortController | null>(null)
const activeConversationId = ref<number | undefined>()

const tips = [
  '帮我总结一下本月经营情况',
  '分析销售趋势，生成图表和明细表',
  '根据知识库，销售人员跟进客户时需要注意什么？',
]

const userInitial = computed(() => bootstrap.state.userName.slice(0, 1).toUpperCase() || '用')

function isThinking(msgIdx: number): boolean {
  const msg = messages.value[msgIdx]
  if (!msg || msg.role !== 'assistant') return false
  return msg.steps.some(s => s.status === 'active')
}

function doneCount(msg: ChatMessage): number {
  return msg.steps.filter(s => s.status === 'complete').length
}

async function handleLogin() {
  if (loggingIn.value) return
  loginError.value = ''
  const username = loginForm.username.trim()
  const password = loginForm.password
  if (!username || !password) {
    loginError.value = '请输入用户名和密码'
    return
  }

  loggingIn.value = true
  try {
    const result = await login(bootstrap.state.baseApi, {
      username,
      password,
      code: captchaEnabled.value ? loginForm.code.trim() : undefined,
      uuid: captchaEnabled.value ? loginForm.uuid : undefined,
    })
    const user = await getUserInfo(bootstrap.state.baseApi, result.token).catch(() => ({ nickName: '', userName: '' }))
    bootstrap.setAuth(result.token, user.nickName || user.userName || username)
    loginForm.password = ''
    loginForm.code = ''
    await loadConversationList()
  } catch (e: unknown) {
    loginError.value = e instanceof Error ? e.message : '登录失败'
    if (captchaEnabled.value) refreshCaptcha()
  } finally {
    loggingIn.value = false
  }
}

async function refreshCaptcha() {
  try {
    const captcha = await getCaptcha(bootstrap.state.baseApi)
    captchaEnabled.value = captcha.captchaEnabled
    loginForm.uuid = captcha.uuid || ''
    captchaImage.value = captcha.img ? `data:image/jpeg;base64,${captcha.img}` : ''
    if (!captcha.captchaEnabled) {
      loginForm.code = ''
    }
  } catch {
    captchaEnabled.value = false
    captchaImage.value = ''
    loginForm.uuid = ''
  }
}

function handleLogout() {
  stopStream()
  bootstrap.clearAuth()
  conversations.value = []
  messages.value = []
  activeConversationId.value = undefined
  conversationError.value = ''
  disposeCharts()
  refreshCaptcha()
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
    error: '',
    artifacts: [],
    sources: [],
  }
}

function createAssistantMessage(content = ''): ChatMessage {
  return {
    id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role: 'assistant',
    content,
    streaming: false,
    steps: [],
    thinkingOpen: false,
    stopped: false,
    error: '',
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
    await nextTick()
    renderAllCharts()
  } catch (e: unknown) {
    conversationError.value = e instanceof Error ? e.message : '消息加载失败'
  } finally {
    loadingMessages.value = false
  }
}

function startNewConversation() {
  if (status.value !== 'ready') return
  activeConversationId.value = undefined
  messages.value = []
  disposeCharts()
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
    error: '',
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

async function sendMessage(text: string) {
  const assistant = createAssistantMessage()
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
  } finally {
    messages.value[idx].streaming = false
    status.value = 'ready'
    abortController.value = null
    loadConversationList()
  }
}

function handleStreamEvent(idx: number, event: { event: string; data: unknown }) {
  const msg = messages.value[idx]
  if (!msg) return

  // 首个事件到达，切换为流式状态
  if (status.value === 'submitted') status.value = 'streaming'

  const { event: type, data } = event

  switch (type) {
    case 'conversation': {
      const d = data as { conversationId?: number }
      if (d.conversationId) activeConversationId.value = d.conversationId
      appendArtifacts(msg, getArtifactsFromStreamData(data))
      appendSources(msg, getSourcesFromStreamData(data))
      break
    }
    case 'message': {
      const d = data as { content?: string }
      if (d.content) msg.content += d.content
      break
    }
    case 'message_replace': {
      const d = data as { content?: string }
      if (d.content) msg.content = d.content
      break
    }
    case 'node': {
      applyNodeEvent(msg.steps, data as Parameters<typeof applyNodeEvent>[1])
      break
    }
    case 'workflow': {
      const d = data as { event?: string; status?: string }
      if (d.event === 'workflow_finished') {
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
      const d = data as { message?: string }
      msg.error = d.message || '服务端错误'
      msg.streaming = false
      msg.stopped = true
      status.value = 'ready'
      break
    }
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

// ---- 图表渲染 ----
const chartRefs = new Map<string, HTMLElement>()
const chartInstances = new Map<string, echarts.ECharts>()

function chartKey(msgId: string, aIdx: number) { return `${msgId}::${aIdx}` }

function setChartRef(msgId: string, aIdx: number, el: unknown) {
  if (!(el instanceof HTMLElement)) return
  const key = chartKey(msgId, aIdx)
  chartRefs.set(key, el)
  if (!chartInstances.has(key)) {
    nextTick(() => renderChart(key))
  }
}

function renderChart(key: string) {
  const el = chartRefs.get(key)
  if (!el) return

  const [msgId, aIdxStr] = key.split('::')
  const msg = messages.value.find(m => m.id === msgId)
  const artifact = msg?.artifacts[Number(aIdxStr)]
  if (!artifact || artifact.type !== 'chart') return

  const payload = artifact.payload as {
    chartType?: string
    categories?: string[]
    series?: Array<{ name: string; data: number[] }>
  }

  let instance = chartInstances.get(key)
  if (!instance) {
    instance = echarts.init(el)
    chartInstances.set(key, instance)
  }

  const chartType = payload.chartType || 'bar'
  const categories = payload.categories || []
  instance.setOption({
    color: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
    tooltip: { trigger: chartType === 'pie' ? 'item' : 'axis' },
    grid: { left: '3%', right: '3%', top: '10%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { show: false },
      axisLabel: { interval: 0 },
    },
    yAxis: {
      type: 'value',
      min: chartType === 'bar' ? 0 : undefined,
      splitLine: { lineStyle: { type: 'dashed' } },
    },
    series: (payload.series || []).map(s => ({
      name: s.name, type: chartType, data: s.data,
      ...(chartType === 'bar' ? { barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } } : {}),
      ...(chartType === 'line' ? { smooth: true, showSymbol: false, lineStyle: { width: 3 } } : {}),
    })),
  }, true)
  requestAnimationFrame(() => instance?.resize())
}

function renderAllCharts() {
  for (const key of chartRefs.keys()) renderChart(key)
}

function disposeCharts() {
  for (const instance of chartInstances.values()) instance.dispose()
  chartInstances.clear()
  chartRefs.clear()
}

// 只追踪 artifact 数量变化触发渲染
watch(() => messages.value.reduce((c, m) => c + m.artifacts.length, 0), () => {
  nextTick(() => {
    for (const key of chartRefs.keys()) {
      if (!chartInstances.has(key)) renderChart(key)
    }
  })
})

// 窗口 resize
window.addEventListener('resize', () => {
  for (const instance of chartInstances.values()) instance.resize()
})

onBeforeUnmount(() => {
  disposeCharts()
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

<style scoped>
.login-input:-webkit-autofill,
.login-input:-webkit-autofill:hover,
.login-input:-webkit-autofill:focus,
.login-input:-webkit-autofill:active {
  -webkit-text-fill-color: var(--foreground);
  box-shadow: 0 0 0 1000px var(--background) inset;
  caret-color: var(--foreground);
  transition: background-color 9999s ease-out;
}
</style>
