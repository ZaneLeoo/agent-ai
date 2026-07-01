<template>
  <PromptInput class="mt-4 w-full" @submit="emit('submit', $event)">
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
