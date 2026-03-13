import React, { useState } from 'react'
import ImageLightbox from './ImageLightbox.jsx'

function safeStringify(val) {
  if (val == null) return '(empty)'
  if (typeof val === 'string') return val
  try {
    return JSON.stringify(val, null, 2)
  } catch {
    return String(val)
  }
}

export default function ToolCallBlock({ block }) {
  const [open, setOpen] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const running = block.status === 'running'

  return (
    <div style={{
      margin: '6px 0',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      fontSize: 12,
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 14 }}>{running ? '⏳' : '🔧'}</span>
        <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 11 }}>{block.name}</span>
        <span style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.2)' }}>
          {block.args && Object.keys(block.args).length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 3 }}>参数</div>
              <pre style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(block.args, null, 2)}
              </pre>
            </div>
          )}

          {block.image && (
            <div style={{ marginTop: 6 }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>截图</div>
              <img
                src={`data:image/jpeg;base64,${block.image}`}
                alt="screenshot"
                onDoubleClick={() => setLightbox(true)}
                title="双击放大"
                style={{ maxWidth: '100%', borderRadius: 6, border: '1px solid var(--border)', cursor: 'zoom-in' }}
              />
              {lightbox && (
                <ImageLightbox
                  src={`data:image/jpeg;base64,${block.image}`}
                  onClose={() => setLightbox(false)}
                />
              )}
            </div>
          )}

          {block.result && !block.image && (
            <div style={{ marginTop: 6 }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 3 }}>结果</div>
              <pre style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflowY: 'auto' }}>
                {safeStringify(block.result)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
