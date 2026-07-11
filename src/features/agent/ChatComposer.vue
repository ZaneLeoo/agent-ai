<template>
  <PromptInput class="my-4 md:my-6 w-full" @submit="emit('submit', $event)">
    <PromptInputBody>
      <PromptInputTextarea
        placeholder="输入你的问题... (Enter 发送)"
        class="min-h-[48px] max-h-40"
        :disabled="status !== 'ready'"
      />
    </PromptInputBody>
    <PromptInputFooter class="justify-end">
      <!-- 官方 PromptInputSubmit 本身支持 CornerDownLeftIcon 图标并处理了流式/停止状态 -->
      <PromptInputSubmit :status="status" />
    </PromptInputFooter>
  </PromptInput>
</template>

<script setup lang="ts">
import type { ChatStatus } from 'ai'
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input'

defineProps<{
  status: ChatStatus
}>()

const emit = defineEmits<{
  submit: [event: { text: string }]
}>()
</script>
