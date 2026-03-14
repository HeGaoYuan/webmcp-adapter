import React, { useState, useEffect } from 'react'
import { useStatusStore } from '../../store/status.js'

const API = 'http://127.0.0.1:8765'

const EMOJI = {
  'mail.google.com': '📧',
  'mail.163.com': '📮',
  'www.jd.com': '🛒',
  'www.xiaohongshu.com': '📕',
}

export default function SitesPanel() {
  const [expanded, setExpanded] = useState(false)
  const [domains, setDomains] = useState([])
  const extension = useStatusStore((s) => s.extension)
  const connected = extension === 'connected'

  useEffect(() => {
    if (!expanded) return
    fetch(`${API}/tools`)
      .then((r) => r.json())
      .then(setDomains)
      .catch(() => {})
  }, [expanded])

  // Also refresh when extension connects
  useEffect(() => {
    if (connected && expanded) {
      fetch(`${API}/tools`).then((r) => r.json()).then(setDomains).catch(() => {})
    }
  }, [connected])

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%', background: 'none', border: 'none',
          color: 'var(--text-muted)', cursor: 'pointer',
          padding: '4px 12px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', fontSize: 11,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}
      >
        <span>已加载工具</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '4px 0' }}>
          {domains.length === 0 ? (
            <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
              {connected ? '暂无工具（请打开支持的网站）' : '扩展未连接'}
            </div>
          ) : (
            domains.map((d) => <DomainItem key={d.domain} data={d} />)
          )}
        </div>
      )}
    </div>
  )
}

function DomainItem({ data }) {
  const [hovered, setHovered] = useState(false)
  const emoji = EMOJI[data.domain] || '🌐'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ padding: '4px 12px', position: 'relative' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>{emoji}</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{data.domain}</span>
        <span style={{ fontSize: 10, color: 'var(--success)', fontFamily: 'monospace' }}>
          {data.tools.length}
        </span>
      </div>
      {hovered && data.tools.length > 0 && (
        <div style={{
          position: 'absolute', left: '100%', top: 0,
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '8px 10px', zIndex: 100,
          minWidth: 200, maxWidth: 280, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            {data.domain} · {data.tab_count} 个标签页
          </div>
          {data.tools.map((t) => (
            <div key={t.name} style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'monospace' }}>{t.name}</div>
              {t.description && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 8 }}>{t.description}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
