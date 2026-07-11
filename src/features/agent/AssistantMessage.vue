<template>
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
        v-if="message.role === 'assistant' && message.content"
        class="mt-2 flex justify-end"
      >
        <Button
          class="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
          size="sm"
          variant="ghost"
          type="button"
          @click="emit('copy', message)"
        >
          <CheckIcon v-if="copied" class="size-3.5" />
          <CopyIcon v-else class="size-3.5" />
          {{ copied ? '已复制' : '复制' }}
        </Button>
      </div>
      <div
        v-if="message.stopped"
        class="mt-2 flex items-center gap-1.5 text-xs text-destructive"
      >
        <span class="block size-1.5 rounded-full bg-destructive" />
        已停止生成
      </div>
      <div
        v-if="message.error"
        class="mt-2 flex flex-wrap items-center gap-2 text-xs text-destructive"
      >
        <span>{{ message.error }}</span>
        <Button
          v-if="message.retryQuery"
          class="h-7 px-2 text-xs"
          size="sm"
          variant="outline"
          type="button"
          :disabled="retryDisabled"
          @click="emit('retry', message)"
        >
          重试
        </Button>
      </div>
    </MessageContent>
  </Message>
</template>

<script setup lang="ts">
import { CheckIcon, CopyIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'

export interface AgentChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming: boolean
  stopped: boolean
  failed: boolean
  error: string
  retryQuery: string
}

defineProps<{
  message: AgentChatMessage
  copied: boolean
  retryDisabled: boolean
}>()

const emit = defineEmits<{
  copy: [message: AgentChatMessage]
  retry: [message: AgentChatMessage]
}>()
</script>
