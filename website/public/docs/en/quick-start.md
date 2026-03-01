# Quick Start

Get WebMCP Adapter running in 5 minutes.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- Google Chrome
- [Claude Code](https://docs.claude.ai/docs/claude-code)

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

Open a website you want to control (e.g., [mail.163.com](https://mail.163.com)). The extension will automatically detect if an adapter is available. If so, the extension icon will show an orange badge — click it to install.

You can also browse all available adapters at [Adapter Hub](/adapters), or install via command line:

```bash
webmcp adapter install mail.163.com --reload
webmcp adapter install mail.google.com --reload
```

## Step 5 — Configure Claude Code

Edit the config file `~/.claude/settings.json` (create it if it doesn't exist):

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

Restart Claude Code after saving.

## Step 6 — Test the tools

1. Open a website with an installed adapter in Chrome (e.g., [mail.163.com](https://mail.163.com)) and wait for it to load
2. In Claude Code, type: `List the available tools`
3. You should see the website's tools (e.g., `mail_163_com_search_emails`, `mail_163_com_get_unread_emails`, etc.)

## Step 7 — Full test

Now you can have Claude perform actual operations:

```
"Search my inbox for all emails about invoices this month"
```

Claude will automatically call the tools, execute the search in the browser, and return the results.

## Next steps

- [CLI Reference](/docs/cli-reference) — full command documentation
- [Installation](/docs/installation) — auto-start on login, multiple AI clients
- [Troubleshooting](/docs/troubleshooting) — if something isn't working
