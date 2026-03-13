import { create } from 'zustand'

const API = 'http://127.0.0.1:8765'

export const useWorksStore = create((set, get) => ({
  works: [],
  activeWorkId: null,
  messages: {}, // workId -> Message[]

  loadWorks: async () => {
    const res = await fetch(`${API}/works`)
    const works = await res.json()
    set({ works })
  },

  createWork: async () => {
    const res = await fetch(`${API}/works`, { method: 'POST' })
    const work = await res.json()
    set((s) => ({ works: [work, ...s.works], activeWorkId: work.id }))
    return work
  },

  selectWork: async (id) => {
    set({ activeWorkId: id })
    if (!get().messages[id]) {
      const res = await fetch(`${API}/works/${id}`)
      const data = await res.json()
      set((s) => ({ messages: { ...s.messages, [id]: data.messages } }))
    }
  },

  deleteWork: async (id) => {
    await fetch(`${API}/works/${id}`, { method: 'DELETE' })
    set((s) => {
      const works = s.works.filter((w) => w.id !== id)
      const messages = { ...s.messages }
      delete messages[id]
      return {
        works,
        messages,
        activeWorkId: s.activeWorkId === id ? (works[0]?.id ?? null) : s.activeWorkId,
      }
    })
  },

  updateTitle: async (id, title) => {
    await fetch(`${API}/works/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    set((s) => ({
      works: s.works.map((w) => (w.id === id ? { ...w, title } : w)),
    }))
  },

  appendMessage: (workId, msg) => {
    set((s) => ({
      messages: {
        ...s.messages,
        [workId]: [...(s.messages[workId] ?? []), msg],
      },
    }))
  },

  updateLastMessage: (workId, updater) => {
    set((s) => {
      const msgs = s.messages[workId] ?? []
      if (!msgs.length) return s
      const updated = [...msgs]
      updated[updated.length - 1] = updater(updated[updated.length - 1])
      return { messages: { ...s.messages, [workId]: updated } }
    })
  },
}))
