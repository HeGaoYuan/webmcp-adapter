import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchRegistry, getContributeUrl } from '../lib/github'
import AdapterCard from '../components/AdapterCard'

export default function AdapterList() {
  const [adapters, setAdapters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchRegistry()
      .then(r => {
        setAdapters(r.adapters || [])
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  const filtered = adapters.filter(a => {
    const q = query.toLowerCase()
    return (
      a.name?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q) ||
      a.id?.toLowerCase().includes(q) ||
      a.match?.some(m => m.toLowerCase().includes(q))
    )
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Adapter Hub</h1>
        <p className="text-gray-400">
          Community-built adapters that let AI control websites.{' '}
          <span className="text-muted">由社区构建的网站 AI 适配器。</span>
        </p>
      </div>

      {/* Search + Action */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search adapters... (e.g. mail, gmail, notion)"
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-white placeholder-muted focus:outline-none focus:border-accent/60 transition-colors"
          />
        </div>
        <a
          href={getContributeUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-lg border border-accent/40 bg-accent/5 text-accent hover:bg-accent/10 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Submit adapter
        </a>
      </div>

      {/* Content */}
      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-subtle" />
                <div className="flex-1">
                  <div className="h-4 bg-subtle rounded w-24 mb-2" />
                  <div className="h-3 bg-subtle rounded w-16" />
                </div>
              </div>
              <div className="h-3 bg-subtle rounded w-full mb-2" />
              <div className="h-3 bg-subtle rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-16">
          <div className="text-red-400 mb-2">Failed to load adapters</div>
          <p className="text-muted text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-white mb-2">No adapters found</div>
              <p className="text-muted text-sm mb-6">
                No adapter matches "{query}". Be the first to add one!
              </p>
              <a
                href={getContributeUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-hover text-sm transition-colors"
              >
                Read Contributing Guide →
              </a>
            </div>
          ) : (
            <>
              <div className="text-muted text-sm mb-4">
                {filtered.length} adapter{filtered.length !== 1 ? 's' : ''}
                {query && ` matching "${query}"`}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(adapter => (
                  <AdapterCard key={adapter.id} adapter={adapter} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
