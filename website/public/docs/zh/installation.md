# 完整安装

基本安装流程请参见[快速开始](/docs/quick-start)。本页介绍如何连接各种 AI 客户端以及卸载。

> **前置条件：** 任何 MCP 客户端连接前，必须先启动 WebSocket bridge：
> ```bash
> webmcp service start -d
> ```

## AI 客户端配置

> **重要提示：** 为了获得最佳体验，建议使用支持 MCP `notifications/tools/list_changed` 协议的 AI 客户端。这样当你在浏览器中打开新网站或安装新 adapter 时，工具列表会自动更新，无需重启客户端。
>
> 经测试，**Claude Code** 完全支持此功能。其他客户端的支持情况未经充分测试，可能需要手动重启才能看到新工具。

### Claude Desktop

配置文件：
- **macOS：** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows：** `%APPDATA%\Claude\claude_desktop_config.json`

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

保存后重启 Claude Desktop。

---

### Claude Code

```bash
claude mcp add webmcp-adapter webmcp mcp
```

---

### Cursor

配置文件：`~/.cursor/mcp.json`（全局）或 `.cursor/mcp.json`（项目级）

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

配置文件：`~/.codeium/windsurf/mcp_config.json`

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

### Cline（VS Code 扩展）

配置文件：`cline_mcp_settings.json`（通过 Cline 面板管理）

打开 Cline 面板 → **MCP Servers** → **Configure MCP Servers**，添加：

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

### GitHub Copilot（VS Code）

在工作区创建 `.vscode/mcp.json`（或添加到用户设置）：

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

配置文件：`.kiro/settings/mcp.json`（项目级）

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

添加到 VS Code `settings.json`：

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

配置文件：`~/.config/opencode/opencode.json`

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

配置文件：`~/.codex/config.toml`

```toml
[mcp_servers.webmcp-adapter]
command = "webmcp"
args = ["mcp"]
```

---

### JetBrains AI

**Settings → Tools → AI Assistant → MCP Servers** → 点击 **+** 添加：

- **名称：** `webmcp-adapter`
- **类型：** `stdio`
- **命令：** `webmcp`
- **参数：** `mcp`

---

### Warp

**Settings → AI → Manage MCP Servers** → 添加新服务，命令填 `webmcp`，参数填 `mcp`。

---

## 卸载

```bash
webmcp service stop                  # 停止后台服务
npm uninstall -g webmcp-adapter      # 删除 CLI 和扩展包
```

然后在 `chrome://extensions` 中移除 Chrome 扩展，并从 AI 客户端配置文件中删除 `webmcp-adapter` 条目。
