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
  const title = data.title || ''
  const nodeType = data.nodeType || ''

  if (nodeType === 'start' || /用户输入|开始/.test(title)) return '理解问题'
  if (nodeType === 'question-classifier' || /问题分类|意图|分类器/.test(title)) return '识别意图'
  if (/图表|BI|chart|可视化/i.test(title)) return '生成图表'
  if (nodeType === 'answer' || /直接回复|回复|回答/.test(title)) return '整理回答'
  if (nodeType === 'llm' || /大模型|LLM/i.test(title)) return '生成回答'

  return title || nodeType || '处理步骤'
}

function describeArtifact(artifact: ArtifactStepData) {
  if (artifact.type === 'table') return '数据表'

  const chartType = artifact.payload?.chartType
  if (chartType === 'bar') return '柱状图'
  if (chartType === 'line') return '折线图'
  if (chartType === 'pie') return '饼图'

  return '图表'
}
