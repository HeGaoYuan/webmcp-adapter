/**
 * Background Service Worker
 *
 * 职责：
 * 1. 通过 WebSocket 连接 native-host（ws://localhost:3711）
 * 2. 维护每个 Tab 注册的工具列表（toolRegistry）
 * 3. 处理来自 content script 的工具注册消息
 * 4. 处理来自 native-host 的工具调用请求，转发到对应 Tab
 */

const WS_URL = "ws://localhost:3711";

// ─── 状态 ──────────────────────────────────────────────────────────────────

/** @type {WebSocket | null} */
let ws = null;

/**
 * 工具注册表：tabId -> [{ name, description, parameters }]
 * @type {Map<number, Array<{name: string, description: string, parameters: object}>>}
 */
const toolRegistry = new Map();

// ─── WebSocket 连接 ──────────────────────────────────────────────────────────

let isConnecting = false;

function connectToNativeHost() {
  // 防止重复连接
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    console.log("[WebMCP] Already connected or connecting, skipping");
    return;
  }
  
  if (isConnecting) {
    console.log("[WebMCP] Connection attempt already in progress");
    return;
  }
  
  isConnecting = true;
  
  try {
    console.log("[WebMCP] Attempting to connect to native host...");
    ws = new WebSocket(WS_URL);
  } catch (err) {
    console.warn("[WebMCP] Failed to create WebSocket:", err.message);
    isConnecting = false;
    setTimeout(connectToNativeHost, 5000);
    return;
  }

  ws.addEventListener("open", () => {
    console.log("[WebMCP] Connected to native host");
    isConnecting = false;

    // 先把内存中还存着的工具同步过去（正常情况）
    for (const [tabId, tabTools] of toolRegistry.entries()) {
      sendToNative({ type: "tools_updated", tabId, tools: tabTools });
    }

    // Service Worker 被 Chrome 挂起重启后 toolRegistry 为空，
    // 广播 resync_tools 让各 Tab 的 content script 重新上报工具
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: "resync_tools" }, () => {
          void chrome.runtime.lastError; // 忽略没有 content script 的 Tab 的错误
        });
      }
    });
  });

  ws.addEventListener("message", async (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    await handleNativeMessage(msg);
  });

  ws.addEventListener("close", (event) => {
    console.warn(`[WebMCP] Native host disconnected (code: ${event.code}, reason: ${event.reason}), reconnecting in 1s...`);
    isConnecting = false;
    ws = null;
    setTimeout(connectToNativeHost, 1000);
  });

  ws.addEventListener("error", (event) => {
    console.error("[WebMCP] WebSocket error:", event);
    isConnecting = false;
    // close 事件会跟着触发，在那里重连
  });
}

// ─── 处理来自 Native Host 的消息 ───────────────────────────────────────────

async function handleNativeMessage(msg) {
  console.log("[WebMCP] <- native:", msg);

  if (msg.type === "list_tools") {
    const tools = gatherAllTools();
    sendToNative({ type: "list_tools_result", id: msg.id, tools });

  } else if (msg.type === "call_tool") {
    const { tabId, toolName, args } = msg;
    try {
      const result = await callToolInTab(tabId, toolName, args);
      sendToNative({ type: "call_tool_result", id: msg.id, result });
    } catch (err) {
      sendToNative({ type: "call_tool_error", id: msg.id, error: err.message });
    }

  } else if (msg.type === "get_active_tab") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    sendToNative({ type: "get_active_tab_result", id: msg.id, tabId: tab?.id ?? null });

  } else if (msg.type === "open_tab") {
    // 打开新标签页
    try {
      const tab = await chrome.tabs.create({ url: msg.url, active: true });
      sendToNative({ type: "call_tool_result", id: msg.id, result: { tabId: tab.id, url: tab.url } });
    } catch (err) {
      sendToNative({ type: "call_tool_error", id: msg.id, error: err.message });
    }
  }
}

function sendToNative(msg) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn("[WebMCP] Cannot send to native: not connected");
    return;
  }
  console.log("[WebMCP] -> native:", msg);
  ws.send(JSON.stringify(msg));
}

// ─── 工具注册表管理 ─────────────────────────────────────────────────────────

function gatherAllTools() {
  const all = [];
  for (const [tabId, tools] of toolRegistry.entries()) {
    for (const tool of tools) {
      all.push({ ...tool, tabId });
    }
  }
  return all;
}

async function callToolInTab(tabId, toolName, args) {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: "call_tool",
    toolName,
    args,
  });
  if (response?.error) throw new Error(response.error);
  return response?.result;
}

// ─── 来自 Content Script / 测试页面的消息 ──────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 来自测试页面的工具调用
  if (msg.type === "test_call_tool") {
    callToolInTab(msg.tabId, msg.toolName, msg.args)
      .then(result => sendResponse({ result }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (!sender.tab) return;

  const tabId = sender.tab.id;

  if (msg.type === "register_tools") {
    toolRegistry.set(tabId, msg.tools);
    console.log(`[WebMCP] Tab ${tabId} registered ${msg.tools.length} tools:`, msg.tools.map(t => t.name));
    sendToNative({ type: "tools_updated", tabId, tools: msg.tools });
    sendResponse({ ok: true });

  } else if (msg.type === "get_registry") {
    sendResponse({ tools: gatherAllTools() });
  }

  return true;
});

// Tab 关闭时清理
chrome.tabs.onRemoved.addListener((tabId) => {
  if (toolRegistry.has(tabId)) {
    toolRegistry.delete(tabId);
    sendToNative({ type: "tools_updated", tabId, tools: [] });
  }
});

// ─── Adapter 注入 ───────────────────────────────────────────────────────────

const ADAPTER_MAP = [
  { match: "mail.163.com",    file: "adapters/163mail.js" },
  { match: "mail.google.com", file: "adapters/gmail.js"   },
];

async function injectAdapters(tabId, url) {
  let hostname;
  try { hostname = new URL(url).hostname; } catch { return; }

  const matches = ADAPTER_MAP.filter(e => hostname.includes(e.match));
  if (matches.length === 0) return;

  for (const entry of matches) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [entry.file],
        world: "ISOLATED",
      });
      console.log(`[WebMCP] Injected ${entry.file} into tab ${tabId}`);
    } catch (err) {
      console.error(`[WebMCP] Failed to inject ${entry.file}:`, err.message);
    }
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    injectAdapters(tabId, tab.url);
  }
});

// ─── 启动 ──────────────────────────────────────────────────────────────────

// 用 alarm 每25秒唤醒一次 Service Worker，防止 Chrome 将其挂起导致 WebSocket 断开
// Chrome MV3 Service Worker 默认30秒无活动后休眠，alarms 是官方推荐的保活方案
chrome.alarms.create("keepAlive", { periodInMinutes: 0.4 }); // 约24秒

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepAlive") {
    // 检查 WebSocket 是否还活着，断了就重连
    if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      console.log("[WebMCP] keepAlive: reconnecting...");
      connectToNativeHost();
    }
  }
});

connectToNativeHost();
