<template>
  <ChainOfThought
    v-if="steps.length"
    v-model="openModel"
    class="mb-3"
  >
    <ChainOfThoughtHeader>
      <template v-if="thinking">
        <Shimmer :duration="1.5">处理中...</Shimmer>
      </template>
      <template v-else-if="stopped">
        <span class="text-destructive">已取消</span>
      </template>
      <template v-else-if="failed">
        <span class="text-destructive">执行失败</span>
      </template>
      <template v-else>
        <span>处理完成 · {{ doneCount }}/{{ steps.length }} 步</span>
      </template>
    </ChainOfThoughtHeader>
    <ChainOfThoughtContent>
      <ChainOfThoughtStep
        v-for="step in steps"
        :key="step.id"
        :label="step.label"
        :description="step.description"
        :status="step.status"
      />
    </ChainOfThoughtContent>
  </ChainOfThought>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thought'
import { Shimmer } from '@/components/ai-elements/shimmer'
import type { ThinkingStep } from '@/lib/steps'

const props = defineProps<{
  open: boolean
  steps: ThinkingStep[]
  stopped: boolean
  failed: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const openModel = computed({
  get: () => props.open,
  set: value => emit('update:open', value),
})

const thinking = computed(() => props.steps.some(step => step.status === 'active'))
const doneCount = computed(() => props.steps.filter(step => step.status === 'complete').length)
</script>
