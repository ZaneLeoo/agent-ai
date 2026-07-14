<template>
  <Message
    :from="message.role"
    :class="message.role === 'assistant' ? 'w-full max-w-none' : undefined"
  >
    <MessageContent
      :class="message.role === 'assistant' ? 'w-full max-w-full gap-3 overflow-visible' : 'min-w-0'"
    >
      <!-- 统一的执行过程折叠块 -->
      <Reasoning
        v-if="reasoningChain.length"
        :is-streaming="message.streaming"
        class="mb-3"
      >
        <ReasoningTrigger />
        <ReasoningContent>
          <div class="mt-3 space-y-3">
            <template v-for="(block, idx) in reasoningChain" :key="idx">
              <!-- 思考段落：带引用线与小字号排版 -->
              <div
                v-if="block.type === 'reasoning'"
                class="pl-4 border-l-2 border-muted-foreground/25 text-muted-foreground/80 text-[13px] leading-relaxed"
              >
                <Markdown :content="block.content" />
              </div>

              <!-- 工具调用段落：原装 Task 卡片样式（宽度自适应、无折叠箭头） -->
              <Task
                v-else-if="block.type === 'tool'"
                :default-open="false"
                class="rounded-md border px-3 py-2 bg-background/50 w-fit"
              >
                <template #default>
                  <TaskTrigger title="工具调用">
                    <div class="flex items-center gap-2 text-muted-foreground text-sm">
                      <Search class="size-4" />
                      <p class="text-sm">
                        {{ block.tool.phase === 'finished' ? '已完成' : '正在调用' }}：{{ block.tool.toolLabel || block.tool.toolName }}
                      </p>
                    </div>
                  </TaskTrigger>
                </template>
              </Task>
            </template>
          </div>
        </ReasoningContent>
      </Reasoning>

      <!-- 最终回复正文 -->
      <MessageResponse
        v-if="renderedAnswerText"
        :content="renderedAnswerText"
        class="h-auto min-h-0 w-full"
      />

      <ChartMessage
        v-for="chart in message.charts"
        :key="chart.callId"
        :chart="chart"
      />

      <GeneratedFilesMessage
        v-if="message.files?.length"
        :files="message.files"
        :base-api="baseApi"
        :token="token"
      />

      <template v-if="!message.streaming">
        <PurchaseOrderDraftCard
          v-for="draft in message.purchaseOrderDrafts"
          :key="draft.callId"
          :item="draft"
          @confirm="emit('confirmPurchaseOrder', $event)"
        />
      </template>

      <!-- 知识库来源引用 -->
      <Sources
        v-if="message.knowledges && message.knowledges.length"
        class="mt-3"
      >
        <SourcesTrigger :count="sourceCount">
          <div class="flex items-center gap-1.5 text-xs font-medium text-primary/85 hover:text-primary cursor-pointer transition-colors">
            <span>参考了 {{ sourceCount }} 个知识库片段</span>
            <ChevronDown class="size-3.5 text-primary/60 transition-transform group-data-[state=open]:rotate-180" />
          </div>
        </SourcesTrigger>
        <SourcesContent>
          <template v-for="kb in message.knowledges" :key="kb.callId">
            <Source
              v-for="source in kb.sources"
              :key="source.sourceId"
              href="#"
              :title="source.documentName"
              class="my-1 block pointer-events-none cursor-default rounded-md border px-3 py-2 text-[13px] text-muted-foreground"
            >
              <div class="flex items-start gap-2">
                <BookIcon class="mt-0.5 size-3.5 shrink-0 text-primary/80" />
                <div class="min-w-0">
                  <div class="font-medium text-foreground">{{ source.documentName }}</div>
                  <p class="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed">{{ source.content }}</p>
                  <span v-if="source.score !== undefined" class="mt-1 block text-[11px] text-muted-foreground/60">匹配度：{{ source.score.toFixed(3) }}</span>
                </div>
              </div>
            </Source>
            <Source
              v-if="!kb.sources?.length"
              :key="`${kb.callId}-fallback`"
              href="#"
              :title="kb.datasetLabel || kb.datasetId"
              class="my-1 block pointer-events-none cursor-default text-[13px] text-muted-foreground"
            >
              <div class="flex items-center gap-2">
                <BookIcon class="size-3.5 text-primary/80" />
                <span>知识库：{{ kb.datasetLabel || kb.datasetId }}</span>
              </div>
            </Source>
          </template>
        </SourcesContent>
      </Sources>

      <!-- 弱化的悬浮操作栏 (Hover 时渐显，且在流式输出结束、有内容时呈现) -->
      <MessageToolbar
        v-if="message.role === 'assistant' && message.content && !message.streaming"
        class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-2"
      >
        <MessageActions>
          <MessageAction
            :tooltip="copied ? '已复制' : '复制内容'"
            @click="emit('copy', message)"
          >
            <CheckIcon v-if="copied" class="size-4 text-emerald-500" />
            <CopyIcon v-else class="size-4 text-muted-foreground/80" />
          </MessageAction>
          <MessageAction
            v-slot="actionProps"
            v-if="message.retryQuery && !retryDisabled"
            tooltip="重新生成"
            @click="emit('retry', message)"
          >
            <RotateCw class="size-4 text-muted-foreground/80" v-bind="actionProps" />
          </MessageAction>
        </MessageActions>
      </MessageToolbar>
      <div
        v-if="message.stopped"
        class="mt-2 flex items-center gap-1.5 text-xs text-destructive"
      >
        <span class="block size-1.5 rounded-full bg-destructive" />
        已停止生成
      </div>
      <div
        v-if="message.error"
        class="mt-2 flex flex-wrap items-center gap-2 text-xs text-destructive"
      >
        <span>{{ message.error }}</span>
        <Button
          v-if="message.retryQuery"
          class="h-7 px-2 text-xs"
          size="sm"
          variant="outline"
          type="button"
          :disabled="retryDisabled"
          @click="emit('retry', message)"
        >
          重试
        </Button>
      </div>
    </MessageContent>
  </Message>
