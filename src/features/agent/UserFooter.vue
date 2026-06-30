<template>
  <div class="mt-3 border-t pt-3">
    <div class="flex items-center gap-2 rounded-md px-2 py-2">
      <Avatar class="size-8">
        <AvatarFallback>{{ userInitial }}</AvatarFallback>
      </Avatar>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium">{{ userName }}</div>
        <div class="text-xs text-muted-foreground">已登录</div>
      </div>
      <Button variant="ghost" size="sm" class="px-2" @click="emit('logout')">
        退出
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

defineProps<{
  userInitial: string
  userName: string
}>()

const emit = defineEmits<{
  logout: []
}>()
</script>
