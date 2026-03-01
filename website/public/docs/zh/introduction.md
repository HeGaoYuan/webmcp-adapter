# 项目介绍

WebMCP Adapter 是一个开源项目，通过 MCP 协议让 Claude 等 AI 客户端能够直接操控浏览器中的网页——无需对网站做任何改动。

## 解决什么问题？

如果你想让 AI 在网站上执行操作——比如自动填写表单、搜索邮件、下载附件——通常做不到，因为 Claude Desktop、Cursor 等 AI 应用无法访问浏览器。有了 WebMCP Adapter，你可以将 AI 应用连接到浏览器，让它们代替你自动完成任务。

WebMCP Adapter 让这一切变得简单。你描述你想要什么，Claude 替你完成浏览器交互。

```
"把我本月收件箱里所有发票相关的附件下载下来"
```

Claude 会自动打开 163mail，搜索发票，逐一打开邮件并下载附件——你不需要碰浏览器。

## 工作原理（概览）

WebMCP Adapter 将三个组件连接在一起：

1. **MCP 服务器** — 实现 [Model Context Protocol](https://modelcontextprotocol.io/)，让 Claude Desktop 能发现并调用网页工具
2. **WebSocket 服务** — 本地后台服务，在扩展和 MCP 服务器之间路由消息
3. **Chrome 扩展** — 检测网页 URL，注入对应的 adapter 脚本，adapter 通过 DOM API 操作网页

## 核心特性

| 特性 | 说明 |
|---|---|
| **无需改动网站** | 通过注入 JavaScript 操控现有页面 |
| **本地架构** | 所有组件在本机运行，通信通过 `localhost` 完成 |
| **社区驱动** | 任何人都可以为任意网站编写并分享 adapter |
| **开放协议** | 基于 [Model Context Protocol](https://modelcontextprotocol.io/) 标准构建 |

## 已支持的网站

Adapter 由社区贡献。在 [Adapter Hub](/adapters) 查看当前完整列表。

## 下一步

- [5 分钟上手](/docs/quick-start) — 快速跑通整个流程
- [完整安装](/docs/installation) — 详细的安装配置指南
- [架构](/docs/architecture) — 了解各组件如何连接
