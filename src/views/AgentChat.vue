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
    <aside
      class="agent-sidebar hidden shrink-0 flex-col border-r md:flex transition-all duration-300 ease-in-out overflow-hidden bg-card"
      :class="sidebarCollapsed ? 'w-[60px]' : 'w-[276px]'"
    >
      <!-- 侧边栏头部：展开时 Logo 在左，关闭键在右；收起时关闭键居中 -->
      <div class="flex items-center justify-between px-4 pb-5 pt-6 shrink-0 h-[68px]">
        <!-- 仅在展开时显示 Logo 和标题（伴随渐隐过渡） -->
        <div
          class="flex items-center gap-2.5 min-w-0 transition-all duration-300 ease-in-out shrink-0"
          :class="sidebarCollapsed ? 'opacity-0 pointer-events-none w-0' : 'opacity-100'"
        >
          <div class="agent-logo flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <SparklesIcon class="size-4.5" />
          </div>
          <div class="min-w-0">
            <div class="text-[15px] font-bold tracking-tight truncate">智能助手</div>
            <div class="text-[10px] text-muted-foreground truncate">企业 AI 工作台</div>
          </div>
        </div>
        
        <!-- 常驻切换按钮：展开时在右侧，折叠时居中 -->
        <Button
          variant="ghost"
          size="icon"
          class="size-9 text-muted-foreground/80 hover:text-foreground rounded-lg transition-colors shrink-0"
          :class="sidebarCollapsed ? 'mx-auto' : ''"
          :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <component :is="sidebarCollapsed ? PanelLeftIcon : PanelLeftCloseIcon" class="size-4.5" />
        </Button>
      </div>

      <!-- 新建对话按钮 -->
      <div class="px-3 shrink-0">
        <!-- 展开态新建按钮 -->
        <Button
          v-if="!sidebarCollapsed"
          class="agent-new-chat mb-4 h-11 w-full justify-center gap-2 rounded-xl border-0 text-white shadow-sm"
          @click="startNewConversation"
        >
          <PlusIcon class="size-4" /> 新建对话
        </Button>
        <!-- 折叠态圆形新建按钮 -->
        <Button
          v-else
          size="icon"
          class="agent-new-chat mb-4 size-9 mx-auto flex items-center justify-center rounded-xl border-0 text-white shadow-sm hover:scale-105 transition-all duration-300"
          title="新建对话"
          @click="startNewConversation"
        >
          <PlusIcon class="size-4.5" />
        </Button>
      </div>

      <!-- 搜索框：折叠时高度塌缩且渐隐 -->
      <div
        class="px-4 shrink-0 transition-all duration-300 ease-in-out"
        :class="sidebarCollapsed ? 'opacity-0 pointer-events-none h-0 mb-0 overflow-hidden' : 'opacity-100 h-14 mb-4'"
      >
        <div class="agent-search flex h-10 items-center gap-2 rounded-xl border bg-muted/40 px-3 text-sm text-muted-foreground focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
          <SearchIcon class="size-4 shrink-0 opacity-70" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索对话"
            class="h-full flex-1 min-w-0 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none animate-none"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
            title="清空搜索"
            @click="searchQuery = ''"
          >
            <XIcon class="size-3" />
          </button>
          <SlidersHorizontalIcon v-else class="size-3.5 opacity-60 shrink-0" />
        </div>
      </div>

      <!-- 历史会话列表：折叠时渐隐 -->
      <div
        class="min-h-0 flex-1 overflow-y-auto px-3 transition-all duration-300 ease-in-out"
        :class="sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'"
      >
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

      <!-- 底部用户与设置：展开时横向排版，折叠时头像、设置、退出垂直堆叠 -->
      <div class="border-t p-3.5 shrink-0 flex items-center justify-center transition-all duration-300 mt-auto min-h-[68px]">
        <Transition name="fade" mode="out-in">
          <!-- 展开态完整卡片 -->
          <div v-if="!sidebarCollapsed" key="expanded" class="flex w-full items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="agent-avatar flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-bold shadow-sm">{{ userInitial }}</div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium leading-none">{{ bootstrap.state.userName }}</div>
                <div class="text-[11px] text-muted-foreground mt-1.5 leading-none">在线使用中</div>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                class="size-8 text-muted-foreground hover:text-foreground"
                title="助手设置"
                aria-label="助手设置"
                @click="settingsDialogOpen = true"
              >
                <SettingsIcon class="size-4" />
              </Button>
              <Button variant="ghost" size="icon" class="size-8 text-muted-foreground hover:text-foreground" title="退出登录" @click="handleLogout">
                <LogOutIcon class="size-4" />
              </Button>
            </div>
          </div>
          
          <!-- 折叠态：头像、设置齿轮、注销退出垂直向上堆叠 -->
          <div v-else key="collapsed" class="flex flex-col items-center gap-2.5 mx-auto">
            <!-- 1. 用户头像 -->
            <div class="agent-avatar flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold shadow-sm select-none">
              {{ userInitial }}
            </div>
            <!-- 2. 齿轮设置 -->
            <Button
              variant="ghost"
              size="icon"
              class="size-9 text-muted-foreground/80 hover:text-foreground hover:bg-muted rounded-xl shrink-0 hover:scale-105 transition-all duration-200"
              title="助手设置"
              @click="settingsDialogOpen = true"
            >
              <SettingsIcon class="size-4.5" />
            </Button>
            <!-- 3. 注销退出 -->
            <Button
              variant="ghost"
              size="icon"
              class="size-9 text-muted-foreground/80 hover:text-destructive hover:bg-destructive/10 rounded-xl shrink-0 hover:scale-105 transition-all duration-200"
              title="退出登录"
              @click="handleLogout"
            >
              <LogOutIcon class="size-4.5" />
            </Button>
          </div>
        </Transition>
      </div>
    </aside>
    <main class="relative mx-auto flex min-w-0 flex-1 flex-col">
      <header class="agent-header flex h-[68px] shrink-0 items-center justify-between border-b px-5 md:px-8">
        <div class="min-w-0">
          <h1 class="truncate text-base font-semibold">{{ activeTitle || '新对话' }}</h1>
          <div class="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span class="size-1.5 rounded-full bg-emerald-500" />
            Agent 已就绪
          </div>
        </div>
        <div class="flex items-center gap-1"><Button variant="ghost" size="icon" class="size-9 text-muted-foreground" title="收藏"><BookmarkIcon class="size-4" /></Button><Button variant="ghost" size="icon" class="size-9 text-muted-foreground" title="分享"><Share2Icon class="size-4" /></Button><Button variant="ghost" size="icon" class="size-9 text-muted-foreground" title="新建对话" @click="startNewConversation"><PlusIcon class="size-4" /></Button></div>
      </header>
      <div class="flex min-h-0 flex-1 flex-col px-4 md:px-8 pb-4 md:pb-6">
        <Conversation class="h-full">
          <ConversationContent class="mx-auto w-full max-w-4xl">
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
                :base-api="bootstrap.state.baseApi"
                :token="bootstrap.state.token"
                @copy="copyMessageContent"
                @retry="retryMessage"
                @confirm-purchase-order="openPurchaseOrderConfirmation"
              />
            </template>

          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <!-- 输入区域 -->
        <ChatComposer :status="status" class="mx-auto w-full max-w-4xl shrink-0" @submit="handleSubmit" />
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

    <Dialog :open="settingsDialogOpen" @update:open="settingsDialogOpen = $event">
      <DialogContent class="max-w-xl">
        <DialogHeader class="border-b pb-4">
          <DialogTitle class="text-base font-semibold">系统设置</DialogTitle>
        </DialogHeader>
        
        <div class="py-6">
          <div class="rounded-xl border border-muted-foreground/10 bg-muted/10 p-5 flex items-center justify-between gap-6 transition-colors hover:bg-muted/15">
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold text-foreground">管理历史对话</div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              class="shrink-0 border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive hover:text-white hover:border-destructive transition-all duration-200"
              :disabled="history.length === 0"
              @click="openClearAllHistory"
            >
              <Trash2Icon class="mr-1.5 size-3.5" />
              清空全部
            </Button>
          </div>
        </div>

        <DialogFooter class="border-t pt-4">
          <Button variant="outline" class="px-4 text-xs h-9" @click="settingsDialogOpen = false">
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="clearAllHistoryDialogOpen" @update:open="clearAllHistoryDialogOpen = $event">
      <DialogContent class="max-w-md" :show-close-button="false">
        <DialogHeader>
          <div class="mb-1 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangleIcon class="size-5" />
          </div>
          <DialogTitle>清空全部历史对话？</DialogTitle>
          <DialogDescription>
            将删除当前浏览器中保存的 {{ history.length }} 条历史对话，并清空当前对话内容。此操作无法恢复。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="clearAllHistoryDialogOpen = false">取消</Button>
          <Button variant="destructive" @click="confirmClearAllHistory">清空全部</Button>
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
import { AlertTriangleIcon, BookmarkIcon, ChevronRightIcon, LogOutIcon, MessageSquareIcon, PlusIcon, SearchIcon, Share2Icon, SlidersHorizontalIcon, SparklesIcon, SettingsIcon, Trash2Icon, PanelLeftIcon, PanelLeftCloseIcon, XIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createBootstrapStore } from '@/lib/bootstrap'
import { AUTH_EXPIRED_EVENT } from '@/api/http'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
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
const sidebarCollapsed = ref(false)
const purchaseOrderDialogOpen = ref(false)
const selectedPurchaseOrderDraft = ref<AgentPurchaseOrderDraft | null>(null)
const deleteDialogOpen = ref(false)
const deleteTarget = ref<ConversationHistory | null>(null)
const settingsDialogOpen = ref(false)
const clearAllHistoryDialogOpen = ref(false)
let skipNextHistoryPersist = false
let lastAuthExpiredToastAt = 0
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
    messages: messagesForHistory(),
    updatedAt: Date.now(),
  }
  activeHistoryId.value = item.id
  history.value = [item, ...history.value.filter(entry => entry.id !== item.id)].slice(0, 50)
  localStorage.setItem(historyStorageKey.value, JSON.stringify(history.value))
}

function messagesForHistory(): AgentChatMessage[] {
  return JSON.parse(JSON.stringify(messages.value, (key, value) => key === 'previewUrl' ? undefined : value))
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
function openClearAllHistory() {
  if (!history.value.length) return
  settingsDialogOpen.value = false
  clearAllHistoryDialogOpen.value = true
}
function confirmClearAllHistory() {
  stopStream()
  clearMessages()
  history.value = []
  activeHistoryId.value = ''
  localStorage.removeItem(historyStorageKey.value)
  clearAllHistoryDialogOpen.value = false
  toast.success('历史对话已清空')
}
function handleAuthExpired() {
  stopStream()
  clearAuth('登录状态已过期，请重新登录')
  clearMessages()
  activeHistoryId.value = ''
  const now = Date.now()
  if (now - lastAuthExpiredToastAt > 1500) {
    toast.error('登录状态已过期', { description: '请重新登录后继续使用智能助手。' })
    lastAuthExpiredToastAt = now
  }
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
  window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
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
onBeforeUnmount(() => {
  window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
  cleanupChat()
  bootstrap.stop()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
