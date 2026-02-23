# Installation

Complete installation and configuration guide.

## System requirements

| Component | Requirement |
|---|---|
| OS | macOS (Windows planned) |
| Node.js | 18 or later |
| Browser | Google Chrome |
| AI client | Claude Desktop |

## 1. Install dependencies

```bash
cd webmcp-adapter
npm install
```

## 2. Install the Chrome extension

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` directory from the repo

Note the extension ID shown on the card — you may need it for debugging.

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
      "command": "node",
      "args": ["/absolute/path/to/webmcp-adapter/native-host/index.js"]
    }
  }
}
```

> **Important:** Use the absolute path. Relative paths will not work because Claude Desktop starts the process from a different working directory.

To find the absolute path:
```bash
cd webmcp-adapter
pwd
# Example output: /Users/yourname/projects/webmcp-adapter
```

So your `args` would be `["/Users/yourname/projects/webmcp-adapter/native-host/index.js"]`.

## 4. Start the WebSocket service

```bash
./start-service.sh start
```

Verify it's running:
```bash
./start-service.sh status
# ✓ Native host is running (PID: xxxxx)
```

## 5. Restart Claude Desktop

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
    <string>/usr/local/bin/node</string>
    <string>/absolute/path/to/webmcp-adapter/native-host/index.js</string>
    <string>--service</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/webmcp-adapter.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/webmcp-adapter-error.log</string>
</dict>
</plist>
```

Load the service:
```bash
launchctl load ~/Library/LaunchAgents/com.webmcp.adapter.plist
```

Unload (disable auto-start):
```bash
launchctl unload ~/Library/LaunchAgents/com.webmcp.adapter.plist
```

> **Tip:** Run `which node` to find the correct path for the `node` binary.

## Verifying the installation

Run the full system test:

```bash
./test-system.sh
```

This checks:
- Node.js dependencies installed
- WebSocket service running on port 3711
- Chrome extension connected
- Tools registered
- Claude Desktop config present

## Uninstall

1. Remove from Claude Desktop config — delete the `webmcp-adapter` entry from `claude_desktop_config.json`
2. Stop the service: `./start-service.sh stop`
3. Remove the Chrome extension from `chrome://extensions`
4. Delete the repo directory
