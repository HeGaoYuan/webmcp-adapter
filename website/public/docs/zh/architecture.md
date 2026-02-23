# 架构

WebMCP Adapter 采用**独立服务架构**，将 WebSocket 桥接与 Claude Desktop 的进程生命周期解耦。

## 组件图

```
┌──────────────────┐
│  Claude Desktop  │
│  (MCP 客户端)    │
└────────┬─────────┘
         │ stdio（JSON-RPC / MCP）
         ▼
┌──────────────────────────┐
│  MCP 进程                │
│  native-host/index.js    │
│  （由 Claude 启动）      │
└────────┬─────────────────┘
         │ WebSocket 客户端
         ▼
┌──────────────────────────┐
│  WebSocket 服务          │  ← 独立后台进程
│  localhost:3711          │
│  native-host/bridge.js   │
└────────┬─────────────────┘
         │ WebSocket 客户端
         ▼
┌──────────────────────────┐
│  Chrome 扩展             │
│  service-worker.js       │
└────────┬─────────────────┘
         │ Chrome 扩展消息传递
         ▼
┌──────────────────────────┐
│  Content Script          │
│  injector.js + adapter   │
└────────┬─────────────────┘
         │ DOM API
         ▼
┌──────────────────────────┐
│  网页                    │
│  (如 mail.163.com)       │
└──────────────────────────┘
```

## 各组件说明

### MCP 进程（`native-host/index.js`）

由 Claude Desktop 通过 stdio 启动。作为 **MCP 服务器**，实现 Model Context Protocol，让 Claude 能发现工具并发起调用。它本身不持有工具状态——它作为客户端连接到 WebSocket 服务，并通过它代理所有工具操作。

### WebSocket 服务（`native-host/bridge.js`）

运行在 `localhost:3711` 的**独立后台进程**，是整个系统的中枢：

- 同时接受 Chrome 扩展和 MCP 进程的连接
- 维护按浏览器 Tab 索引的工具注册表
- 将 MCP 进程的工具调用请求路由到对应 Tab 的扩展
- 向所有已连接的 MCP 客户端广播工具注册更新

独立运行意味着 Claude Desktop 重启或崩溃后，工具注册表不会丢失。

### Chrome 扩展

分为两个部分：

| 文件 | 职责 |
|---|---|
| `background/service-worker.js` | WebSocket 客户端；转发工具注册；处理调用路由 |
| `content/injector.js` | 注入每个页面；加载匹配的 adapter；将工具调用分发给 adapter 的 handler 函数 |

### Adapter

一个在页面的 **isolated world** 中运行的小 JavaScript 文件。它调用 `window.__webmcpRegister()` 声明提供的工具及其 handler。Handler 使用标准 DOM API 与页面交互。

## 两种运行模式

`native-host/index.js` 根据调用方式有两种模式：

| 模式 | 命令 | 职责 |
|---|---|---|
| **服务模式** | `node index.js --service` | 启动 WebSocket 服务器；作为长期后台守护进程运行 |
| **MCP 模式** | `node index.js`（由 Claude 启动） | 连接到已运行的 WebSocket 服务；向 Claude Desktop 实现 MCP 协议 |

这种分离确保了 WebSocket 服务（及其工具注册表）的生命周期长于任意单个 Claude 会话。

## 端口与纯本地策略

WebSocket 服务仅在 `localhost:3711` 上监听，不对外网开放。所有通信都在本机内完成。

## 下一步

- [工作原理](/docs/how-it-works) — 工具注册和调用的详细消息流
- [Adapter 体系](/docs/adapter-system) — adapter 如何加载和沙箱隔离
