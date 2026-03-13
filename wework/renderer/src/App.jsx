import React, { useEffect } from 'react'
import Sidebar from './components/layout/Sidebar.jsx'
import MainArea from './components/layout/MainArea.jsx'
import SettingsModal from './components/settings/SettingsModal.jsx'
import { useWorksStore } from './store/works.js'
import { useStatusStore } from './store/status.js'
import { useSettingsStore } from './store/settings.js'
import { useState } from 'react'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
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

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar onOpenSettings={() => setShowSettings(true)} />
      <MainArea />
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