</template>

<script setup lang="ts">
import { CheckIcon, CopyIcon, Search, BookIcon, ChevronDown, RotateCw, SparklesIcon } from '@lucide/vue'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Markdown } from 'vue-stream-markdown'
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageToolbar,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import { Task, TaskContent, TaskItem, TaskTrigger } from '@/components/ai-elements/task'
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from '@/components/ai-elements/sources'
import type { AgentToolCall, AgentKnowledgeCall, AgentChart } from './useAgentChat'
import type { AgentFile } from './useAgentChat'
import ChartMessage from './ChartMessage.vue'
import GeneratedFilesMessage from './GeneratedFilesMessage.vue'
import PurchaseOrderDraftCard from './PurchaseOrderDraftCard.vue'
import type { AgentPurchaseOrderDraft } from '@/types/automation'

export interface AgentChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming: boolean
  stopped: boolean
  failed: boolean
  error: string
  retryQuery: string
  tools: AgentToolCall[]
  knowledges: AgentKnowledgeCall[]
  charts: AgentChart[]
  files: AgentFile[]
  purchaseOrderDrafts: AgentPurchaseOrderDraft[]
}

const props = defineProps<{
  message: AgentChatMessage
  copied: boolean
  retryDisabled: boolean
  baseApi: string
  token: string
}>()

const sourceCount = computed(() => props.message.knowledges.reduce((count, item) => count + (item.sources?.length || 1), 0))

