<template>
  <PromptInput
    ref="promptInputRef"
    class="my-4 md:my-6 w-full"
    accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx,.pptx,.txt,.csv"
    multiple
    :max-files="5"
    :max-file-size="15 * 1024 * 1024"
    @submit="emit('submit', $event)"
  >
    <PromptInputBody>
      <PromptInputTextarea
        placeholder="输入你的问题... (Enter 发送)"
        class="min-h-[48px] max-h-40"
        :disabled="status !== 'ready'"
      />
    </PromptInputBody>
    <PromptInputFooter class="justify-between gap-2">
      <ChatComposerAttachments />
      <!-- 官方 PromptInputSubmit 本身支持 CornerDownLeftIcon 图标并处理了流式/停止状态 -->
      <PromptInputSubmit :status="status" />
    </PromptInputFooter>
  </PromptInput>
</template>

<script setup lang="ts">
import type { ChatStatus } from 'ai'
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input'
import { ref, watch, nextTick } from 'vue'
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input'
import ChatComposerAttachments from './ChatComposerAttachments.vue'

const props = defineProps<{
  status: ChatStatus
}>()

const emit = defineEmits<{
  submit: [event: PromptInputMessage]
}>()

const promptInputRef = ref<any>()

// 监听状态变更：在大模型生成完毕（解除禁用）后自动恢复光标聚焦
watch(() => props.status, (newStatus) => {
  if (newStatus === 'ready') {
    nextTick(() => {
      const textarea = promptInputRef.value?.$el?.querySelector('textarea')
      textarea?.focus()
    })
  }
})
</script>
