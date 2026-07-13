<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] w-[min(900px,calc(100%-2rem))] !max-w-4xl overflow-y-auto p-0 flex flex-col" :show-close-button="!creating">
      <!-- 带有下边框线的 Header -->
      <DialogHeader class="border-b pb-4 px-6 pt-5">
        <DialogTitle class="text-base font-semibold">确认创建采购订单</DialogTitle>
        <DialogDescription class="text-xs">系统已校验供应商、物料和金额。确认后将为当前登录用户创建“草稿”状态订单。</DialogDescription>
      </DialogHeader>

      <!-- 中间内容区：呼吸留白 -->
      <div class="space-y-5 px-6 py-5 text-sm flex-1 overflow-y-auto">
        <!-- 4 列磁贴式网格属性格 -->
        <div class="rounded-xl border border-muted-foreground/10 bg-muted/10 p-4">
          <div class="grid gap-4 grid-cols-2 sm:grid-cols-4 text-xs">
            <div class="space-y-1 min-w-0">
              <span class="block text-muted-foreground font-medium">供应商</span>
              <span class="block text-sm font-semibold text-foreground truncate" :title="draft.supplierName">
                {{ draft.supplierName }}
              </span>
            </div>
            <div class="space-y-1">
              <span class="block text-muted-foreground font-medium">订单日期</span>
              <span class="block text-sm font-semibold text-foreground">
                {{ draft.orderDate }}
              </span>
            </div>
            <div class="space-y-1">
              <span class="block text-muted-foreground font-medium">结算币种</span>
              <span class="block text-sm font-semibold text-foreground">
                {{ draft.currency }}
              </span>
            </div>
            <div class="space-y-1">
              <span class="block text-muted-foreground font-medium">预计到货</span>
              <span class="block text-sm font-semibold text-foreground">
                {{ draft.expectedDate || '—' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 采购明细表格 -->
        <div class="overflow-hidden rounded-xl border border-muted-foreground/10">
          <table class="w-full text-sm">
            <thead class="bg-muted/40 text-left text-xs text-muted-foreground border-b">
              <tr>
                <th class="px-4 py-3 font-medium border-r border-muted-foreground/10">物料</th>
                <th class="px-4 py-3 text-right font-medium w-32 border-r border-muted-foreground/10">数量</th>
                <th class="px-4 py-3 text-right font-medium w-36 border-r border-muted-foreground/10">单价</th>
                <th class="px-4 py-3 text-right font-medium w-36">金额</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-muted-foreground/10">
              <tr v-for="line in draft.lines" :key="line.lineNo" class="hover:bg-muted/5 transition-colors">
                <td class="px-4 py-3 border-r border-muted-foreground/10">
                  <div class="font-medium text-foreground text-sm">{{ line.materialName }}</div>
                  <div class="mt-0.5 text-xs text-muted-foreground/80 font-mono">{{ line.materialCode }}</div>
                </td>
                <td class="px-4 py-3 text-right text-muted-foreground border-r border-muted-foreground/10 whitespace-nowrap">
                  {{ formatNumber(line.quantity) }} {{ line.unit }}
                </td>
                <td class="px-4 py-3 text-right text-muted-foreground border-r border-muted-foreground/10 whitespace-nowrap">
                  {{ formatMoney(line.unitPrice) }}
                </td>
                <td class="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                  {{ formatMoney(line.amount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 订单总金额与备注 -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div v-if="draft.remark" class="text-xs text-muted-foreground bg-muted/20 px-3 py-1.5 rounded-lg border border-muted-foreground/5 max-w-md">
            <span class="font-medium text-foreground/80">备注：</span>{{ draft.remark }}
          </div>
          <div v-else />
          
          <!-- 大字亮蓝总额 -->
          <div class="flex items-baseline justify-end gap-2 text-sm shrink-0 ml-auto">
            <span class="text-muted-foreground font-medium">含税总金额：</span>
            <strong class="text-2xl font-bold text-primary tracking-tight">{{ formatMoney(totalAmount) }}</strong>
          </div>
        </div>

        <p v-if="errorMessage" class="rounded-lg bg-destructive/10 border border-destructive/10 px-4 py-2.5 text-xs text-destructive font-medium">
          ⚠️ {{ errorMessage }}
        </p>
      </div>

      <!-- 带有上边框线的 Footer -->
      <DialogFooter class="border-t pt-4 px-6 pb-5">
        <Button variant="outline" class="h-9 px-4 text-xs rounded-lg" :disabled="creating" @click="emit('update:open', false)">取消</Button>
        <Button :disabled="creating" class="h-9 px-4 text-xs rounded-lg gap-1.5 shadow-sm transition-all" @click="confirm">
          <LoaderCircleIcon v-if="creating" class="size-3.5 animate-spin" />
          <CheckIcon v-else class="size-3.5" />
          {{ creating ? '创建中…' : '确认创建草稿' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CheckIcon, LoaderCircleIcon } from '@lucide/vue'
import { createPurchaseOrderDraft } from '@/api/automation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { BootstrapState } from '@/lib/bootstrap'
import type { AgentPurchaseOrderDraft, CreatePurchaseOrderDraftResult } from '@/types/automation'

const props = defineProps<{ open: boolean; item: AgentPurchaseOrderDraft; bootstrap: BootstrapState }>()
const emit = defineEmits<{ 'update:open': [open: boolean]; created: [item: AgentPurchaseOrderDraft, result: CreatePurchaseOrderDraftResult] }>()
const creating = ref(false)
const errorMessage = ref('')
const draft = computed(() => props.item)

// 含税订单总金额自动累加计算
const totalAmount = computed(() => {
  return draft.value.lines?.reduce((sum, line) => sum + (line.amount || 0), 0) || 0
})

watch(() => props.open, (open) => {
  if (open) errorMessage.value = ''
})

async function confirm() {
  creating.value = true; errorMessage.value = ''
  try {
    const result = await createPurchaseOrderDraft(props.bootstrap, props.item.requestId, draft.value)
    emit('created', props.item, result)
    emit('update:open', false)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '创建采购订单失败'
  } finally { creating.value = false }
}
function formatNumber(value: number) { return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 6 }).format(value) }
function formatMoney(value: number) { return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: draft.value.currency || 'CNY' }).format(value) }
</script>
