# Comparison: WebMCP Adapter vs. CDP-based Browser Automation

Several MCP projects give AI clients the ability to control a browser. The most common approach uses the **Chrome DevTools Protocol (CDP)** — the same underlying mechanism as Playwright, Puppeteer, and Selenium. WebMCP Adapter takes a different approach. This page explains the difference and when each is appropriate.

## How CDP-based tools work

Tools like [chrome-mcp](https://github.com/hangwin/mcp-chrome), Playwright MCP, and similar projects connect to Chrome via its remote debugging port (`--remote-debugging-port`). From there, they can:

- Navigate to any URL
- Take screenshots
- Evaluate arbitrary JavaScript in the page context
- Click elements by CSS selector or coordinates
- Read and manipulate the DOM

These are **low-level, general-purpose browser operations**. They work on any website, but they give Claude raw browser primitives — not business-level tools.

## How WebMCP Adapter works

WebMCP Adapter connects through a **Chrome Extension** running inside the browser's normal process. An adapter for a specific website is loaded into that page's isolated world. The adapter calls `window.__webmcpRegister()` to expose a set of **named, typed tools** — each one a purpose-built function for a specific operation on that site.

Claude doesn't receive a DOM handle. It receives a tool like `search_emails(keyword)` or `get_unread_count()`. The implementation details of the website stay inside the adapter.

## Side-by-side comparison

| | CDP-based MCP | WebMCP Adapter |
|---|---|---|
| **Connection mechanism** | Remote debugging port (`--remote-debugging-port`) | Chrome Extension via WebSocket |
| **Tool abstraction** | Low-level (`navigate`, `click`, `evaluate`) | High-level, site-specific (`search_emails`, `compose`) |
| **Website knowledge** | None — Claude navigates blindly | Encoded in adapter — Claude calls semantic tools |
| **Prompt complexity** | Higher — Claude must reason about selectors and page state | Lower — tool names and parameters carry intent |
| **Fragility** | High — breaks on DOM or JS framework changes | Adapter-local — only the affected adapter needs updating |
| **Scope** | Any website, immediately | Requires an adapter per site |
| **Authentication context** | Shares your logged-in browser session | Same — runs in your real browser |
| **Local-only** | Depends on implementation | Yes, by design |

## Trade-offs

**CDP-based tools are more flexible.** If you need to automate an arbitrary website that has no adapter, or you want to give Claude the ability to freely navigate the web, a CDP-based tool is the right choice. The cost is that Claude must construct its own understanding of the page structure, which increases prompt complexity and failure modes.

**WebMCP Adapter is more stable and predictable.** When an adapter exists for a site, Claude has a clean, typed interface. The adapter author handles the DOM quirks, React synthetic event requirements, and timing issues once — all callers benefit. Tool calls are deterministic: `search_emails("invoice")` always does the same thing.

The abstraction also has a security implication: Claude never has an `evaluate()` escape hatch that could run arbitrary code in your browser. It can only call the specific operations the adapter exposes.

## When to use each

| Use case | Recommended approach |
|---|---|
| Automating a specific website you use regularly | WebMCP Adapter (if an adapter exists or you write one) |
| General web research or one-off browsing tasks | CDP-based tool |
| Building stable, repeatable AI workflows over a known site | WebMCP Adapter |
| Exploratory automation on an unsupported site | CDP-based tool |

## Using both together

The two approaches are not mutually exclusive. You can configure Claude Desktop with both a CDP-based MCP server and WebMCP Adapter simultaneously. Claude will use whichever tools are available and appropriate for the task.

## Related

- [Architecture](/docs/architecture) — internal component diagram
- [Adapter System](/docs/adapter-system) — how adapters are loaded and sandboxed
- [Writing an Adapter](/docs/writing-an-adapter) — contribute an adapter for a new site
