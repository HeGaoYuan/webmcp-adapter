import { Link, useParams } from 'react-router-dom'
import { docsSidebar } from '../lib/docsConfig'
import { useLang } from '../lib/LanguageContext'

export default function DocsSidebar({ onNavigate }) {
  const { slug } = useParams()
  const { lang } = useLang()

  return (
    <nav className="w-56 flex-shrink-0">
      {docsSidebar.map((group) => (
        <div key={group.titleEn} className="mb-5">
          {/* Group heading — clearly a non-clickable category label */}
          <div className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mb-1 px-3">
            {lang === 'en' ? group.titleEn : group.titleZh}
          </div>
          <ul>
            {group.items.map((item) => {
              const active = slug === item.slug
              return (
                <li key={item.slug}>
                  <Link
                    to={`/docs/${item.slug}`}
                    onClick={onNavigate}
                    className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
                      active
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {lang === 'en' ? item.titleEn : item.titleZh}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
