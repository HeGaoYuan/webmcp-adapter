import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchRegistry, getContributeUrl, GITHUB_REPO } from '../lib/github'
import { useLang } from '../lib/LanguageContext'

export default function Home() {
  const { t } = useLang()
  const [adapterCount, setAdapterCount] = useState('—')

  useEffect(() => {
    fetchRegistry()
      .then(r => setAdapterCount(r.adapters?.length ?? 0))
      .catch(() => {})
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/5 text-accent text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            {t.home.badge}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            {t.home.heroTitle1}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">
              {t.home.heroTitle2}
            </span>
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t.home.heroSub}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/adapters"
              className="px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium text-sm transition-colors"
            >
              {t.home.browseAdapters}
            </Link>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg border border-border hover:border-subtle bg-surface text-gray-300 hover:text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              {t.home.viewGithub}
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-white font-mono">{adapterCount}</div>
            <div className="text-sm text-muted mt-1">{t.home.statsAdapters}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white font-mono">∞</div>
            <div className="text-sm text-muted mt-1">{t.home.statsWebsites}</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white font-mono">0</div>
            <div className="text-sm text-muted mt-1">{t.home.statsChanges}</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{t.home.howTitle}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: t.home.step1Title,
                desc: t.home.step1Desc,
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: t.home.step2Title,
                desc: t.home.step2Desc,
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: t.home.step3Title,
                desc: t.home.step3Desc,
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                    {icon}
                  </div>
                  <span className="text-accent font-mono text-xs font-medium">{step}</span>
                </div>
                <h3 className="text-white font-semibold mb-3">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-8">{t.home.archTitle}</h2>
          <div className="bg-surface border border-border rounded-xl p-6 font-mono text-sm">
            <div className="text-gray-400 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-accent">Claude Desktop</span>
                <span className="text-muted">(stdio)</span>
                <span className="text-muted">→</span>
                <span className="text-accent">MCP Process</span>
                <span className="text-muted">(WebSocket)</span>
                <span className="text-muted">→</span>
                <span className="text-accent">WebSocket Server</span>
              </div>
              <div className="text-muted pl-4">↓</div>
              <div className="flex items-center gap-2 pl-8 flex-wrap">
                <span className="text-purple-400">Chrome Extension</span>
                <span className="text-muted">→</span>
                <span className="text-purple-400">Adapter</span>
                <span className="text-muted">→</span>
                <span className="text-purple-400">Website DOM</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Contribute */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center bg-surface border border-border rounded-2xl p-10">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">{t.home.ctaTitle}</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            {t.home.ctaDesc1}{' '}
            <code className="text-accent bg-accent/10 px-1.5 py-0.5 rounded text-sm">
              window.__webmcpRegister()
            </code>
            {' '}{t.home.ctaDesc2}
          </p>
          <a
            href={getContributeUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium text-sm transition-colors"
          >
            {t.home.ctaButton}
          </a>
        </div>
      </section>
    </div>
  )
}
