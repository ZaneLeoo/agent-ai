import { reactive, ref } from 'vue'
import { getCaptcha, getUserInfo, login } from '@/api/auth'
import type { createBootstrapStore } from '@/lib/bootstrap'

type BootstrapStore = ReturnType<typeof createBootstrapStore>

export function useAgentAuth(
  bootstrap: BootstrapStore,
  options: {
    onLoginSuccess?: () => Promise<void> | void
  } = {},
) {
  const loggingIn = ref(false)
  const loginError = ref('')
  const showPassword = ref(false)
  const captchaEnabled = ref(false)
  const captchaImage = ref('')
  const loginForm = reactive({
    username: '',
    password: '',
    code: '',
    uuid: '',
  })

  async function handleLogin() {
    if (loggingIn.value) return
    loginError.value = ''
    const username = loginForm.username.trim()
    const password = loginForm.password
    if (!username || !password) {
      loginError.value = '请输入用户名和密码'
      return
    }

    loggingIn.value = true
    try {
      const result = await login(bootstrap.state.baseApi, {
        username,
        password,
        code: captchaEnabled.value ? loginForm.code.trim() : undefined,
        uuid: captchaEnabled.value ? loginForm.uuid : undefined,
      })
      const user = await getUserInfo(bootstrap.state.baseApi, result.token)
        .catch(() => ({ nickName: '', userName: '' }))
      bootstrap.setAuth(result.token, user.nickName || user.userName || username)
      loginForm.password = ''
      loginForm.code = ''
      await options.onLoginSuccess?.()
    } catch (e: unknown) {
      loginError.value = e instanceof Error ? e.message : '登录失败'
      if (captchaEnabled.value) refreshCaptcha()
    } finally {
      loggingIn.value = false
    }
  }

  async function refreshCaptcha() {
    try {
      const captcha = await getCaptcha(bootstrap.state.baseApi)
      captchaEnabled.value = captcha.captchaEnabled
      loginForm.uuid = captcha.uuid || ''
      captchaImage.value = captcha.img ? `data:image/jpeg;base64,${captcha.img}` : ''
      if (!captcha.captchaEnabled) {
        loginForm.code = ''
      }
    } catch {
      captchaEnabled.value = false
      captchaImage.value = ''
      loginForm.uuid = ''
    }
  }

  function clearAuth() {
    bootstrap.clearAuth()
    loginError.value = ''
    refreshCaptcha()
  }

  return {
    loggingIn,
    loginError,
    showPassword,
    captchaEnabled,
    captchaImage,
    loginForm,
    handleLogin,
    refreshCaptcha,
    clearAuth,
  }
}
