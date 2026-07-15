<script setup lang="ts">
import { PaperclipIcon } from '@lucide/vue'
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@/components/ai-elements/attachments'
import { PromptInputButton, usePromptInput } from '@/components/ai-elements/prompt-input'

const { files, openFileDialog, removeFile } = usePromptInput()
</script>

<template>
  <div class="flex min-w-0 flex-1 items-center gap-2">
    <PromptInputButton title="添加图片或文件" aria-label="添加图片或文件" @click="openFileDialog">
      <PaperclipIcon class="size-4" />
    </PromptInputButton>
    <Attachments v-if="files.length" variant="inline" class="min-w-0 flex-nowrap overflow-x-auto">
      <Attachment
        v-for="file in files"
        :key="file.id"
        :data="file"
        class="max-w-52 shrink-0"
        @remove="removeFile(file.id)"
      >
        <AttachmentPreview />
        <AttachmentInfo />
        <AttachmentRemove label="移除附件" />
      </Attachment>
    </Attachments>
  </div>
</template>
