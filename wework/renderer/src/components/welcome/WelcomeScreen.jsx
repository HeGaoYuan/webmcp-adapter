import React from 'react'
import { useWorksStore } from '../../store/works.js'
import { useStatusStore } from '../../store/status.js'

const SITES = [
  { name: 'Gmail', emoji: '📧', desc: '读取、搜索、下载附件' },
  { name: '163邮箱', emoji: '📮', desc: '读取、搜索、下载附件' },
  { name: '京东', emoji: '🛒', desc: '搜索商品、下单、支付' },
  { name: '小红书', emoji: '📕', desc: '浏览、搜索帖子' },
]

export default function WelcomeScreen() {
  const createWork = useWorksStore((s) => s.createWork)
  const extension = useStatusStore((s) => s.extension)

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      gap: 32,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🐂</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>微牛马</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          让 AI 帮你操作网站，解放双手
        </p>
      </div>

      {/* Supported sites */}
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          已支持的网站
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {SITES.map((s) => (
            <div key={s.name} style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>{s.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Extension status hint */}
      {extension !== 'connected' && (
        <div style={{
          background: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 13,
          color: 'var(--warning)',
          maxWidth: 480,
          textAlign: 'center',
        }}>
          💡 请先安装 Chrome 扩展并打开目标网站，AI 才能操作网页
        </div>
      )}

      <button
        onClick={createWork}
        style={{
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 28px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => (e.target.style.background = 'var(--accent-hover)')}
        onMouseLeave={(e) => (e.target.style.background = 'var(--accent)')}
      >
        开始新的 Work
      </button>
    </div>
  )
}
