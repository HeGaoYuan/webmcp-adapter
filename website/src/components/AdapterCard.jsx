import { Link } from 'react-router-dom'

export default function AdapterCard({ adapter }) {
  const favicon = `https://www.google.com/s2/favicons?domain=${adapter.match?.[0] || adapter.id}&sz=32`

  return (
    <Link
      to={`/adapters/${adapter.id}`}
      className="group block bg-surface border border-border rounded-xl p-5 hover:border-accent/50 hover:bg-surface/80 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-bg border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img
            src={favicon}
            alt={adapter.name}
            className="w-5 h-5"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm group-hover:text-accent-hover transition-colors truncate">
            {adapter.name}
          </h3>
          <p className="text-muted text-xs mt-0.5 font-mono truncate">
            {adapter.match?.[0] || adapter.id}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-400 text-sm line-clamp-2 mb-4 leading-relaxed">
        {adapter.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {adapter.author}
        </span>
        {adapter.verified_on && (
          <span className="flex items-center gap-1 text-green-500/70">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Verified {adapter.verified_on}
          </span>
        )}
      </div>
    </Link>
  )
}
