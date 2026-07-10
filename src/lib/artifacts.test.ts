import { describe, expect, it } from 'vitest'
import { getArtifactsFromStreamData, normalizeTablePayload, safeArtifactUrl } from './artifacts'

describe('artifact helpers', () => {
  it('extracts artifacts from conversation payloads', () => {
    const artifacts = getArtifactsFromStreamData({
      artifacts: [
        {
          type: 'chart',
          version: '1.0',
          title: '季度销售',
          payload: {
            chartType: 'bar',
            xAxis: ['Q1', 'Q2'],
            series: [{ name: '销售额', data: [120, 180] }],
          },
        },
      ],
    })

    expect(artifacts).toEqual([
      {
        type: 'chart',
        version: '1.0',
        title: '季度销售',
        payload: {
          chartType: 'bar',
          categories: ['Q1', 'Q2'],
          series: [{ name: '销售额', data: [120, 180] }],
        },
      },
    ])
  })

  it('normalizes array table rows into object rows', () => {
    expect(
      normalizeTablePayload({
        columns: ['月份', '销售额'],
        rows: [
          ['1月', 120],
          ['2月', 180],
        ],
      }),
    ).toEqual({
      columns: ['月份', '销售额'],
      rows: [
        { 月份: '1月', 销售额: 120 },
        { 月份: '2月', 销售额: 180 },
      ],
    })
  })

  it('keeps safe file links and rejects executable schemes', () => {
    expect(safeArtifactUrl('/agent/artifacts/9/download')).toBe('/agent/artifacts/9/download')
    expect(safeArtifactUrl('https://office.example.com/preview/9')).toContain('https://')
    expect(safeArtifactUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeArtifactUrl('data:text/html,bad')).toBeUndefined()
  })
})
