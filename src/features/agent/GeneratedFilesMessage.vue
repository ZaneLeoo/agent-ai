<script setup lang="ts">
import { computed, h, onBeforeUnmount, ref } from 'vue'
import { DownloadIcon, EyeIcon, FileIcon, FileSpreadsheetIcon, FileTextIcon, Loader2Icon, PresentationIcon } from '@lucide/vue'
import { isAuthExpiredStatus, notifyAuthExpired, withBaseApi } from '@/api/http'
import { toast } from 'vue-sonner'
import type { AgentFile } from './useAgentChat'
import type { AttachmentData } from '@/components/ai-elements/attachments'
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  Attachments,
} from '@/components/ai-elements/attachments'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const props = defineProps<{
  files: AgentFile[]
  baseApi: string
  token: string
}>()

const downloading = ref<Record<string, boolean>>({})
const previewOpen = ref(false)
const previewUrl = ref('')
const previewFileName = ref('')

function attachmentData(file: AgentFile): AttachmentData {
  return {
    id: file.resourceId,
    type: 'file',
    url: file.downloadUrl ? withBaseApi(props.baseApi, file.downloadUrl) : '#',
    mediaType: file.mediaType || 'application/octet-stream',
    filename: file.name,
  }
}

function fileIcon(file: AgentFile) {
  const extension = (file.extension || '').toLowerCase()
  const Icon = extension === 'xlsx' || extension === 'xls' || extension === 'csv'
    ? FileSpreadsheetIcon
    : extension === 'pptx' || extension === 'ppt'
      ? PresentationIcon
      : extension === 'docx' || extension === 'doc' || extension === 'pdf' || extension === 'txt' || extension === 'md'
        ? FileTextIcon
        : FileIcon
  return h(Icon, { class: 'size-5' })
}

function filePreviewClass(file: AgentFile) {
  const extension = (file.extension || '').toLowerCase()
  if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
    return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300'
  }
  if (extension === 'pptx' || extension === 'ppt') {
    return 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-300'
  }
  if (extension === 'pdf') {
    return 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300'
  }
  if (extension === 'docx' || extension === 'doc') {
    return 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300'
  }
  return 'bg-muted text-muted-foreground'
}

function formatSize(size?: number) {
  if (!size || size < 1024) return size ? `${size} B` : ''
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function canPreview(file: AgentFile) {
  return file.phase === 'available' && file.preview === 'browser'
}

async function fetchFile(file: AgentFile) {
  if (!file.downloadUrl) throw new Error('文件下载地址为空')
  const response = await fetch(withBaseApi(props.baseApi, file.downloadUrl), {
    headers: props.token ? { Authorization: `Bearer ${props.token}` } : {},
  })
  if (!response.ok) {
    if (isAuthExpiredStatus(response.status)) notifyAuthExpired()
    throw new Error('文件读取失败')
  }
  return response.blob()
}

async function download(file: AgentFile) {
  if (downloading.value[file.resourceId]) return
  downloading.value[file.resourceId] = true
  try {
    const blob = await fetchFile(file)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    anchor.click()
    URL.revokeObjectURL(url)
  } catch {
    toast.error('文件下载失败', { description: '文件可能已过期，请重新生成后再试。' })
  } finally {
    downloading.value[file.resourceId] = false
  }
}

async function preview(file: AgentFile) {
  if (!canPreview(file)) return download(file)
  try {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    const blob = await fetchFile(file)
    previewUrl.value = URL.createObjectURL(blob)
    previewFileName.value = file.name
    previewOpen.value = true
  } catch {
    toast.error('文件预览失败', { description: '可以尝试直接下载文件。' })
  }
}

function closePreview(open: boolean) {
  previewOpen.value = open
  if (!open && previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <div v-if="files.length" class="mt-3 w-full max-w-4xl space-y-2">
    <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <FileTextIcon class="size-3.5 text-primary" />
      <span>生成文件</span>
      <span v-if="files.length > 1" class="text-muted-foreground/60">{{ files.length }}</span>
    </div>

    <Attachments variant="list" class="flex flex-row flex-wrap gap-3 w-full">
      <Attachment
        v-for="file in files"
        :key="file.resourceId || file.sourceFileId || file.name"
        :data="attachmentData(file)"
        class="bg-background/50 border border-muted-foreground/15 transition-all duration-200 hover:border-primary/40 hover:bg-muted/30 rounded-xl p-3 flex items-center gap-3 w-full sm:max-w-[400px] shadow-sm shrink-0"
      >
        <!-- 左侧图标区 -->
        <AttachmentPreview :fallback-icon="fileIcon(file)" :class="filePreviewClass(file)" class="size-10 shrink-0 rounded-lg flex items-center justify-center" />
        
        <!-- 中间信息区 (上下双行结构) -->
        <div class="min-w-0 flex-1 flex flex-col gap-0.5 select-text">
          <span class="line-clamp-2 text-sm font-medium text-foreground leading-snug break-all" :title="file.name">
            {{ file.name }}
          </span>
          <span v-if="file.phase === 'failed'" class="truncate text-[11px] font-medium text-destructive leading-none">
            {{ file.error || '保存失败' }}
          </span>
          <span v-else class="truncate text-[11px] text-muted-foreground/80 leading-none">
            {{ formatSize(file.size) }}
          </span>
        </div>

        <!-- 右侧操作按钮 -->
        <div class="flex shrink-0 items-center gap-1.5">
          <Button
            v-if="file.phase === 'available' && canPreview(file)"
            variant="ghost"
            size="icon"
            class="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            title="预览"
            @click="preview(file)"
          >
            <EyeIcon class="size-4" />
          </Button>
          <Button
            v-if="file.phase === 'available'"
            variant="ghost"
            size="icon"
            class="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            title="下载"
            :disabled="downloading[file.resourceId]"
            @click="download(file)"
          >
            <Loader2Icon v-if="downloading[file.resourceId]" class="size-4 animate-spin" />
            <DownloadIcon v-else class="size-4" />
          </Button>
        </div>
      </Attachment>
    </Attachments>

    <Dialog :open="previewOpen" @update:open="closePreview">
      <DialogContent class="flex h-[85vh] max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader class="border-b px-5 py-3">
          <DialogTitle class="truncate text-sm">{{ previewFileName }}</DialogTitle>
        </DialogHeader>
        <iframe v-if="previewUrl" :src="previewUrl" class="min-h-0 flex-1 border-0" title="文件预览" />
      </DialogContent>
    </Dialog>
  </div>
</template>
