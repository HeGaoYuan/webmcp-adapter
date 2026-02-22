# Contributing to WebMCP Adapters

欢迎为 WebMCP Adapters 贡献代码！任何人都可以提交 Pull Request 来支持新的网站。

## 什么是 Adapter？

Adapter 是一段在浏览器 content script 环境中运行的 JavaScript，通过 `window.__webmcpRegister()` 向 WebMCP Extension 注册工具，让 AI Agent（如 Claude Code）能够操作对应网站。

## 目录结构

每个 adapter 放在 `adapters/{域名}/` 目录下：

```
adapters/
└── mail.163.com/
    ├── index.js    ← adapter 代码
    └── meta.json   ← 元数据
```

## meta.json 格式

```json
{
  "id": "mail.163.com",
  "name": "163邮箱",
  "description": "简短描述这个 adapter 能做什么（1-2句话）",
  "author": "你的GitHub用户名",
  "match": ["mail.163.com"],
  "version": "2026-02-22T10:30:00Z",
  "verified_on": "2026-02-22",
  "homepage": "https://github.com/HeGaoYuan/webmcp-adapter/tree/main/hub/adapters/mail.163.com"
}
```

字段说明：
- `id`：唯一标识，通常用主域名
- `match`：匹配的域名列表，支持多个（如子域名）
- `version`：**发布时的 ISO 8601 时间戳**，用户凭此判断 adapter 新旧程度
- `verified_on`：最后验证目标网站可用的日期，帮助用户判断是否可能已过期

## index.js 格式

```js
/**
 * [网站名称] Adapter
 *
 * 验证版本：[网站名称] [验证年月]
 * 维护者：[你的名字]
 */

// ─── 工具函数（按需添加）────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); reject(new Error(`Timeout: ${selector}`)); }, timeout);
  });
}

// ─── Tool Handler 函数 ────────────────────────────────────────────────────

async function myToolHandler({ param1 }) {
  // 操作 DOM，返回结构化数据
  return { status: "success", data: "..." };
}

// ─── 适配器注册 ────────────────────────────────────────────────────────────
// 必须调用 window.__webmcpRegister，格式固定

window.__webmcpRegister({
  name: "my-site-adapter",       // 唯一名称，建议用 "{域名}-adapter"
  match: ["example.com"],        // 匹配的域名
  tools: [
    {
      name: "my_tool",           // tool 名称，snake_case
      description: "工具的用途描述，供 AI Agent 理解何时调用",
      parameters: {
        type: "object",
        properties: {
          param1: {
            type: "string",
            description: "参数说明",
          },
        },
        required: ["param1"],
      },
      handler: async ({ param1 }) => myToolHandler({ param1 }),
    },
  ],
});
```

完整示例请参考 [adapters/mail.163.com/index.js](adapters/mail.163.com/index.js)。

Adapter 运行在 Chrome Extension 的 **isolated world** content script 环境中：

- ✅ 可以操作 DOM（`document.querySelector` 等）
- ✅ 可以使用 `window.__webmcpRegister`
- ❌ 不能访问页面的 JS 变量/框架实例
- ❌ 不能使用 ES module `import/export`
- ❌ 不能使用 `fetch` 向第三方域名发送请求（安全要求）
- ❌ 不能使用 `chrome.*` API

## 提交步骤

1. Fork 本仓库
2. 创建目录 `adapters/{你的域名}/`
3. 添加 `index.js` 和 `meta.json`
4. 在 `registry.json` 的 `adapters` 数组中添加对应条目（复制已有格式）
5. 本地测试（加载扩展 → 访问目标网站 → 验证工具可用）
6. 提交 Pull Request，描述中注明：
   - 目标网站
   - 提供了哪些工具
   - 验证日期和验证方式

## 审核标准

PR 合并前会检查：

- [ ] `index.js` 不向第三方服务器发送任何数据
- [ ] `index.js` 不读取用户密码/token 等敏感字段
- [ ] `meta.json` 格式正确，`version` 为有效 ISO 8601 时间戳
- [ ] `registry.json` 条目已添加
- [ ] 工具有合理的 `description`，便于 AI Agent 理解

感谢贡献！
