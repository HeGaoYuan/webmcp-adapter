import { Link } from 'react-router-dom'
import { getContributeUrl, GITHUB_REPO } from '../lib/github'
import { useLang } from '../lib/LanguageContext'
import HowItWorksAnimation from '../components/HowItWorksAnimation'

export default function Home() {
  const { t, lang } = useLang()

  return (
    <div>
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            {t.home.heroTitle1}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">
              {t.home.heroTitle2}
            </span>
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {t.home.heroSub}
          </p>
        </div>
      </section>

      {/* Animated Demo */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <HowItWorksAnimation lang={lang} />
        </div>
      </section>

      {/* Core Concept */}
      <section className="py-20 px-4 sm:px-6 bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">{t.home.conceptTitle}</h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto leading-relaxed">
              {t.home.conceptDesc}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: t.home.conceptFeature1Title,
                desc: t.home.conceptFeature1Desc,
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                ),
              },
              {
                title: t.home.conceptFeature2Title,
                desc: t.home.conceptFeature2Desc,
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ),
              },
              {
                title: t.home.conceptFeature3Title,
                desc: t.home.conceptFeature3Desc,
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ),
              },
            ].map((feature, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-6 hover:border-accent/30 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Setup Guide */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">{t.home.setupTitle}</h2>
            <p className="text-gray-400">{t.home.setupDesc}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                title: t.home.setup1Title,
                desc: t.home.setup1Desc,
                action: t.home.setup1Action,
                link: GITHUB_REPO + '/releases',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                ),
              },
              {
                title: t.home.setup2Title,
                desc: t.home.setup2Desc,
                action: t.home.setup2Action,
                link: '/docs/installation',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                ),
              },
              {
                title: t.home.setup3Title,
                desc: t.home.setup3Desc,
                action: t.home.setup3Action,
                link: '/adapters',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                ),
              },
            ].map((step, i) => (
              <div key={i} className="relative group">
                <div className="bg-surface border border-border rounded-xl p-6 h-full flex flex-col hover:border-accent/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
                      {step.icon}
                    </div>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-3">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1">{step.desc}</p>
                  <Link
                    to={step.link}
                    className="inline-flex items-center gap-1 text-accent hover:text-accent-hover text-sm font-medium transition-colors group-hover:gap-2"
                  >
                    {step.action}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Adapter Hub CTA */}
          <div className="relative overflow-hidden bg-gradient-to-br from-surface via-surface to-accent/5 border border-border rounded-2xl p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
            <div className="relative flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-3">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                  {t.home.adapterHubTitle}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t.home.adapterHubDesc}
                </h3>
                <p className="text-gray-400 text-sm">
                  <span className="text-accent font-semibold">{t.home.adapterHubCta}</span>{' '}
                  {t.home.adapterHubCtaDesc}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/adapters"
                  className="px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium text-sm transition-colors whitespace-nowrap"
                >
                  {t.home.setup3Action}
                </Link>
                <a
                  href={getContributeUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-lg border border-border hover:border-accent/30 bg-surface/50 text-gray-300 hover:text-white font-medium text-sm transition-colors whitespace-nowrap"
                >
                  {t.home.ctaButton}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
