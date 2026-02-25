# CLI 参考

`webmcp` 命令完整参考。

## 语法

```
webmcp <命令> [子命令] [选项]
```

---

## service

管理 WebSocket Bridge 服务。服务运行在 `ws://localhost:3711`，作为 Chrome 扩展与 MCP 客户端之间的通信中枢。

### `webmcp service start`

```
webmcp service start [-d | --daemon]
```

启动 WebSocket bridge。

- **无标志** — 在前台运行（适合调试，日志直接输出到终端）
- **`-d` / `--daemon`** — 在后台运行，PID 写入 `~/.webmcp/service.pid`，日志写入 `~/.webmcp/service.log`

**示例：**

```bash
webmcp service start          # 前台运行
webmcp service start -d       # 后台运行（日常使用推荐）
```

### `webmcp service stop`

```
webmcp service stop
```

停止后台服务。从 `~/.webmcp/service.pid` 读取 PID 并发送 `SIGTERM`。

### `webmcp service status`

```
webmcp service status
```

检查服务是否正在运行及其 PID。

### `webmcp service logs`

```
webmcp service logs [-f | --follow]
```

输出服务日志文件（`~/.webmcp/service.log`）。

- **`-f` / `--follow`** — 实时流式输出新日志行（类似 `tail -f`）

---

## mcp

```
webmcp mcp
```

通过 stdio 启动 MCP 服务器。这是 Claude Desktop（或任意 MCP 客户端）应调用的命令。MCP 服务器会连接到正在运行的 WebSocket bridge，并向 AI 客户端暴露浏览器工具。

> **Claude Desktop 配置：**
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

MCP 服务器启动前，必须先运行服务（`webmcp service start -d`）。

---

## adapter

管理网站 adapter。Adapter 是存储在 npm 包内 `extension/adapters/` 目录下的 JavaScript 文件。

### `webmcp adapter list`

```
webmcp adapter list
```

显示所有本地已安装的 adapter。

### `webmcp adapter install`

```
webmcp adapter install <id> [--reload]
webmcp adapter install --url <url> [--reload]
webmcp adapter install --file <path> [--reload] [--name <id>]
```

从 Hub、远程 URL 或本地文件安装 adapter。

| 来源 | 标志 | 说明 |
|---|---|---|
| Hub（官方） | `<id>` | 如 `mail.163.com` |
| 远程 URL | `--url <url>` | 必须是 `https://`，adapter id 从文件名推断 |
| 本地文件 | `--file <path>` | 适合开发或私有 adapter |

`--reload` 在安装后立即向 Chrome 扩展发送重载信号。

`--name <id>` 覆盖推断出的 adapter id（配合 `--url` 或 `--file` 使用）。

**示例：**

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

移除已安装的 adapter。使用 `--reload` 可立即刷新扩展。

```bash
webmcp adapter remove mail.google.com --reload
```

### `webmcp adapter refresh`

```
webmcp adapter refresh
```

强制清除本地 Hub 注册表缓存并从 GitHub 重新拉取。扩展弹窗的 adapter 列表会自动更新。

---

## extension-path

```
webmcp extension-path
```

打印 Chrome 扩展包所在目录的路径，在 Chrome 中加载扩展时使用。

```bash
webmcp extension-path
# /usr/local/lib/node_modules/webmcp-adapter/extension
```

---

## 全局选项

### `--version` / `-v`

```
webmcp --version
```

打印已安装的版本号。

### `--help` / `-h`

```
webmcp --help
```

打印所有命令的摘要。

---

## 日志文件

以 daemon 模式运行服务时，日志写入以下位置：

| 文件 | 用途 |
|---|---|
| `~/.webmcp/service.pid` | 后台服务进程的 PID |
| `~/.webmcp/service.log` | 服务的 stdout + stderr 合并输出 |