function formatValue(value: unknown) {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

// 1. 将文本按 think 标签切割为多段
type AnswerBlock = { type: 'answer'; content: string }
type ReasoningBlock = { type: 'reasoning'; content: string; streaming?: boolean }
type ToolBlock = { type: 'tool'; tool: AgentToolCall }
type DisplayBlock = AnswerBlock | ReasoningBlock | ToolBlock

function parseContentToBlocks(content: string, isStreaming: boolean): Array<AnswerBlock | ReasoningBlock> {
  const blocks: Array<AnswerBlock | ReasoningBlock> = []
  let remaining = content
  const thinkStartRegex = /<think(?:\s[^>]*)?>/i
  const thinkEndRegex = /<\/think\s*>/i

  while (remaining.length > 0) {
    const startMatch = thinkStartRegex.exec(remaining)
    if (!startMatch || startMatch.index === undefined) {
      blocks.push({ type: 'answer', content: remaining })
      break
    }

    if (startMatch.index > 0) {
      blocks.push({ type: 'answer', content: remaining.slice(0, startMatch.index) })
    }

    const reasoningStart = startMatch.index + startMatch[0].length
    const rest = remaining.slice(reasoningStart)
    const endMatch = thinkEndRegex.exec(rest)

    if (!endMatch || endMatch.index === undefined) {
      blocks.push({
        type: 'reasoning',
        content: rest,
        streaming: isStreaming,
      })
      remaining = ''
    } else {
      blocks.push({
        type: 'reasoning',
        content: rest.slice(0, endMatch.index),
        streaming: false,
      })
      remaining = rest.slice(endMatch.index + endMatch[0].length)
    }
  }
  return blocks
}

// 2. 结合 tools，以时序交织穿插构建 displayBlocks
const displayBlocks = computed<DisplayBlock[]>(() => {
  if (props.message.role === 'user') {
    return [{ type: 'answer', content: props.message.content }]
  }

  const blocks = parseContentToBlocks(props.message.content, props.message.streaming)
  const result: DisplayBlock[] = []

  let toolIndex = 0

  for (const block of blocks) {
    if (block.type === 'reasoning') {
      result.push(block)
      // 在流式过程中，某段思考一旦结束（闭合标签匹配成功），就立即在这个段落后面插入当时对应的工具调用
      if (!block.streaming) {
        if (toolIndex < props.message.tools.length) {
          result.push({ type: 'tool', tool: props.message.tools[toolIndex] })
          toolIndex++
        }
      }
    } else {
      // 避免时序错位：在渲染正文前把中间积压 of 工具调用先全部渲染
      while (toolIndex < props.message.tools.length) {
        result.push({ type: 'tool', tool: props.message.tools[toolIndex] })
        toolIndex++
      }
      result.push(block)
    }
  }

  // 兜底：流渲染完如果还有剩余的工具对象，则追加在末尾
  while (toolIndex < props.message.tools.length) {
    result.push({ type: 'tool', tool: props.message.tools[toolIndex] })
    toolIndex++
  }

  return result
})

// 收集思考和工具组成的链条
const reasoningChain = computed(() => {
  return displayBlocks.value.filter(block => block.type === 'reasoning' || block.type === 'tool')
})

// 合并拼接出最终的回复正文
const answerText = computed(() => {
  return displayBlocks.value
    .filter(block => block.type === 'answer')
    .map(block => block.content)
    .join('')
})

// Dify 文件插件会在文本中输出 /files/tools/... 链接。该地址是 Dify 内部路径，
// 浏览器不能直接携带 RuoYi JWT 访问，也不应触发外部链接确认；文件卡片负责下载。
const renderedAnswerText = computed(() => sanitizeDifyFileLinks(answerText.value))

function sanitizeDifyFileLinks(content: string) {
  const sanitized = content.replace(
    /\[([^\]\n]+)\]\((?:(?:https?:\/\/[^)\s]+)?\/files\/tools\/[^)\s]+)\)/gi,
    '**$1**',
  )
  // 文件卡片已经展示了文件名，正文中常见的“文件名称：xxx.xlsx”仅保留一次即可。
  return sanitized.replace(
    /^\s*(?:[-*]\s*)?(?:\*{0,2})文件(?:名称|名)(?:\*{0,2})\s*[:：].*\.(?:xlsx?|docx?|pdf|pptx?)\s*$/gim,
    '',
  )
}

const emit = defineEmits<{
  copy: [message: AgentChatMessage]
  retry: [message: AgentChatMessage]
  confirmPurchaseOrder: [item: AgentPurchaseOrderDraft]
}>()
</script>
