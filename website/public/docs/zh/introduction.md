# 项目介绍

WebMCP Adapter 是一个开源桥接工具，让 Claude 等 AI 客户端能够通过 Chrome 扩展直接操控网页——无需对网站做任何改动。

## 解决什么问题？

现代 AI 助手在推理和规划方面能力强大，但它们只能活在对话窗口里。要在网站上实际*执行*操作——读取邮件、点击按钮、下载文件——用户必须手动切换上下文、复制粘贴信息，再把结果转述给 AI。

WebMCP Adapter 消除了这种摩擦。你描述你想要什么，Claude 替你完成浏览器交互。

```
"把我本月收件箱里所有发票相关的附件下载下来"
```

Claude 会自动打开 163mail，搜索发票，逐一打开邮件并下载附件——你不需要碰浏览器。

## 工作原理（概览）

WebMCP Adapter 将三个组件连接在一起：

1. **Chrome 扩展** — 注入到网页中，通过 `window.__webmcpRegister()` 将页面的功能暴露为可调用的工具
2. **WebSocket 服务** — 一个本地后台服务，在扩展和 MCP 客户端之间路由消息
3. **MCP 服务器** — 实现 [Model Context Protocol](https://modelcontextprotocol.io/)，让 Claude Desktop 能发现并调用这些网页工具

当 Claude 调用工具（如 `search_emails`）时，调用链路为：Claude Desktop → MCP 服务器 → WebSocket 服务 → Chrome 扩展 → DOM。结果沿原路返回。

## 核心特性

| 特性 | 说明 |
|---|---|
| **无需改动网站** | 通过注入 JavaScript 操控现有页面 |
| **纯本地通信** | 所有通信在 `localhost` 上完成，数据不离开本机 |
| **社区驱动** | 任何人都可以为任意网站编写并分享 adapter |
| **开放协议** | 基于 [Model Context Protocol](https://modelcontextprotocol.io/) 标准构建 |

## 已支持的网站

Adapter 由社区贡献。在 [Adapter Hub](/adapters) 查看当前完整列表。

## 下一步

- [5 分钟上手](/docs/quick-start) — 快速跑通整个流程
- [完整安装](/docs/installation) — 详细的安装配置指南
- [架构](/docs/architecture) — 了解各组件如何连接
