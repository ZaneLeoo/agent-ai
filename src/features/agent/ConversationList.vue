<template>
  <div class="space-y-1 overflow-y-auto">
    <div
      v-if="conversationError"
      class="mb-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
    >
      {{ conversationError }}
    </div>

    <div
      v-for="conversation in conversations"
      :key="conversation.id"
      class="group flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
      :class="conversation.id === activeConversationId ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'"
      role="button"
      tabindex="0"
      @click="emit('select', conversation.id)"
      @keydown.enter="emit('select', conversation.id)"
    >
      <MessageSquareIcon class="size-4 shrink-0" />
      <span class="min-w-0 flex-1 truncate">{{ conversation.title || '新会话' }}</span>
      <button
        class="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-background hover:text-destructive"
        :class="showDeleteOnHover ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'"
        title="删除会话"
        @click.stop="emit('delete', conversation.id)"
      >
        <Trash2Icon class="size-3.5" />
      </button>
    </div>

    <div
      v-if="!conversations.length && !loadingConversations"
      class="px-3 py-8 text-center text-xs text-muted-foreground"
    >
      暂无会话
    </div>
  </div>
</template>

<script setup lang="ts">
import { MessageSquareIcon, Trash2Icon } from '@lucide/vue'
import type { ConversationItem } from '@/api/agent'

defineProps<{
  conversations: ConversationItem[]
  activeConversationId?: number
  conversationError: string
  loadingConversations: boolean
  showDeleteOnHover?: boolean
}>()

const emit = defineEmits<{
  select: [conversationId: number]
  delete: [conversationId: number]
}>()
</script>
