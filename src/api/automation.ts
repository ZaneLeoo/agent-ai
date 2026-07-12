import type { BootstrapState } from '@/lib/bootstrap'
import type { CreatePurchaseOrderDraftResult, PurchaseOrderDraft } from '@/types/automation'
import { requestJson } from './http'

/** 用户确认后，以当前 RuoYi 登录态创建采购订单草稿。 */
export function createPurchaseOrderDraft(
  bootstrap: BootstrapState,
  requestId: string,
  draft: PurchaseOrderDraft,
) {
  return requestJson<CreatePurchaseOrderDraftResult>(bootstrap, '/agent/automation/purchase-orders', {
    method: 'POST',
    body: JSON.stringify({ requestId, draft }),
  })
}
