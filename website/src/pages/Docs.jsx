import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DocsSidebar from '../components/DocsSidebar'
import { useLang } from '../lib/LanguageContext'
import { docsSidebar, defaultSlug, findDocItem } from '../lib/docsConfig'

export default function Docs() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { lang } = useLang()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const currentSlug = slug || defaultSlug

  // Redirect /docs → /docs/introduction
  useEffect(() => {
    if (!slug) navigate(`/docs/${defaultSlug}`, { replace: true })
  }, [slug, navigate])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/docs/${lang}/${currentSlug}.md`)
      .then(res => {
        if (!res.ok) throw new Error(`${res.status}`)
        return res.text()
      })
      .then(text => { setContent(text); setLoading(false) })
      .catch(() => {
        // fallback to English if zh not found
        if (lang === 'zh') {
          return fetch(`/docs/en/${currentSlug}.md`)
            .then(r => r.ok ? r.text() : Promise.reject())
            .then(text => { setContent(text); setLoading(false) })
            .catch(() => { setError(true); setLoading(false) })
        }
        setError(true)
        setLoading(false)
      })
  }, [lang, currentSlug])

  // Prev / Next navigation
  const allItems = docsSidebar.flatMap(g => g.items)
  const currentIdx = allItems.findIndex(i => i.slug === currentSlug)
  const prev = currentIdx > 0 ? allItems[currentIdx - 1] : null
  const next = currentIdx < allItems.length - 1 ? allItems[currentIdx + 1] : null

  const itemTitle = (item) => lang === 'en' ? item.titleEn : item.titleZh

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16">
      <div className="flex gap-8 min-h-[calc(100vh-8rem)]">

        {/* Desktop sidebar */}
        <aside className="hidden md:block sticky top-20 self-start pt-6">
          <DocsSidebar />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-surface border-r border-border p-6 pt-20 overflow-y-auto z-50">
              <DocsSidebar onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 pt-6">
          {/* Mobile: toggle sidebar */}
          <button
            className="md:hidden mb-6 flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            {lang === 'en' ? 'Menu' : '菜单'}
          </button>

          {loading && (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-surface rounded w-64" />
              <div className="h-4 bg-surface rounded w-full" />
              <div className="h-4 bg-surface rounded w-5/6" />
              <div className="h-4 bg-surface rounded w-4/6" />
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <div className="text-muted">
                {lang === 'en' ? 'Page not found.' : '页面未找到。'}
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="prose-dark">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          )}

          {/* Prev / Next */}
          {!loading && !error && (
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-border">
              {prev ? (
                <a
                  href={`/docs/${prev.slug}`}
                  onClick={e => { e.preventDefault(); navigate(`/docs/${prev.slug}`) }}
                  className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  {itemTitle(prev)}
                </a>
              ) : <span />}

              {next ? (
                <a
                  href={`/docs/${next.slug}`}
                  onClick={e => { e.preventDefault(); navigate(`/docs/${next.slug}`) }}
                  className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
                >
                  {itemTitle(next)}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              ) : <span />}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
