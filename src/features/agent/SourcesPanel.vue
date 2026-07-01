<template>
  <Sources
    v-if="sources.length"
    class="mt-4 w-full text-muted-foreground"
  >
    <SourcesTrigger
      :count="sources.length"
      class="group inline-flex w-fit rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/60"
    >
      <BookOpenIcon class="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
      <span class="font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-4 group-hover:text-primary group-hover:decoration-primary">
        参考来源 {{ sources.length }}
      </span>
      <span class="text-xs text-muted-foreground">知识库召回</span>
      <ChevronDownIcon class="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </SourcesTrigger>
    <SourcesContent class="w-full max-w-full">
      <Source
        v-for="source in visibleSources"
        :key="source.id"
        :href="`#${source.id}`"
        :title="source.title"
        class="block rounded-md border bg-background p-3 text-left no-underline transition-colors hover:bg-accent/40"
        @click.prevent
      >
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="font-medium text-foreground">{{ source.title }}</span>
          <span v-if="formatSourceScore(source.score)" class="text-xs text-muted-foreground">
            相关度 {{ formatSourceScore(source.score) }}
          </span>
        </div>
        <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {{ source.content }}
        </p>
      </Source>
      <div
        v-if="sources.length > maxVisible"
        class="text-xs text-muted-foreground"
      >
        还有 {{ sources.length - maxVisible }} 条来源暂未展开展示
      </div>
    </SourcesContent>
  </Sources>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BookOpenIcon, ChevronDownIcon } from '@lucide/vue'
import { Source, Sources, SourcesContent, SourcesTrigger } from '@/components/ai-elements/sources'
import { formatSourceScore, type AgentSourceItem } from '@/lib/sources'

const props = withDefaults(defineProps<{
  sources: AgentSourceItem[]
  maxVisible?: number
}>(), {
  maxVisible: 3,
})

const visibleSources = computed(() => props.sources.slice(0, props.maxVisible))
</script>
