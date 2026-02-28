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

// Hub registry 地址（raw.githubusercontent.com，max-age=300，内容变化后 5 分钟内生效）
// 不用 jsDelivr：其 max-age=604800（7天）会导致浏览器 HTTP 缓存长期返回旧数据
const REGISTRY_URL = "https://raw.githubusercontent.com/HeGaoYuan/webmcp-adapter/main/hub/registry.json";

// adapter 代码基础路径（CLI 下载用，扩展本身不再从网络加载 adapter）
const ADAPTER_BASE_URL = "https://raw.githubusercontent.com/HeGaoYuan/webmcp-adapter/main/hub/adapters";

// registry 在 chrome.storage.local 中的缓存有效期（1小时，配合 raw GitHub 的 5 分钟 HTTP 缓存）
const REGISTRY_TTL_MS = 60 * 60 * 1000;

// ─── 状态 ──────────────────────────────────────────────────────────────────

/** @type {WebSocket | null} */
let ws = null;

/**
 * 工具注册表：domain -> { tools: [...], tabIds: Set<tabId> }
 * @type {Map<string, {tools: Array<{name: string, description: string, parameters: object}>, tabIds: Set<number>}>}
 */
const toolRegistry = new Map();

/**
 * Tab到域名的映射：tabId -> domain
 * @type {Map<number, string>}
 */
const tabDomainMap = new Map();

/**
 * 待安装适配器表：tabId -> adapterMeta（registry 里找到但未安装的 adapter）
 * 供 popup 查询当前 tab 状态用
 * @type {Map<number, object>}
 */
