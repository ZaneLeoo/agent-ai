<template>
  <div class="flex size-full h-screen items-center justify-center bg-background px-6 py-10">
    <div class="flex w-full max-w-[380px] flex-col items-center">
      <div class="mb-10 flex flex-col items-center gap-5">
        <div class="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <SparklesIcon class="size-6" />
        </div>
        <div class="space-y-2 text-center">
          <h1 class="text-3xl font-semibold tracking-normal text-foreground">登录</h1>
          <p class="text-sm text-muted-foreground">继续使用企业智能体</p>
        </div>
      </div>

      <form class="w-full space-y-4" @submit.prevent="emit('submit')">
        <div class="space-y-3">
          <Input
            v-model="form.username"
            class="login-input h-12 rounded-xl bg-background px-4 text-base"
            autocomplete="username"
            placeholder="用户名"
          />
          <div class="relative">
            <Input
              v-model="form.password"
              class="login-input h-12 rounded-xl bg-background px-4 pr-12 text-base"
              autocomplete="current-password"
              placeholder="密码"
              :type="showPassword ? 'text' : 'password'"
            />
            <button
              class="absolute right-3 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              type="button"
              title="切换密码可见性"
              @click="emit('update:showPassword', !showPassword)"
            >
              <EyeOffIcon v-if="showPassword" class="size-4" />
              <EyeIcon v-else class="size-4" />
            </button>
          </div>
          <div v-if="captchaEnabled" class="flex gap-2">
            <Input
              v-model="form.code"
              class="login-input h-11 rounded-xl bg-background px-4 text-sm"
              placeholder="验证码"
            />
            <button
              class="h-11 w-28 overflow-hidden rounded-xl border bg-muted text-xs text-muted-foreground"
              type="button"
              title="刷新验证码"
              @click="emit('refreshCaptcha')"
            >
              <img
                v-if="captchaImage"
                :src="captchaImage"
                alt="验证码"
                class="size-full object-cover"
              >
              <span v-else>刷新</span>
            </button>
          </div>
          <div v-if="loginError" class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {{ loginError }}
          </div>
        </div>
        <Button class="h-12 w-full rounded-xl text-base font-medium shadow-sm" type="submit" :disabled="loggingIn">
          {{ loggingIn ? '登录中...' : '登录' }}
        </Button>
      </form>
      <p class="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
        使用 RuoYi 账号访问你的会话、图表和知识库来源。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EyeIcon, EyeOffIcon, SparklesIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

defineProps<{
  form: {
    username: string
    password: string
    code: string
    uuid: string
  }
  captchaEnabled: boolean
  captchaImage: string
  loginError: string
  loggingIn: boolean
  showPassword: boolean
}>()

const emit = defineEmits<{
  submit: []
  refreshCaptcha: []
  'update:showPassword': [showPassword: boolean]
}>()
</script>

<style scoped>
.login-input:-webkit-autofill,
.login-input:-webkit-autofill:hover,
.login-input:-webkit-autofill:focus,
.login-input:-webkit-autofill:active {
  -webkit-text-fill-color: var(--foreground);
  box-shadow: 0 0 0 1000px var(--background) inset;
  caret-color: var(--foreground);
  transition: background-color 9999s ease-out;
}
</style>
