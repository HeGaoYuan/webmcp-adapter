import React from 'react'
import { useStatusStore } from '../../store/status.js'
import { useSettingsStore } from '../../store/settings.js'

export default function StatusBar() {
  const { extension, channels } = useStatusStore()
  const { model, hasApiKey } = useSettingsStore()

  const dot = (status) => {
    const color = status === 'connected' ? 'var(--success)'
      : status === 'unknown' ? 'var(--warning)'
      : 'var(--error)'
    return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, marginRight: 4, flexShrink: 0 }} />
  }

  const channelDot = (status) => {
    const color = status === 'connected' ? 'var(--success)'
      : status === 'starting' ? 'var(--warning)'
      : status === 'error' ? 'var(--error)'
      : 'var(--text-muted)'
    return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, marginRight: 4, flexShrink: 0 }} />
  }

  const CHANNEL_NAMES = { qq: 'QQ Bot' }
  const STATUS_TEXT = { connected: '已连接', starting: '连接中', error: '错误' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Current model */}
      <div style={{ fontSize: 11, color: hasApiKey ? 'var(--text-secondary)' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
        </svg>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
          {hasApiKey ? (model || '未设置模型') : '未配置 API Key'}
        </span>
      </div>
      {/* Extension status */}
      <span title={`Extension: ${extension}`} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
        {dot(extension)}扩展{extension === 'connected' ? '已连接' : '未连接'}
      </span>
      {/* Channel statuses */}
      {Object.entries(channels).map(([name, info]) => (
        <span
          key={name}
          title={info.error ? `${CHANNEL_NAMES[name] || name}: ${info.error}` : undefined}
          style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
        >
          {channelDot(info.status)}
          {CHANNEL_NAMES[name] || name} {STATUS_TEXT[info.status] || info.status}
        </span>
      ))}
    </div>
  )
}
