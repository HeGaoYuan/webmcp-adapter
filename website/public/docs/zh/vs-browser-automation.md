# 对比：WebMCP Adapter vs. 基于 CDP 的浏览器自动化

目前有多个 MCP 项目能让 AI 客户端操控浏览器。最常见的方案使用 **Chrome DevTools Protocol（CDP）**——与 Playwright、Puppeteer、Selenium 底层机制相同。WebMCP Adapter 采用了不同的路径。本页说明两者的区别，以及各自适用的场景。

## CDP 方案的工作方式

[chrome-mcp](https://github.com/hangwin/mcp-chrome)、Playwright MCP 等工具通过 Chrome 的远程调试端口（`--remote-debugging-port`）连接浏览器，可以执行：

- 导航到任意 URL
- 截图
- 在页面上下文中执行任意 JavaScript
- 通过 CSS 选择器或坐标点击元素
- 读写 DOM

这些是**底层、通用的浏览器操作原语**。可以作用于任何网站，但给 Claude 的是裸浏览器能力，而非业务层工具。

## WebMCP Adapter 的工作方式

WebMCP Adapter 通过运行在浏览器正常进程内的 **Chrome 扩展**进行连接。针对特定网站的 Adapter 被加载到该页面的 isolated world 中，通过调用 `window.__webmcpRegister()` 暴露一组**具名、有类型的工具**——每个工具都是为该网站某个具体操作而构建的函数。

Claude 拿到的不是 DOM 句柄，而是 `search_emails(keyword)` 或 `get_unread_count()` 这样的工具。网站的实现细节留在 Adapter 内部。

## 横向对比

| | 基于 CDP 的 MCP | WebMCP Adapter |
|---|---|---|
| **连接方式** | 远程调试端口（`--remote-debugging-port`） | Chrome 扩展 via WebSocket |
| **工具抽象层级** | 低层（`navigate`、`click`、`evaluate`） | 高层、网站专属（`search_emails`、`compose`） |
| **网站知识** | 无——Claude 需自行探索页面结构 | 编码在 Adapter 中——Claude 调用语义工具 |
| **Prompt 复杂度** | 较高——Claude 须推理选择器和页面状态 | 较低——工具名和参数直接承载意图 |
| **脆弱性** | 高——DOM 或 JS 框架变动即可破坏 | 局限于 Adapter——只有受影响的 Adapter 需要更新 |
| **覆盖范围** | 任意网站，立即可用 | 每个网站需对应 Adapter |
| **认证上下文** | 复用你已登录的浏览器会话 | 相同——运行在真实浏览器中 |
| **纯本地** | 取决于实现 | 设计上强制本地 |

## 权衡

**CDP 方案更灵活。** 如果你需要自动化一个没有 Adapter 的网站，或者希望 Claude 能自由浏览任意网页，CDP 方案是正确选择。代价是 Claude 必须自行构建对页面结构的理解，Prompt 复杂度上升，失败点也随之增多。

**WebMCP Adapter 更稳定、更可预测。** 当某个网站有 Adapter 时，Claude 拥有干净的类型化接口。DOM 的各种细节——React 合成事件的要求、时序问题——由 Adapter 作者处理一次，所有调用方受益。工具调用是确定性的：`search_emails("发票")` 始终执行相同的操作。

这一抽象层也带来安全含义：Claude 没有 `evaluate()` 这样的逃生舱口在你的浏览器中执行任意代码，它只能调用 Adapter 明确暴露的操作。

## 适用场景

| 场景 | 推荐方案 |
|---|---|
| 自动化你日常使用的特定网站 | WebMCP Adapter（已有 Adapter 或自行编写） |
| 通用网页浏览或一次性任务 | CDP 方案 |
| 在已知网站上构建稳定、可重复的 AI 工作流 | WebMCP Adapter |
| 在尚无 Adapter 支持的网站上进行探索性自动化 | CDP 方案 |

## 两者可以并用

两种方案并不互斥。你可以同时在 Claude Desktop 中配置 CDP 类 MCP 服务器和 WebMCP Adapter。Claude 会根据任务选择合适的工具。

## 相关文档

- [架构](/docs/architecture) — 内部组件图
- [Adapter 体系](/docs/adapter-system) — Adapter 如何加载和隔离
- [编写 Adapter](/docs/writing-an-adapter) — 为新网站贡献 Adapter
