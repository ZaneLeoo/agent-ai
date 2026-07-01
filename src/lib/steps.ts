import { parseDifyNode } from './dify-node'

export interface ThinkingStep {
  id: string
  label: string
  description: string
  status: 'complete' | 'active' | 'pending'
}

export interface NodeStreamData {
  event?: string
  title?: string
  nodeType?: string
  status?: string
  elapsedTime?: number
}

export interface ArtifactStepData {
  type: string
  title?: string
  payload?: Record<string, unknown>
}

export function applyNodeEvent(steps: ThinkingStep[], data: NodeStreamData) {
  const sourceLabel = data.title || data.nodeType || '节点'
  const id = `step:${sourceLabel}`
  const existing = steps.find(step => step.id === id)
  const patch = toStepPatch(data)
  const label = mapNodeLabel(data)

  if (existing) {
    existing.label = label
    existing.status = patch.status
    existing.description = patch.description
    return
  }

  steps.push({
    id,
    label,
    description: patch.description,
    status: patch.status,
  })
}

export function applyArtifactStep(steps: ThinkingStep[], artifact: ArtifactStepData) {
  steps.push({
    id: `artifact:${artifact.type}:${artifact.title || 'artifact'}`,
    label: artifact.type === 'table' ? '数据表已生成' : '图表已生成',
    description: describeArtifact(artifact),
    status: 'complete',
  })
}

function toStepPatch(data: NodeStreamData): Pick<ThinkingStep, 'description' | 'status'> {
  if (data.status === 'error' || data.status === 'failed') {
    return { status: 'complete', description: '执行出错' }
  }

  if (data.event === 'node_started') {
    return { status: 'active', description: '执行中...' }
  }

  if (data.event === 'node_finished') {
    return { status: 'complete', description: formatElapsedTime(data.elapsedTime) }
  }

  return { status: 'complete', description: '已完成' }
}

function formatElapsedTime(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '已完成'
  }

  if (value < 0.1) {
    return '已完成'
  }

  if (value < 1) {
    return `${Math.round(value * 1000)} ms`
  }

  return `${value.toFixed(1)} s`
}

function mapNodeLabel(data: NodeStreamData) {
  const parsed = parseDifyNode(data.title, data.nodeType)
  return parsed.kind === 'generic'
    ? data.title || data.nodeType || parsed.displayLabel
    : parsed.displayLabel
}

function describeArtifact(artifact: ArtifactStepData) {
  if (artifact.type === 'table') return '数据表'

  const chartType = artifact.payload?.chartType
  if (chartType === 'bar') return '柱状图'
  if (chartType === 'line') return '折线图'
  if (chartType === 'pie') return '饼图'

  return '图表'
}
