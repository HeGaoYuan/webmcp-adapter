import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DocsSidebar from '../components/DocsSidebar'
import { useLang } from '../lib/LanguageContext'
import { docsSidebar, defaultSlug, findDocItem } from '../lib/docsConfig'

// ─── Heading ID helpers ───────────────────────────────────────────────────────

function slugify(text) {
  return text
    .replace(/`[^`]*`/g, '')        // strip inline code
    .replace(/[*_[\]()#]/g, '')     // strip markdown symbols
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '') // keep word chars, Chinese, hyphens
    .replace(/^-+|-+$/g, '')
}

function extractHeadings(markdown) {
  const headings = []
  for (const line of markdown.split('\n')) {
    const m = line.match(/^(#{2,3})\s+(.+)$/)
    if (m) {
      const text = m[2].replace(/`[^`]*`/g, s => s.slice(1, -1)) // unwrap inline code for display
      headings.push({ level: m[1].length, text, id: slugify(m[2]) })
    }
  }
  return headings
}

// Custom heading renderers that inject id attributes
const headingComponents = {
  h1: ({ children }) => <h1 id={slugify(String(children))}>{children}</h1>,
  h2: ({ children }) => <h2 id={slugify(String(children))}>{children}</h2>,
  h3: ({ children }) => <h3 id={slugify(String(children))}>{children}</h3>,
}

// ─── Right TOC ────────────────────────────────────────────────────────────────

function DocsToc({ headings, activeId, lang }) {
  if (!headings.length) return null

  const handleClick = (e, id) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <aside className="hidden xl:block w-48 flex-shrink-0 sticky top-20 self-start pt-6">
      <div className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mb-3">
        {lang === 'en' ? 'On this page' : '本页目录'}
      </div>
      <nav>
        <ul className="space-y-0.5">
          {headings.map(h => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={e => handleClick(e, h.id)}
                className={`block text-[13px] leading-snug py-0.5 transition-colors ${
                  h.level === 3 ? 'pl-3' : ''
                } ${
                  activeId === h.id
                    ? 'text-accent'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

// ─── Main Docs page ───────────────────────────────────────────────────────────

export default function Docs() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { lang } = useLang()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [headings, setHeadings] = useState([])
  const [activeId, setActiveId] = useState('')

  const currentSlug = slug || defaultSlug

  // Redirect /docs → /docs/introduction
  useEffect(() => {
    if (!slug) navigate(`/docs/${defaultSlug}`, { replace: true })
  }, [slug, navigate])

  // Fetch markdown content
  useEffect(() => {
    setLoading(true)
    setError(null)
    setHeadings([])
    setActiveId('')
    fetch(`/docs/${lang}/${currentSlug}.md`)
      .then(res => {
        if (!res.ok) throw new Error(`${res.status}`)
        return res.text()
      })
      .then(text => { setContent(text); setHeadings(extractHeadings(text)); setLoading(false) })
      .catch(() => {
        if (lang === 'zh') {
          return fetch(`/docs/en/${currentSlug}.md`)
            .then(r => r.ok ? r.text() : Promise.reject())
            .then(text => { setContent(text); setHeadings(extractHeadings(text)); setLoading(false) })
            .catch(() => { setError(true); setLoading(false) })
        }
        setError(true)
        setLoading(false)
      })
  }, [lang, currentSlug])

  // Active heading tracking via scroll position
  useEffect(() => {
    if (!headings.length) return
    const onScroll = () => {
      const scrollY = window.scrollY + 100 // offset for fixed header
      let current = headings[0]?.id ?? ''
      for (const { id } of headings) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= scrollY) current = id
      }
      setActiveId(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [headings])

  // Prev / Next navigation
  const allItems = docsSidebar.flatMap(g => g.items)
  const currentIdx = allItems.findIndex(i => i.slug === currentSlug)
  const prev = currentIdx > 0 ? allItems[currentIdx - 1] : null
  const next = currentIdx < allItems.length - 1 ? allItems[currentIdx + 1] : null
  const itemTitle = (item) => lang === 'en' ? item.titleEn : item.titleZh

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-16">
      <div className="flex gap-8 min-h-[calc(100vh-8rem)]">

        {/* Left sidebar — desktop */}
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
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={headingComponents}
              >
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

        {/* Right TOC — only on xl screens */}
        <DocsToc headings={headings} activeId={activeId} lang={lang} />

      </div>
    </div>
  )
}
