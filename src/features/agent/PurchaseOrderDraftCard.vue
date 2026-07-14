<template>
  <section class="mt-4 max-w-3xl overflow-hidden rounded-xl border bg-card shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
    <div class="flex items-start justify-between gap-4 border-b bg-primary/[0.03] px-4 py-3">
      <div class="flex min-w-0 items-start gap-3">
        <div class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FilePlus2Icon class="size-4" />
        </div>
        <div class="min-w-0">
          <h3 class="font-semibold text-foreground">采购订单草稿</h3>
          <p class="mt-0.5 text-xs text-muted-foreground">已根据主数据校验；确认后将创建为草稿，不会自动审核。</p>
        </div>
      </div>
      <Badge variant="secondary" class="shrink-0">待确认</Badge>
    </div>

    <div class="grid gap-x-6 gap-y-2 px-4 py-3 text-sm sm:grid-cols-2">
      <div><span class="text-muted-foreground">供应商：</span>{{ draft.supplierName }}（{{ draft.supplierCode }}）</div>
      <div><span class="text-muted-foreground">订单日期：</span>{{ draft.orderDate }}</div>
      <div><span class="text-muted-foreground">币种：</span>{{ draft.currency }}</div>
      <div><span class="text-muted-foreground">预计到货：</span>{{ draft.expectedDate || '—' }}</div>
    </div>

    <div class="border-y px-4 py-3">
      <div class="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>采购明细 {{ draft.lines.length }} 项</span>
        <span>总数量 {{ formatNumber(draft.totalQuantity) }}</span>
      </div>
      <div class="space-y-1.5">
        <div v-for="line in draft.lines" :key="line.lineNo" class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 text-sm">
          <span class="truncate" :title="line.materialName">{{ line.materialName }} <em class="not-italic text-xs text-muted-foreground">{{ line.materialCode }}</em></span>
          <span class="text-muted-foreground">{{ formatNumber(line.quantity) }} {{ line.unit }}</span>
          <span class="w-24 text-right">{{ formatCurrency(line.amount) }}</span>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between gap-3 px-4 py-3">
      <div class="text-sm"><span class="text-muted-foreground">含税总金额：</span><strong class="text-base text-foreground">{{ formatCurrency(draft.totalAmount) }}</strong></div>
      <div v-if="item.createdOrderCode" class="flex items-center gap-2 text-sm text-emerald-600"><CircleCheckIcon class="size-4" />已创建 {{ item.createdOrderCode }}</div>
      <Button v-else size="sm" class="gap-1.5" @click="emit('confirm', item)"><CheckIcon class="size-4" />确认创建</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { CheckIcon, CircleCheckIcon, FilePlus2Icon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AgentPurchaseOrderDraft } from '@/types/automation'

const props = defineProps<{ item: AgentPurchaseOrderDraft }>()
const emit = defineEmits<{ confirm: [item: AgentPurchaseOrderDraft] }>()
const draft = props.item

function formatNumber(value: number) { return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 6 }).format(value) }
function formatCurrency(value: number) { return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: draft.currency || 'CNY' }).format(value) }
</script>
