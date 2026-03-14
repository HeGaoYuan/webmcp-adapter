import React from 'react'
import { useWorksStore } from '../../store/works.js'
import ChatView from '../chat/ChatView.jsx'
import WelcomeScreen from '../welcome/WelcomeScreen.jsx'
import InputBar from '../chat/InputBar.jsx'

export default function MainArea() {
  const activeWorkId = useWorksStore((s) => s.activeWorkId)
  const createWork = useWorksStore((s) => s.createWork)

  const handleSendFromWelcome = async (text) => {
    const work = await createWork()
    // ChatView will mount and handle the message via its own InputBar,
    // but we need to trigger the send after mount — store the pending text
    useWorksStore.setState({ pendingMessage: text })
  }

  if (activeWorkId) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ChatView workId={activeWorkId} />
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <WelcomeScreen />
      <InputBar onSend={handleSendFromWelcome} />
    </div>
  )
}
