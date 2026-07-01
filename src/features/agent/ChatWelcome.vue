<template>
  <div class="flex min-h-full flex-col items-center justify-center gap-6 p-8 text-center">
    <SparklesIcon class="size-8 text-muted-foreground" />
    <div class="space-y-1">
      <h3 class="text-lg font-semibold">今天想分析什么？</h3>
      <p class="text-sm text-muted-foreground">可以提问业务问题、分析经营数据，或直接生成可视化图表。</p>
    </div>
    <div class="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
      <button
        v-for="tip in tips"
        :key="tip"
        class="group flex flex-col items-start gap-2 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-accent"
        @click="emit('select', tip)"
      >
        <span class="text-sm leading-relaxed">{{ tip }}</span>
        <span class="text-xs text-muted-foreground transition-transform group-hover:translate-x-0.5">-&gt;</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SparklesIcon } from '@lucide/vue'

defineProps<{
  tips: string[]
}>()

const emit = defineEmits<{
  select: [tip: string]
}>()
</script>
