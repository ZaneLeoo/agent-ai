<template>
  <aside class="hidden w-72 shrink-0 border-r bg-muted/20 p-3 md:flex md:flex-col">
    <div class="mb-3 flex items-center justify-between gap-2">
      <div class="text-sm font-semibold">企业智能体</div>
      <button
        class="inline-flex size-8 items-center justify-center rounded-md border bg-background transition-colors hover:bg-accent"
        title="新建会话"
        @click="emit('new')"
      >
        <PlusIcon class="size-4" />
      </button>
    </div>

    <ConversationList
      class="min-h-0 flex-1"
      :active-conversation-id="activeConversationId"
      :conversation-error="conversationError"
      :conversations="conversations"
      :loading-conversations="loadingConversations"
      :show-delete-on-hover="true"
      @delete="emit('delete', $event)"
      @select="emit('select', $event)"
    />

    <UserFooter
      :user-initial="userInitial"
      :user-name="userName"
      @logout="emit('logout')"
    />
  </aside>

  <div
    v-if="mobileOpen"
    data-testid="mobile-sidebar"
    class="fixed inset-0 z-40 md:hidden"
  >
    <button
      class="absolute inset-0 bg-background/80 backdrop-blur-sm"
      type="button"
      title="关闭会话列表"
      @click="closeMobileSidebar"
    />
    <aside class="absolute inset-y-0 left-0 flex w-80 max-w-[86vw] flex-col border-r bg-background p-3 shadow-xl">
      <div class="mb-3 flex items-center justify-between gap-2">
        <div class="text-sm font-semibold">企业智能体</div>
        <button
          data-testid="mobile-sidebar-close"
          class="inline-flex size-8 items-center justify-center rounded-md border bg-background transition-colors hover:bg-accent"
          title="关闭会话列表"
          @click="closeMobileSidebar"
        >
          <XIcon class="size-4" />
        </button>
      </div>

      <Button class="mb-3 h-9 justify-start gap-2" variant="outline" @click="handleNewConversation">
        <PlusIcon class="size-4" />
        新建会话
      </Button>

      <ConversationList
        class="min-h-0 flex-1"
        :active-conversation-id="activeConversationId"
        :conversation-error="conversationError"
        :conversations="conversations"
        :loading-conversations="loadingConversations"
        @delete="emit('delete', $event)"
        @select="handleMobileSelect"
      />

      <UserFooter
        :user-initial="userInitial"
        :user-name="userName"
        @logout="emit('logout')"
      />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { PlusIcon, XIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { ConversationItem } from '@/api/agent'
import ConversationList from './ConversationList.vue'
import UserFooter from './UserFooter.vue'

defineProps<{
  conversations: ConversationItem[]
  activeConversationId?: number
  conversationError: string
  loadingConversations: boolean
  mobileOpen: boolean
  userInitial: string
  userName: string
}>()

const emit = defineEmits<{
  'update:mobileOpen': [value: boolean]
  new: []
  select: [conversationId: number]
  delete: [conversationId: number]
  logout: []
}>()

function closeMobileSidebar() {
  emit('update:mobileOpen', false)
}

function handleNewConversation() {
  emit('new')
  closeMobileSidebar()
}

function handleMobileSelect(conversationId: number) {
  emit('select', conversationId)
  closeMobileSidebar()
}
</script>
