<template>
  <Card class="my-4 min-w-0 w-full max-w-2xl overflow-hidden rounded-2xl border-primary/10 bg-card shadow-sm">
    <CardHeader class="flex flex-row items-center justify-between space-y-0 border-b px-4 py-3">
      <div class="flex items-center gap-2">
        <div class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BarChart3Icon class="size-4" />
        </div>
        <div>
          <CardTitle class="text-sm font-semibold">{{ chart.title || chartTypeLabel }}</CardTitle>
          <p class="text-[11px] text-muted-foreground">{{ chartTypeLabel }}</p>
        </div>
      </div>
      <Button
        v-if="chart.phase === 'finished' && chart.option"
        variant="ghost"
        size="icon"
        class="size-8 text-muted-foreground hover:text-foreground"
        title="下载图片"
        @click="downloadChart"
      >
        <DownloadIcon class="size-4" />
      </Button>
    </CardHeader>
    <CardContent class="p-3 relative">
      <!-- 图表容器：一直保持在 DOM 中，防止 ref 为 undefined，在生成后用 v-show 渐显 -->
      <div
        ref="chartElement"
        v-show="chart.phase === 'finished' && chart.option"
        class="w-full"
        :style="{ height: `${chartHeight}px`, minHeight: `${chartHeight}px` }"
      />
      
      <!-- 加载提示占位：在未完成时展示 -->
      <div
        v-if="chart.phase !== 'finished' || !chart.option"
        class="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground"
        :style="{ height: `${chartHeight}px`, minHeight: `${chartHeight}px` }"
      >
        <LoaderCircleIcon class="size-4 animate-spin text-primary" />
        <span>正在为您绘制{{ chartTypeLabel }}…</span>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { BarChart3Icon, DownloadIcon, LoaderCircleIcon } from '@lucide/vue'
import * as echarts from 'echarts'
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AgentChart } from './useAgentChat'

const props = defineProps<{ chart: AgentChart }>()
const chartElement = ref<HTMLElement>()
let instance: echarts.ECharts | undefined
const chartTypeLabel = computed(() => ({ bar: '柱状图', line: '折线图', pie: '饼图' })[props.chart.chartType] || '图表')
const chartHeight = computed(() => props.chart.chartType === 'pie' ? 300 : 260)

function renderChart() {
  if (!chartElement.value || !props.chart.option) return

  if (chartElement.value.clientWidth === 0 || chartElement.value.clientHeight === 0) {
    console.warn('[ChartMessage] chart container has no size; skip rendering')
    return
  }

  try {
    instance?.dispose()
    instance = echarts.init(chartElement.value)

    let opt = props.chart.option
    if (typeof opt === 'string') {
      try {
        opt = JSON.parse(opt)
      } catch (e) {
        console.error('[ChartMessage] option parse from string failed', e)
      }
    }

    instance.setOption(opt as echarts.EChartsOption, { notMerge: true })
  } catch (err) {
    console.error('[ChartMessage] ECharts init or setOption failed:', err)
  }
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
onUpdated(() => void nextTick(renderChart))
watch(() => [props.chart.phase, props.chart.option], () => void nextTick(renderChart), { deep: true, flush: 'post' })
onBeforeUnmount(() => { window.removeEventListener('resize', resizeChart); instance?.dispose() })
</script>
