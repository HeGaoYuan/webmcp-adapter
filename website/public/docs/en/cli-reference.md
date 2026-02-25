# CLI Reference

Complete reference for the `webmcp` command.

## Synopsis

```
webmcp <command> [subcommand] [options]
```

---

## service

Manage the WebSocket bridge service. The service runs on `ws://localhost:3711` and acts as the communication hub between the Chrome extension and MCP clients.

### `webmcp service start`

```
webmcp service start [-d | --daemon]
```

Start the WebSocket bridge.

- **No flag** — runs in the foreground (useful for debugging; logs print directly to terminal)
- **`-d` / `--daemon`** — starts in the background, writes PID to `~/.webmcp/service.pid` and logs to `~/.webmcp/service.log`

**Examples:**

```bash
webmcp service start          # foreground
webmcp service start -d       # background (recommended for daily use)
```

### `webmcp service stop`

```
webmcp service stop
```

Stop the background service. Reads the PID from `~/.webmcp/service.pid` and sends `SIGTERM`.

### `webmcp service status`

```
webmcp service status
```

Check whether the service is running and which PID it has.

### `webmcp service logs`

```
webmcp service logs [-f | --follow]
```

Print the service log file (`~/.webmcp/service.log`).

- **`-f` / `--follow`** — stream new log lines in real time (like `tail -f`)

---

## mcp

```
webmcp mcp
```

Start the MCP server over stdio. This is the command that Claude Desktop (or any MCP client) should call. The MCP server connects to the running WebSocket bridge and exposes browser tools to the AI client.

> **Claude Desktop config:**
> ```json
> {
>   "mcpServers": {
>     "webmcp-adapter": {
>       "command": "webmcp",
>       "args": ["mcp"]
>     }
>   }
> }
> ```

The service (`webmcp service start -d`) must be running before the MCP server can connect.

---

## adapter

Manage site adapters. Adapters are JavaScript files stored in `extension/adapters/` inside the npm package.

### `webmcp adapter list`

```
webmcp adapter list
```

Show all locally installed adapters.

### `webmcp adapter install`

```
webmcp adapter install <id> [--reload]
webmcp adapter install --url <url> [--reload]
webmcp adapter install --file <path> [--reload] [--name <id>]
```

Install an adapter from the Hub, a remote URL, or a local file.

| Source | Flag | Notes |
|---|---|---|
| Hub (official) | `<id>` | e.g. `mail.163.com` |
| Remote URL | `--url <url>` | Must be `https://`. Adapter id is inferred from the filename |
| Local file | `--file <path>` | Useful for development or private adapters |

`--reload` sends a reload signal to the Chrome extension immediately after installation.

`--name <id>` overrides the inferred adapter id (useful with `--url` or `--file`).

**Examples:**

```bash
webmcp adapter install mail.163.com --reload
webmcp adapter install mail.google.com --reload
webmcp adapter install --url https://example.com/my-adapter.js --reload
webmcp adapter install --file ./adapters/intranet.js --name corp.intranet --reload
```

### `webmcp adapter remove`

```
webmcp adapter remove <id> [--reload]
```

Remove an installed adapter. Use `--reload` to immediately refresh the extension.

```bash
webmcp adapter remove mail.google.com --reload
```

### `webmcp adapter refresh`

```
webmcp adapter refresh
```

Force-clear the local Hub registry cache and re-fetch it from GitHub. The extension popup's adapter list will update automatically.

---

## extension-path

```
webmcp extension-path
```

Print the path to the bundled Chrome extension directory. Use this when loading the extension in Chrome.

```bash
webmcp extension-path
# /usr/local/lib/node_modules/webmcp-adapter/extension
```

---

## Global options

### `--version` / `-v`

```
webmcp --version
```

Print the installed version.

### `--help` / `-h`

```
webmcp --help
```

Print a summary of all commands.

---

## Log files

When running the service as a daemon, logs are written to:

| File | Purpose |
|---|---|
| `~/.webmcp/service.pid` | PID of the background service process |
| `~/.webmcp/service.log` | Combined stdout + stderr from the service |
