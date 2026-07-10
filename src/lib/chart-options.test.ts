import { describe, expect, it } from 'vitest'
import { buildChartOption } from './chart-options'

describe('buildChartOption', () => {
  it('builds axis series for bar charts', () => {
    const option = buildChartOption({
      chartType: 'bar',
      categories: ['原料', '成品'],
      series: [{ name: '数量', data: [5, 3] }],
    })
    expect(option.xAxis).toMatchObject({ type: 'category', data: ['原料', '成品'] })
    expect(option.series).toEqual([
      expect.objectContaining({ type: 'bar', data: [5, 3] }),
    ])
  })

  it('maps categories and values to named pie slices', () => {
    const option = buildChartOption({
      chartType: 'pie',
      categories: ['原料', '成品'],
      series: [{ name: '数量', data: [5, 3] }],
    })
    expect(option).not.toHaveProperty('xAxis')
    expect(option.series).toEqual([
      expect.objectContaining({
        type: 'pie',
        data: [
          { name: '原料', value: 5 },
          { name: '成品', value: 3 },
        ],
      }),
    ])
  })

  it('falls back to bar instead of accepting arbitrary renderer types', () => {
    const option = buildChartOption({
      chartType: 'custom-script',
      categories: ['A'],
      series: [{ name: '值', data: [1] }],
    })
    expect(option.series).toEqual([expect.objectContaining({ type: 'bar' })])
  })
})
