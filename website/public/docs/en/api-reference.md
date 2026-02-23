# API Reference

Complete specification for `window.__webmcpRegister()`.

## `window.__webmcpRegister(config)`

Registers an adapter with the WebMCP extension. Must be called at the top level of your `index.js`.

### Parameters

```ts
window.__webmcpRegister({
  name:  string,       // Unique adapter name. Convention: "{domain}-adapter"
  match: string[],     // Hostnames this adapter activates on
  tools: Tool[],       // Array of tool definitions
})
```

### `Tool`

```ts
{
  name:        string,          // Tool name, snake_case. Must be unique within this adapter.
  description: string,          // Natural-language description for the AI agent
  parameters:  JSONSchema,      // JSON Schema object describing the input parameters
  handler:     AsyncFunction,   // Async function that executes the tool
}
```

### `JSONSchema` (parameters)

Follows [JSON Schema draft-07](https://json-schema.org/). The root must be `{ type: "object" }`.

```ts
{
  type: "object",
  properties: {
    [paramName]: {
      type:        "string" | "number" | "boolean" | "array" | "object",
      description: string,   // Explain what this parameter means
      enum?:       any[],    // Restrict to specific values
    }
  },
  required: string[],        // List of required parameter names
}
```

### `handler(args) → Promise<any>`

Called when the AI invokes the tool. Receives an object matching the `parameters` schema.

- **Must be async** (return a `Promise`)
- **Return value** is serialized to JSON and sent back to the AI. Keep it structured and informative.
- **No side effects beyond the page** — do not `fetch` to external servers, do not access `localStorage` for credential storage

## Full example

```js
window.__webmcpRegister({
  name: 'example-adapter',
  match: ['example.com'],
  tools: [
    {
      name: 'search_items',
      description:
        'Searches for items on the page by keyword. ' +
        'Returns a list of matches with their IDs and titles. ' +
        'Call this before open_item to find the right ID.',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: 'The search term to look for',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return. Defaults to 20.',
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

## Constraints

| Allowed | Not allowed |
|---|---|
| `document.*` DOM APIs | `import` / `export` |
| `window.__webmcpRegister()` | `chrome.*` APIs |
| `setTimeout`, `setInterval` | Cross-origin `fetch` |
| `MutationObserver` | Reading page JS variables |
| `fetch` to same-origin | Storing credentials |
| Standard Web APIs | Sending data to external servers |

## Utility functions

These are not provided by the extension — copy them into your `index.js` as needed.

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
      reject(new Error(`Timeout waiting for: ${selector}`))
    }, timeout)
  })
}
```
