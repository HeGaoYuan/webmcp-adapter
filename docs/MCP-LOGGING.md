# MCP 日志说明

## 日志位置

MCP server 的日志保存在：
```
~/.webmcp/mcp-YYYY-MM-DDTHH-MM-SS.log
```

每次启动 MCP server 都会创建一个新的日志文件，文件名包含启动时间戳。

## 查看日志

```bash
# 查看最新的 MCP 日志
webmcp mcp-logs

# 实时跟踪 MCP 日志
webmcp mcp-logs -f

# 直接查看日志文件
ls -lt ~/.webmcp/mcp-*.log | head -5
cat ~/.webmcp/mcp-2026-02-28T04-26-29.log
```

## 日志格式

每条日志包含：
- **时间戳**: ISO 8601 格式（UTC）
- **前缀**: `[WebMCP]` 表示来自 MCP server
- **消息内容**: 包含符号标识消息方向和类型

### 符号说明

- `←` - 接收到的消息（从客户端或 WebSocket）
- `→` - 发送的消息（到客户端或 WebSocket）
- `⚡` - 内部事件
- `✓` - 成功状态

## 日志示例

### 1. 启动过程

```
2026-02-28T04:26:29.919Z [WebMCP] Log file created: /Users/dear/.webmcp/mcp-2026-02-28T04-26-29.log
2026-02-28T04:26:29.919Z [WebMCP] Started at: 2026-02-28T04:26:29.919Z
2026-02-28T04:26:29.919Z [WebMCP] Starting MCP server...
2026-02-28T04:26:29.938Z [WebMCP] Connected to service
2026-02-28T04:26:29.939Z [WebMCP] Connected to WebSocket service
2026-02-28T04:26:29.942Z [WebMCP] ✓ MCP Server connected and ready
2026-02-28T04:26:29.942Z [WebMCP] MCP server ready
2026-02-28T04:26:29.942Z [WebMCP] Log file: /Users/dear/.webmcp/mcp-2026-02-28T04-26-29.log
```

### 2. 工具列表同步

```
2026-02-28T04:26:29.942Z [WebMCP] ← WebSocket: tools_snapshot (6 tools total)
2026-02-28T04:26:29.942Z [WebMCP]   Tab 1069648863: mail.163.com.navigate_to_inbox, mail.163.com.search_emails, mail.163.com.get_unread_emails, mail.163.com.open_email, mail.163.com.download_attachment, mail.163.com.get_current_page_info
2026-02-28T04:26:29.942Z [WebMCP] ⚡ Event: tools_updated from bridge
2026-02-28T04:26:30.044Z [WebMCP] → Sending: notifications/tools/list_changed
2026-02-28T04:26:30.044Z [WebMCP]   Notification sent successfully
```

**说明**:
- 从 WebSocket 接收到工具快照
- 显示每个 tab 注册的工具列表
- 触发内部事件
- 向客户端发送工具列表变更通知

### 3. list_tools 请求

```
2026-02-28T04:30:15.123Z [WebMCP] ← Received: list_tools request
2026-02-28T04:30:15.125Z [WebMCP] → Response: 7 tools (1 system + 6 web)
2026-02-28T04:30:15.125Z [WebMCP]   Web tools: mail.163.com.navigate_to_inbox, mail.163.com.search_emails, mail.163.com.get_unread_emails, mail.163.com.open_email, mail.163.com.download_attachment, mail.163.com.get_current_page_info
```

**说明**:
- 客户端请求工具列表
- 返回系统工具（open_browser）+ 网站工具
- 列出所有可用的网站工具名称

### 4. call_tool 请求（成功）

```
2026-02-28T04:30:20.456Z [WebMCP] ← Received: call_tool request
2026-02-28T04:30:20.456Z [WebMCP]   Tool: mail.163.com.search_emails
2026-02-28T04:30:20.456Z [WebMCP]   Args: {"keyword":"发票"}
2026-02-28T04:30:20.457Z [WebMCP]   Getting active tab...
2026-02-28T04:30:20.457Z [WebMCP] → WebSocket: get_active_tab (request 1)
2026-02-28T04:30:20.460Z [WebMCP] ← WebSocket: get_active_tab_result (tab 1069648863)
2026-02-28T04:30:20.460Z [WebMCP]   Active tab: 1069648863
2026-02-28T04:30:20.461Z [WebMCP]   Calling tool "mail.163.com.search_emails" on tab 1069648863...
2026-02-28T04:30:20.461Z [WebMCP] → WebSocket: call_tool (request 2)
2026-02-28T04:30:22.789Z [WebMCP] ← WebSocket: call_tool_result (request 2)
2026-02-28T04:30:22.790Z [WebMCP] → Response: Success (1234 chars)
```

**说明**:
- 接收到工具调用请求
- 显示工具名称和参数
- 获取活跃的 tab ID
- 向 WebSocket 发送工具调用请求
- 接收到执行结果
- 返回成功响应

