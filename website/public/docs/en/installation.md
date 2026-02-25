# Installation

For basic setup, follow [Quick Start](/docs/quick-start). This page covers what comes next: running the service automatically on login, connecting additional AI clients, and uninstalling.

## Auto-start on login

The WebSocket service needs to be running before Claude Desktop can connect. Rather than starting it manually each session, set it up to start automatically.

### macOS — launchd

Create `~/Library/LaunchAgents/com.webmcp.adapter.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.webmcp.adapter</string>
  <key>ProgramArguments</key>
  <array>
    <string>webmcp</string>
    <string>service</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/Users/YOUR_USERNAME/.webmcp/service.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/YOUR_USERNAME/.webmcp/service.log</string>
</dict>
</plist>
```

> Replace `YOUR_USERNAME` with your actual username, or use the full path from `echo $HOME`.
>
> If launchd can't find `webmcp`, replace `<string>webmcp</string>` with the full path from `which webmcp` (e.g. `/usr/local/bin/webmcp`).

Enable:
```bash
launchctl load ~/Library/LaunchAgents/com.webmcp.adapter.plist
```

Disable:
```bash
launchctl unload ~/Library/LaunchAgents/com.webmcp.adapter.plist
```

### macOS / Linux — pm2

[pm2](https://pm2.keymetrics.io/) is a Node.js process manager that handles auto-start across platforms:

```bash
npm install -g pm2
pm2 start webmcp -- service start
pm2 save
pm2 startup   # follow the printed instructions
```

Useful pm2 commands:
```bash
pm2 status         # show all processes
pm2 logs webmcp    # view logs
pm2 stop webmcp    # stop
pm2 restart webmcp # restart
```

## AI client configuration

All MCP-compatible clients use the same command. The config file location and format differ slightly.

### Claude Desktop

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

Config file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Cursor / other MCP clients

Cursor and similar tools follow the same MCP server format. Check your client's MCP configuration documentation for the config file location, then add the same `webmcp mcp` entry shown above.

## Uninstall

```bash
webmcp service stop                          # stop background service
launchctl unload ~/Library/LaunchAgents/com.webmcp.adapter.plist  # disable auto-start (macOS)
npm uninstall -g webmcp-adapter              # remove CLI and extension bundle
```

Then remove the Chrome extension from `chrome://extensions` and delete the `webmcp-adapter` entry from your AI client's config file.
