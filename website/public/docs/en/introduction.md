# Introduction

WebMCP Adapter is an open-source project that uses the MCP protocol to let AI clients like Claude directly operate websites in the browser — without any changes to the website itself.

## What problem does it solve?

If you want AI to perform actions on a website — like automatically filling out forms, searching emails, or downloading attachments — you normally can't do it because AI apps like Claude Desktop and Cursor don't have access to a web browser. With WebMCP Adapter, you can connect AI apps to your browser so they can automate tasks on your behalf.

WebMCP Adapter makes this simple. You describe what you want, and Claude handles the browser interaction for you.

```
"Download all invoices from my inbox for this month"
```

Claude will open 163mail, search for invoices, open each email, and download the attachments — without you touching the browser.

## How it works (overview)

WebMCP Adapter connects three components:

1. **MCP Server** — implements the [Model Context Protocol](https://modelcontextprotocol.io/), so Claude Desktop can discover and call web tools
2. **WebSocket Service** — a local background service that routes messages between the extension and MCP server
3. **Chrome Extension** — detects page URLs, injects matching adapter scripts, and adapters manipulate web pages via DOM APIs

## Key properties

| Property | Detail |
|---|---|
| **No website changes** | Works by injecting JavaScript into existing pages |
| **Local architecture** | All components run on your machine, communicating via `localhost` |
| **Community-driven** | Anyone can write and share an adapter for any website |
| **Open protocol** | Built on the [Model Context Protocol](https://modelcontextprotocol.io/) standard |

## Supported websites

Adapters are community-contributed. Browse the [Adapter Hub](/adapters) for the current list.

## Next steps

- [Quick Start](/docs/quick-start) — get running in 5 minutes
- [Installation](/docs/installation) — detailed setup guide
- [Architecture](/docs/architecture) — understand how components connect
