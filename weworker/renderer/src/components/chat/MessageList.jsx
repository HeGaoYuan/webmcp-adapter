import React, { useEffect, useRef } from 'react'
import MessageItem from './MessageItem.jsx'

export default function MessageList({ messages, streaming }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0' }}>
      {messages.map((msg, i) => (
        <MessageItem
          key={msg.id ?? i}
          message={msg}
          isLast={i === messages.length - 1}
          streaming={streaming && i === messages.length - 1}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
