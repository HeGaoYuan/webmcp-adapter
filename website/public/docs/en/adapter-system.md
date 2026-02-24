# Adapter System

An adapter is a small JavaScript file that teaches WebMCP how to interact with a specific website. Anyone can write one and share it via a pull request.

## What an adapter does

An adapter calls `window.__webmcpRegister()` to declare:

1. **Which domains it applies to** — e.g. `["mail.163.com"]`
2. **What tools it provides** — names, descriptions, parameter schemas
3. **How to execute each tool** — handler functions that use DOM APIs

## The Hub

Adapters are stored in `hub/adapters/{domain}/` in the repository. Each adapter folder contains:

| File | Purpose |
|---|---|
| `index.js` | The adapter code |
| `meta.json` | Metadata: name, description, author, version, verified date |

A central `hub/registry.json` lists all available adapters so the extension and website can discover them.

## Installing adapters

Adapters are installed locally using the `webmcp` CLI:

```bash
webmcp adapter install mail.163.com --reload   # from the Hub
webmcp adapter install --url <url> --reload    # from a custom URL (https only)
webmcp adapter install --file <path> --reload  # from a local file
```

The CLI downloads the adapter's `index.js` and writes it to the `extension/adapters/` directory inside the npm package. When Chrome loads the extension, it can inject these local files directly — no network requests at page-load time.

## Loading lifecycle

When you open a page in Chrome:

1. The extension's content script (`injector.js`) runs on every page
2. The background service worker checks the page's hostname against the local `extension/adapters/` directory and the Hub registry
3. If a locally installed adapter matches the hostname, its `index.js` is injected into the page from the local file
4. If no local adapter is installed but the Hub has a match, the extension shows an orange `!` badge — run `webmcp adapter install <id> --reload` to install it
5. The injected adapter calls `window.__webmcpRegister()`, and `injector.js` forwards the tool definitions to the background service worker

## Isolated world sandbox

Adapters run inside Chrome's **isolated world** — a sandboxed JavaScript environment that:

- ✅ **Can** read and modify the DOM (`document.querySelector`, etc.)
- ✅ **Can** use `window.__webmcpRegister()`
- ✅ **Can** use standard Web APIs (`setTimeout`, `MutationObserver`, `fetch` to same-origin)
- ❌ **Cannot** access the page's own JavaScript variables or framework instances (React state, Angular controllers, etc.)
- ❌ **Cannot** use `import`/`export` (no ES modules)
- ❌ **Cannot** use `chrome.*` APIs
- ❌ **Cannot** make cross-origin `fetch` requests

This sandbox exists for security: even a malicious adapter cannot steal page-level secrets like authentication tokens stored in JavaScript memory.

## meta.json fields

```json
{
  "id": "mail.163.com",
  "name": "163 Mail",
  "description": "Read emails, search, open messages, download attachments",
  "author": "webmcp-team",
  "match": ["mail.163.com"],
  "version": "2026-02-22T00:00:00Z",
  "verified_on": "2026-02-22",
  "homepage": "https://github.com/HeGaoYuan/webmcp-adapter/tree/main/hub/adapters/mail.163.com"
}
```

| Field | Description |
|---|---|
| `id` | Unique identifier, usually the primary domain |
| `match` | Array of hostname patterns the adapter activates on |
| `version` | ISO 8601 timestamp of the last release |
| `verified_on` | Date the adapter was last confirmed working against the live site |

## Next steps

- [Writing an Adapter](/docs/writing-an-adapter) — step-by-step guide to creating your own
- [API Reference](/docs/api-reference) — `window.__webmcpRegister()` full specification
