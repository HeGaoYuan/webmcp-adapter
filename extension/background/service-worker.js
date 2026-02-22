/**
 * Background Service Worker
 *
 * 职责：
 * 1. 通过 WebSocket 连接 native-host（ws://localhost:3711）
 * 2. 维护每个 Tab 注册的工具列表（toolRegistry）
 * 3. 处理来自 content script 的工具注册消息
 * 4. 处理来自 native-host 的工具调用请求，转发到对应 Tab
 * 5. 从 Hub 拉取 registry.json，管理已安装 adapter
 * 6. 检测 Tab URL，提示用户安装可用 adapter
 */

const WS_URL = "ws://localhost:3711";

// Hub registry CDN 地址（jsDelivr，从 GitHub 仓库实时分发）
// 格式：https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/registry.json
const REGISTRY_URL = "https://cdn.jsdelivr.net/gh/HeGaoYuan/webmcp-adapter@main/hub/registry.json";

// adapter 代码的 CDN 基础路径
const ADAPTER_BASE_URL = "https://cdn.jsdelivr.net/gh/HeGaoYuan/webmcp-adapter@main/hub/adapters";

// registry 缓存有效期（24小时）
const REGISTRY_TTL_MS = 24 * 60 * 60 * 1000;

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

    for (const [tabId, tabTools] of toolRegistry.entries()) {
      sendToNative({ type: "tools_updated", tabId, tools: tabTools });
    }

    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: "resync_tools" }, () => {
          void chrome.runtime.lastError;
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
    console.warn(`[WebMCP] Native host disconnected (code: ${event.code}), reconnecting in 1s...`);
    isConnecting = false;
    ws = null;
    setTimeout(connectToNativeHost, 1000);
  });

  ws.addEventListener("error", () => {
    isConnecting = false;
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
  if (msg.type === "test_call_tool") {
    callToolInTab(msg.tabId, msg.toolName, msg.args)
      .then(result => sendResponse({ result }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  // Popup 请求安装 adapter
  if (msg.type === "install_adapter") {
    installAdapter(msg.adapterId)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  // Popup 请求卸载 adapter
  if (msg.type === "uninstall_adapter") {
    uninstallAdapter(msg.adapterId)
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  // Popup / 其他页面请求已安装 adapter 列表
  if (msg.type === "get_installed_adapters") {
    getInstalledAdapters()
      .then(list => sendResponse({ ok: true, adapters: list }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  // Popup 请求缓存的 registry
  if (msg.type === "get_registry") {
    getCachedRegistry()
      .then(registry => sendResponse({ ok: true, registry }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (!sender.tab) return;

  const tabId = sender.tab.id;

  if (msg.type === "register_tools") {
    toolRegistry.set(tabId, msg.tools);
    console.log(`[WebMCP] Tab ${tabId} registered ${msg.tools.length} tools`);
    sendToNative({ type: "tools_updated", tabId, tools: msg.tools });
    sendResponse({ ok: true });
  }

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (toolRegistry.has(tabId)) {
    toolRegistry.delete(tabId);
    sendToNative({ type: "tools_updated", tabId, tools: [] });
  }
});

// ─── Hub Registry 管理 ──────────────────────────────────────────────────────

/**
 * 获取缓存的 registry（如已过期则重新拉取）
 * @returns {Promise<object|null>}
 */
async function getCachedRegistry() {
  const { registry, registry_fetched_at } = await chrome.storage.local.get([
    "registry",
    "registry_fetched_at",
  ]);

  const now = Date.now();
  if (registry && registry_fetched_at && now - registry_fetched_at < REGISTRY_TTL_MS) {
    return registry;
  }

  return fetchAndCacheRegistry();
}

/**
 * 从 CDN 拉取 registry.json 并缓存
 * @returns {Promise<object|null>}
 */
async function fetchAndCacheRegistry() {
  try {
    const resp = await fetch(REGISTRY_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const registry = await resp.json();
    await chrome.storage.local.set({
      registry,
      registry_fetched_at: Date.now(),
    });
    console.log(`[WebMCP] Registry fetched: ${registry.adapters?.length ?? 0} adapters`);
    return registry;
  } catch (err) {
    console.warn("[WebMCP] Failed to fetch registry:", err.message);
    return null;
  }
}

// ─── Adapter 安装 / 卸载 ────────────────────────────────────────────────────

/**
 * 安装一个 adapter（从 CDN 下载代码并存入 chrome.storage.local）
 * @param {string} adapterId  例如 "mail.163.com"
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function installAdapter(adapterId) {
  try {
    const codeUrl = `${ADAPTER_BASE_URL}/${adapterId}/index.js`;
    const resp = await fetch(codeUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const code = await resp.text();

    const registry = await getCachedRegistry();
    const meta = registry?.adapters?.find(a => a.id === adapterId) ?? { id: adapterId };

    await chrome.storage.local.set({
      [`adapter:${adapterId}`]: { code, meta, installed_at: Date.now() },
    });

    console.log(`[WebMCP] Adapter installed: ${adapterId}`);
    return { ok: true };
  } catch (err) {
    console.error(`[WebMCP] Failed to install adapter ${adapterId}:`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * 卸载一个 adapter
 * @param {string} adapterId
 */
async function uninstallAdapter(adapterId) {
  await chrome.storage.local.remove(`adapter:${adapterId}`);
  console.log(`[WebMCP] Adapter uninstalled: ${adapterId}`);
}

/**
 * 获取所有已安装 adapter 的元信息列表
 * @returns {Promise<Array>}
 */
async function getInstalledAdapters() {
  const all = await chrome.storage.local.get(null);
  return Object.entries(all)
    .filter(([key]) => key.startsWith("adapter:"))
    .map(([, value]) => value.meta);
}

// ─── Adapter 注入 ───────────────────────────────────────────────────────────

/**
 * 检查给定 URL 的 Tab，注入已安装的 adapter；
 * 若有可用但未安装的 adapter，显示通知提示用户
 */
async function injectAdapters(tabId, url) {
  let hostname;
  try { hostname = new URL(url).hostname; } catch { return; }

  const registry = await getCachedRegistry();
  if (!registry?.adapters) return;

  for (const adapterMeta of registry.adapters) {
    const matches = adapterMeta.match.some(domain => hostname.includes(domain));
    if (!matches) continue;

    const stored = await chrome.storage.local.get(`adapter:${adapterMeta.id}`);
    const adapterData = stored[`adapter:${adapterMeta.id}`];

    if (adapterData?.code) {
      // 已安装：动态注入
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          world: "ISOLATED",
          func: (code) => { (new Function(code))(); },
          args: [adapterData.code],
        });
        console.log(`[WebMCP] Injected adapter "${adapterMeta.id}" into tab ${tabId}`);
      } catch (err) {
        console.error(`[WebMCP] Failed to inject adapter "${adapterMeta.id}":`, err.message);
      }
    } else {
      // 未安装：通知用户
      notifyAdapterAvailable(adapterMeta, tabId);
    }
  }
}

/**
 * 显示通知，告知用户有可用但未安装的 adapter
 */
function notifyAdapterAvailable(adapterMeta, tabId) {
  const notificationId = `adapter-available:${adapterMeta.id}`;

  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "WebMCP：发现可用适配器",
    message: `「${adapterMeta.name}」适配器可以让 AI 助手操作此网站。点击安装。`,
    buttons: [{ title: "安装" }, { title: "忽略" }],
    requireInteraction: false,
  });

  // 点击通知主体
  chrome.notifications.onClicked.addListener(function onClicked(id) {
    if (id !== notificationId) return;
    chrome.notifications.onClicked.removeListener(onClicked);
    installAdapter(adapterMeta.id).then(() => injectAdapters(tabId, `https://${adapterMeta.id}`));
  });

  // 点击通知按钮
  chrome.notifications.onButtonClicked.addListener(function onButtonClicked(id, btnIdx) {
    if (id !== notificationId) return;
    chrome.notifications.onButtonClicked.removeListener(onButtonClicked);
    chrome.notifications.clear(notificationId);
    if (btnIdx === 0) {
      installAdapter(adapterMeta.id).then(() => injectAdapters(tabId, `https://${adapterMeta.id}`));
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    injectAdapters(tabId, tab.url);
  }
});

// ─── 启动 ──────────────────────────────────────────────────────────────────

chrome.alarms.create("keepAlive", { periodInMinutes: 0.4 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepAlive") {
    if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      console.log("[WebMCP] keepAlive: reconnecting...");
      connectToNativeHost();
    }
  }
});

// 启动时拉取 registry（异步，不阻塞 WebSocket 连接）
fetchAndCacheRegistry();
connectToNativeHost();
