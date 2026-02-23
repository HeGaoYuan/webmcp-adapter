# Writing an Adapter

A step-by-step guide to creating an adapter for a new website and contributing it to the Hub.

## Before you start

Make sure you can answer yes to all of these:

- [ ] The target website renders its content in the DOM (not inside a canvas or PDF viewer)
- [ ] You have a Chrome extension loaded and WebMCP running locally
- [ ] You're familiar with basic DOM APIs (`document.querySelector`, `MutationObserver`, etc.)

## Step 1 — Create the directory

```
hub/adapters/
└── your.domain.com/
    ├── index.js
    └── meta.json
```

Use the primary domain as the directory name (e.g. `notion.so`, `linear.app`).

## Step 2 — Write meta.json

```json
{
  "id": "your.domain.com",
  "name": "Your Site Name",
  "description": "Short description of what this adapter lets AI do (1–2 sentences)",
  "author": "your-github-username",
  "match": ["your.domain.com"],
  "version": "2026-01-01T00:00:00Z",
  "verified_on": "2026-01-01",
  "homepage": "https://github.com/HeGaoYuan/webmcp-adapter/tree/main/hub/adapters/your.domain.com"
}
```

Set `version` to the current ISO 8601 timestamp. Set `verified_on` to today's date.

## Step 3 — Write index.js

### Minimal template

```js
/**
 * YourSite Adapter
 *
 * Verified: YourSite, January 2026
 * Maintainer: your-github-username
 */

// ── Utility helpers ──────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector)
    if (el) return resolve(el)
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) { observer.disconnect(); resolve(el) }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => { observer.disconnect(); reject(new Error(`Timeout waiting for: ${selector}`)) }, timeout)
  })
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function getPageTitle() {
  return { title: document.title, url: window.location.href }
}

// ── Registration ──────────────────────────────────────────────────────────────

window.__webmcpRegister({
  name: 'yoursite-adapter',
  match: ['your.domain.com'],
  tools: [
    {
      name: 'get_page_title',
      description: 'Returns the current page title and URL. Useful to confirm the page has loaded.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async () => getPageTitle(),
    },
  ],
})
```

### Tips for writing good handlers

**Wait for elements, don't assume they're there:**
```js
// ❌ Fragile
const btn = document.querySelector('.submit-btn')
btn.click()

// ✅ Robust
const btn = await waitForElement('.submit-btn', 5000)
btn.click()
await sleep(500) // let the UI react
```

**Return structured data:**
```js
// ❌ Hard for the AI to parse
return "Found 3 emails"

// ✅ Structured
return { count: 3, emails: [{ id: "...", subject: "..." }] }
```

**Handle errors gracefully:**
```js
async function readInbox() {
  try {
    const rows = document.querySelectorAll('.email-row')
    if (!rows.length) return { emails: [], message: 'No emails found' }
    return { emails: Array.from(rows).map(parseRow) }
  } catch (err) {
    return { error: err.message }
  }
}
```

**Write clear `description` fields** — Claude reads these to decide which tool to call:
```js
// ❌ Vague
description: 'Gets emails'

// ✅ Clear and actionable
description: 'Returns a list of unread emails from the inbox. Each item includes id, sender, subject, and date. Call this before open_email.'
```

## Step 4 — Register in registry.json

Add an entry to `hub/registry.json`:

```json
{
  "id": "your.domain.com",
  "name": "Your Site Name",
  "description": "Short description",
  "author": "your-github-username",
  "match": ["your.domain.com"],
  "version": "2026-01-01T00:00:00Z",
  "verified_on": "2026-01-01",
  "homepage": "https://github.com/HeGaoYuan/webmcp-adapter/tree/main/hub/adapters/your.domain.com"
}
```

## Step 5 — Test locally

1. In Chrome, go to `chrome://extensions` → find WebMCP Adapter → click **Service Worker** to open the console
2. Navigate to your target website
3. Watch the console — you should see `Registered X tools for tab NNNNN`
4. In Claude Desktop, ask: *"List available tools"* — your tools should appear
5. Test each tool by asking Claude to use it

## Step 6 — Submit a pull request

1. Fork the repository on GitHub
2. Create your adapter files
3. Open a Pull Request with:
   - The target website name
   - A list of the tools you implemented
   - The date and method you used to verify it works

### PR review checklist

Before merging, maintainers verify:

- [ ] `index.js` does not send data to any third-party server
- [ ] `index.js` does not read passwords, tokens, or other sensitive credentials
- [ ] `meta.json` is valid and `version` is a proper ISO 8601 timestamp
- [ ] `registry.json` entry is present
- [ ] Tool `description` fields are clear and useful for an AI agent

## Next steps

- [API Reference](/docs/api-reference) — full `window.__webmcpRegister()` specification
