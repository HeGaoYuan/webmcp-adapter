# Architecture

WebMCP Adapter uses a **standalone service architecture** that decouples the WebSocket bridge from Claude Desktop's process lifecycle.

## Component diagram

```
┌──────────────────┐
│  Claude Desktop  │
│  (MCP Client)    │
└────────┬─────────┘
         │ stdio (JSON-RPC / MCP)
         ▼
┌──────────────────────────┐
│  MCP Process             │
│  native-host/index.js    │
│  (started by Claude)     │
└────────┬─────────────────┘
         │ WebSocket client
         ▼
┌──────────────────────────┐
│  WebSocket Service       │  ← independent background process
│  localhost:3711          │
│  native-host/bridge.js   │
└────────┬─────────────────┘
         │ WebSocket client
         ▼
┌──────────────────────────┐
│  Chrome Extension        │
│  service-worker.js       │
└────────┬─────────────────┘
         │ Chrome extension messaging
         ▼
┌──────────────────────────┐
│  Content Script          │
│  injector.js + adapter   │
└────────┬─────────────────┘
         │ DOM API
         ▼
┌──────────────────────────┐
│  Web Page                │
│  (e.g. mail.163.com)     │
└──────────────────────────┘
```

## Components

### MCP Process (`native-host/index.js`)

Started by Claude Desktop via stdio. Acts as the **MCP server** — it speaks the Model Context Protocol so Claude can discover tools and make calls. It does not hold any tool state itself; it connects to the WebSocket Service as a client and proxies all tool operations through it.

### WebSocket Service (`native-host/bridge.js`)

An **independent background process** running on `localhost:3711`. This is the central hub:

- Accepts connections from both the Chrome Extension and the MCP Process
- Maintains a registry of available tools, indexed by browser tab
- Routes tool call requests from the MCP Process to the correct tab's extension
- Broadcasts tool registration updates to all connected MCP clients

Running the service independently means Claude Desktop can restart or crash without losing the tool registry.

### Chrome Extension

Two parts:

| File | Role |
|---|---|
| `background/service-worker.js` | WebSocket client; forwards tool registrations and handles call routing |
| `content/injector.js` | Injected into each page; loads the matching adapter; dispatches tool calls to the adapter's handler functions |

### Adapter

A small JavaScript file that runs inside the page's **isolated world**. It calls `window.__webmcpRegister()` to declare the tools it provides and their handlers. The handlers use standard DOM APIs to interact with the page.

## Two process modes

`native-host/index.js` has two modes depending on how it's invoked:

| Mode | Command | Role |
|---|---|---|
| **Service mode** | `node index.js --service` | Starts the WebSocket server; runs as a long-lived background daemon |
| **MCP mode** | `node index.js` (started by Claude) | Connects to the running WebSocket service; speaks MCP to Claude Desktop |

This separation ensures the WebSocket service (and its tool registry) outlives any individual Claude session.

## Port and local-only policy

The WebSocket service listens exclusively on `localhost:3711`. It is not reachable from the network. All communication stays on your machine.

## Next steps

- [How It Works](/docs/how-it-works) — detailed message flow for tool registration and calling
- [Adapter System](/docs/adapter-system) — how adapters are loaded and sandboxed
