import { GITHUB_REPO, getContributeUrl } from '../lib/github'
import { useLang } from '../lib/LanguageContext'

export default function Footer() {
  const { t } = useLang()

  return (
    <footer className="border-t border-border mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-white font-bold text-xs font-mono">
            W
          </div>
          <span className="text-sm text-muted">{t.footer.license}</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted">
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
          <a
            href={getContributeUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            {t.footer.contribute}
          </a>
        </div>
      </div>
    </footer>
  )
}
