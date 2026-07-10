export interface ArtifactItem {
  type: string
  version?: string
  title: string
  payload: Record<string, unknown>
  artifactId?: number
  datasetId?: number
  fileId?: number
  mimeType?: string
  previewUrl?: string
  downloadUrl?: string
}

export interface NormalizedTablePayload {
  columns: string[]
  rows: Array<Record<string, unknown>>
}

export function getArtifactsFromStreamData(data: unknown): ArtifactItem[] {
  const record = asRecord(data)
  if (!record) return []

  const sources = [
    record.artifacts,
    asRecord(record.outputs)?.artifacts,
    asRecord(record.outputs)?.outputs,
  ]

  for (const source of sources) {
    const items = toArray(source)
    if (items.length) {
      return items.map(normalizeArtifact).filter((item): item is ArtifactItem => Boolean(item))
    }
  }

  const single = normalizeArtifact(record)
  return single ? [single] : []
}

export function normalizeTablePayload(payload: unknown): NormalizedTablePayload {
  const record = asRecord(payload) ?? {}
  const columns = toStringArray(record.columns)
  const rows = toArray(record.rows).map((row) => normalizeTableRow(columns, row))

  return { columns, rows }
}

export function normalizeArtifact(value: unknown): ArtifactItem | null {
  const record = asRecord(value)
  if (!record || typeof record.type !== 'string') return null

  const payload = asRecord(record.payload) ?? {}
  const normalizedPayload = { ...payload }

  const type = record.type.toLowerCase()
  if (type === 'chart' && !normalizedPayload.categories && Array.isArray(normalizedPayload.xAxis)) {
    normalizedPayload.categories = normalizedPayload.xAxis
    delete normalizedPayload.xAxis
  }

  return {
    type,
    version: typeof record.version === 'string' ? record.version : undefined,
    title: typeof record.title === 'string' ? record.title : '数据产物',
    payload: normalizedPayload,
    artifactId: toNumber(record.artifactId),
    datasetId: toNumber(record.datasetId),
    fileId: toNumber(record.fileId),
    mimeType: toString(record.mimeType),
    previewUrl: safeArtifactUrl(record.previewUrl),
    downloadUrl: safeArtifactUrl(record.downloadUrl),
  }
}

/** 防御性限制可点击 Artifact URL，后端也执行相同白名单。 */
export function safeArtifactUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const url = value.trim()
  if (url.startsWith('/') && !url.startsWith('//')) return url
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : undefined
  } catch {
    return undefined
  }
}

function normalizeTableRow(columns: string[], row: unknown): Record<string, unknown> {
  if (Array.isArray(row)) {
    return Object.fromEntries(columns.map((column, index) => [column, row[index]]))
  }

  return asRecord(row) ?? {}
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

function toString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}
