# Introduction

WebMCP Adapter is an open-source bridge that lets AI clients like Claude directly operate websites through a Chrome extension — without any changes to the website itself.

## What problem does it solve?

Modern AI assistants are powerful at reasoning and planning, but they live inside a chat window. To actually *do* something on a website — read an email, click a button, download a file — a user has to manually switch context, copy-paste information, and relay results back to the AI.

WebMCP Adapter removes that friction. You describe what you want, and Claude handles the browser interaction for you.

```
"Download all invoices from my inbox for this month"
```

Claude will open 163mail, search for invoices, open each email, and download the attachments — without you touching the browser.

## How it works (overview)

WebMCP Adapter connects three components:

1. **Chrome Extension** — injected into web pages, exposes the page's capabilities as callable tools via `window.__webmcpRegister()`
2. **WebSocket Service** — a local background service that routes messages between the extension and MCP clients
3. **MCP Server** — implements the [Model Context Protocol](https://modelcontextprotocol.io/), so Claude Desktop can discover and call the web tools

When Claude calls a tool (e.g. `search_emails`), the call travels from Claude Desktop → MCP Server → WebSocket Service → Chrome Extension → DOM. The result travels back the same path.

## Key properties

| Property | Detail |
|---|---|
| **No website changes** | Works by injecting JavaScript into existing pages |
| **Local only** | All communication happens on `localhost`. No data leaves your machine |
| **Community-driven** | Anyone can write and share an adapter for any website |
| **Open protocol** | Built on the [Model Context Protocol](https://modelcontextprotocol.io/) standard |

## Supported websites

Adapters are community-contributed. Browse the [Adapter Hub](/adapters) for the current list.

## Next steps

- [Quick Start](/docs/quick-start) — get running in 5 minutes
- [Installation](/docs/installation) — detailed setup guide
- [Architecture](/docs/architecture) — understand how components connect
