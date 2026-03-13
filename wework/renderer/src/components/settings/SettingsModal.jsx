import React, { useState } from 'react'
import { useSettingsStore, PRESETS } from '../../store/settings.js'

const API = 'http://127.0.0.1:8765'

export default function SettingsModal({ onClose }) {
  const { baseUrl, model, hasApiKey, save } = useSettingsStore()
  const [form, setForm] = useState({
    api_key: '',
    base_url: baseUrl,
    model: model,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // null | {ok, message}

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setTestResult(null) // clear test result on change
  }

  const handlePreset = (preset) => {
    setForm((f) => ({ ...f, base_url: preset.baseUrl, model: preset.model }))
    setTestResult(null)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = { base_url: form.base_url, model: form.model }
    if (form.api_key) payload.api_key = form.api_key
    await save(payload)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    // Auto-test after save
    handleTest()
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000)
    try {
      const res = await fetch(`${API}/settings/test`, { method: 'POST', signal: controller.signal })
      const data = await res.json()
      if (res.ok) {
        setTestResult({ ok: true, message: `连接成功 · ${data.model}` })
      } else {
        setTestResult({ ok: false, message: data.detail || '连接失败' })
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        setTestResult({ ok: false, message: '连接超时（30s），请检查代理地址是否正确' })
      } else {
        setTestResult({ ok: false, message: `无法连接后端服务: ${e.message}` })
      }
    } finally {
      clearTimeout(timer)
      setTesting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 28,
          width: 460,
          maxWidth: '90vw',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>模型设置</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {/* Current active model banner */}
        <div style={{
          background: 'rgba(124,106,247,0.1)',
          border: '1px solid rgba(124,106,247,0.25)',
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 16,
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ color: 'var(--text-muted)' }}>当前使用</span>
          <span style={{ color: 'var(--accent)', fontWeight: 600, fontFamily: 'monospace' }}>
            {hasApiKey ? (model || '未设置') : '⚠ 未配置 API Key'}
          </span>
          {hasApiKey && (
            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: 11 }}>
              {baseUrl.replace('https://', '').split('/')[0]}
            </span>
          )}
        </div>

        {/* Presets */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>快速选择</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                style={{
                  background: form.base_url === p.baseUrl ? 'var(--accent)' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '4px 12px',
                  fontSize: 12,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="API Key" hint={hasApiKey ? '已设置（留空保持不变）' : '未设置'}>
          <input
            type="password"
            value={form.api_key}
            onChange={(e) => set('api_key', e.target.value)}
            placeholder="sk-..."
            style={inputStyle}
          />
        </Field>

        <Field label="Base URL" hint={form.model.startsWith('claude-') && !form.base_url ? '请填入你的代理地址' : ''}>
          <input
            value={form.base_url}
            onChange={(e) => set('base_url', e.target.value)}
            placeholder={form.model.startsWith('claude-') ? 'https://your-proxy.com/v1' : 'https://api.openai.com/v1'}
            style={inputStyle}
          />
        </Field>

        <Field label="Model">
          <input
            value={form.model}
            onChange={(e) => set('model', e.target.value)}
            placeholder="gpt-4o"
            style={inputStyle}
          />
        </Field>

        {/* Test result */}
        {testResult && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 7,
            fontSize: 12,
            marginBottom: 12,
            background: testResult.ok ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
            color: testResult.ok ? 'var(--success)' : 'var(--error)',
            border: `1px solid ${testResult.ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
          }}>
            {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button
            onClick={handleTest}
            disabled={testing || saving}
            style={{ ...btnStyle, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            {testing ? '检测中...' : '测试连接'}
          </button>
          <button onClick={onClose} style={{ ...btnStyle, background: 'transparent', color: 'var(--text-muted)' }}>取消</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...btnStyle, background: saved ? 'var(--success)' : 'var(--accent)' }}
          >
            {saving ? '保存中...' : saved ? '已保存 ✓' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>
        {label}
        {hint && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }
const inputStyle = {
  width: '100%',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 7,
  color: 'var(--text-primary)',
  fontSize: 13,
  padding: '7px 10px',
  outline: 'none',
  fontFamily: 'inherit',
}
const btnStyle = {
  border: 'none',
  borderRadius: 7,
  color: '#fff',
  cursor: 'pointer',
  padding: '8px 20px',
  fontSize: 13,
  fontWeight: 600,
}
