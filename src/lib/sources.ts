export interface AgentSourceItem {
  id: string
  title: string
  sourceType: string
  documentName?: string
  datasetName?: string
  content: string
  score?: number
  position?: number
  segmentId?: string
  page?: number | null
}

export function getSourcesFromStreamData(data: unknown): AgentSourceItem[] {
  const record = asRecord(data)
  if (!record) return []

  const candidates = [
    record.sources,
    asRecord(record.metadata)?.retriever_resources,
    asRecord(record.outputs)?.result,
  ]

  for (const candidate of candidates) {
    const items = toArray(candidate).map(normalizeSource).filter((item): item is AgentSourceItem => Boolean(item))
    if (items.length) return items
  }

  const single = normalizeSource(record)
  return single ? [single] : []
}

export function formatSourceScore(score: unknown): string {
  return typeof score === 'number' ? `${Math.round(score * 100)}%` : ''
}

export function normalizeSource(value: unknown): AgentSourceItem | null {
  const record = asRecord(value)
  if (!record) return null

  const metadata = asRecord(record.metadata) ?? record
  const content = firstString(record.content, metadata.content)
  if (!content) return null

  const position = toNumber(metadata.position)
  const segmentId = firstString(metadata.segment_id, record.segmentId)
  const documentName = firstString(metadata.document_name, record.documentName)
  const datasetName = firstString(metadata.dataset_name, record.datasetName)
  const title = firstString(record.title, documentName, datasetName, '知识来源') ?? '知识来源'
  const id = firstString(record.id, segmentId, metadata.document_id, position === undefined ? undefined : String(position)) ?? title

  return {
    id,
    title,
    sourceType: firstString(record.sourceType, metadata._source, 'knowledge') ?? 'knowledge',
    documentName,
    datasetName,
    content,
    score: toNumber(record.score ?? metadata.score),
    position,
    segmentId,
    page: toNullableNumber(record.page ?? metadata.page),
  }
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return undefined
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function toNullableNumber(value: unknown): number | null | undefined {
  if (value === null) return null
  return toNumber(value)
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}
