/**
 * Content Script: Injector
 *
 * 职责：
 * 1. 暴露 window.__webmcpRegister 供 background 注入的 adapter 调用
 * 2. 维护工具 handler 映射，上报工具元数据给 background
 * 3. 监听来自 background 的工具调用请求，执行 handler 并返回结果
 *
 * 注意：
 * - Chrome MV3 content script 不支持动态 import()
 * - Adapter 文件由 background service worker 通过 chrome.scripting.executeScript 注入
 * - 运行在 isolated world，可访问 DOM，不能访问页面 JS 变量
 */

/** @type {Map<string, Function>} 工具名 -> handler 函数 */
const handlers = new Map();

/** 已注册工具的元数据列表（不含 handler） */
const toolDefs = [];

// ─── 注册入口（供 adapter 文件调用） ──────────────────────────────────────────

/**
 * Adapter 文件调用此函数来注册工具
 * @param {{ name: string, tools: Array<{name, description, parameters, handler}> }} adapter
 */
window.__webmcpRegister = function (adapter) {
  let registered = 0;

  for (const tool of adapter.tools) {
    if (typeof tool.handler !== "function") {
      console.warn(`[WebMCP] Tool "${tool.name}" has no handler, skipping`);
      continue;
    }

    handlers.set(tool.name, tool.handler);
    toolDefs.push({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters ?? {},
    });
    registered++;
  }

  console.log(`[WebMCP] Adapter "${adapter.name}" registered ${registered} tools`);

  // 每次有新工具注册后，把完整列表上报给 background
  chrome.runtime.sendMessage({ type: "register_tools", tools: toolDefs });
};

// ─── 处理工具调用请求 ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "call_tool") return;

  const { toolName, args } = msg;
  const handler = handlers.get(toolName);

  if (!handler) {
    sendResponse({ error: `Tool "${toolName}" not found in this page` });
    return true;
  }

  Promise.resolve()
    .then(() => handler(args))
    .then(result => {
      sendResponse({ result: JSON.parse(JSON.stringify(result ?? null)) });
    })
    .catch(err => {
      sendResponse({ error: err.message ?? String(err) });
    });

  return true;
});
