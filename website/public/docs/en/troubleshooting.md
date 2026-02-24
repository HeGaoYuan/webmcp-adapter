# Troubleshooting

Diagnose and fix the most common issues.

## Quick diagnostics

Check whether the service is running:

```bash
lsof -i :3711   # should show a node process listening
```

View live service logs (stderr output from `webmcp start`). If you started it with pm2:
```bash
pm2 logs webmcp
```

Or check the Claude Desktop MCP log:
```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log
```

---

## Issue: Service won't start — "Port 3711 is already in use"

Another process is holding port 3711 (possibly a previous service instance).

```bash
# Find and kill the process
lsof -ti :3711 | xargs kill -9

# Start fresh
webmcp start
```

---

## Issue: Chrome extension shows ERR\_CONNECTION\_REFUSED

The extension cannot connect to the WebSocket service — the service is not running.

```bash
webmcp start
```

---

## Issue: Tool list is empty in Claude Desktop

Claude sees no tools. Work through this checklist:

1. **Is the service running?**
   ```bash
   lsof -i :3711
   ```
2. **Is an adapter installed for the site you have open?**
   ```bash
   webmcp adapter list
   ```
3. **Is a supported website open in Chrome?** Tools only appear when a matching page is loaded.
4. **Has the page fully loaded?** Wait 5–10 seconds after the page appears.
5. **Was Claude Desktop restarted after the config change?** Fully quit (⌘Q) and relaunch.

---

## Issue: Tool calls time out

Claude calls a tool but the request hangs or returns a timeout error.

Check the Claude Desktop log while triggering the tool call:

```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log
```

Also open the Chrome extension Service Worker console:
`chrome://extensions` → WebMCP Adapter → **Service Worker**

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

Verify the config file content:

```bash
# macOS
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Check:
- `"command": "webmcp"` is present
- The JSON is valid (no trailing commas, no syntax errors)
- `webmcp` is in your PATH: run `which webmcp` in a terminal

---

## Issue: `webmcp adapter install` can't download from GitHub

If you're behind a proxy, `fetch` in Node.js may not respect system proxy settings. The CLI automatically falls back to `curl`, which does. Set the proxy environment variable:

```bash
export HTTPS_PROXY=http://127.0.0.1:<port>
webmcp adapter install mail.163.com --reload
```

---

## Viewing logs

| Log source | How to view |
|---|---|
| WebSocket service | stderr of `webmcp start`, or `pm2 logs webmcp` |
| Chrome Extension | `chrome://extensions` → WebMCP Adapter → **Service Worker** |
| Claude Desktop MCP | `tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log` |

---

## Still stuck?

Open an issue on [GitHub](https://github.com/HeGaoYuan/webmcp-adapter/issues) and include:
- Output of `lsof -i :3711`
- Chrome extension Service Worker console output
- Your `claude_desktop_config.json` (redact any sensitive paths if needed)
- macOS: contents of `~/Library/Logs/Claude/mcp-server-webmcp-adapter.log`
