<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] max-w-3xl overflow-y-auto p-0" :show-close-button="!creating">
      <DialogHeader class="px-5 pt-5">
        <DialogTitle>确认创建采购订单</DialogTitle>
        <DialogDescription>系统会再次校验供应商、物料和金额，并以当前登录用户创建“草稿”状态订单。</DialogDescription>
      </DialogHeader>
      <div class="space-y-4 px-5 pb-5 text-sm">
        <div class="rounded-lg border bg-muted/30 p-3">
          <div class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <div><span class="text-muted-foreground">供应商：</span>{{ draft.supplierName }}</div>
            <div><span class="text-muted-foreground">订单日期：</span>{{ draft.orderDate }}</div>
            <div><span class="text-muted-foreground">币种：</span>{{ draft.currency }}</div>
            <div><span class="text-muted-foreground">预计到货：</span>{{ draft.expectedDate || '—' }}</div>
          </div>
        </div>
        <div class="overflow-hidden rounded-lg border">
          <table class="w-full text-sm"><thead class="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th class="px-3 py-2 font-medium">物料</th><th class="px-3 py-2 text-right font-medium">数量</th><th class="px-3 py-2 text-right font-medium">单价</th><th class="px-3 py-2 text-right font-medium">金额</th></tr></thead>
            <tbody><tr v-for="line in draft.lines" :key="line.lineNo" class="border-t"><td class="px-3 py-2"><div>{{ line.materialName }}</div><small class="text-muted-foreground">{{ line.materialCode }}</small></td><td class="px-3 py-2 text-right">{{ formatNumber(line.quantity) }} {{ line.unit }}</td><td class="px-3 py-2 text-right">{{ formatMoney(line.unitPrice) }}</td><td class="px-3 py-2 text-right font-medium">{{ formatMoney(line.amount) }}</td></tr></tbody>
          </table>
        </div>
        <div v-if="draft.remark" class="text-xs text-muted-foreground">备注：{{ draft.remark }}</div>
        <p v-if="errorMessage" class="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{{ errorMessage }}</p>
      </div>
      <DialogFooter class="px-5">
        <Button variant="outline" :disabled="creating" @click="emit('update:open', false)">取消</Button>
        <Button :disabled="creating" class="gap-1.5" @click="confirm"><LoaderCircleIcon v-if="creating" class="size-4 animate-spin" /><CheckIcon v-else class="size-4" />{{ creating ? '创建中…' : '确认创建草稿' }}</Button>
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
const draft = computed(() => props.item.draft!)

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
