# 工作原理

详细介绍两个核心流程：**工具注册**和**工具调用**。

## 工具注册流程

当你在 Chrome 中打开一个已支持的网站时，以下步骤自动发生：

```
1. Chrome 加载页面
   ↓
2. injector.js（content script）检查当前域名
   ↓
3. 找到匹配的 adapter，injector.js 加载它
   ↓
4. Adapter 调用 window.__webmcpRegister({ name, match, tools })
   ↓
5. injector.js 通过 chrome.runtime.sendMessage 将工具列表发送给 service-worker.js
   ↓
6. service-worker.js 将工具列表转发给 WebSocket 服务
   消息：{ type: "tools_updated", tabId, tools }
   ↓
7. WebSocket 服务按 tabId 存储工具列表
   ↓
8. WebSocket 服务向所有已连接的 MCP 客户端广播更新
   消息：{ type: "tools_updated", tabId, tools }
   ↓
9. MCP 进程更新工具注册表，并上报给 Claude Desktop
```

结果：Claude Desktop 看到新工具，可在后续对话轮次中调用。

## 工具调用流程

当 Claude 决定调用一个工具时：

```
1. Claude Desktop 通过 stdio 向 MCP 进程发送工具调用请求
   ↓
2. MCP 进程向 WebSocket 服务发送调用请求
   消息：{ type: "call_tool", id, tabId, toolName, args }
   ↓
3. WebSocket 服务将请求路由给 Chrome 扩展的 service-worker
   ↓
4. service-worker.js 向目标 Tab 的 content script 发送消息
   ↓
5. injector.js 找到匹配的 adapter 并调用工具的 handler 函数
   handler({ param1, param2, ... })
   ↓
6. Handler 执行 DOM 操作（点击、读取文字、导航等）
   ↓
7. Handler 返回结果对象
   ↓
8. 结果原路返回：injector → service-worker → WebSocket 服务 → MCP 进程 → Claude Desktop
```

## WebSocket 消息类型

### 扩展 → 服务

```json
{ "type": "tools_updated", "tabId": 12345, "tools": [ /* Tool[] */ ] }
```

### 服务 → MCP 进程

```json
// 新工具注册时广播
{ "type": "tools_updated", "tabId": 12345, "tools": [ /* Tool[] */ ] }

// 新 MCP 客户端连接时发送，同步当前工具状态
{ "type": "tools_snapshot", "tools": [ /* Tool[] */ ] }

// 工具调用成功
{ "type": "call_tool_result", "id": "req-abc", "result": { /* 任意 */ } }

// 工具调用失败
{ "type": "call_tool_error", "id": "req-abc", "error": "Timeout: .selector" }
```

### MCP 进程 → 服务

```json
// 请求执行工具
{
  "type": "call_tool",
  "id": "req-abc",
  "tabId": 12345,
  "toolName": "search_emails",
  "args": { "keyword": "发票" }
}
```

## 超时与错误处理

- 若 MCP 进程启动后 **15 秒**内没有任何工具注册，它会向 Claude 返回空工具列表，避免阻塞会话。
- 若工具调用超过配置的超时时间，服务返回 `call_tool_error` 消息。
- 若 MCP 进程启动时 WebSocket 服务未运行，进程会输出明确的错误信息后退出。
