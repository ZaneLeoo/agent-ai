<template>
  <div class="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-5 py-10 text-center sm:px-8">
    <div class="pointer-events-none absolute inset-x-0 top-1/2 h-72 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_68%)]" />
    <div class="relative flex max-w-2xl flex-col items-center">
      <div class="mb-5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
        <SparklesIcon class="size-7" />
      </div>
      <div class="space-y-2">
        <p class="text-xs font-medium uppercase tracking-[0.24em] text-blue-600/80">企业 AI 工作台</p>
        <h3 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">今天想处理什么？</h3>
        <p class="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">查询库存和供应商、查阅工序知识库、生成图表，或让助手准备采购单据。</p>
      </div>
      <div class="mt-5 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
        <span class="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">业务数据</span>
        <span class="rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">知识库</span>
        <span class="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">业务助手</span>
      </div>
    </div>
    <div class="relative mt-8 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
      <button
        v-for="(tip, index) in tips"
        :key="tip"
        class="group flex min-h-36 flex-col items-start justify-between gap-5 rounded-2xl border border-border/70 bg-background/80 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md"
        @click="emit('select', tip)"
      >
        <div class="flex w-full items-start justify-between gap-3">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-blue-100 group-hover:text-blue-600">
            <component :is="cardMeta[index]?.icon ?? SparklesIcon" class="size-4" />
          </span>
          <ArrowUpRightIcon class="size-4 text-muted-foreground/70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-600" />
        </div>
        <div class="space-y-1.5">
          <span class="text-[11px] font-medium text-muted-foreground">{{ cardMeta[index]?.label ?? '智能助手' }}</span>
          <span class="block text-sm font-medium leading-6 text-foreground">{{ tip }}</span>
        </div>
      </button>
    </div>
    <p class="relative mt-5 text-xs text-muted-foreground/70">选择一个示例开始，也可以直接输入你的问题</p>
  </div>
</template>

<script setup lang="ts">
import { ArrowUpRightIcon, BookOpenCheckIcon, BoxesIcon, ShoppingCartIcon, SparklesIcon } from '@lucide/vue'

defineProps<{
  tips: string[]
}>()

const emit = defineEmits<{
  select: [tip: string]
}>()

const cardMeta = [
  { label: '工序知识库', icon: BookOpenCheckIcon },
  { label: '库存查询', icon: BoxesIcon },
  { label: '采购助手', icon: ShoppingCartIcon },
]
</script>
