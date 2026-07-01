<template>
  <Artifact class="mt-1 w-full max-w-full">
    <ArtifactHeader>
      <ArtifactTitle>{{ artifact.title }}</ArtifactTitle>
    </ArtifactHeader>
    <ArtifactContent class="p-4">
      <div
        v-if="artifact.type === 'chart'"
        ref="chartEl"
        class="h-[300px] min-h-[280px] w-full"
      />
      <div v-else-if="artifact.type === 'table'" class="overflow-x-auto p-4">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b">
              <th
                v-for="col in table.columns"
                :key="col"
                class="px-3 py-2 text-left font-medium text-muted-foreground"
              >
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rIdx) in table.rows"
              :key="rIdx"
              class="border-b last:border-0"
            >
              <td
                v-for="col in table.columns"
                :key="col"
                class="px-3 py-2"
              >
                {{ row[col] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <pre v-else class="p-4 text-xs text-muted-foreground">{{ JSON.stringify(artifact.payload, null, 2) }}</pre>
    </ArtifactContent>
  </Artifact>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Artifact, ArtifactContent, ArtifactHeader, ArtifactTitle } from '@/components/ai-elements/artifact'
import { normalizeTablePayload, type ArtifactItem } from '@/lib/artifacts'

const props = defineProps<{
  artifact: ArtifactItem
}>()

const chartEl = ref<HTMLElement>()
let chart: echarts.ECharts | undefined

const table = computed(() => normalizeTablePayload(props.artifact.payload))

function renderChart() {
  if (props.artifact.type !== 'chart' || !chartEl.value) return

  const payload = props.artifact.payload as {
    chartType?: string
    categories?: string[]
    series?: Array<{ name: string; data: number[] }>
  }

  if (!chart) {
    chart = echarts.init(chartEl.value)
  }

  const chartType = payload.chartType || 'bar'
  chart.setOption({
    color: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
    tooltip: { trigger: chartType === 'pie' ? 'item' : 'axis' },
    grid: { left: '3%', right: '3%', top: '10%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: payload.categories || [],
      axisTick: { show: false },
      axisLabel: { interval: 0 },
    },
    yAxis: {
      type: 'value',
      min: chartType === 'bar' ? 0 : undefined,
      splitLine: { lineStyle: { type: 'dashed' } },
    },
    series: (payload.series || []).map(series => ({
      name: series.name,
      type: chartType,
      data: series.data,
      ...(chartType === 'bar' ? { barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } } : {}),
      ...(chartType === 'line' ? { smooth: true, showSymbol: false, lineStyle: { width: 3 } } : {}),
    })),
  }, true)
  requestAnimationFrame(() => chart?.resize())
}

function resizeChart() {
  chart?.resize()
}

onMounted(() => {
  nextTick(renderChart)
  window.addEventListener('resize', resizeChart)
})

watch(() => props.artifact.payload, () => nextTick(renderChart), { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chart?.dispose()
  chart = undefined
})
</script>
