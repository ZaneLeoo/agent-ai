<template>
  <Card v-if="chart.phase === 'finished' && chart.option" class="my-4 w-full max-w-3xl overflow-hidden rounded-2xl border-primary/10 shadow-sm">
    <CardHeader class="flex flex-row items-center justify-between space-y-0 border-b px-4 py-3">
      <div class="flex items-center gap-2">
        <div class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><BarChart3Icon class="size-4" /></div>
        <div><CardTitle class="text-sm">{{ chart.title || chartTypeLabel }}</CardTitle><p class="text-[11px] text-muted-foreground">{{ chartTypeLabel }}</p></div>
      </div>
      <Button variant="ghost" size="icon" class="size-8 text-muted-foreground" title="下载图片" @click="downloadChart"><DownloadIcon class="size-4" /></Button>
    </CardHeader>
    <CardContent class="p-3"><div ref="chartElement" class="h-[320px] w-full" /></CardContent>
  </Card>
  <div v-else class="my-3 flex items-center gap-2 rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground"><LoaderCircleIcon class="size-4 animate-spin text-primary" />正在生成{{ chartTypeLabel }}…</div>
</template>

<script setup lang="ts">
import { BarChart3Icon, DownloadIcon, LoaderCircleIcon } from '@lucide/vue'
import * as echarts from 'echarts'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AgentChart } from './useAgentChat'

const props = defineProps<{ chart: AgentChart }>()
const chartElement = ref<HTMLElement>()
let instance: echarts.ECharts | undefined
const chartTypeLabel = computed(() => ({ bar: '柱状图', line: '折线图', pie: '饼图' })[props.chart.chartType] || '图表')

function renderChart() {
  if (!chartElement.value || !props.chart.option) return
  instance?.dispose()
  instance = echarts.init(chartElement.value)
  instance.setOption(props.chart.option as echarts.EChartsOption, { notMerge: true })
}
function resizeChart() { instance?.resize() }
function downloadChart() {
  if (!instance) return
  const link = document.createElement('a')
  link.download = `${props.chart.title || '图表'}.png`
  link.href = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
  link.click()
}
onMounted(() => { window.addEventListener('resize', resizeChart); void nextTick(renderChart) })
watch(() => props.chart.option, () => void nextTick(renderChart), { deep: true })
onBeforeUnmount(() => { window.removeEventListener('resize', resizeChart); instance?.dispose() })
</script>
