/**
 * Content Script: Injector
 *
 * 职责：
 * 1. 根据当前域名匹配内置适配脚本
 * 2. 加载适配脚本，执行工具注册
 * 3. 把工具列表（不含 handler）上报给 background service worker
 * 4. 监听来自 background 的工具调用请求，执行 handler 并返回结果
 *
 * 注意：运行在 isolated world，可访问 DOM，不能访问页面的 JS 变量
 */

// ─── 内置适配脚本注册表 ──────────────────────────────────────────────────────
// key: 域名匹配规则（字符串包含匹配），value: 适配模块路径（相对扩展根目录）
const ADAPTER_REGISTRY = [
  { match: ["mail.163.com"], src: "adapters/163mail.js" },
  { match: ["mail.google.com"], src: "adapters/gmail.js" },
];

// ─── 已注册的工具（含 handler） ──────────────────────────────────────────────
/** @type {Map<string, Function>} */
const handlers = new Map();

// ─── 域名匹配 ────────────────────────────────────────────────────────────────

function findMatchingAdapters(hostname) {
  return ADAPTER_REGISTRY.filter(entry =>
    entry.match.some(pattern => hostname.includes(pattern))
  );
}

// ─── 加载适配脚本 ─────────────────────────────────────────────────────────────

async function loadAdapter(src) {
  const url = chrome.runtime.getURL(src);
  // 使用动态 import 加载 ES module 适配脚本
  const module = await import(url);
  return module.default;
}

// ─── 注册工具 ─────────────────────────────────────────────────────────────────

async function registerAdapters() {
  const hostname = location.hostname;
  const matchingEntries = findMatchingAdapters(hostname);

  if (matchingEntries.length === 0) {
    return; // 当前网站无适配，静默退出
  }

  const toolDefs = []; // 只含元数据，不含 handler，用于上报给 background

  for (const entry of matchingEntries) {
    let adapter;
    try {
      adapter = await loadAdapter(entry.src);
    } catch (err) {
      console.error(`[WebMCP] Failed to load adapter ${entry.src}:`, err);
      continue;
    }

    for (const tool of adapter.tools) {
      if (typeof tool.handler !== "function") {
        console.warn(`[WebMCP] Tool "${tool.name}" has no handler, skipping`);
        continue;
      }

      // 存储 handler（本地使用）
      handlers.set(tool.name, tool.handler);

      // 收集工具元数据（上报给 background）
      toolDefs.push({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters ?? {},
      });
    }

    console.log(`[WebMCP] Loaded adapter "${adapter.name}" with ${adapter.tools.length} tools`);
  }

  if (toolDefs.length === 0) return;

  // 上报给 background service worker
  chrome.runtime.sendMessage({ type: "register_tools", tools: toolDefs });
}

// ─── 处理工具调用请求 ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "call_tool") return;

  const { toolName, args } = msg;
  const handler = handlers.get(toolName);

  if (!handler) {
    sendResponse({ error: `Tool "${toolName}" not found in this page` });
    return true;
  }

  // 执行 handler（异步）
  Promise.resolve()
    .then(() => handler(args))
    .then(result => {
      // 确保结果可序列化
      sendResponse({ result: JSON.parse(JSON.stringify(result ?? null)) });
    })
    .catch(err => {
      sendResponse({ error: err.message ?? String(err) });
    });

  return true; // 保持通道
});

// ─── 启动 ─────────────────────────────────────────────────────────────────────

registerAdapters().catch(err => {
  console.error("[WebMCP] Adapter registration failed:", err);
});
