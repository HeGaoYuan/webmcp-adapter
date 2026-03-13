import { create } from 'zustand'

const API = 'http://127.0.0.1:8765'

export const useStatusStore = create((set) => ({
  bridge: 'unknown',
  extension: 'unknown',
  python: 'unknown',
  toolsCount: 0,

  poll: async () => {
    try {
      const res = await fetch(`${API}/status`)
      if (res.ok) {
        const data = await res.json()
        set({
          bridge: data.bridge,
          extension: data.extension,
          toolsCount: data.tools_count,
          python: 'running',
        })
      }
    } catch {
      set({ python: 'disconnected', bridge: 'unknown', extension: 'unknown' })
    }
  },
}))
