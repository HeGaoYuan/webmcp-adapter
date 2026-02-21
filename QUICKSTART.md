# WebMCP Adapter 快速开始

## 🚀 5分钟快速上手

### 第一步：启动WebSocket服务

```bash
./start-service.sh start
```

你应该看到：
```
✓ Native host started successfully (PID: xxxxx)
  Log file: /Users/dear/myProject/webmcp-adapter/native-host.log
  WebSocket: ws://localhost:3711
```

### 第二步：打开支持的网站

在Chrome中打开以下任一网站：
- **Gmail**: https://mail.google.com
- **163邮箱**: https://mail.163.com

等待页面完全加载（约5-10秒）。

### 第三步：验证工具已注册

```bash
./start-service.sh status
```

你应该在日志中看到类似：
```
[Bridge] Registered 2 tools for tab 1069644375
```

### 第四步：启动Claude Desktop

如果Claude Desktop已经在运行，重启它（Command+Q 然后重新打开）。

### 第五步：测试

在Claude Desktop中输入：
```
请列出可用的工具
```

你应该看到类似：
- `search_emails` - 在邮箱中搜索邮件
- `get_unread_emails` - 获取未读邮件

然后尝试使用工具：
```
搜索我的邮件中包含"发票"的内容
```

## ✅ 验证清单

如果遇到问题，按照这个清单检查：

### 1. WebSocket服务是否运行？
```bash
./start-service.sh status
```
应该显示：`✓ Native host is running`

### 2. Chrome扩展是否已加载？
- 打开 `chrome://extensions`
- 找到 "WebMCP Adapter"
- 确认已启用

### 3. Chrome扩展是否已连接？
```bash
./start-service.sh logs | grep "New connection"
```
应该看到：`[Bridge] New connection #xxxxx`

### 4. 工具是否已注册？
```bash
./start-service.sh logs | grep "Registered"
```
应该看到：`[Bridge] Registered X tools for tab xxxxx`

### 5. Claude Desktop配置是否正确？
```bash
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```
应该包含：
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

## 🔧 常用命令

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

## 🐛 常见问题

### 问题1：服务启动失败，提示"Port 3711 is already in use"

**解决：**
```bash
# 停止占用端口的进程
lsof -ti :3711 | xargs kill -9

# 重新启动
./start-service.sh start
```

### 问题2：Chrome扩展显示"ERR_CONNECTION_REFUSED"

**原因：** WebSocket服务未运行

**解决：**
```bash
./start-service.sh start
```

### 问题3：Claude Desktop显示"Service is not running"

**原因：** WebSocket服务未运行

**解决：**
```bash
# 启动服务
./start-service.sh start

# 重启Claude Desktop
```

### 问题4：工具列表为空

**原因：** 未打开支持的网站

**解决：**
1. 在Chrome中打开 Gmail 或 163mail
2. 等待页面完全加载
3. 验证工具已注册：`./start-service.sh logs | grep Registered`
4. 在Claude Desktop中重新发起对话

### 问题5：工具调用超时

**检查：**
```bash
# 1. 服务是否运行
./start-service.sh status

# 2. 查看实时日志
./start-service.sh logs -f

# 3. 在Claude Desktop中调用工具，观察日志输出
```

## 📊 架构说明

```
┌─────────────────┐
│ Claude Desktop  │  ← 你在这里使用工具
└────────┬────────┘
         │ stdio (MCP)
         ▼
┌─────────────────────────┐
│  MCP进程                │  ← Claude自动启动
│  (连接到WebSocket)      │
└────────┬────────────────┘
         │ WebSocket
         ▼
┌─────────────────────────┐
│  WebSocket服务          │  ← 你需要手动启动
│  (localhost:3711)       │     ./start-service.sh start
└────────┬────────────────┘
         │ WebSocket
         ▼
┌─────────────────────────┐
│  Chrome Extension       │  ← 自动连接
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Gmail / 163mail        │  ← 你需要打开网站
└─────────────────────────┘
```

## 🎯 使用流程

每次使用WebMCP Adapter时：

1. **启动服务** → `./start-service.sh start`
2. **打开网站** → Gmail 或 163mail
3. **使用Claude** → 在Claude Desktop中调用工具

停止使用时：

```bash
./start-service.sh stop
```

## 💡 提示

- 服务可以一直运行，不需要每次都重启
- 可以配置开机自动启动（参见 SETUP.md）
- 支持同时连接多个MCP客户端（Claude Desktop、Cline、Cursor等）
- 日志文件位置：`native-host.log`

## 📚 更多文档

- **完整安装指南**: `SETUP.md`
- **故障排除**: `DEBUGGING.md`
- **架构说明**: `README.md`
