import React from 'react'
import { useStatusStore } from '../../store/status.js'
import { useSettingsStore } from '../../store/settings.js'

export default function StatusBar() {
  const { extension } = useStatusStore()
  const { model, hasApiKey } = useSettingsStore()

  const dot = (status) => {
    const color = status === 'connected'
      ? 'var(--success)'
      : status === 'unknown'
      ? 'var(--warning)'
      : 'var(--error)'
    return (
      <span style={{
        display: 'inline-block',
        width: 6, height: 6,
        borderRadius: '50%',
        background: color,
        marginRight: 4,
        flexShrink: 0,
      }} />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Current model */}
      <div style={{ fontSize: 11, color: hasApiKey ? 'var(--text-secondary)' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10 }}>🤖</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
          {hasApiKey ? (model || '未设置模型') : '未配置 API Key'}
        </span>
      </div>
      {/* Extension status */}
      <span title={`Extension: ${extension}`} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
        {dot(extension)}扩展{extension === 'connected' ? '已连接' : '未连接'}
      </span>
    </div>
  )
}
