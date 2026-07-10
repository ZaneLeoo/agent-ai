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
      <CodeBlock
        v-else-if="artifact.type === 'code'"
        :code="codeContent"
        :language="codeLanguage"
        show-line-numbers
      >
        <CodeBlockHeader>
          <span>{{ codeFilename }}</span>
          <CodeBlockCopyButton aria-label="复制代码" />
        </CodeBlockHeader>
      </CodeBlock>
      <div
        v-else-if="artifact.type === 'file' || artifact.type === 'document'"
        class="flex items-center gap-3 rounded-xl border bg-muted/20 p-4"
      >
        <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
          <FileTextIcon class="size-5 text-muted-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium">{{ artifact.title }}</div>
          <div class="mt-0.5 text-xs text-muted-foreground">{{ artifact.mimeType || '文件' }}</div>
        </div>
        <a
          v-if="previewUrl"
          :href="previewUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs hover:bg-muted"
        >
          <ExternalLinkIcon class="size-3.5" />预览
        </a>
        <a
          v-if="downloadUrl"
          :href="downloadUrl"
          rel="noopener noreferrer"
          class="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs hover:bg-muted"
        >
          <DownloadIcon class="size-3.5" />下载
        </a>
      </div>
      <pre v-else class="p-4 text-xs text-muted-foreground">{{ JSON.stringify(artifact.payload, null, 2) }}</pre>
    </ArtifactContent>
  </Artifact>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import type { BundledLanguage } from 'shiki'
import { DownloadIcon, ExternalLinkIcon, FileTextIcon } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Artifact, ArtifactContent, ArtifactHeader, ArtifactTitle } from '@/components/ai-elements/artifact'
import {
  normalizeTablePayload,
  safeArtifactUrl,
  type ArtifactItem,
} from '@/lib/artifacts'
import { buildChartOption, type SemanticChartPayload } from '@/lib/chart-options'
import {
  CodeBlock,
  CodeBlockCopyButton,
  CodeBlockHeader,
} from '@/components/ai-elements/code-block'

const props = defineProps<{
  artifact: ArtifactItem
}>()

const chartEl = ref<HTMLElement>()
let chart: echarts.ECharts | undefined

const table = computed(() => normalizeTablePayload(props.artifact.payload))
const codeContent = computed(() => typeof props.artifact.payload.content === 'string'
  ? props.artifact.payload.content : '')
const codeFilename = computed(() => typeof props.artifact.payload.filename === 'string'
  ? props.artifact.payload.filename : `${codeLanguage.value} 代码`)
const codeLanguage = computed<BundledLanguage>(() => normalizeCodeLanguage(props.artifact.payload.language))
const previewUrl = computed(() => safeArtifactUrl(props.artifact.previewUrl))
const downloadUrl = computed(() => safeArtifactUrl(props.artifact.downloadUrl))

function renderChart() {
  if (props.artifact.type !== 'chart' || !chartEl.value) return

  if (!chart) {
    chart = echarts.init(chartEl.value)
  }
  chart.setOption(buildChartOption(props.artifact.payload as SemanticChartPayload), true)
  requestAnimationFrame(() => chart?.resize())
}

function resizeChart() {
  chart?.resize()
}

function normalizeCodeLanguage(value: unknown): BundledLanguage {
  const aliases: Record<string, BundledLanguage> = {
    js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', shell: 'bash', yml: 'yaml',
  }
  const supported = new Set([
    'javascript', 'typescript', 'java', 'sql', 'json', 'python', 'bash',
    'html', 'css', 'markdown', 'xml', 'yaml', 'vue', 'text',
  ])
  const language = typeof value === 'string' ? value.toLowerCase() : 'text'
  return aliases[language] || (supported.has(language) ? language as BundledLanguage : 'text')
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
