import React from 'react'
import WorksList from '../sidebar/WorksList.jsx'
import SitesPanel from '../sidebar/SitesPanel.jsx'
import StatusBar from '../sidebar/StatusBar.jsx'
import { useWorksStore } from '../../store/works.js'

export default function Sidebar({ onOpenSettings }) {
  const createWork = useWorksStore((s) => s.createWork)

  return (
    <div style={{
      width: 'var(--sidebar-width)',
      minWidth: 'var(--sidebar-width)',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      WebkitAppRegion: 'drag',
    }}>
      {/* Title bar area */}
      <div style={{
        padding: '16px 12px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        WebkitAppRegion: 'drag',
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
          微牛马
        </span>
        <button
          onClick={createWork}
          title="New Work"
          style={{
            WebkitAppRegion: 'no-drag',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 20,
            lineHeight: 1,
            padding: '2px 4px',
            borderRadius: 4,
          }}
          onMouseEnter={(e) => (e.target.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.target.style.color = 'var(--text-secondary)')}
        >
          +
        </button>
      </div>

      {/* Works list */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitAppRegion: 'no-drag' }}>
        <WorksList />
      </div>

      {/* Sites panel */}
      <div style={{ WebkitAppRegion: 'no-drag' }}>
        <SitesPanel />
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        WebkitAppRegion: 'no-drag',
      }}>
        <StatusBar />
        <button
          onClick={onOpenSettings}
          title="Settings"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 16,
            padding: '2px 4px',
          }}
          onMouseEnter={(e) => (e.target.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.target.style.color = 'var(--text-muted)')}
        >
          ⚙
        </button>
      </div>
    </div>
  )
}