### 5. call_tool 请求（错误）

```
2026-02-28T04:31:10.123Z [WebMCP] ← Received: call_tool request
2026-02-28T04:31:10.123Z [WebMCP]   Tool: mail.163.com.search_emails
2026-02-28T04:31:10.123Z [WebMCP]   Args: {"keyword":"测试"}
2026-02-28T04:31:10.124Z [WebMCP]   Getting active tab...
2026-02-28T04:31:10.124Z [WebMCP] → WebSocket: get_active_tab (request 3)
2026-02-28T04:31:10.127Z [WebMCP] ← WebSocket: get_active_tab_error: No active tab found
2026-02-28T04:31:10.127Z [WebMCP] → Response: Error - No active tab found
```

**说明**:
- 尝试获取活跃 tab 失败
- 返回错误响应

### 6. 工具列表更新

```
2026-02-28T04:32:00.456Z [WebMCP] ← WebSocket: tools_updated (tab 1069648863)
2026-02-28T04:32:00.456Z [WebMCP]   Registered 6 tools: mail.163.com.navigate_to_inbox, mail.163.com.search_emails, mail.163.com.get_unread_emails, mail.163.com.open_email, mail.163.com.download_attachment, mail.163.com.get_current_page_info
2026-02-28T04:32:00.456Z [WebMCP] ⚡ Event: tools_updated from bridge
2026-02-28T04:32:00.558Z [WebMCP] → Sending: notifications/tools/list_changed
2026-02-28T04:32:00.558Z [WebMCP]   Notification sent successfully
```

**说明**:
- 某个 tab 的工具列表更新
- 显示新注册的工具
- 通知客户端重新查询工具列表

### 7. 关闭过程

```
2026-02-28T04:35:00.123Z [WebMCP] Received SIGTERM, shutting down...
```

或

```
2026-02-28T04:35:00.123Z [WebMCP] Received SIGINT, shutting down...
```

## 消息类型

### MCP 协议消息

| 消息类型 | 方向 | 说明 |
|---------|------|------|
| `list_tools` | ← 请求 | 客户端请求工具列表 |
| `call_tool` | ← 请求 | 客户端调用工具 |
| `notifications/tools/list_changed` | → 通知 | 通知客户端工具列表已变更 |

### WebSocket 消息

| 消息类型 | 方向 | 说明 |
|---------|------|------|
| `tools_snapshot` | ← | 初始工具列表快照 |
| `tools_updated` | ← | 工具列表更新 |
| `get_active_tab` | → | 请求活跃的 tab ID |
| `get_active_tab_result` | ← | 返回 tab ID |
| `get_active_tab_error` | ← | 获取失败 |
| `call_tool` | → | 调用工具 |
| `call_tool_result` | ← | 工具执行结果 |
| `call_tool_error` | ← | 工具执行失败 |
| `open_browser` | → | 打开浏览器 |

### 内部事件

| 事件类型 | 说明 |
|---------|------|
| `tools_updated` | Bridge 触发的工具列表更新事件 |

## 调试技巧

### 1. 实时监控日志

```bash
# 在一个终端窗口中实时查看日志
webmcp mcp-logs -f
```

### 2. 过滤特定消息

```bash
# 只看请求
grep "← Received:" ~/.webmcp/mcp-*.log

# 只看响应
grep "→ Response:" ~/.webmcp/mcp-*.log

# 只看错误
grep "Error" ~/.webmcp/mcp-*.log

# 只看工具调用
grep "call_tool" ~/.webmcp/mcp-*.log
```

### 3. 分析工具使用情况

```bash
# 统计各工具的调用次数
grep "Tool:" ~/.webmcp/mcp-*.log | sort | uniq -c | sort -rn
```

### 4. 查看最近的错误

```bash
# 最近 10 条错误
grep "Error" ~/.webmcp/mcp-*.log | tail -10
```

## 日志保留策略

日志文件会持续累积，建议定期清理：

```bash
# 查看日志文件大小
du -sh ~/.webmcp/mcp-*.log

# 删除 7 天前的日志
find ~/.webmcp -name "mcp-*.log" -mtime +7 -delete

# 只保留最新 10 个日志文件
ls -t ~/.webmcp/mcp-*.log | tail -n +11 | xargs rm -f
```

## 常见问题

### Q: 为什么看不到日志？

A: 确保 MCP server 已经启动。日志只在 `webmcp mcp` 运行时才会生成。

### Q: 日志文件太多怎么办？

A: 使用上面的清理命令定期删除旧日志。

### Q: 如何查看特定时间段的日志？

A: 日志文件名包含时间戳，可以根据文件名筛选：
```bash
ls ~/.webmcp/mcp-2026-02-28*.log
```

### Q: 日志中的时间是什么时区？

A: 日志使用 UTC 时间（ISO 8601 格式）。
