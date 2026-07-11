<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CollapsibleContent } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { Markdown } from 'vue-stream-markdown'
import 'vue-stream-markdown/index.css'

interface Props {
  class?: HTMLAttributes['class']
  content?: string
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
})
</script>

<template>
  <CollapsibleContent
    :class="cn(
      'mt-2 outline-none',
      'data-[state=closed]:animate-out data-[state=open]:animate-in',
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2',
      'data-[state=open]:slide-in-from-top-2',
      props.class,
    )"
  >
    <slot>
      <Markdown :content="props.content" />
    </slot>
  </CollapsibleContent>
</template>
