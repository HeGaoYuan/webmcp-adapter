import { create } from 'zustand'

const API = 'http://127.0.0.1:8765'

export const useSettingsStore = create((set, get) => ({
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  hasApiKey: false,
  loaded: false,
  channels: { qq: { enabled: false, app_id: '', has_app_secret: false } },

  load: async () => {
    try {
      const [res, chRes] = await Promise.all([
        fetch(`${API}/settings`),
        fetch(`${API}/settings/channels`),
      ])
      const data = await res.json()
      const chData = await chRes.json()
      set({ baseUrl: data.base_url, model: data.model, hasApiKey: data.has_api_key, loaded: true, channels: chData })
    } catch {}
  },

  save: async (updates) => {
    const res = await fetch(`${API}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    set({ baseUrl: data.base_url, model: data.model, hasApiKey: data.has_api_key })
  },

  saveChannels: async (updates) => {
    const res = await fetch(`${API}/settings/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json()
    set({ channels: data })
  },
}))

export const PRESETS = [
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: 'Qwen', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-max' },
  { label: 'Claude (proxy)', baseUrl: '', model: 'claude-sonnet-4-6' },
]
