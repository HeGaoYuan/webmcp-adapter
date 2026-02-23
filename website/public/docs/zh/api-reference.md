# API 参考

`window.__webmcpRegister()` 的完整规范。

## `window.__webmcpRegister(config)`

向 WebMCP 扩展注册一个 adapter。必须在 `index.js` 的顶层调用。

### 参数

```ts
window.__webmcpRegister({
  name:  string,       // Adapter 唯一名称，约定："{域名}-adapter"
  match: string[],     // 此 adapter 激活的主机名列表
  tools: Tool[],       // 工具定义数组
})
```

### `Tool`

```ts
{
  name:        string,          // 工具名称，snake_case，在此 adapter 内唯一
  description: string,          // 自然语言描述，供 AI 理解何时调用此工具
  parameters:  JSONSchema,      // 描述输入参数的 JSON Schema 对象
  handler:     AsyncFunction,   // 执行工具逻辑的异步函数
}
```

### `JSONSchema`（parameters）

遵循 [JSON Schema draft-07](https://json-schema.org/)。根节点必须为 `{ type: "object" }`。

```ts
{
  type: "object",
  properties: {
    [参数名]: {
      type:        "string" | "number" | "boolean" | "array" | "object",
      description: string,   // 解释此参数的含义
      enum?:       any[],    // 限制为特定值列表
    }
  },
  required: string[],        // 必填参数名称列表
}
```

### `handler(args) → Promise<any>`

AI 调用工具时被执行。接收一个与 `parameters` schema 匹配的对象。

- **必须是 async**（返回 `Promise`）
- **返回值** 会被序列化为 JSON 发回给 AI。保持结构化且信息丰富。
- **不产生页面外副作用** — 不向外部服务器 `fetch`，不读取用于凭据存储的 `localStorage`

## 完整示例

```js
window.__webmcpRegister({
  name: 'example-adapter',
  match: ['example.com'],
  tools: [
    {
      name: 'search_items',
      description:
        '按关键词搜索页面上的条目。' +
        '返回匹配项列表，包含 ID 和标题。' +
        '在调用 open_item 前先用此工具获取 ID。',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: '要搜索的关键词',
          },
          limit: {
            type: 'number',
            description: '最多返回的结果数，默认 20',
          },
        },
        required: ['keyword'],
      },
      handler: async ({ keyword, limit = 20 }) => {
        const searchBox = await waitForElement('#search-input')
        searchBox.value = keyword
        searchBox.dispatchEvent(new Event('input', { bubbles: true }))
        await sleep(1000)
        const rows = document.querySelectorAll('.result-row')
        return {
          count: rows.length,
          results: Array.from(rows).slice(0, limit).map(row => ({
            id:    row.dataset.id,
            title: row.querySelector('.title')?.textContent?.trim(),
          })),
        }
      },
    },
  ],
})
```

## 使用约束

| 允许 | 不允许 |
|---|---|
| `document.*` DOM API | `import` / `export` |
| `window.__webmcpRegister()` | `chrome.*` API |
| `setTimeout`、`setInterval` | 跨域 `fetch` |
| `MutationObserver` | 读取页面 JS 变量 |
| 同源 `fetch` | 存储或读取凭据 |
| 标准 Web API | 向外部服务器发送数据 |

## 工具函数

这些函数不由扩展提供，按需复制到你的 `index.js` 中使用。

### `sleep(ms)`

```js
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

### `waitForElement(selector, timeout)`

```js
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector)
    if (el) return resolve(el)
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) { observer.disconnect(); resolve(el) }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => {
      observer.disconnect()
      reject(new Error(`Timeout: ${selector}`))
    }, timeout)
  })
}
```
