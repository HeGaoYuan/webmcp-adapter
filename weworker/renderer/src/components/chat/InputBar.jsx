import React, { useState, useRef } from 'react'

export default function InputBar({ onSend, onStop, disabled, streaming }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    textareaRef.current?.focus()
  }

  return (
    <div style={{
      padding: '12px 20px 16px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '8px 12px',
      }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={streaming ? '正在处理...' : '输入消息，Enter 发送，Shift+Enter 换行'}
          disabled={streaming}
          rows={1}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 14,
            resize: 'none',
            maxHeight: 120,
            overflowY: 'auto',
            lineHeight: 1.5,
            fontFamily: 'inherit',
          }}
          onInput={(e) => {
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
        />
        {streaming ? (
          <button
            onClick={onStop}
            title="停止生成"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            ■ 停止
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!text.trim()}
            style={{
              background: !text.trim() ? 'var(--bg-tertiary)' : 'var(--bg-active)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: !text.trim() ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: !text.trim() ? 'not-allowed' : 'pointer',
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            发送
          </button>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
        {streaming ? 'ESC 或点击停止按钮中断生成' : 'Enter 发送 · Shift+Enter 换行'}
      </div>
    </div>
  )
}
