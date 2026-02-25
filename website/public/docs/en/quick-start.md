# Quick Start

Get WebMCP Adapter running in 5 minutes.

## Prerequisites

- macOS (Windows support is planned)
- [Node.js](https://nodejs.org/) 18+
- Google Chrome
- [Claude Desktop](https://claude.ai/download)

## Step 1 — Install

```bash
npm install -g github:HeGaoYuan/webmcp-adapter
```

This installs the `webmcp` CLI globally and includes the Chrome extension bundle.

## Step 2 — Load the Chrome extension

Find the path to the bundled extension:

```bash
webmcp extension-path
# Example output: /usr/local/lib/node_modules/webmcp-adapter/extension
```

Then load it in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the path printed by `webmcp extension-path`

## Step 3 — Start the WebSocket service

```bash
webmcp service start -d
```

This starts the bridge in the background. Verify it's running:

```bash
webmcp service status
```

## Step 4 — Install an adapter

Adapters are site-specific plugins:

```bash
webmcp adapter install mail.163.com --reload
webmcp adapter install mail.google.com --reload
```

## Step 5 — Configure Claude Desktop

Edit the config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "webmcp-adapter": {
      "command": "webmcp",
      "args": ["mcp"]
    }
  }
}
```

Restart Claude Desktop after saving.

## Step 6 — Test it

1. Open a supported site in Chrome (e.g. [mail.163.com](https://mail.163.com)) and wait for it to load
2. Ask Claude: `List the available tools`
3. You should see tools like `search_emails`, `get_unread_emails`, etc.

## Verification checklist

- [ ] `webmcp service status` shows service is running
- [ ] Extension is enabled at `chrome://extensions`
- [ ] `webmcp adapter list` shows the adapter for your site
- [ ] Supported site is open in Chrome
- [ ] `claude_desktop_config.json` has `"command": "webmcp", "args": ["mcp"]`
- [ ] Claude Desktop was restarted after config change

## Common service commands

```bash
webmcp service start -d    # Start in background
webmcp service stop        # Stop background service
webmcp service status      # Check status
webmcp service logs -f     # Stream live logs
```

## Next steps

- [CLI Reference](/docs/cli-reference) — full command documentation
- [Installation](/docs/installation) — auto-start on login, multiple AI clients
- [Troubleshooting](/docs/troubleshooting) — if something isn't working
