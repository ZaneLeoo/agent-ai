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

  <div v-else class="agent-shell flex size-full h-screen overflow-hidden bg-background">
    <aside class="agent-sidebar hidden w-[276px] shrink-0 flex-col border-r md:flex">
      <div class="flex items-center gap-3 px-5 pb-5 pt-6">
        <div class="agent-logo flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <SparklesIcon class="size-5" />
        </div>
        <div>
          <div class="text-[17px] font-bold tracking-tight">智能助手</div>
          <div class="text-[11px] text-muted-foreground">企业 AI 工作台</div>
        </div>
      </div>
      <div class="px-4">
        <Button class="agent-new-chat mb-4 h-11 w-full justify-center gap-2 rounded-xl border-0 text-white shadow-sm" @click="startNewConversation">
          <PlusIcon class="size-4" /> 新建对话
        </Button>
        <div class="agent-search mb-4 flex h-10 items-center gap-2 rounded-xl border bg-muted/40 px-3 text-sm text-muted-foreground focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
          <SearchIcon class="size-4 shrink-0 opacity-70" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索对话"
            class="h-full flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
          <SlidersHorizontalIcon class="ml-auto size-3.5 opacity-60" />
        </div>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto px-3">
        <div v-for="group in historyGroups" :key="group.label" class="mb-5">
          <div class="px-2 pb-2 text-xs font-medium text-muted-foreground">{{ group.label }}</div>
          <div
            v-for="item in group.items"
            :key="item.id"
            class="agent-history-item group flex w-full items-center gap-1 rounded-lg px-1 py-1 text-left text-sm transition-colors"
            :class="item.id === activeHistoryId ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'"
          >
            <button
              type="button"
              class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none"
              :aria-current="item.id === activeHistoryId ? 'page' : undefined"
              @click="openHistory(item)"
            >
              <MessageSquareIcon class="size-4 shrink-0 opacity-80" />
              <span class="min-w-0 flex-1 truncate">{{ item.title }}</span>
              <span class="text-[11px] text-muted-foreground/70 group-hover:text-primary/70">{{ formatHistoryTime(item.updatedAt) }}</span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              class="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              title="删除对话"
              @click="deleteHistory(item)"
            >
              <Trash2Icon class="size-3.5" />
            </Button>
          </div>
        </div>
        <p v-if="history.length === 0" class="px-3 py-4 text-xs text-muted-foreground">暂无历史对话</p>
      </div>
      <div class="border-t p-4">
        <div class="flex items-center gap-3 rounded-xl px-2 py-2">
          <div class="agent-avatar flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-bold shadow-sm">{{ userInitial }}</div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">{{ bootstrap.state.userName }}</div>
            <div class="text-[11px] text-muted-foreground">在线使用中</div>
          </div>
          <Button variant="ghost" size="icon" class="size-8 text-muted-foreground hover:text-foreground" title="系统设置">
            <SettingsIcon class="size-4" />
          </Button>
          <Button variant="ghost" size="icon" class="size-8 text-muted-foreground hover:text-foreground" title="退出登录" @click="handleLogout">
            <LogOutIcon class="size-4" />
          </Button>
        </div>
      </div>
    </aside>
    <main class="relative mx-auto flex min-w-0 flex-1 flex-col">
      <header class="agent-header flex h-[68px] shrink-0 items-center justify-between border-b px-5 md:px-8">
        <div class="min-w-0"><h1 class="truncate text-base font-semibold">{{ activeTitle || '新对话' }}</h1><div class="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><span class="size-1.5 rounded-full bg-emerald-500" />Agent 已就绪</div></div>
        <div class="flex items-center gap-1"><Button variant="ghost" size="icon" class="size-9 text-muted-foreground" title="收藏"><BookmarkIcon class="size-4" /></Button><Button variant="ghost" size="icon" class="size-9 text-muted-foreground" title="分享"><Share2Icon class="size-4" /></Button><Button variant="ghost" size="icon" class="size-9 text-muted-foreground" title="新建对话" @click="startNewConversation"><PlusIcon class="size-4" /></Button></div>
      </header>
      <div class="flex min-h-0 flex-1 flex-col px-4 md:px-8 pb-4 md:pb-6">
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
            @confirm-purchase-order="openPurchaseOrderConfirmation"
          />
        </template>

        <Loader v-if="status === 'submitted'" class="mx-auto mt-4" />
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>

    <!-- 输入区域 -->
    <ChatComposer :status="status" @submit="handleSubmit" />
    </div>

    <PurchaseOrderConfirmDialog
      v-if="selectedPurchaseOrderDraft"
      v-model:open="purchaseOrderDialogOpen"
      :item="selectedPurchaseOrderDraft"
      :bootstrap="bootstrap.state"
      @created="handlePurchaseOrderCreated"
    />

    <Dialog :open="deleteDialogOpen" @update:open="deleteDialogOpen = $event">
      <DialogContent class="max-w-md" :show-close-button="false">
        <DialogHeader>
          <div class="mb-1 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangleIcon class="size-5" />
          </div>
          <DialogTitle>删除这条对话？</DialogTitle>
          <DialogDescription>
            删除后将无法恢复。{{ deleteTarget ? `“${deleteTarget.title}”` : '这条对话' }}中的历史消息也会从当前浏览器中移除。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="deleteDialogOpen = false">取消</Button>
          <Button variant="destructive" @click="confirmDeleteHistory">删除对话</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Token 提示 -->
    <div v-if="!bootstrap.state.token" class="mt-2 text-center text-xs text-muted-foreground">
      ⚠ 未配置 token，请设置 VITE_AGENT_TOKEN 环境变量
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangleIcon, BookmarkIcon, ChevronRightIcon, LogOutIcon, MessageSquareIcon, PlusIcon, SearchIcon, Share2Icon, SlidersHorizontalIcon, SparklesIcon, SettingsIcon, Trash2Icon } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createBootstrapStore } from '@/lib/bootstrap'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import AssistantMessage from '@/features/agent/AssistantMessage.vue'
import type { AgentChatMessage } from '@/features/agent/AssistantMessage.vue'
import PurchaseOrderConfirmDialog from '@/features/agent/PurchaseOrderConfirmDialog.vue'
import type { AgentPurchaseOrderDraft, CreatePurchaseOrderDraftResult } from '@/types/automation'
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
  '完成灯杆组件（lamppost）装配工序的步骤和注意事项',
  '查询智能护眼台灯（smart-desk-lamp）的当前库存',
  '向 SUP001（深圳鸿发电子科技有限公司）采购 10 套灯杆组件',
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
const searchQuery = ref('')
const purchaseOrderDialogOpen = ref(false)
const selectedPurchaseOrderDraft = ref<AgentPurchaseOrderDraft | null>(null)
const deleteDialogOpen = ref(false)
const deleteTarget = ref<ConversationHistory | null>(null)
let skipNextHistoryPersist = false
const historyStorageKey = computed(() => `agent-ui:history:${bootstrap.state.userName || 'anonymous'}`)
const activeTitle = computed(() => history.value.find(item => item.id === activeHistoryId.value)?.title || '')
const userInitial = computed(() => (bootstrap.state.userName || '用').slice(0, 1).toUpperCase())
const historyGroups = computed(() => {
  const now = Date.now()
  const query = searchQuery.value.trim().toLowerCase()
  const filtered = history.value.filter(item => !query || item.title.toLowerCase().includes(query))
  const groups = [{ label: '今天', items: [] as ConversationHistory[] }, { label: '更早', items: [] as ConversationHistory[] }]
  filtered.forEach(item => (now - item.updatedAt < 86400000 ? groups[0].items : groups[1].items).push(item))
  return groups.filter(group => group.items.length)
})

