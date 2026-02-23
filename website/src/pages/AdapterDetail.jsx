import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  fetchAdapterMeta,
  fetchAdapterReadme,
  getAdapterGithubUrl,
} from '../lib/github'
import { useLang } from '../lib/LanguageContext'

export default function AdapterDetail() {
  const { id } = useParams()
  const { lang, t } = useLang()
  const [meta, setMeta] = useState(null)
  const [readme, setReadme] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetchAdapterMeta(id),
      fetchAdapterReadme(id, lang),
    ])
      .then(([m, r]) => {
        setMeta(m)
        setReadme(r)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [id, lang])

  const favicon = `https://www.google.com/s2/favicons?domain=${meta?.match?.[0] || id}&sz=48`
  const githubUrl = getAdapterGithubUrl(id)

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <div className="animate-pulse">
          <div className="h-8 bg-surface rounded w-48 mb-4" />
          <div className="h-4 bg-surface rounded w-64 mb-8" />
          <div className="h-4 bg-surface rounded w-full mb-2" />
          <div className="h-4 bg-surface rounded w-3/4" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16 text-center">
        <div className="text-red-400 mb-2">{t.adapterDetail.failedLoad}</div>
        <p className="text-muted text-sm mb-6">{error}</p>
        <Link to="/adapters" className="text-accent hover:text-accent-hover text-sm">
          {t.adapterDetail.backToHub}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Link
          to="/adapters"
          className="text-muted hover:text-white text-sm transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {t.adapterDetail.backLink}
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-5 mb-8 pb-8 border-b border-border">
        <div className="w-14 h-14 rounded-xl bg-surface border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img
            src={favicon}
            alt={meta?.name}
            className="w-8 h-8"
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{meta?.name}</h1>
            {meta?.verified_on && (
              <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {t.adapterDetail.verified} {meta.verified_on}
              </span>
            )}
          </div>

          <p className="text-gray-400 mb-4 leading-relaxed">{meta?.description}</p>

          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {meta?.author}
            </span>
            {meta?.match?.map(domain => (
              <span key={domain} className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                {domain}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex sm:flex-col gap-2 flex-shrink-0">
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface hover:border-subtle text-sm text-gray-300 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            {t.adapterDetail.viewSource}
          </a>
        </div>
      </div>

      {/* README or fallback */}
      {readme ? (
        <div>
          <h2 className="text-lg font-semibold text-white mb-5">{t.adapterDetail.readmeTitle}</h2>
          <div className="prose-dark">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {readme}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <div className="text-muted mb-2 text-sm">{t.adapterDetail.noReadme}</div>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover text-sm transition-colors"
          >
            {t.adapterDetail.noReadmeLink}
          </a>
        </div>
      )}

      {/* Contribute nudge */}
      <div className="mt-12 pt-8 border-t border-border flex items-center justify-between">
        <p className="text-muted text-sm">{t.adapterDetail.outdated}</p>
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover text-sm transition-colors"
        >
          {t.adapterDetail.submitFix}
        </a>
      </div>
    </div>
  )
}
