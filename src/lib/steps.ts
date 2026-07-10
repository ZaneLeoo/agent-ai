export interface ThinkingStep {
  id: string
  label: string
  description: string
  status: 'complete' | 'active' | 'pending'
}

export interface StepStreamData {
  stepId?: number | string
  stepType?: string
  displayName?: string
  summary?: string
  message?: string
  durationMs?: number
  toolCallId?: number | string
  toolCode?: string
}

export interface ArtifactStepData {
  type: string
  title?: string
  payload?: Record<string, unknown>
}

export function applyStepStarted(steps: ThinkingStep[], data: StepStreamData) {
  const id = stepId(data)
  const existing = steps.find(step => step.id === id)
  if (existing) {
    existing.label = stepLabel(data)
    existing.status = 'active'
    existing.description = activeDescription(data)
    return
  }
  steps.push({
    id,
    label: stepLabel(data),
    description: activeDescription(data),
    status: 'active',
  })
}

export function applyStepFinished(steps: ThinkingStep[], data: StepStreamData, failed = false) {
  const id = stepId(data)
  const existing = steps.find(step => step.id === id)
  const patch = {
    label: existing?.label || stepLabel(data),
    description: failed ? data.message || '执行失败' : data.summary || formatDuration(data.durationMs),
    status: 'complete' as const,
  }
  if (existing) Object.assign(existing, patch)
  else steps.push({ id, ...patch })
}

export function applyToolStarted(steps: ThinkingStep[], data: StepStreamData) {
  const id = toolStepId(data)
  const existing = steps.find(step => step.id === id)
  const label = existing?.label || `正在调用 ${toolLabel(data)}`
  if (existing) {
    existing.label = label
    existing.description = activeDescription(data)
    existing.status = 'active'
    return
  }
  steps.push({
    id,
    label,
    description: activeDescription(data),
    status: 'active',
  })
}

export function applyToolFinished(steps: ThinkingStep[], data: StepStreamData, failed = false) {
  const id = toolStepId(data)
  const existing = steps.find(step => step.id === id)
  const toolName = toolLabel(data)
  const patch = {
    label: existing?.label || `正在调用 ${toolName}`,
    description: failed
      ? data.message || `${toolName} 调用失败`
      : data.summary || `已获取 ${toolName} 结果`,
    status: 'complete' as const,
  }
  if (existing) Object.assign(existing, patch)
  else steps.push({ id, ...patch })
}

export function applyArtifactStep(steps: ThinkingStep[], artifact: ArtifactStepData) {
  steps.push({
    id: `artifact:${artifact.type}:${artifact.title || 'artifact'}`,
    label: artifact.type.toLowerCase() === 'table' ? '数据表已生成' : '图表已生成',
    description: describeArtifact(artifact),
    status: 'complete',
  })
}

function formatDuration(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '已完成'
  }
  if (value < 1000) return `${Math.max(0, Math.round(value))} ms`
  return `${(value / 1000).toFixed(1)} s`
}

function stepId(data: StepStreamData) {
  return `step:${data.stepId ?? data.stepType ?? 'unknown'}`
}

function toolStepId(data: StepStreamData) {
  if (data.stepId !== undefined && data.stepId !== null) return stepId(data)
  return `tool:${data.toolCallId ?? data.toolCode ?? 'unknown'}`
}

function stepLabel(data: StepStreamData) {
  if (data.displayName) return data.displayName
  const labels: Record<string, string> = {
    UNDERSTANDING: '正在理解需求',
    DATA_QUERY: '正在查询业务数据',
    DATA_ANALYSIS: '正在分析数据',
    CHART_RENDER: '正在生成图表',
    KNOWLEDGE_SEARCH: '正在检索知识库',
    REALTIME_SEARCH: '正在检索实时信息',
    CLARIFICATION: '正在确认需求',
    FILE_GENERATION: '正在生成文件',
    BUSINESS_ACTION: '正在执行业务操作',
    RESPONSE_COMPOSE: '正在整理回答',
  }
  return labels[data.stepType || ''] || '正在处理'
}

function toolLabel(data: StepStreamData) {
  return data.displayName || data.toolCode || '工具'
}

function activeDescription(data: StepStreamData) {
  return data.summary || data.message || '执行中...'
}

function describeArtifact(artifact: ArtifactStepData) {
  if (artifact.type.toLowerCase() === 'table') return '数据表'

  const chartType = artifact.payload?.chartType
  if (chartType === 'bar') return '柱状图'
  if (chartType === 'line') return '折线图'
  if (chartType === 'pie') return '饼图'

  return '图表'
}
