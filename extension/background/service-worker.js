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
 * 工具注册表：tabId -> [{ name, description, parameters }]
 * @type {Map<number, Array<{name: string, description: string, parameters: object}>>}
 */
const toolRegistry = new Map();

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

  // 页面分析请求（从 analysis panel 发起）
  if (msg.type === "analyze_page") {
    // 转发到 content script 进行分析
    chrome.tabs.sendMessage(msg.tabId, { type: "analyze_page_dom" })
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Popup 查询当前 tab 的状态（active / available / none）
  if (msg.type === "get_tab_info") {
    (async () => {
      const { tabId, url } = msg;
      const isConnected = ws && ws.readyState === WebSocket.OPEN;
      const tools = toolRegistry.get(tabId) ?? [];

      if (tools.length > 0) {
        sendResponse({ state: "active", tools, isConnected });
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

  // 智能生成的适配器保存通知
  if (msg.type === "adapter_created") {
    (async () => {
      try {
        const { adapter } = msg;
        console.log('[WebMCP] Adapter created:', adapter);
        
        // 将适配器转换为可执行的 JS 代码
        const adapterCode = generateAdapterCode(adapter);
        
        // 保存到 chrome.storage（用于自动注入）
        await chrome.storage.local.set({
          [`generated_adapter_${adapter.domain}`]: {
            code: adapterCode,
            metadata: adapter,
            createdAt: adapter.createdAt
          }
        });
        
        console.log(`[WebMCP] Adapter saved for domain: ${adapter.domain}`);
        
        // 提供下载功能（可选）
        try {
          const blob = new Blob([adapterCode], { type: 'text/javascript' });
          const downloadUrl = URL.createObjectURL(blob);
          
          await chrome.downloads.download({
            url: downloadUrl,
            filename: `webmcp-adapters/${adapter.domain}.js`,
            saveAs: false
          });
          
          console.log(`[WebMCP] Adapter also downloaded as backup`);
        } catch (downloadError) {
          console.warn('[WebMCP] Failed to download adapter file:', downloadError);
        }
        
        sendResponse({ 
          ok: true, 
          message: '适配器已保存，刷新页面后自动生效'
        });
      } catch (error) {
        console.error('[WebMCP] Failed to save adapter:', error);
        sendResponse({ ok: false, error: error.message });
      }
    })();
    return true;
  }

  if (!sender.tab) return;

  const tabId = sender.tab.id;

  if (msg.type === "register_tools") {
    toolRegistry.set(tabId, msg.tools);
    console.log(`[WebMCP] Tab ${tabId} registered ${msg.tools.length} tools`);
    sendToNative({ type: "tools_updated", tabId, tools: msg.tools });
    if (msg.tools.length > 0) {
      setBadgeActive(tabId, msg.tools.length);
    } else {
      // Don't show "0 tools ready" — check if there's a known available adapter
      const available = tabAvailableAdapter.get(tabId);
      if (available) {
        setBadgeAvailable(tabId, available.name);
      } else {
        clearBadge(tabId);
      }
    }
    sendResponse({ ok: true });
  }

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (toolRegistry.has(tabId)) {
    toolRegistry.delete(tabId);
    sendToNative({ type: "tools_updated", tabId, tools: [] });
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

  console.log(`[WebMCP] injectAdapters called for hostname: ${hostname}, tabId: ${tabId}`);

  // 1. 首先检查是否有智能生成的适配器
  // 尝试多个可能的 key（处理 www 前缀等情况）
  const possibleKeys = [
    `generated_adapter_${hostname}`,
    `generated_adapter_${hostname.replace(/^www\./, '')}`, // 移除 www
    `generated_adapter_www.${hostname}` // 添加 www
  ];
  
  console.log(`[WebMCP] Checking possible keys:`, possibleKeys);
  
  for (const storageKey of possibleKeys) {
    const generatedAdapter = await chrome.storage.local.get([storageKey]);
    console.log(`[WebMCP] Checking key "${storageKey}":`, generatedAdapter);
    
    if (generatedAdapter[storageKey]) {
      try {
        const { metadata } = generatedAdapter[storageKey];
        console.log(`[WebMCP] Found generated adapter:`, metadata);
        
        // 直接传递适配器元数据，在 content script 中重建
        await chrome.scripting.executeScript({
          target: { tabId },
          world: "ISOLATED",
          func: function(adapterMetadata) {
            console.log('[WebMCP Content] Registering generated adapter:', adapterMetadata.name);
            
            // 重建工具定义
            const tools = adapterMetadata.tools.map(tool => {
              // 根据工具类型创建 handler
              let handler;
              
              if (tool.name.startsWith('search_')) {
                handler = async function(args) {
                  const searchInput = document.querySelector('input[type="search"], input[placeholder*="搜索"], input[placeholder*="search"]');
                  if (!searchInput) throw new Error('搜索框未找到');
                  
                  searchInput.value = args.query || '';
                  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                  
                  const searchButton = document.querySelector('button[type="submit"], button[aria-label*="搜索"]');
                  if (searchButton) {
                    searchButton.click();
                  } else {
                    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                  }
                  
                  return { success: true, query: args.query };
                };
              } else if (tool.name.startsWith('get_') && tool.name.endsWith('_list')) {
                handler = async function(args) {
                  const listContainer = document.querySelector('ul, ol, [role="list"]');
                  if (!listContainer) throw new Error('列表未找到');
                  
                  const items = Array.from(listContainer.querySelectorAll('li, [role="listitem"]')).map(item => ({
                    text: item.textContent.trim(),
                    link: item.querySelector('a')?.href || null
                  }));
                  
                  return { items, count: items.length };
                };
              } else {
                handler = async function(args) {
                  return { success: true, message: '工具执行成功' };
                };
              }
              
              return {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters || {},
                handler: handler
              };
            });
            
            // 注册适配器
            if (window.__webmcpRegister) {
              window.__webmcpRegister({
                name: adapterMetadata.name,
                domain: adapterMetadata.domain,
                version: adapterMetadata.version,
                tools: tools
              });
              console.log('[WebMCP Content] Adapter registered successfully');
            } else {
              console.error('[WebMCP Content] __webmcpRegister not found');
            }
          },
          args: [metadata]
        });
        
        tabAvailableAdapter.delete(tabId);
        console.log(`[WebMCP] Successfully injected generated adapter for "${hostname}" into tab ${tabId}`);
        return; // 优先使用生成的适配器
      } catch (err) {
        console.error(`[WebMCP] Failed to inject generated adapter:`, err.message, err);
      }
    }
  }
  
  console.log(`[WebMCP] No generated adapter found for ${hostname}`);

  // 2. 如果没有生成的适配器，使用 Hub 中的适配器
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
    // 未安装：清除该 tab 中残留的工具注册（可能是 adapter 刚被删除后 extension 重载的情况）
    if (toolRegistry.has(tabId)) {
      toolRegistry.delete(tabId);
      chrome.tabs.sendMessage(tabId, { type: "clear_tools" }, () => void chrome.runtime.lastError);
      sendToNative({ type: "tools_updated", tabId, tools: [] });
      console.log(`[WebMCP] Cleared stale tools for tab ${tabId} (adapter "${adapterId}" not installed)`);
    }

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

// ─── 智能适配器代码生成 ─────────────────────────────────────────────────────

/**
 * 将智能生成的适配器元数据转换为可执行的 JS 代码
 * @param {Object} adapter - 适配器元数据
 * @returns {string} 适配器 JS 代码
 */
function generateAdapterCode(adapter) {
  const tools = adapter.tools.map(tool => {
    // 生成工具的 handler 函数
    const handlerCode = generateToolHandler(tool);
    
    return `{
      name: "${tool.name}",
      description: "${tool.description}",
      parameters: ${JSON.stringify(tool.parameters || {})},
      handler: ${handlerCode}
    }`;
  }).join(',\n    ');

  return `// Auto-generated adapter for ${adapter.domain}
// Created at: ${new Date(adapter.createdAt).toISOString()}

window.__webmcpRegister({
  name: "${adapter.name}",
  domain: "${adapter.domain}",
  version: "${adapter.version}",
  tools: [
    ${tools}
  ]
});
`;
}

/**
 * 生成工具的 handler 函数代码
 * @param {Object} tool - 工具定义
 * @returns {string} handler 函数代码
 */
function generateToolHandler(tool) {
  // 根据工具类型生成不同的 handler
  if (tool.name.startsWith('search_')) {
    return `async function(args) {
      // 查找搜索框
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="搜索"], input[placeholder*="search"]');
      if (!searchInput) throw new Error('搜索框未找到');
      
      // 输入搜索关键词
      searchInput.value = args.query || '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // 查找搜索按钮并点击
      const searchButton = document.querySelector('button[type="submit"], button[aria-label*="搜索"], button[aria-label*="search"]');
      if (searchButton) {
        searchButton.click();
      } else {
        // 如果没有按钮，尝试按回车
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
      
      return { success: true, query: args.query };
    }`;
  } else if (tool.name.startsWith('get_') && tool.name.endsWith('_list')) {
    return `async function(args) {
      // 查找列表容器
      const listContainer = document.querySelector('ul, ol, [role="list"]');
      if (!listContainer) throw new Error('列表未找到');
      
      // 提取列表项
      const items = Array.from(listContainer.querySelectorAll('li, [role="listitem"]')).map(item => ({
        text: item.textContent.trim(),
        link: item.querySelector('a')?.href || null
      }));
      
      return { items, count: items.length };
    }`;
  } else if (tool.name.startsWith('navigate_to_')) {
    return `async function(args) {
      // 查找导航链接
      const link = document.querySelector('a[href*="${tool.name.replace('navigate_to_', '')}"]');
      if (!link) throw new Error('导航链接未找到');
      
      link.click();
      return { success: true, url: link.href };
    }`;
  } else {
    // 通用 handler
    return `async function(args) {
      // TODO: 实现 ${tool.name} 的具体逻辑
      return { success: true, message: '工具执行成功' };
    }`;
  }
}

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
