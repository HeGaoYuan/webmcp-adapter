# Installation

Complete installation and configuration guide.

## System requirements

| Component | Requirement |
|---|---|
| OS | macOS (Windows planned) |
| Node.js | 18 or later |
| Browser | Google Chrome |
| AI client | Claude Desktop |

## 1. Install the CLI

```bash
npm install -g webmcp-adapter
```

This installs the `webmcp` command globally. Verify:

```bash
webmcp --version
```

## 2. Load the Chrome extension

The extension is bundled inside the npm package. Find its path:

```bash
webmcp extension-path
# Example: /usr/local/lib/node_modules/webmcp-adapter/extension
```

Load it in Chrome:

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the path printed above

Note the extension ID shown on the card — you may need it for debugging.

> **Important:** Always load the extension from the path returned by `webmcp extension-path`. This ensures adapter files installed via `webmcp adapter install` are found by the extension.

## 3. Configure Claude Desktop

### Locate the config file

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

### Edit the config

```json
{
  "mcpServers": {
    "webmcp-adapter": {
      "command": "webmcp"
    }
  }
}
```

Because `webmcp` is a globally installed CLI command, no absolute paths are needed.

## 4. Start the WebSocket service

```bash
webmcp start
```

Verify it's running by checking that `ws://localhost:3711` is listening:

```bash
lsof -i :3711
```

## 5. Install adapters

```bash
webmcp adapter install mail.163.com --reload
webmcp adapter install mail.google.com --reload
```

List all available adapters from the Hub:

```bash
webmcp adapter refresh   # update the local registry cache
webmcp adapter list      # show installed adapters
```

## 6. Restart Claude Desktop

After editing the config, fully quit and relaunch Claude Desktop for it to pick up the new MCP server.

## Auto-start on login (optional)

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
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/webmcp.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/webmcp.log</string>
</dict>
</plist>
```

Load (enable auto-start):
```bash
launchctl load ~/Library/LaunchAgents/com.webmcp.adapter.plist
```

Unload (disable auto-start):
```bash
launchctl unload ~/Library/LaunchAgents/com.webmcp.adapter.plist
```

> **Tip:** If `launchctl` can't find `webmcp`, use the full path. Run `which webmcp` to find it and replace `<string>webmcp</string>` with the full path like `<string>/usr/local/bin/webmcp</string>`.

### macOS/Linux — pm2

[pm2](https://pm2.keymetrics.io/) is a popular Node.js process manager:

```bash
npm install -g pm2
pm2 start webmcp -- start
pm2 save
pm2 startup   # follow the printed instructions to enable auto-start
```

## Uninstall

1. Remove from Claude Desktop config — delete the `webmcp-adapter` entry from `claude_desktop_config.json`
2. Stop the service: kill the `webmcp start` process (or `pm2 stop webmcp`)
3. Remove the Chrome extension from `chrome://extensions`
4. Uninstall the package: `npm uninstall -g webmcp-adapter`
