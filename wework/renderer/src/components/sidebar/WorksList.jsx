import React from 'react'
import { useWorksStore } from '../../store/works.js'

export default function WorksList() {
  const works = useWorksStore((s) => s.works)
  const activeWorkId = useWorksStore((s) => s.activeWorkId)
  const selectWork = useWorksStore((s) => s.selectWork)
  const deleteWork = useWorksStore((s) => s.deleteWork)

  if (!works.length) {
    return (
      <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 12 }}>
        No works yet. Click + to start.
      </div>
    )
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {works.map((w) => (
        <WorkItem
          key={w.id}
          work={w}
          active={w.id === activeWorkId}
          onSelect={() => selectWork(w.id)}
          onDelete={() => deleteWork(w.id)}
        />
      ))}
    </div>
  )
}

function WorkItem({ work, active, onSelect, onDelete }) {
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '7px 12px',
        cursor: 'pointer',
        background: active ? 'var(--bg-active)' : hovered ? 'var(--bg-hover)' : 'transparent',
        borderRadius: 6,
        margin: '1px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'background 0.1s',
      }}
    >
      <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
        {work.title}
      </span>
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 12,
            padding: '0 2px',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
