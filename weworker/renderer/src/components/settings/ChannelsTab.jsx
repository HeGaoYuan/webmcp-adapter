import React, { useState } from 'react'
import { useSettingsStore } from '../../store/settings.js'

export default function ChannelsTab() {
  const { channels, saveChannels } = useSettingsStore()
  const qq = channels?.qq ?? {}
  const [form, setForm] = useState({
    enabled: qq.enabled ?? false,
    app_id: qq.app_id ?? '',
    app_secret: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const payload = { qq: { enabled: form.enabled, app_id: form.app_id } }
    if (form.app_secret) payload.qq.app_secret = form.app_secret
    await saveChannels(payload)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      {/* QQ Bot Card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>QQ 频道机器人</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
              style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
            />
            启用
          </label>
        </div>

        <Field label="AppID">
          <input
            value={form.app_id}
            onChange={e => setForm(f => ({ ...f, app_id: e.target.value }))}
            placeholder="你的 AppID"
            style={inputStyle}
          />
        </Field>

        <Field label="AppSecret" hint={qq.has_app_secret ? '已设置（留空保持不变）' : '未设置'}>
          <input
            type="password"
            value={form.app_secret}
            onChange={e => setForm(f => ({ ...f, app_secret: e.target.value }))}
            placeholder="输入新 AppSecret"
            style={inputStyle}
          />
        </Field>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          在 <a href="https://q.qq.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>QQ 开放平台</a> 创建频道机器人后获取凭证。
          用户在频道中 @ 机器人即可对话，发送 /new 开启新对话。
        </div>
      </div>

      {/* Future channels placeholder */}
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
        更多通道（Telegram、微信）即将支持
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={btnStyle}
        >
          {saving ? '保存中...' : saved ? '已保存 ✓' : '保存'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>
        {label}
        {hint && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const cardStyle = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 16,
  marginBottom: 12,
}
const labelStyle = { display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }
const inputStyle = {
  width: '100%',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 7,
  color: 'var(--text-primary)',
  fontSize: 13,
  padding: '7px 10px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}
const btnStyle = {
  border: 'none',
  borderRadius: 7,
  color: '#fff',
  cursor: 'pointer',
  padding: '8px 20px',
  fontSize: 13,
  fontWeight: 600,
  background: 'var(--accent)',
}
