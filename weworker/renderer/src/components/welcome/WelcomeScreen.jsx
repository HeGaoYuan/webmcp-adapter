import React from 'react'
import { useStatusStore } from '../../store/status.js'

const SITES = [
  { name: 'Gmail', icon: 'M', desc: '读取、搜索、下载附件' },
  { name: '163邮箱', icon: '@', desc: '读取、搜索、下载附件' },
  { name: '京东', icon: 'JD', desc: '搜索商品、下单、支付' },
  { name: '小红书', icon: 'XHS', desc: '浏览、搜索帖子' },
]

export default function WelcomeScreen() {
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
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>WeWorker</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          让 AI 帮你操作网站，解放双手
        </p>
      </div>

      {/* Supported sites */}
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
              <div style={{
                width: 32, height: 32,
                borderRadius: 6,
                background: 'var(--bg-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
                flexShrink: 0, letterSpacing: '-0.02em',
              }}>{s.icon}</div>
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
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.25)',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 13,
          color: 'var(--warning)',
          maxWidth: 480,
          textAlign: 'center',
        }}>
          请先安装 Chrome 扩展并打开目标网站，AI 才能操作网页
        </div>
      )}
    </div>
  )
}
