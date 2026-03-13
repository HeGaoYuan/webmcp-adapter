import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ToolCallBlock from './ToolCallBlock.jsx'
import ImageLightbox from './ImageLightbox.jsx'

export default function MessageItem({ message, streaming, isLast }) {
  const isUser = message.role === 'user'
  const isEmpty = !message.content?.length

  return (
    <div style={{
      padding: '8px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      gap: 4,
    }}>
      <div style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        marginBottom: 2,
        paddingLeft: isUser ? 0 : 4,
        paddingRight: isUser ? 4 : 0,
      }}>
        {isUser ? '你' : '微牛马'}
      </div>

      <div style={{
        maxWidth: '80%',
        background: isUser ? 'var(--accent)' : 'var(--bg-secondary)',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '10px 14px',
        border: isUser ? 'none' : '1px solid var(--border)',
      }}>
        {isEmpty && streaming && isLast ? (
          <span style={{ color: 'var(--text-muted)' }}>
            <StreamingCursor />
          </span>
        ) : (
          (message.content ?? []).map((block, i) => (
            <ContentBlock key={i} block={block} />
          ))
        )}
        {!isEmpty && streaming && isLast && message.role === 'assistant' && (
          <StreamingCursor />
        )}
      </div>
    </div>
  )
}

function ContentBlock({ block }) {
  if (block.type === 'text') {
    return (
      <div className="markdown" style={{ color: 'inherit' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.text || ''}</ReactMarkdown>
      </div>
    )
  }

  if (block.type === 'tool_use') {
    return <ToolCallBlock block={block} />
  }

  if (block.type === 'image') {
    return <ZoomableImage src={`data:image/jpeg;base64,${block.data}`} />
  }

  if (block.type === 'error') {
    return (
      <div style={{ color: 'var(--error)', fontSize: 13 }}>⚠ {block.text}</div>
    )
  }

  return null
}

function ZoomableImage({ src }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <img
        src={src}
        alt="screenshot"
        onDoubleClick={() => setOpen(true)}
        title="双击放大"
        style={{ maxWidth: '100%', borderRadius: 8, marginTop: 4, border: '1px solid var(--border)', cursor: 'zoom-in' }}
      />
      {open && <ImageLightbox src={src} onClose={() => setOpen(false)} />}
    </>
  )
}

function StreamingCursor() {
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 14,
      background: 'var(--text-secondary)',
      borderRadius: 1,
      marginLeft: 2,
      verticalAlign: 'middle',
      animation: 'blink 1s step-end infinite',
    }}>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </span>
  )
}
