# Troubleshooting

Diagnose and fix the most common issues.

## Quick diagnostics

Run this first — it checks every component at once:

```bash
./test-system.sh
```

Or check the service status manually:

```bash
./start-service.sh status
./start-service.sh logs -f   # stream logs in real time
```

---

## Issue: Service won't start — "Port 3711 is already in use"

Another process is holding port 3711 (possibly a previous service instance).

```bash
# Find and kill the process
lsof -ti :3711 | xargs kill -9

# Start fresh
./start-service.sh start
```

---

## Issue: Chrome extension shows ERR\_CONNECTION\_REFUSED

The extension cannot connect to the WebSocket service — the service is not running.

```bash
./start-service.sh start
./start-service.sh status
```

---

## Issue: Tool list is empty in Claude Desktop

Claude sees no tools. Work through this checklist:

1. **Is the service running?**
   ```bash
   ./start-service.sh status
   ```
2. **Is a supported website open in Chrome?** Tools only appear when a matching page is loaded.
3. **Has the page fully loaded?** Wait 5–10 seconds after the page appears.
4. **Did the extension register tools?** Check the log:
   ```bash
   ./start-service.sh logs | grep Registered
   # Should show: [Bridge] Registered X tools for tab NNNNN
   ```
5. **Was Claude Desktop restarted after the config change?** Fully quit (⌘Q) and relaunch.

---

## Issue: Tool calls time out

Claude calls a tool but the request hangs or returns a timeout error.

Check the live log while triggering the tool call from Claude:

```bash
./start-service.sh logs -f
```

Also check the Claude Desktop log:

```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log
```

Things to look for:
- Is the WebSocket service receiving the call? (`call_tool` message should appear)
- Is the Chrome extension responding? (look for `call_tool_result` or `call_tool_error`)
- Is the target tab still open and on the correct page?

---

## Issue: Tools disappear after navigating inside the site

When you navigate to a new page, the adapter is re-injected. This takes 2–3 seconds. Wait, then re-trigger the tool call.

If the extension console shows *no* registration after navigation, the new page's hostname may not match the adapter's `match` list.

---

## Issue: Claude Desktop doesn't connect at startup

Verify the config file path and content:

```bash
# macOS
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Check:
- The path in `args` is absolute (starts with `/`)
- `native-host/index.js` exists at that path: `ls /your/path/native-host/index.js`
- The JSON is valid (no trailing commas, no syntax errors)

---

## Viewing logs

| Log source | Command |
|---|---|
| WebSocket service | `./start-service.sh logs -f` |
| Chrome Extension | `chrome://extensions` → WebMCP Adapter → **Service Worker** |
| Claude Desktop MCP | `tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log` |

---

## Still stuck?

Open an issue on [GitHub](https://github.com/HeGaoYuan/webmcp-adapter/issues) and include:
- Output of `./start-service.sh status`
- The relevant section of `./start-service.sh logs`
- Chrome extension Service Worker console output
- Your `claude_desktop_config.json` (redact any sensitive paths if needed)
