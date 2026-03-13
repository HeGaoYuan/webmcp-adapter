import React from 'react'
import { useWorksStore } from '../../store/works.js'
import ChatView from '../chat/ChatView.jsx'
import WelcomeScreen from '../welcome/WelcomeScreen.jsx'

export default function MainArea() {
  const activeWorkId = useWorksStore((s) => s.activeWorkId)
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {activeWorkId ? <ChatView workId={activeWorkId} /> : <WelcomeScreen />}
    </div>
  )
}
