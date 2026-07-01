import type { ChatStatus } from 'ai'
import type { Ref } from 'vue'
import { ref } from 'vue'
import {
  deleteConversation,
  listConversations,
  listMessages,
  type ConversationItem,
  type MessageItem,
} from '@/api/agent'
import type { createBootstrapStore } from '@/lib/bootstrap'
import type { AgentChatMessage } from './AssistantMessage.vue'

type BootstrapStore = ReturnType<typeof createBootstrapStore>

export function useConversations(
  bootstrap: BootstrapStore,
  options: {
    activeConversationId: Ref<number | undefined>
    status: Ref<ChatStatus>
    messages: Ref<AgentChatMessage[]>
    toChatMessage: (item: MessageItem) => AgentChatMessage
    clearMessages: () => void
  },
) {
  const conversations = ref<ConversationItem[]>([])
  const loadingConversations = ref(false)
  const loadingMessages = ref(false)
  const conversationError = ref('')
  const mobileSidebarOpen = ref(false)

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
    if (options.status.value !== 'ready' || loadingMessages.value) return
    loadingMessages.value = true
    conversationError.value = ''
    try {
      const items = await listMessages(bootstrap.state, conversationId)
      options.activeConversationId.value = conversationId
      options.messages.value = items.map(options.toChatMessage)
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
    if (options.status.value !== 'ready') return
    options.activeConversationId.value = undefined
    options.clearMessages()
    mobileSidebarOpen.value = false
  }

  async function removeConversation(conversationId: number) {
    if (options.status.value !== 'ready') return
    conversationError.value = ''
    try {
      await deleteConversation(bootstrap.state, conversationId)
      conversations.value = conversations.value.filter(item => item.id !== conversationId)
      if (options.activeConversationId.value === conversationId) startNewConversation()
    } catch (e: unknown) {
      conversationError.value = e instanceof Error ? e.message : '删除会话失败'
    }
  }

  function clearConversationState() {
    conversations.value = []
    options.activeConversationId.value = undefined
    conversationError.value = ''
    mobileSidebarOpen.value = false
  }

  return {
    conversations,
    loadingConversations,
    loadingMessages,
    conversationError,
    mobileSidebarOpen,
    loadConversationList,
    selectConversation,
    startNewConversation,
    removeConversation,
    clearConversationState,
  }
}
