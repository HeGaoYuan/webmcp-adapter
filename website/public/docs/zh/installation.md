# 完整安装

基本安装流程请参见[快速开始](/docs/quick-start)。本页介绍后续内容：开机自启服务、连接多种 AI 客户端，以及卸载。

## 开机自启

WebSocket 服务需要在 Claude Desktop 连接之前运行。与其每次手动启动，不如配置成开机自动启动。

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
    <string>service</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/Users/YOUR_USERNAME/.webmcp/service.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/YOUR_USERNAME/.webmcp/service.log</string>
</dict>
</plist>
```

> 将 `YOUR_USERNAME` 替换为你的用户名，或使用 `echo $HOME` 获取完整路径。
>
> 如果 launchd 找不到 `webmcp`，用 `which webmcp` 获取完整路径（如 `/usr/local/bin/webmcp`），替换 plist 中的 `<string>webmcp</string>`。

启用（开机自启生效）：
```bash
launchctl load ~/Library/LaunchAgents/com.webmcp.adapter.plist
```

禁用：
```bash
launchctl unload ~/Library/LaunchAgents/com.webmcp.adapter.plist
```

### macOS / Linux — pm2

[pm2](https://pm2.keymetrics.io/) 是流行的 Node.js 进程管理工具，支持跨平台自启：

```bash
npm install -g pm2
pm2 start webmcp -- service start
pm2 save
pm2 startup   # 按照打印的指引完成自启配置
```

常用 pm2 命令：
```bash
pm2 status         # 查看所有进程
pm2 logs webmcp    # 查看日志
pm2 stop webmcp    # 停止
pm2 restart webmcp # 重启
```

## AI 客户端配置

所有兼容 MCP 的客户端使用相同的命令，只是配置文件的位置和格式略有不同。

### Claude Desktop

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

配置文件位置：
- **macOS：** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows：** `%APPDATA%\Claude\claude_desktop_config.json`

### Cursor / 其他 MCP 客户端

Cursor 等工具使用相同的 MCP server 格式。查阅你的客户端文档获取配置文件位置，然后添加与上方相同的 `webmcp mcp` 配置项。

## 卸载

```bash
webmcp service stop                          # 停止后台服务
launchctl unload ~/Library/LaunchAgents/com.webmcp.adapter.plist  # 禁用自启（macOS）
npm uninstall -g webmcp-adapter              # 删除 CLI 和扩展包
```

然后在 `chrome://extensions` 中移除 Chrome 扩展，并从 AI 客户端配置文件中删除 `webmcp-adapter` 条目。
