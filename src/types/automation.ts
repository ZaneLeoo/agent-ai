export type AutomationPreparationStatus = 'NEED_INPUT' | 'AMBIGUOUS' | 'INVALID' | 'READY'

export interface PurchaseOrderDraftLine {
  lineNo: number
  materialId: number
  materialCode: string
  materialName: string
  spec?: string | null
  model?: string | null
  unit: string
  quantity: number
  unitPrice: number
  taxRate: number
  amount: number
  plannedDate?: string | null
}

export interface PurchaseOrderDraft {
  supplierCode: string
  supplierName: string
  currency: string
  orderDate: string
  expectedDate?: string | null
  remark?: string | null
  totalQuantity: number
  totalAmount: number
  lines: PurchaseOrderDraftLine[]
}

export interface PurchaseOrderPreparation {
  status: AutomationPreparationStatus
  message: string
  missingFields?: string[]
  candidates?: Array<{
    field: string
    keyword: string
    options: Array<{ id: number; code: string; name: string; spec?: string; model?: string; unit?: string }>
  }>
  draft?: PurchaseOrderDraft | null
}

export interface AgentPurchaseOrderDraft extends PurchaseOrderPreparation {
  callId: string
  requestId: string
  createdOrderCode?: string
}

export interface CreatePurchaseOrderDraftResult {
  orderId: number
  orderCode: string
  duplicated: boolean
}
