// Hub URL 配置：前端网站使用相对路径访问本地 hub 文件夹
// 部署时 hub 文件夹会被放在网站根目录下的 /hub/ 路径
const RAW = '/hub'
const BRANCH = 'main'
const GITHUB = 'https://github.com/HeGaoYuan/webmcp-adapter'

export const GITHUB_REPO = GITHUB

export async function fetchRegistry() {
  const res = await fetch(`${RAW}/registry.json`)
  if (!res.ok) throw new Error('Failed to fetch registry')
  return res.json()
}

export async function fetchAdapterMeta(id) {
  const res = await fetch(`${RAW}/adapters/${id}/meta.json`)
  if (!res.ok) throw new Error(`Failed to fetch meta for ${id}`)
  return res.json()
}

export async function fetchAdapterReadme(id, lang = 'en') {
  // For non-English languages, try README.{lang}.md first, then fall back to README.md
  if (lang !== 'en') {
    const localized = await fetch(`${RAW}/adapters/${id}/README.${lang}.md`)
    if (localized.ok) return localized.text()
  }
  const res = await fetch(`${RAW}/adapters/${id}/README.md`)
  if (!res.ok) return null
  return res.text()
}

export function getAdapterGithubUrl(id) {
  return `${GITHUB}/tree/${BRANCH}/hub/adapters/${id}`
}

export function getContributeUrl() {
  return `${GITHUB}/blob/${BRANCH}/hub/CONTRIBUTING.md`
}

export function getLocalizedMeta(meta, lang) {
  if (!meta) return meta
  const overrides = meta.i18n?.[lang] ?? {}
  return { ...meta, ...overrides }
}