function formatHistoryTime(timestamp: number) {
  const date = new Date(timestamp)
  return date.toLocaleDateString() === new Date().toLocaleDateString()
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : `${date.getMonth() + 1}/${date.getDate()}`
}

function loadHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(historyStorageKey.value) || '[]')
    history.value = Array.isArray(stored) ? stored.sort((left, right) => right.updatedAt - left.updatedAt) : []
  } catch { history.value = [] }
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
  skipNextHistoryPersist = true
  loadConversation(item.messages, item.conversationId)
  activeHistoryId.value = item.id
}
function deleteHistory(item: ConversationHistory) {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}
function confirmDeleteHistory() {
  const item = deleteTarget.value
  if (!item) return
  history.value = history.value.filter(entry => entry.id !== item.id)
  localStorage.setItem(historyStorageKey.value, JSON.stringify(history.value))
  if (activeHistoryId.value === item.id) {
    stopStream()
    clearMessages()
    activeHistoryId.value = ''
  }
  deleteTarget.value = null
  deleteDialogOpen.value = false
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

function openPurchaseOrderConfirmation(item: AgentPurchaseOrderDraft) {
  selectedPurchaseOrderDraft.value = item
  purchaseOrderDialogOpen.value = true
}

function handlePurchaseOrderCreated(item: AgentPurchaseOrderDraft, result: CreatePurchaseOrderDraftResult) {
  item.createdOrderCode = result.orderCode
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
watch(messages, () => {
  if (skipNextHistoryPersist) {
    skipNextHistoryPersist = false
    return
  }
  persistHistory()
}, { deep: true })
watch(historyStorageKey, () => loadHistory())
onBeforeUnmount(() => { cleanupChat(); bootstrap.stop() })
</script>
