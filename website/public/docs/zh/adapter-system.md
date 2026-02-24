# Adapter 体系

Adapter 是一个小型 JavaScript 文件，用于告知 WebMCP 如何与特定网站交互。任何人都可以编写并通过 Pull Request 分享。

## Adapter 的作用

Adapter 通过调用 `window.__webmcpRegister()` 来声明：

1. **适用于哪些域名** — 如 `["mail.163.com"]`
2. **提供哪些工具** — 名称、描述、参数结构
3. **如何执行每个工具** — 使用 DOM API 实现的 handler 函数

## Hub

Adapter 存储在仓库的 `hub/adapters/{域名}/` 目录下。每个 adapter 文件夹包含：

| 文件 | 用途 |
|---|---|
| `index.js` | Adapter 代码 |
| `meta.json` | 元数据：名称、描述、作者、版本、验证日期 |

中央文件 `hub/registry.json` 列出所有可用 adapter，供扩展和网站发现。

## 安装 Adapter

使用 `webmcp` CLI 在本地安装 adapter：

```bash
webmcp adapter install mail.163.com --reload   # 从 Hub 安装
webmcp adapter install --url <url> --reload    # 从自定义 URL 安装（仅 https）
webmcp adapter install --file <path> --reload  # 从本地文件安装
```

CLI 会下载 adapter 的 `index.js` 并写入 npm 包内的 `extension/adapters/` 目录。Chrome 加载扩展时可直接注入这些本地文件，无需在页面加载时发起网络请求。

## 加载生命周期

当你在 Chrome 中打开一个页面时：

1. 扩展的 content script（`injector.js`）在每个页面上运行
2. 后台 service worker 将页面 hostname 与本地 `extension/adapters/` 目录及 Hub 注册表进行匹配
3. 如果本地已安装匹配的 adapter，其 `index.js` 从本地文件注入到页面
4. 如果本地未安装但 Hub 有匹配，扩展图标显示橙色 `!` 提示——运行 `webmcp adapter install <id> --reload` 安装
5. 注入的 adapter 调用 `window.__webmcpRegister()`，`injector.js` 将工具定义转发给后台 service worker

## Isolated World 沙箱

Adapter 运行在 Chrome 的 **Isolated World** 中——一个沙箱化的 JavaScript 环境：

- ✅ **可以** 读写 DOM（`document.querySelector` 等）
- ✅ **可以** 使用 `window.__webmcpRegister()`
- ✅ **可以** 使用标准 Web API（`setTimeout`、`MutationObserver`、同源 `fetch`）
- ❌ **不能** 访问页面自身的 JavaScript 变量或框架实例（React state、Angular controller 等）
- ❌ **不能** 使用 `import`/`export`（不支持 ES 模块）
- ❌ **不能** 使用 `chrome.*` API
- ❌ **不能** 发起跨域 `fetch` 请求

这个沙箱出于安全考虑：即使是恶意 adapter，也无法窃取存储在 JavaScript 内存中的认证 token 等页面级敏感信息。

## meta.json 字段

```json
{
  "id": "mail.163.com",
  "name": "163 Mail",
  "description": "Read emails, search, open messages, download attachments",
  "author": "webmcp-team",
  "match": ["mail.163.com"],
  "version": "2026-02-22T00:00:00Z",
  "verified_on": "2026-02-22",
  "homepage": "https://github.com/HeGaoYuan/webmcp-adapter/tree/main/hub/adapters/mail.163.com"
}
```

| 字段 | 说明 |
|---|---|
| `id` | 唯一标识符，通常为主域名 |
| `match` | Adapter 激活的 hostname 模式数组 |
| `version` | 最后发布时间（ISO 8601 格式） |
| `verified_on` | 最后确认在真实网站上可用的日期 |

## 下一步

- [编写 Adapter](/docs/writing-an-adapter) — 分步创建自己的 adapter
- [API 参考](/docs/api-reference) — `window.__webmcpRegister()` 完整规范
