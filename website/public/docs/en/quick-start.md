# Quick Start

Get WebMCP Adapter running in 5 minutes.

## Prerequisites

- macOS (Windows support is planned)
- [Node.js](https://nodejs.org/) 18+
- Google Chrome
- [Claude Desktop](https://claude.ai/download)

## Step 1 — Clone and install

```bash
git clone https://github.com/HeGaoYuan/webmcp-adapter.git
cd webmcp-adapter
npm install
```

## Step 2 — Install the Chrome extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder inside the cloned repo

The extension icon will appear in your Chrome toolbar.

## Step 3 — Configure Claude Desktop

Edit the Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the following (replace `/absolute/path/to` with the actual path):

```json
{
  "mcpServers": {
    "webmcp-adapter": {
      "command": "node",
      "args": ["/absolute/path/to/webmcp-adapter/native-host/index.js"]
    }
  }
}
```

## Step 4 — Start the WebSocket service

```bash
./start-service.sh start
```

You should see:

```
✓ Native host started successfully (PID: xxxxx)
  WebSocket: ws://localhost:3711
```

## Step 5 — Test it

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

- [ ] **Service running?** Run `./start-service.sh status` — should show `✓ Native host is running`
- [ ] **Extension loaded?** Go to `chrome://extensions`, confirm WebMCP Adapter is enabled
- [ ] **Website open?** Open and fully load a supported site in Chrome
- [ ] **Claude config correct?** Check the path in `claude_desktop_config.json` is absolute and correct
- [ ] **Claude restarted?** Restart Claude Desktop after editing the config

## Service management commands

```bash
./start-service.sh start     # Start
./start-service.sh stop      # Stop
./start-service.sh restart   # Restart
./start-service.sh status    # Check status
./start-service.sh logs      # View logs
./start-service.sh logs -f   # Stream logs in real-time
```

## Next steps

- [Installation](/docs/installation) — auto-start on login, Windows setup
- [Troubleshooting](/docs/troubleshooting) — if something isn't working
