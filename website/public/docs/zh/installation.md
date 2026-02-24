# 完整安装

详细的安装和配置说明。

## 系统要求

| 组件 | 要求 |
|---|---|
| 操作系统 | macOS（Windows 规划中） |
| Node.js | 18 或更高版本 |
| 浏览器 | Google Chrome |
| AI 客户端 | Claude Desktop |

## 1. 安装 CLI

```bash
npm install -g webmcp-adapter
```

这会全局安装 `webmcp` 命令。验证安装：

```bash
webmcp --version
```

## 2. 加载 Chrome 扩展

扩展已内置在 npm 包中，找到其路径：

```bash
webmcp extension-path
# 示例：/usr/local/lib/node_modules/webmcp-adapter/extension
```

在 Chrome 中加载：

1. 在 Chrome 中打开 `chrome://extensions`
2. 开启右上角**开发者模式**
3. 点击**加载已解压的扩展程序**
4. 选择上方命令打印的路径

扩展卡片上会显示一个扩展 ID，调试时可能用到。

> **重要：** 请始终从 `webmcp extension-path` 返回的路径加载扩展。这样才能确保通过 `webmcp adapter install` 安装的 adapter 文件能被扩展找到。

## 3. 配置 Claude Desktop

### 找到配置文件

| 平台 | 路径 |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

### 编辑配置

```json
{
  "mcpServers": {
    "webmcp-adapter": {
      "command": "webmcp"
    }
  }
}
```

由于 `webmcp` 是全局安装的 CLI 命令，无需填写绝对路径。

## 4. 启动 WebSocket 服务

```bash
webmcp start
```

验证服务已启动（检查 3711 端口是否在监听）：

```bash
lsof -i :3711
```

## 5. 安装 Adapter

```bash
webmcp adapter install mail.163.com --reload
webmcp adapter install mail.google.com --reload
```

查看 Hub 中所有可用的 adapter：

```bash
webmcp adapter refresh   # 更新本地注册表缓存
webmcp adapter list      # 显示已安装的 adapter
```

## 6. 重启 Claude Desktop

编辑配置后，需要完全退出并重新启动 Claude Desktop，才能加载新的 MCP 服务器。

## 开机自启（可选）

### macOS — launchd

创建文件 `~/Library/LaunchAgents/com.webmcp.adapter.plist`：

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

加载（开机自启生效）：
```bash
launchctl load ~/Library/LaunchAgents/com.webmcp.adapter.plist
```

卸载（取消自启）：
```bash
launchctl unload ~/Library/LaunchAgents/com.webmcp.adapter.plist
```

> **提示：** 如果 launchctl 找不到 `webmcp`，使用完整路径。运行 `which webmcp` 获取路径，将 `<string>webmcp</string>` 替换为如 `<string>/usr/local/bin/webmcp</string>`。

### macOS/Linux — pm2

[pm2](https://pm2.keymetrics.io/) 是流行的 Node.js 进程管理工具：

```bash
npm install -g pm2
pm2 start webmcp -- start
pm2 save
pm2 startup   # 按照打印的指引完成自启配置
```

## 卸载

1. 从 Claude Desktop 配置中删除 `webmcp-adapter` 条目
2. 停止服务：终止 `webmcp start` 进程（或 `pm2 stop webmcp`）
3. 在 `chrome://extensions` 中移除 Chrome 扩展
4. 卸载包：`npm uninstall -g webmcp-adapter`
