# 安全模型

本页说明 WebMCP Adapter 的安全架构、已知风险及其缓解措施。

## 信任边界

WebMCP Adapter 由四个层次组成，每层具有不同的信任级别：

```
Claude Desktop（MCP 客户端）
    ↓  stdio（本地进程，受信任）
native-host/mcp-server.js
    ↓  WebSocket ws://localhost:3711（仅环回地址）
extension/background/service-worker.js
    ↓  chrome.scripting / chrome.runtime（Chrome 沙箱）
extension/adapters/{site}.js（运行在 Isolated World 中）
```

- **仅限本地。** WebSocket Bridge 绑定到 `127.0.0.1:3711`，所有通信不经过核心基础设施离开你的机器。
- **Chrome Isolated World。** Adapter 脚本运行在 Chrome 的 Isolated World 中——可以读写 DOM，但无法访问宿主页面的 JavaScript 变量或闭包。
- **无遥测。** WebMCP 不向任何远程服务器发送使用数据、邮件内容或个人数据。

## 已知风险

### 1. Adapter 代码拥有完整 DOM 访问权限

**风险级别：高（设计层面的固有限制）**

已安装的 adapter 对其匹配网站的 DOM 具有完整的读写权限。这意味着恶意 adapter 可能：
- 读取所有展示内容（包括邮件、消息等敏感数据）
- 通过 `fetch()` 或图片信标将数据外传到外部服务器
- 在你发送内容之前对其进行修改

**缓解措施：**
- 只安装来自官方 Hub 或你信任且已审查过的来源的 adapter
- Hub 中的 adapter 均为开源代码——安装前可在 `hub/adapters/{id}/index.js` 阅读每一行
- Adapter 安装需要显式 CLI 操作（`node index.js adapter install`）——不会自动安装任何内容

### 2. 未加密的本地 WebSocket

**风险级别：实际风险较低**

扩展与 Native Host 之间通过 `ws://localhost:3711` 通信，不使用 TLS。这是本地 IPC 的常见做法，但意味着：
- 同一机器上的其他进程可以连接到此端口
- 工具调用载荷（可能包含邮件内容）在环回传输时未加密

**缓解措施：**
- 端口仅绑定到环回地址 `127.0.0.1`，不绑定到网络接口
- 能够读取环回流量的攻击者，通常已在 OS 层面完全控制了你的机器
- 目前不需要认证密钥即可连接——避免在运行 WebMCP 的同一台机器上同时运行不受信任的软件

### 3. Adapter 供应链

**风险级别：中（针对社区 adapter）**

从 Hub 安装 adapter 时，你需要信任：
1. GitHub 仓库未被入侵
2. Adapter 作者未包含恶意代码
3. Hub 维护者正确审查了该 adapter

**缓解措施：**
- 所有 Hub adapter 在合并前均经过人工审查
- Adapter 代码是人类可读的 JavaScript——安装前请审阅 `index.js`
- 如有顾虑，可先在本地审计后通过 `--file` 安装本地副本
- `verified_on` 日期记录了每个 adapter 最后确认可用和经过审查的时间

### 4. AI 操作范围

**风险级别：中（操作层面）**

Claude 或其他 MCP 客户端可以调用已安装 adapter 注册的任意工具。混乱或恶意的 AI 指令可能导致意外操作（发送邮件、删除数据等）。

**缓解措施：**
- 对 AI 操作保持监督，尤其是在具有写权限的网站上（邮件、社交媒体等）
- 工具作用域限定在单个浏览器标签页——`mail.google.com` 的 adapter 不会影响其他网站
- 可随时通过扩展弹窗检查哪些工具处于活跃状态

## 已修复的问题

以下漏洞已在代码库中被识别并修复：

| 问题 | 严重程度 | 修复方式 |
|---|---|---|
| `openBrowser()` 中通过 shell 字符串插值 URL 导致的命令注入 | 严重 | 将 `exec()` 替换为 `execFile()`，URL 作为独立参数传递，不经过 shell 解析 |
| `fetchViaCurl()` 中通过 shell 字符串插值 URL 导致的命令注入 | 严重 | 同上，改用 `execFile('curl', [url])` |
| `--url` adapter 安装接受 `file://`、`data:` 等协议 | 高 | 现在仅允许 `https://`，其他协议一律拒绝 |
| Adapter id 在构造文件路径前未经验证 | 中 | 使用正则 `^[a-zA-Z0-9][a-zA-Z0-9._-]*$` 进行校验 |
| Registry 中的 `homepage` 字段未经验证就作为链接使用 | 低 | 在 `chrome.tabs.create()` 前校验 URL 协议（仅允许 http/https） |

## 用户建议

1. **安装前审阅 adapter 代码**——尤其是访问敏感网站（邮件、银行、工作工具）的 adapter。
2. **运行 WebMCP 时，不要在同一台机器上运行不受信任的进程。**
3. **使用 `--file` 标志**从本地已审计的副本安装，而非直接从远程 URL 拉取。
4. **定期查看弹窗**，了解当前活跃的 adapter 及其暴露的工具列表。
5. **移除不再使用的 adapter**：`node index.js adapter remove <id> --reload`。

## 报告安全漏洞

如果你发现安全漏洞，请通过 [GitHub Issues](https://github.com/HeGaoYuan/webmcp-adapter/issues) 提交，并添加 `security` 标签。对于敏感报告，可通过 GitHub 直接联系维护者。
