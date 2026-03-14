import React, { useEffect, useState } from 'react'
import Sidebar from './components/layout/Sidebar.jsx'
import MainArea from './components/layout/MainArea.jsx'
import SettingsModal from './components/settings/SettingsModal.jsx'
import { useWorksStore } from './store/works.js'
import { useStatusStore } from './store/status.js'
import { useSettingsStore } from './store/settings.js'
import logoUrl from './logo.png'

function getInitialTheme() {
  const saved = localStorage.getItem('theme')
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [theme, setTheme] = useState(getInitialTheme)
  const loadWorks = useWorksStore((s) => s.loadWorks)
  const loadSettings = useSettingsStore((s) => s.load)
  const poll = useStatusStore((s) => s.poll)

  useEffect(() => {
    loadWorks()
    loadSettings()
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Full-width title bar — draggable, contains app title + theme toggle */}
      <div style={{
        height: 38,
        minHeight: 38,
        WebkitAppRegion: 'drag',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 80, /* leave room for macOS traffic lights */
        paddingRight: 12,
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none' }}>
          <img src={logoUrl} alt="WeWorker" style={{ width: 22, height: 22, borderRadius: 4 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>WeWorker</span>
        </div>
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          style={{
            WebkitAppRegion: 'no-drag',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: 4,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {theme === 'dark' ? (
            // Sun icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            // Moon icon
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar onOpenSettings={() => setShowSettings(true)} />
        <MainArea />
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
