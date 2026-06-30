import { reactive } from 'vue'
import type { AgentBootstrapPayload } from '@/types/agent'

const BOOTSTRAP_TYPE = 'agent-ui:bootstrap'
const READY_TYPE = 'agent-ui:ready'
const STORAGE_KEY = 'agent-ui:auth'

export interface BootstrapState {
  ready: boolean
  embedded: boolean
  token: string
  baseApi: string
  userName: string
}

export function createBootstrapStore() {
  const persisted = readPersistedAuth()
  const state = reactive<BootstrapState>({
    ready: false,
    embedded: window.parent !== window,
    token: persisted.token || import.meta.env.VITE_AGENT_TOKEN || '',
    baseApi: import.meta.env.VITE_APP_BASE_API ?? '/dev-api',
    userName: persisted.userName || '开发用户',
  })

  const applyPayload = (payload: AgentBootstrapPayload) => {
    state.token = payload.token ?? ''
    state.baseApi = payload.baseApi || '/dev-api'
    state.userName = payload.user?.nickName || payload.user?.name || '当前用户'
    state.ready = true
  }

  const setAuth = (token: string, userName: string) => {
    state.token = token
    state.userName = userName || '当前用户'
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: state.token, userName: state.userName }))
  }

  const clearAuth = () => {
    state.token = ''
    state.userName = '开发用户'
    localStorage.removeItem(STORAGE_KEY)
  }

  const onMessage = (event: MessageEvent) => {
    if (event.source !== window.parent) return
    if (!event.data || event.data.type !== BOOTSTRAP_TYPE) return
    applyPayload(event.data.payload)
  }

  const start = () => {
    window.addEventListener('message', onMessage)

    if (state.embedded) {
      window.parent.postMessage({ type: READY_TYPE }, '*')
      return
    }

    state.ready = true
  }

  const stop = () => {
    window.removeEventListener('message', onMessage)
  }

  return {
    state,
    setAuth,
    clearAuth,
    start,
    stop,
  }
}

function readPersistedAuth(): { token: string; userName: string } {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      token: typeof parsed.token === 'string' ? parsed.token : '',
      userName: typeof parsed.userName === 'string' ? parsed.userName : '',
    }
  } catch {
    return { token: '', userName: '' }
  }
}
