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

export interface AgentPurchaseOrderDraft extends PurchaseOrderDraft {
  callId: string
  requestId: string
  createdOrderCode?: string
}

export interface CreatePurchaseOrderDraftResult {
  orderId: number
  orderCode: string
  duplicated: boolean
}
