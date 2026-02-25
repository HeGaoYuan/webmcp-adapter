# Installation

For basic setup, follow [Quick Start](/docs/quick-start). This page covers connecting different AI clients and uninstalling.

> **Prerequisite:** The WebSocket bridge must be running before any MCP client connects.
> ```bash
> webmcp service start -d
> ```

## AI client configuration

### Claude Desktop

Config file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop after saving.

---

### Claude Code

```bash
claude mcp add webmcp-adapter webmcp mcp
```

---

### Cursor

Config file: `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project-level)

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

---

### Windsurf

Config file: `~/.codeium/windsurf/mcp_config.json`

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

---

### Cline (VS Code extension)

Config file: `cline_mcp_settings.json` (managed via Cline panel)

Open the Cline panel → **MCP Servers** → **Configure MCP Servers**, then add:

```json
{
  "mcpServers": {
    "webmcp-adapter": {
      "type": "stdio",
      "command": "webmcp",
      "args": ["mcp"]
    }
  }
}
```

---

### GitHub Copilot (VS Code)

Create `.vscode/mcp.json` in your workspace (or add to User settings):

```json
{
  "servers": {
    "webmcp-adapter": {
      "type": "stdio",
      "command": "webmcp",
      "args": ["mcp"]
    }
  }
}
```

---

### Kiro

Config file: `.kiro/settings/mcp.json` (project-level)

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

---

### Amp

Add to VS Code `settings.json`:

```json
{
  "amp.mcpServers": {
    "webmcp-adapter": {
      "command": "webmcp",
      "args": ["mcp"]
    }
  }
}
```

---

### OpenCode

Config file: `~/.config/opencode/opencode.json`

```json
{
  "mcp": {
    "webmcp-adapter": {
      "type": "local",
      "command": ["webmcp", "mcp"],
      "enabled": true
    }
  }
}
```

---

### Codex

Config file: `~/.codex/config.toml`

```toml
[mcp_servers.webmcp-adapter]
command = "webmcp"
args = ["mcp"]
```

---

### JetBrains AI

**Settings → Tools → AI Assistant → MCP Servers** → click **+** to add a new server:

- **Name:** `webmcp-adapter`
- **Type:** `stdio`
- **Command:** `webmcp`
- **Arguments:** `mcp`

---

### Warp

**Settings → AI → Manage MCP Servers** → Add new server with command `webmcp` and argument `mcp`.

---

## Uninstall

```bash
webmcp service stop                  # stop background service
npm uninstall -g webmcp-adapter      # remove CLI and extension bundle
```

Then remove the Chrome extension from `chrome://extensions` and delete the `webmcp-adapter` entry from your AI client's config file.
