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
      height: '100%',
      WebkitAppRegion: 'drag',
    }}>
      {/* New work button */}
      <div style={{
        padding: '10px 12px 6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        WebkitAppRegion: 'drag',
      }}>
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
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
