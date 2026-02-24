# Quick Start

Get WebMCP Adapter running in 5 minutes.

## Prerequisites

- macOS (Windows support is planned)
- [Node.js](https://nodejs.org/) 18+
- Google Chrome
- [Claude Desktop](https://claude.ai/download)

## Step 1 — Install

```bash
npm install -g webmcp-adapter
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

The extension icon will appear in your Chrome toolbar.

## Step 3 — Configure Claude Desktop

Edit the Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "webmcp-adapter": {
      "command": "webmcp"
    }
  }
}
```

## Step 4 — Start the WebSocket service

```bash
webmcp start
```

Keep this running in a terminal while using Claude. For auto-start on login, see [Installation](/docs/installation).

## Step 5 — Install an adapter

Adapters are site-specific plugins. Install one for the site you want to use:

```bash
# 163 Mail
webmcp adapter install mail.163.com --reload

# Gmail
webmcp adapter install mail.google.com --reload
```

`--reload` automatically refreshes the Chrome extension after installation.

## Step 6 — Test it

1. Open Chrome and navigate to a supported site (e.g. [mail.163.com](https://mail.163.com))
2. Wait for the page to fully load (~5 seconds)
3. Open (or restart) Claude Desktop
4. Ask Claude:

```
List the available tools
```

You should see tools like `search_emails`, `get_unread_emails`, etc. Then try:

```
Search my inbox for emails containing "invoice"
```

## Verification checklist

If something doesn't work, go through this list:

- [ ] **Service running?** Run `webmcp start` in a terminal
- [ ] **Extension loaded?** Go to `chrome://extensions`, confirm WebMCP Adapter is enabled
- [ ] **Adapter installed?** Run `webmcp adapter list` — the site's adapter should appear
- [ ] **Website open?** Open and fully load a supported site in Chrome
- [ ] **Claude config correct?** Check that `claude_desktop_config.json` has `"command": "webmcp"`
- [ ] **Claude restarted?** Restart Claude Desktop after editing the config

## Managing adapters

```bash
webmcp adapter list                            # List installed adapters
webmcp adapter install <id> --reload           # Install from Hub
webmcp adapter install --url <url> --reload    # Install from custom URL
webmcp adapter install --file <path> --reload  # Install from local file
webmcp adapter remove <id> --reload            # Remove
webmcp adapter refresh                         # Force-refresh Hub registry cache
```

## Next steps

- [Installation](/docs/installation) — auto-start on login, Windows setup
- [Troubleshooting](/docs/troubleshooting) — if something isn't working
