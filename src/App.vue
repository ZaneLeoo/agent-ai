<template>
  <AgentChat />
  <Toaster position="top-right" rich-colors close-button />
</template>

<script setup lang="ts">
import 'vue-sonner/style.css'
import AgentChat from '@/views/AgentChat.vue'
import { Toaster } from 'vue-sonner'
</script>