const tabAvailableAdapter = new Map();

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

    // 同步所有域名的工具
    for (const [domain, domainData] of toolRegistry.entries()) {
      sendToNative({ type: "tools_updated", domain, tools: domainData.tools, tabCount: domainData.tabIds.size });
    }

    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: "resync_tools" }, () => {
          void chrome.runtime.lastError;
        });
      }
    });

    // 延迟扫描所有 tab 的 adapter 状态：处理 extension reload 后 adapter 被删除的情况
    // （resync_tools 可能把旧工具重新注入，这里再做一次清理校验）
    setTimeout(() => {
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://")) {
            injectAdapters(tab.id, tab.url);
          }
        }
      });
    }, 800);
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
    const { toolName, args } = msg;
    try {
      // 从工具名提取域名
      const domain = extractDomainFromToolName(toolName);
      if (!domain) {
        throw new Error(`无法从工具名 "${toolName}" 提取域名`);
      }

      // 查找匹配域名的tab
      const tabId = await findTabByDomain(domain);
      if (!tabId) {
        throw new Error(`未找到域名 "${domain}" 的标签页。请先使用 open_browser 工具打开 https://${domain}`);
      }

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
  } else if (msg.type === "reload_extension") {
    console.log("[WebMCP] Reloading extension by request from native host...");
    chrome.runtime.reload();
  } else if (msg.type === "refresh_registry") {
    doRefreshRegistry()
      .then(r => console.log(`[WebMCP] Registry refreshed via CLI: ${r.count} adapters`))
      .catch(err => console.error(`[WebMCP] Registry refresh failed: ${err.message}`));
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

/**
 * 比较两个工具列表是否相同（深度比较）
 * @param {Array} tools1
 * @param {Array} tools2
 * @returns {boolean}
 */
function toolsAreEqual(tools1, tools2) {
  if (tools1.length !== tools2.length) return false;

  // 按名称排序后比较（避免顺序不同导致误判）
  const sorted1 = [...tools1].sort((a, b) => a.name.localeCompare(b.name));
  const sorted2 = [...tools2].sort((a, b) => a.name.localeCompare(b.name));

  for (let i = 0; i < sorted1.length; i++) {
    const t1 = sorted1[i];
    const t2 = sorted2[i];

    // 比较关键字段
    if (t1.name !== t2.name ||
        t1.description !== t2.description ||
        JSON.stringify(t1.parameters) !== JSON.stringify(t2.parameters)) {
      return false;
    }
  }

  return true;
}

function gatherAllTools() {
  const all = [];
  for (const [domain, domainData] of toolRegistry.entries()) {
    for (const tool of domainData.tools) {
      all.push({ ...tool, domain, tabCount: domainData.tabIds.size });
    }
  }
  return all;
}

/**
 * 从工具名中提取域名
 * 工具名格式：<domain>.<action>
 * 例如：mail.163.com.search_emails -> mail.163.com
 */
function extractDomainFromToolName(toolName) {
  // 找到最后一个点的位置，之前的部分是域名
  const lastDotIndex = toolName.lastIndexOf('.');
  if (lastDotIndex === -1) return null;
  return toolName.substring(0, lastDotIndex);
}

/**
 * 根据域名查找匹配的tab（按时间倒序，最新的优先）
 * 找到后会激活该tab，让用户能看到操作过程
 * @param {string} domain
 * @returns {Promise<number|null>} tabId or null
 */
async function findTabByDomain(domain) {
  const domainData = toolRegistry.get(domain);
  if (!domainData || domainData.tabIds.size === 0) {
    return null;
  }

  // 获取所有tab，按id倒序（id越大越新）
  const tabs = await chrome.tabs.query({});
  const sortedTabs = tabs.sort((a, b) => b.id - a.id);

  // 找到第一个匹配域名的tab
  for (const tab of sortedTabs) {
    if (domainData.tabIds.has(tab.id)) {
      // 激活该tab，让用户能看到操作过程
      await chrome.tabs.update(tab.id, { active: true });
      // 激活该tab所在的窗口
      await chrome.windows.update(tab.windowId, { focused: true });

      console.log(`[WebMCP] Activated tab ${tab.id} (${domain}) in window ${tab.windowId}`);
      return tab.id;
    }
  }

  return null;
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

  // Popup 查询当前 tab 的状态（active / available / none）
  if (msg.type === "get_tab_info") {
    (async () => {
      const { tabId, url } = msg;
      const isConnected = ws && ws.readyState === WebSocket.OPEN;

      // 从URL提取域名
      let domain;
      try {
        domain = new URL(url).hostname;
      } catch {
        sendResponse({ state: "none", isConnected });
        return;
      }

      // 检查该域名是否有工具
      const domainData = toolRegistry.get(domain);
      if (domainData && domainData.tools.length > 0) {
        sendResponse({ state: "active", tools: domainData.tools, isConnected });
        return;
      }

      // Check in-memory cache first (set by injectAdapters when adapter found but not installed)
      const availableAdapter = tabAvailableAdapter.get(tabId);
      if (availableAdapter) {
        sendResponse({ state: "available", adapterMeta: availableAdapter, isConnected });
        return;
      }

      // Fallback: check registry by URL, then verify the file is NOT locally installed
      const registry = await getCachedRegistry();
      if (registry?.adapters && url) {
        try {
          const hostname = new URL(url).hostname;
          const adapterMeta = registry.adapters.find(a =>
            a.match.some(d => hostname === d || hostname.endsWith(`.${d}`))
          );
          if (adapterMeta) {
            const installed = await isAdapterFileInstalled(adapterMeta.id);
            if (!installed) {
              sendResponse({ state: "available", adapterMeta, isConnected });
              return;
            }
          }
        } catch { /* bad URL */ }
      }

      sendResponse({ state: "none", isConnected });
    })();
    return true;
  }

  // Popup 请求缓存的 registry
  if (msg.type === "get_registry") {
    getCachedRegistry()
      .then(registry => sendResponse({ ok: true, registry }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  // Popup / CLI 请求强制刷新 registry 缓存
  if (msg.type === "refresh_registry") {
    doRefreshRegistry()
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (!sender.tab) return;

  if (msg.type === "register_tools") {
    const newTools = msg.tools;
    const tabId = sender.tab.id;
    const tabUrl = sender.tab.url;

    // 如果没有工具，不做任何处理（不触发 tools_updated）
    if (!newTools || newTools.length === 0) {
      console.log(`[WebMCP] Tab ${tabId} has no tools, skipping registration`);
      sendResponse({ ok: true });
      return true;
    }

    // 从URL提取域名
    let domain;
    try {
      domain = new URL(tabUrl).hostname;
    } catch {
      console.warn(`[WebMCP] Invalid tab URL: ${tabUrl}`);
      sendResponse({ ok: false, error: "Invalid tab URL" });
      return true;
    }

    // 获取该域名的现有数据
    const domainData = toolRegistry.get(domain);
    const oldTools = domainData?.tools ?? [];

    // 检查工具列表是否真的变化了
    const hasChanged = !domainData ||
                       oldTools.length !== newTools.length ||
                       !toolsAreEqual(oldTools, newTools);

    if (hasChanged) {
      // 更新或创建域名数据
      if (!domainData) {
        toolRegistry.set(domain, { tools: newTools, tabIds: new Set([tabId]) });
      } else {
        domainData.tools = newTools;
        domainData.tabIds.add(tabId);
      }

      // 记录tab到域名的映射
      tabDomainMap.set(tabId, domain);

      console.log(`[WebMCP] Domain ${domain} registered ${newTools.length} tools (changed), tab count: ${toolRegistry.get(domain).tabIds.size}`);
      sendToNative({ type: "tools_updated", domain, tools: newTools, tabCount: toolRegistry.get(domain).tabIds.size });
    } else {
      // 工具未变化，但仍需记录tab
      if (domainData) {
        domainData.tabIds.add(tabId);
        tabDomainMap.set(tabId, domain);
      }
      console.log(`[WebMCP] Domain ${domain} tools unchanged, skipping notification, tab count: ${domainData.tabIds.size}`);
    }

    setBadgeActive(tabId, newTools.length);
    sendResponse({ ok: true });
  }

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const domain = tabDomainMap.get(tabId);
  if (domain) {
    const domainData = toolRegistry.get(domain);
    if (domainData) {
      domainData.tabIds.delete(tabId);

      // 如果该域名没有任何tab了，清除工具
      if (domainData.tabIds.size === 0) {
        toolRegistry.delete(domain);
        console.log(`[WebMCP] Domain ${domain} has no tabs, clearing tools`);
        sendToNative({ type: "tools_updated", domain, tools: [], tabCount: 0 });
      } else {
        console.log(`[WebMCP] Tab ${tabId} removed, domain ${domain} still has ${domainData.tabIds.size} tabs`);
      }
    }
    tabDomainMap.delete(tabId);
  }
  tabAvailableAdapter.delete(tabId);
  clearBadge(tabId);
});

// ─── Hub Registry 管理 ──────────────────────────────────────────────────────

/**
 * 清除 registry 缓存并强制重新拉取
 * @returns {Promise<{ok: boolean, count: number}>}
 */
async function doRefreshRegistry() {
  await chrome.storage.local.remove(["registry", "registry_fetched_at"]);
  const registry = await fetchAndCacheRegistry();
  if (!registry) throw new Error("Failed to fetch registry");
  return { ok: true, count: registry.adapters?.length ?? 0 };
}

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
    // cache: 'no-cache' 绕过浏览器 HTTP 缓存，确保拿到 GitHub 的最新内容
    const resp = await fetch(REGISTRY_URL, { cache: "no-cache" });
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

// ─── Adapter 文件检测 ────────────────────────────────────────────────────────

/**
 * 检查 adapter JS 文件是否已安装到扩展包的 adapters/ 目录
 * （通过 fetch 扩展内部资源来探测文件是否存在）
 * @param {string} adapterId
 * @returns {Promise<boolean>}
 */
async function isAdapterFileInstalled(adapterId) {
  try {
    const url = chrome.runtime.getURL(`adapters/${adapterId}.js`);
    const resp = await fetch(url);
    return resp.ok;
  } catch {
    return false;
  }
}

// ─── Badge 管理 ─────────────────────────────────────────────────────────────

/**
 * 绿色 badge，显示工具数量，表示 adapter 已激活
 * @param {number} tabId
 * @param {number} toolCount
 */
function setBadgeActive(tabId, toolCount) {
  chrome.action.setBadgeText({ text: String(toolCount), tabId });
  chrome.action.setBadgeBackgroundColor({ color: "#22c55e", tabId }); // green-500
  chrome.action.setTitle({ title: `WebMCP：${toolCount} 个工具已就绪`, tabId });
}

/**
 * 橙色 badge "!"，表示有可用 adapter 但未安装
 * @param {number} tabId
 * @param {string} adapterName
 */
function setBadgeAvailable(tabId, adapterName) {
  chrome.action.setBadgeText({ text: "!", tabId });
  chrome.action.setBadgeBackgroundColor({ color: "#f97316", tabId }); // orange-500
  chrome.action.setTitle({ title: `WebMCP：发现「${adapterName}」适配器，点击扩展图标安装`, tabId });
}

/**
 * 清除 badge
 * @param {number} tabId
 */
function clearBadge(tabId) {
  chrome.action.setBadgeText({ text: "", tabId });
  chrome.action.setTitle({ title: "WebMCP Adapter", tabId });
}

// ─── Adapter 注入 ───────────────────────────────────────────────────────────

/** Safe adapter id: starts with alphanumeric, then alphanumeric/dot/hyphen/underscore only. */
const SAFE_ADAPTER_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/**
 * 检查给定 URL 的 Tab，注入已安装的 adapter（本地文件存在则注入）；
 * 若本地文件不存在但 Hub 有匹配，设橙色 badge 提示用户用 CLI 安装。
 */
async function injectAdapters(tabId, url) {
  let hostname;
  try { hostname = new URL(url).hostname; } catch { return; }

  const registry = await getCachedRegistry();
  const adapters = registry?.adapters ?? [];

  // 查找 registry 中匹配当前 hostname 的 adapter
  const adapterMeta = adapters.find(a =>
    a.match.some(d => hostname === d || hostname.endsWith(`.${d}`))
  );

  // adapter id：优先用 registry 里的 id，其次用 hostname 本身（兼容本地自定义 adapter）
  const adapterId = adapterMeta?.id ?? hostname;

  // Guard against path traversal or unexpected characters in the adapter id
  if (!SAFE_ADAPTER_ID_RE.test(adapterId)) {
    console.warn(`[WebMCP] Unsafe adapter id "${adapterId}", skipping`);
    return;
  }
  // 检查本地文件是否存在
  const isInstalled = await isAdapterFileInstalled(adapterId);

  if (isInstalled) {
    // 已安装：直接注入
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        world: "ISOLATED",
        files: [`adapters/${adapterId}.js`],
      });
      tabAvailableAdapter.delete(tabId);
      console.log(`[WebMCP] Injected adapter "${adapterId}" into tab ${tabId}`);
    } catch (err) {
      console.error(`[WebMCP] Failed to inject adapter "${adapterId}":`, err.message);
    }
  } else {
    // 未安装：清除该域名中残留的工具注册（可能是 adapter 刚被删除后 extension 重载的情况）
    const domain = hostname;
    const domainData = toolRegistry.get(domain);
    if (domainData) {
      // 从该域名的tab集合中移除当前tab
      domainData.tabIds.delete(tabId);

      // 如果该域名没有任何tab了，清除工具
      if (domainData.tabIds.size === 0) {
        toolRegistry.delete(domain);
        sendToNative({ type: "tools_updated", domain, tools: [], tabCount: 0 });
        console.log(`[WebMCP] Cleared stale tools for domain ${domain} (adapter "${adapterId}" not installed)`);
      }

      // 清除tab到域名的映射
      tabDomainMap.delete(tabId);
    }

    // 通知content script清除工具
    chrome.tabs.sendMessage(tabId, { type: "clear_tools" }, () => void chrome.runtime.lastError);

    if (adapterMeta) {
      // Hub 有匹配但未安装：设橙色 badge，等用户通过 CLI 安装
      tabAvailableAdapter.set(tabId, adapterMeta);
      setBadgeAvailable(tabId, adapterMeta.name);
    } else {
      // 无任何匹配，清除 badge
      tabAvailableAdapter.delete(tabId);
      clearBadge(tabId);
    }
  }
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
