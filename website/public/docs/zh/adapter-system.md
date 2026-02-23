# Adapter 体系

Adapter 是一个小型 JavaScript 文件，用于告诉 WebMCP 如何与特定网站交互。任何人都可以编写并通过 Pull Request 分享。

## Adapter 的作用

Adapter 调用 `window.__webmcpRegister()` 来声明：

1. **它适用于哪些域名** — 如 `["mail.163.com"]`
2. **它提供哪些工具** — 名称、描述、参数 Schema
3. **如何执行每个工具** — 使用 DOM API 的 handler 函数

## Hub（适配器仓库）

Adapter 存储在仓库的 `hub/adapters/{域名}/` 下。每个 adapter 文件夹包含：

| 文件 | 用途 |
|---|---|
| `index.js` | Adapter 代码 |
| `meta.json` | 元数据：名称、描述、作者、版本、验证日期 |

中央文件 `hub/registry.json` 列出所有可用 adapter，供网站发现和展示。

## 加载生命周期

当你在 Chrome 中打开页面时：

1. 扩展的 content script（`injector.js`）在每个页面上运行
2. 它将页面的主机名与所有已注册 adapter 的 `match` 数组对比
3. 若找到匹配项，从 Hub 拉取该 adapter 的 `index.js` 并注入页面
4. Adapter 调用 `window.__webmcpRegister()`，`injector.js` 将工具定义向上转发

## Isolated World 沙箱

Adapter 运行在 Chrome 的 **isolated world**——一个沙箱化的 JavaScript 环境：

- ✅ **可以** 读取和修改 DOM（`document.querySelector` 等）
- ✅ **可以** 使用 `window.__webmcpRegister()`
- ✅ **可以** 使用标准 Web API（`setTimeout`、`MutationObserver`、同源 `fetch`）
- ❌ **不能** 访问页面自身的 JavaScript 变量或框架实例（React state、Angular controller 等）
- ❌ **不能** 使用 `import`/`export`（不支持 ES 模块）
- ❌ **不能** 使用 `chrome.*` API
- ❌ **不能** 向跨域地址发送 `fetch` 请求

这个沙箱是安全设计的一部分：即使是恶意 adapter，也无法窃取存储在 JavaScript 内存中的认证 token 等页面级别的敏感信息。

## meta.json 字段说明

```json
{
  "id": "mail.163.com",
  "name": "163邮箱",
  "description": "读取邮件列表、搜索邮件、查看详情、下载附件",
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
| `match` | Adapter 激活的主机名数组 |
| `version` | 最后发布时的 ISO 8601 时间戳 |
| `verified_on` | 最后确认在线网站可用的日期 |

## 下一步

- [编写 Adapter](/docs/writing-an-adapter) — 分步骤创建你自己的 adapter
- [API 参考](/docs/api-reference) — `window.__webmcpRegister()` 完整规范
