# 编写 Adapter

分步骤指南：为新网站创建 adapter 并贡献到 Hub。

## 开始前确认

- [ ] 目标网站的内容在 DOM 中渲染（不是 canvas 或 PDF 查看器）
- [ ] 你已在本地加载了 Chrome 扩展，并且 WebMCP 正在运行
- [ ] 你熟悉基本的 DOM API（`document.querySelector`、`MutationObserver` 等）

## 第一步 — 创建目录

```
hub/adapters/
└── your.domain.com/
    ├── index.js
    └── meta.json
```

目录名使用主域名（如 `notion.so`、`linear.app`）。

## 第二步 — 编写 meta.json

```json
{
  "id": "your.domain.com",
  "name": "你的网站名",
  "description": "简短描述此 adapter 能让 AI 做什么（1-2 句话）",
  "author": "你的 GitHub 用户名",
  "match": ["your.domain.com"],
  "version": "2026-01-01T00:00:00Z",
  "verified_on": "2026-01-01",
  "homepage": "https://github.com/HeGaoYuan/webmcp-adapter/tree/main/hub/adapters/your.domain.com"
}
```

`version` 填写当前 ISO 8601 时间戳，`verified_on` 填写今天的日期。

## 第三步 — 编写 index.js

### 最小模板

```js
/**
 * YourSite Adapter
 *
 * 验证版本：YourSite，2026 年 1 月
 * 维护者：你的 GitHub 用户名
 */

// ── 工具函数 ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector)
    if (el) return resolve(el)
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) { observer.disconnect(); resolve(el) }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => { observer.disconnect(); reject(new Error(`Timeout: ${selector}`)) }, timeout)
  })
}

// ── Tool Handler ──────────────────────────────────────────────────────────────

async function getPageTitle() {
  return { title: document.title, url: window.location.href }
}

// ── 注册 ──────────────────────────────────────────────────────────────────────

window.__webmcpRegister({
  name: 'yoursite-adapter',
  match: ['your.domain.com'],
  tools: [
    {
      name: 'get_page_title',
      description: '返回当前页面的标题和 URL，可用于确认页面是否已加载。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async () => getPageTitle(),
    },
  ],
})
```

### 编写优质 handler 的技巧

**等待元素，而不是假设它们存在：**
```js
// ❌ 脆弱
const btn = document.querySelector('.submit-btn')
btn.click()

// ✅ 健壮
const btn = await waitForElement('.submit-btn', 5000)
btn.click()
await sleep(500) // 等待 UI 响应
```

**返回结构化数据：**
```js
// ❌ AI 难以解析
return "找到 3 封邮件"

// ✅ 结构化
return { count: 3, emails: [{ id: "...", subject: "..." }] }
```

**优雅处理错误：**
```js
async function readInbox() {
  try {
    const rows = document.querySelectorAll('.email-row')
    if (!rows.length) return { emails: [], message: '未找到邮件' }
    return { emails: Array.from(rows).map(parseRow) }
  } catch (err) {
    return { error: err.message }
  }
}
```

**写清晰的 `description`** — Claude 读这些描述来决定调用哪个工具：
```js
// ❌ 模糊
description: '获取邮件'

// ✅ 清晰且可操作
description: '返回收件箱中的未读邮件列表。每条包含 id、发件人、主题和日期。在调用 open_email 之前先调用此工具。'
```

## 第四步 — 在 registry.json 中注册

在 `hub/registry.json` 的 `adapters` 数组中添加一条：

```json
{
  "id": "your.domain.com",
  "name": "你的网站名",
  "description": "简短描述",
  "author": "你的 GitHub 用户名",
  "match": ["your.domain.com"],
  "version": "2026-01-01T00:00:00Z",
  "verified_on": "2026-01-01",
  "homepage": "https://github.com/HeGaoYuan/webmcp-adapter/tree/main/hub/adapters/your.domain.com"
}
```

## 第五步 — 本地测试

1. 在 Chrome 中进入 `chrome://extensions` → 找到 WebMCP Adapter → 点击 **Service Worker** 打开控制台
2. 导航到目标网站
3. 观察控制台 — 应看到 `Registered X tools for tab NNNNN`
4. 在 Claude Desktop 中问：*"请列出可用的工具"* — 你的工具应该出现
5. 逐一测试每个工具

## 第六步 — 提交 Pull Request

1. Fork 本仓库
2. 创建 adapter 文件
3. 提交 Pull Request，说明：
   - 目标网站
   - 实现了哪些工具
   - 验证日期和验证方式

### PR 审核标准

合并前，维护者会检查：

- [ ] `index.js` 不向任何第三方服务器发送数据
- [ ] `index.js` 不读取密码、token 等敏感凭据
- [ ] `meta.json` 格式正确，`version` 为有效的 ISO 8601 时间戳
- [ ] `registry.json` 中已添加对应条目
- [ ] 工具的 `description` 清晰，便于 AI 理解何时调用

## 下一步

- [API 参考](/docs/api-reference) — `window.__webmcpRegister()` 完整规范
