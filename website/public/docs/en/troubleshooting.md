# Troubleshooting

Diagnose and fix the most common issues.

## Quick diagnostics

```bash
webmcp service status    # is the service running?
webmcp adapter list      # are adapters installed?
```

View live service logs:
```bash
webmcp service logs -f
```

---

## Issue: Service won't start — "Port 3711 is already in use"

A previous service instance is still running.

```bash
# Find and kill the process
lsof -ti :3711 | xargs kill -9

# Start fresh
webmcp service start -d
```

---

## Issue: Chrome extension shows ERR\_CONNECTION\_REFUSED

The WebSocket service is not running.

```bash
webmcp service start -d
webmcp service status
```

---

## Issue: Tool list is empty in Claude Desktop

Work through this checklist:

1. **Is the service running?**
   ```bash
   webmcp service status
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

Check the live service log while triggering the tool call:

```bash
webmcp service logs -f
```

Also check the Claude Desktop MCP log:
```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log
```

Things to look for:
- Is the service receiving the call? (`call_tool` message should appear)
- Is the extension responding? (look for `call_tool_result` or `call_tool_error`)
- Is the target tab still open and on the correct page?

---

## Issue: Tools disappear after navigating inside the site

When you navigate to a new page, the adapter re-injects itself (~2–3 seconds). Wait, then retry.

If the extension console shows no registration after navigation, the new page's hostname may not match the adapter's `match` list.

---

## Issue: Claude Desktop doesn't connect

Verify the config:

```bash
# macOS
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Check:
- `"command": "webmcp"` and `"args": ["mcp"]` are present
- The JSON is valid (no trailing commas, no syntax errors)
- `webmcp` is in your PATH: `which webmcp`

---

## Issue: `webmcp adapter install` fails with "fetch failed"

You may be behind a proxy. The CLI falls back to `curl` automatically, but if curl also fails, set the proxy:

```bash
export HTTPS_PROXY=http://127.0.0.1:<port>
webmcp adapter install mail.163.com --reload
```

---

## Viewing logs

| Source | Command |
|---|---|
| WebSocket service | `webmcp service logs -f` |
| Chrome Extension | `chrome://extensions` → WebMCP Adapter → **Service Worker** |
| Claude Desktop MCP | `tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log` |

---

## Still stuck?

Open an issue on [GitHub](https://github.com/HeGaoYuan/webmcp-adapter/issues) and include:
- Output of `webmcp service status`
- Chrome extension Service Worker console output
- Your `claude_desktop_config.json` (redact sensitive paths if needed)
- macOS: `~/Library/Logs/Claude/mcp-server-webmcp-adapter.log`
