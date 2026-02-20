/**
 * Background Service Worker
 *
 * 职责：
 * 1. 维护与 Native Host 的 Native Messaging 连接
 * 2. 维护每个 Tab 注册的工具列表（toolRegistry）
 * 3. 处理来自 content script 的工具注册消息
 * 4. 处理来自 Native Host 的工具调用请求，转发到对应 Tab
 */

// ─── 状态 ──────────────────────────────────────────────────────────────────

/** @type {chrome.runtime.Port | null} */
let nativePort = null;

/**
 * 工具注册表：tabId -> [{ name, description, parameters }]
 * 注意：handler 不能跨进程传输，真正执行时通过消息发到 content script
 * @type {Map<number, Array<{name: string, description: string, parameters: object}>>}
 */
const toolRegistry = new Map();

// ─── Native Messaging ───────────────────────────────────────────────────────

function connectNativeHost() {
  try {
    nativePort = chrome.runtime.connectNative("com.webmcp.adapter");
    console.log("[WebMCP] Connected to native host");

    nativePort.onMessage.addListener(handleNativeMessage);

    nativePort.onDisconnect.addListener(() => {
      console.warn("[WebMCP] Native host disconnected:", chrome.runtime.lastError?.message);
      nativePort = null;
      // 5秒后重连
      setTimeout(connectNativeHost, 5000);
    });
  } catch (err) {
    console.error("[WebMCP] Failed to connect native host:", err);
  }
}

/**
 * 处理来自 Native Host 的消息
 * 消息格式：{ type, id, ... }
 * - list_tools: 返回所有已注册工具（跨所有 Tab）
 * - call_tool: 调用指定 tabId 上的工具
 */
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
    // Native Host 可以查询当前活跃的 Tab，以便确定调用哪个 Tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    sendToNative({ type: "get_active_tab_result", id: msg.id, tabId: tab?.id ?? null });
  }
}

function sendToNative(msg) {
  if (!nativePort) {
    console.warn("[WebMCP] Cannot send to native: not connected");
    return;
  }
  console.log("[WebMCP] -> native:", msg);
  nativePort.postMessage(msg);
}

// ─── 工具注册表管理 ─────────────────────────────────────────────────────────

/**
 * 收集所有 Tab 的工具，附带 tabId 信息供 MCP 路由使用
 */
function gatherAllTools() {
  const all = [];
  for (const [tabId, tools] of toolRegistry.entries()) {
    for (const tool of tools) {
      all.push({ ...tool, tabId });
    }
  }
  return all;
}

/**
 * 向指定 Tab 的 content script 发送工具调用请求
 */
async function callToolInTab(tabId, toolName, args) {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: "call_tool",
    toolName,
    args,
  });
  if (response?.error) throw new Error(response.error);
  return response?.result;
}

// ─── 来自 Content Script 的消息 ────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 来自测试页面的工具调用（sender.tab 为 null，因为测试页是扩展页面）
  if (msg.type === "test_call_tool") {
    callToolInTab(msg.tabId, msg.toolName, msg.args)
      .then(result => sendResponse({ result }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (!sender.tab) return; // 以下只处理来自 content script 的消息

  const tabId = sender.tab.id;

  if (msg.type === "register_tools") {
    toolRegistry.set(tabId, msg.tools);
    console.log(`[WebMCP] Tab ${tabId} registered ${msg.tools.length} tools:`, msg.tools.map(t => t.name));

    // 通知 Native Host 工具列表已更新
    sendToNative({ type: "tools_updated", tabId, tools: msg.tools });
    sendResponse({ ok: true });

  } else if (msg.type === "get_registry") {
    sendResponse({ tools: gatherAllTools() });
  }

  return true; // 保持 sendResponse 通道
});

// Tab 关闭时清理
chrome.tabs.onRemoved.addListener((tabId) => {
  if (toolRegistry.has(tabId)) {
    toolRegistry.delete(tabId);
    sendToNative({ type: "tools_updated", tabId, tools: [] });
  }
});

// ─── 启动 ──────────────────────────────────────────────────────────────────

connectNativeHost();
