# WebMCP Adapter 完整安装指南

## 架构说明

WebMCP Adapter 使用**独立服务架构**：

```
┌─────────────────┐
│ Claude Desktop  │
│  (MCP Client)   │
└────────┬────────┘
         │ stdio
         ▼
┌─────────────────────────┐
│  MCP进程                │
│  (由Claude启动)         │
│  • 连接到WebSocket服务  │
└────────┬────────────────┘
         │ WebSocket
         ▼
┌─────────────────────────┐
│  WebSocket服务          │  ← 独立后台服务
│  (localhost:3711)       │
│  • 管理工具注册表       │
└────────┬────────────────┘
         │ WebSocket
         ▼
┌─────────────────────────┐
│  Chrome Extension       │
└─────────────────────────┘
```

## 安装步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 安装Chrome扩展

1. 打开Chrome浏览器
2. 访问 `chrome://extensions`
3. 启用"开发者模式"（右上角）
4. 点击"加载已解压的扩展程序"
5. 选择项目中的 `extension/` 文件夹
6. 记下扩展ID（类似 `abcdefghijklmnopabcdefghijklmnop`）

### 3. 配置Claude Desktop

编辑配置文件：
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

添加以下配置：

```json
{
  "mcpServers": {
    "webmcp-adapter": {
      "command": "node",
      "args": ["/绝对路径/webmcp-adapter/native-host/index.js"]
    }
  }
}
```

**重要：** 将 `/绝对路径/` 替换为实际的项目路径。

### 4. 启动WebSocket服务

```bash
./start-service.sh start
```

验证服务已启动：
```bash
./start-service.sh status
```

应该看到：
```
✓ Native host is running (PID: xxxxx)
```

## 使用流程

### 每次使用前

1. **启动WebSocket服务**（如果未运行）
   ```bash
   ./start-service.sh start
   ```

2. **打开Chrome并访问支持的网站**
   - Gmail: https://mail.google.com
   - 163邮箱: https://mail.163.com

3. **启动Claude Desktop**
   - Claude会自动连接到WebSocket服务

4. **测试工具**
   ```
   请列出可用的工具
   ```

### 停止服务

```bash
./start-service.sh stop
```

## 服务管理命令

```bash
# 启动服务
./start-service.sh start

# 停止服务
./start-service.sh stop

# 重启服务
./start-service.sh restart

# 查看状态
./start-service.sh status

# 查看日志
./start-service.sh logs

# 实时查看日志
./start-service.sh logs -f
```

## 自动启动配置（可选）

### macOS - 使用launchd

创建 `~/Library/LaunchAgents/com.webmcp.adapter.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.webmcp.adapter</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/node</string>
        <string>/绝对路径/webmcp-adapter/native-host/index.js</string>
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

加载服务：
```bash
launchctl load ~/Library/LaunchAgents/com.webmcp.adapter.plist
```

卸载服务：
```bash
launchctl unload ~/Library/LaunchAgents/com.webmcp.adapter.plist
```

## 故障排除

### 问题1：Claude Desktop显示"Service is not running"

**原因：** WebSocket服务未启动

**解决：**
```bash
./start-service.sh start
```

### 问题2：Chrome扩展无法连接

**症状：** Service Worker日志显示 `ERR_CONNECTION_REFUSED`

**检查：**
```bash
./start-service.sh status
```

**解决：**
1. 确保服务正在运行
2. 检查端口3711是否被占用：`lsof -i :3711`
3. 重启服务：`./start-service.sh restart`

### 问题3：工具列表为空

**原因：** 未打开支持的网站

**解决：**
1. 在Chrome中打开 Gmail 或 163mail
2. 等待页面完全加载（5-10秒）
3. 检查Service Worker日志，确认看到 "registered X tools"
4. 在Claude Desktop中重新发起对话

### 问题4：工具调用超时

**检查清单：**
1. ✓ WebSocket服务正在运行
2. ✓ Chrome扩展已连接（Service Worker日志）
3. ✓ 网站已打开并加载完成
4. ✓ 工具已注册

**查看日志：**
```bash
# WebSocket服务日志
./start-service.sh logs -f

# Claude Desktop日志
tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log
```

## 验证安装

运行完整的验证流程：

```bash
# 1. 启动服务
./start-service.sh start

# 2. 检查状态
./start-service.sh status

# 3. 在浏览器中打开测试页面
open test-connection.html

# 4. 点击"Connect"按钮，应该显示"Connected"

# 5. 打开Gmail或163mail

# 6. 在test-connection.html中点击"Send Test Message"

# 7. 查看服务日志
./start-service.sh logs
```

如果所有步骤都成功，说明安装正确。

## 支持的网站

| 网站 | 工具 |
|------|------|
| Gmail (mail.google.com) | search_emails, get_unread_emails, compose_email, open_email |
| 163邮箱 (mail.163.com) | search_emails, get_unread_emails, compose_email |

## 开发调试

### 手动启动服务（查看详细日志）

```bash
node native-host/index.js --service
```

### 手动启动MCP进程（测试）

```bash
node native-host/index.js
```

### 测试WebSocket连接

```bash
open test-connection.html
```

## 更新日志

### v0.2.0 - 独立服务架构
- 改用WebSocket独立服务架构
- 添加服务管理脚本
- 改进稳定性和调试体验
- 支持多个MCP客户端同时连接

### v0.1.0 - 初始版本
- 基本的MCP server功能
- Gmail和163mail适配器
