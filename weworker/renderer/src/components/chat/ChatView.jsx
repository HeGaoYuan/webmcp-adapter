import React, { useEffect, useRef, useState } from 'react'
import { useWorksStore } from '../../store/works.js'
import MessageList from './MessageList.jsx'
import InputBar from './InputBar.jsx'
import WelcomeScreen from '../welcome/WelcomeScreen.jsx'
import { streamChat } from '../../api/backend.js'

export default function ChatView({ workId }) {
  const messages = useWorksStore((s) => s.messages[workId] ?? [])
  const appendMessage = useWorksStore((s) => s.appendMessage)
  const updateLastMessage = useWorksStore((s) => s.updateLastMessage)
  const selectWork = useWorksStore((s) => s.selectWork)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)
  const handleSendRef = useRef(null)

  const handleStop = () => {
    abortRef.current?.abort()
  }

  const handleSend = async (text) => {
    if (!text.trim() || streaming) return
    setError(null)
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    appendMessage(workId, { id: Date.now() + '-u', role: 'user', content: [{ type: 'text', text }] })
    appendMessage(workId, { id: Date.now() + '-a', role: 'assistant', content: [] })

    try {
      await streamChat(workId, text, (event) => {
        updateLastMessage(workId, (msg) => {
          const content = [...msg.content]

          if (event.type === 'text_delta') {
            const last = content[content.length - 1]
            if (last?.type === 'text') {
              return { ...msg, content: [...content.slice(0, -1), { type: 'text', text: last.text + event.content }] }
            }
            return { ...msg, content: [...content, { type: 'text', text: event.content }] }
          }

          if (event.type === 'tool_call_start') {
            return { ...msg, content: [...content, { type: 'tool_use', id: event.id, name: event.name, args: event.args, status: 'running' }] }
          }

          if (event.type === 'tool_call_result') {
            return {
              ...msg,
              content: content.map((b) =>
                b.type === 'tool_use' && b.id === event.id
                  ? { ...b, result: event.result ?? '(no result)', status: 'done' }
                  : b
              ),
            }
          }

          if (event.type === 'tool_call_image') {
            return {
              ...msg,
              content: content.map((b) =>
                b.type === 'tool_use' && b.id === event.id
                  ? { ...b, image: event.data, status: 'done' }
                  : b
              ),
            }
          }

          return msg
        })
      }, controller.signal)
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message)
        updateLastMessage(workId, (msg) => ({
          ...msg,
          content: [...msg.content, { type: 'error', text: e.message }],
        }))
      }
    } finally {
      abortRef.current = null
      setStreaming(false)
    }
  }

  // Keep ref up to date so the effect below can call the latest handleSend
  handleSendRef.current = handleSend

  useEffect(() => {
    const init = async () => {
      await selectWork(workId)
      const pending = useWorksStore.getState().pendingMessage
      if (pending) {
        useWorksStore.setState({ pendingMessage: null })
        handleSendRef.current(pending)
      }
    }
    init()
  }, [workId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {messages.length === 0 ? <WelcomeScreen /> : <MessageList messages={messages} streaming={streaming} />}
      {error && (
        <div style={{ padding: '8px 20px', color: 'var(--error)', fontSize: 12, background: 'rgba(248,113,113,0.1)' }}>
          {error}
        </div>
      )}
      <InputBar onSend={handleSend} onStop={handleStop} disabled={streaming} streaming={streaming} />
    </div>
  )
}
