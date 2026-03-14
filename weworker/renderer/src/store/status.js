import { create } from 'zustand'
import { useWorksStore } from './works.js'

const API = 'http://127.0.0.1:8765'

export const useStatusStore = create((set, get) => ({
  bridge: 'unknown',
  extension: 'unknown',
  python: 'unknown',
  toolsCount: 0,
  channels: {},
  _lastExternalWrite: '',

  poll: async () => {
    try {
      const res = await fetch(`${API}/status`)
      if (res.ok) {
        const data = await res.json()
        const prev = get()._lastExternalWrite
        const next = data.external_write ?? ''

        set({
          bridge: data.bridge,
          extension: data.extension,
          toolsCount: data.tools_count,
          channels: data.channels ?? {},
          python: 'running',
          _lastExternalWrite: next,
        })

        // A QQ/channel message arrived — refresh works list and active work
        if (next && next !== prev) {
          const worksStore = useWorksStore.getState()
          await worksStore.loadWorks()
          const activeId = worksStore.activeWorkId
          if (activeId) {
            // Force re-fetch messages for the active work
            const res2 = await fetch(`${API}/works/${activeId}`)
            if (res2.ok) {
              const d = await res2.json()
              useWorksStore.setState((s) => ({
                messages: { ...s.messages, [activeId]: d.messages },
              }))
            }
          }
        }
      }
    } catch {
      set({ python: 'disconnected', bridge: 'unknown', extension: 'unknown' })
    }
  },
}))
