export interface SemanticChartSeries {
  name: string
  data: number[]
}

export interface SemanticChartPayload {
  chartType?: string
  categories?: Array<string | number>
  series?: SemanticChartSeries[]
}

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']

/** 只从白名单语义字段构造 ECharts option，不接受模型提供的原始 option。 */
export function buildChartOption(payload: SemanticChartPayload): Record<string, unknown> {
  const chartType = normalizeChartType(payload.chartType)
  const categories = Array.isArray(payload.categories) ? payload.categories.map(String) : []
  const series = Array.isArray(payload.series) ? payload.series : []
  if (chartType === 'pie') {
    return {
      color: COLORS,
      tooltip: { trigger: 'item' },
      legend: { type: 'scroll', bottom: 0 },
      series: series.slice(0, 1).map(item => ({
        name: item.name,
        type: 'pie',
        radius: ['38%', '68%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        label: { formatter: '{b}: {d}%' },
        data: item.data.slice(0, categories.length).map((value, index) => ({
          name: categories[index],
          value,
        })),
      })),
    }
  }
  return {
    color: COLORS,
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '3%', top: '10%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { show: false },
      axisLabel: { interval: 0 },
    },
    yAxis: {
      type: 'value',
      min: chartType === 'bar' ? 0 : undefined,
      splitLine: { lineStyle: { type: 'dashed' } },
    },
    series: series.map(item => ({
      name: item.name,
      type: chartType,
      data: item.data,
      ...(chartType === 'bar'
        ? { barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } }
        : { smooth: true, showSymbol: false, lineStyle: { width: 3 } }),
    })),
  }
}

function normalizeChartType(value: unknown): 'bar' | 'line' | 'pie' {
  return value === 'line' || value === 'pie' ? value : 'bar'
}
