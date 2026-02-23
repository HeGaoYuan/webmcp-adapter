const REPO = 'HeGaoYuan/webmcp-adapter'
const BRANCH = 'main'
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`
const GITHUB = `https://github.com/${REPO}`

export const GITHUB_REPO = GITHUB

export async function fetchRegistry() {
  const res = await fetch(`${RAW}/hub/registry.json`)
  if (!res.ok) throw new Error('Failed to fetch registry')
  return res.json()
}

export async function fetchAdapterMeta(id) {
  const res = await fetch(`${RAW}/hub/adapters/${id}/meta.json`)
  if (!res.ok) throw new Error(`Failed to fetch meta for ${id}`)
  return res.json()
}

export async function fetchAdapterReadme(id, lang = 'en') {
  // For non-English languages, try README.{lang}.md first, then fall back to README.md
  if (lang !== 'en') {
    const localized = await fetch(`${RAW}/hub/adapters/${id}/README.${lang}.md`)
    if (localized.ok) return localized.text()
  }
  const res = await fetch(`${RAW}/hub/adapters/${id}/README.md`)
  if (!res.ok) return null
  return res.text()
}

export function getAdapterGithubUrl(id) {
  return `${GITHUB}/tree/${BRANCH}/hub/adapters/${id}`
}

export function getContributeUrl() {
  return `${GITHUB}/blob/${BRANCH}/hub/CONTRIBUTING.md`
}
