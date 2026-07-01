export type DifyNodeKind =
  | 'input'
  | 'intent'
  | 'knowledge'
  | 'model'
  | 'chart'
  | 'table'
  | 'tool'
  | 'answer'
  | 'generic'

export interface DifyNodeInfo {
  kind: DifyNodeKind
  displayLabel: string
  rawTitle: string
  rawPrefix: string
}

const PREFIX_KIND_MAP: Record<string, DifyNodeKind> = {
  输入: 'input',
  意图: 'intent',
  知识: 'knowledge',
  模型: 'model',
  图表: 'chart',
  表格: 'table',
  工具: 'tool',
  回答: 'answer',
}

const NODE_TYPE_KIND_MAP: Record<string, DifyNodeKind> = {
  start: 'input',
  'question-classifier': 'intent',
  knowledge: 'knowledge',
  'knowledge-retrieval': 'knowledge',
  llm: 'model',
  answer: 'answer',
  tool: 'tool',
  'tool-call': 'tool',
}

const KIND_LABEL_MAP: Record<DifyNodeKind, string> = {
  input: '用户输入',
  intent: '识别意图',
  knowledge: '检索知识库',
  model: '大模型思考',
  chart: '生成图表',
  table: '生成表格',
  tool: '调用工具',
  answer: '整理回答',
  generic: '处理步骤',
}

export function parseDifyNode(title = '', nodeType = ''): DifyNodeInfo {
  const rawTitle = title.trim()
  const rawPrefix = extractPrefix(rawTitle)
  const kind = resolveKind(rawPrefix, rawTitle, nodeType)

  return {
    kind,
    displayLabel: KIND_LABEL_MAP[kind],
    rawTitle,
    rawPrefix,
  }
}

function extractPrefix(title: string) {
  return title.match(/^\[(.+?)]/)?.[1]?.trim() || ''
}

function resolveKind(prefix: string, title: string, nodeType: string): DifyNodeKind {
  if (prefix && PREFIX_KIND_MAP[prefix]) return PREFIX_KIND_MAP[prefix]

  const normalizedNodeType = nodeType.trim().toLowerCase()
  if (normalizedNodeType && NODE_TYPE_KIND_MAP[normalizedNodeType]) {
    return NODE_TYPE_KIND_MAP[normalizedNodeType]
  }

  if (/用户输入|开始/.test(title)) return 'input'
  if (/问题分类|意图|分类器|CLASS\s*\d+/i.test(title)) return 'intent'
  if (/知识|召回|检索/.test(title)) return 'knowledge'
  if (/图表|BI|chart|可视化/i.test(title)) return 'chart'
  if (/表格|table|明细/i.test(title)) return 'table'
  if (/工具|HTTP|接口|数据库|代码执行/i.test(title)) return 'tool'
  if (/直接回复|回复|回答|生成回复/.test(title)) return 'answer'
  if (/大模型|模型|LLM/i.test(title)) return 'model'

  return 'generic'
}
