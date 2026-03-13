const API = 'http://127.0.0.1:8765'

export async function streamChat(workId, message, onEvent, signal) {
  const res = await fetch(`${API}/works/${workId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        try {
          onEvent(JSON.parse(data))
        } catch {}
      }
    }
  } catch (e) {
    if (e.name === 'AbortError') return  // user cancelled
    throw e
  }
}

export async function getSites() {
  const res = await fetch(`${API}/sites`)
  return res.json()
}
