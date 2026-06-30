export interface ArtifactItem {
  type: string
  version?: string
  title: string
  payload: Record<string, unknown>
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

function normalizeArtifact(value: unknown): ArtifactItem | null {
  const record = asRecord(value)
  if (!record || typeof record.type !== 'string') return null

  const payload = asRecord(record.payload) ?? {}
  const normalizedPayload = { ...payload }

  if (record.type === 'chart' && !normalizedPayload.categories && Array.isArray(normalizedPayload.xAxis)) {
    normalizedPayload.categories = normalizedPayload.xAxis
    delete normalizedPayload.xAxis
  }

  return {
    type: record.type,
    version: typeof record.version === 'string' ? record.version : undefined,
    title: typeof record.title === 'string' ? record.title : '数据产物',
    payload: normalizedPayload,
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}
