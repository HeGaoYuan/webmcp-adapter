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

/** 已注册的工具名集合，用于去重 */
const registeredToolNames = new Set();

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

    // 去重：如果工具已注册，跳过
    if (registeredToolNames.has(tool.name)) {
      console.log(`[WebMCP] Tool "${tool.name}" already registered, skipping duplicate`);
      continue;
    }

    handlers.set(tool.name, tool.handler);
    toolDefs.push({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters ?? {},
    });
    registeredToolNames.add(tool.name);
    registered++;
  }

  console.log(`[WebMCP] Adapter "${adapter.name}" registered ${registered} tools (${toolDefs.length} total)`);

  // 每次有新工具注册后，把完整列表上报给 background
  chrome.runtime.sendMessage({ type: "register_tools", tools: toolDefs });
};

// ─── 处理工具调用请求 & 重连时的工具重新上报 ───────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // Service Worker 重连后请求重新上报工具（解决 SW 被挂起后 toolRegistry 丢失的问题）
  if (msg.type === "resync_tools") {
    if (toolDefs.length > 0) {
      chrome.runtime.sendMessage({ type: "register_tools", tools: toolDefs });
    }
    sendResponse({ ok: true });
    return true;
  }

  // Adapter 被删除后，Service Worker 通知清除本页工具
  if (msg.type === "clear_tools") {
    handlers.clear();
    toolDefs.length = 0;
    registeredToolNames.clear();
    chrome.runtime.sendMessage({ type: "register_tools", tools: [] });
    sendResponse({ ok: true });
    return true;
  }

  // 页面分析（DOM 扫描）
  if (msg.type === "analyze_page_dom") {
    analyzePageDOM()
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // 演示工具（Phase 3）
  if (msg.type === "demonstrate_tool") {
    demonstrateTool(msg.tool)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // 清除高亮
  if (msg.type === "clear_highlights") {
    clearHighlights();
    sendResponse({ success: true });
    return true;
  }

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

// ─── 页面 DOM 分析功能 ──────────────────────────────────────────────────────

/**
 * 分析页面 DOM，构建可操作树
 */
async function analyzePageDOM() {
  try {
    const interactiveElements = {
      search: [],
      navigation: [],
      actions: [],
      lists: [],
      forms: [],
      inputs: []
    };

    let refCounter = 1;

    // 查找搜索框
    const searchInputs = document.querySelectorAll(
      'input[type="search"], input[placeholder*="搜索"], input[placeholder*="search"], ' +
      'input[placeholder*="Search"], input[name*="search"], input[id*="search"], ' +
      '[role="searchbox"]'
    );
    for (const el of searchInputs) {
      if (isVisible(el)) {
        interactiveElements.search.push(createElementInfo(el, `e${refCounter++}`, 'search'));
      }
    }

    // 查找导航链接
    const links = document.querySelectorAll('a[href]');
    for (const el of links) {
      if (isVisible(el) && isInternalLink(el)) {
        interactiveElements.navigation.push(createElementInfo(el, `e${refCounter++}`, 'navigation'));
      }
    }

    // 查找按钮
    const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]');
    for (const el of buttons) {
      if (isVisible(el)) {
        interactiveElements.actions.push(createElementInfo(el, `e${refCounter++}`, 'action'));
      }
    }

    // 查找列表
    const lists = document.querySelectorAll('ul, ol, [role="list"]');
    for (const el of lists) {
      if (isVisible(el)) {
        const items = el.querySelectorAll('li, [role="listitem"]');
        if (items.length >= 2) {
          const info = createElementInfo(el, `e${refCounter++}`, 'list');
          info.itemCount = items.length;
          interactiveElements.lists.push(info);
        }
      }
    }

    // 查找表单
    const forms = document.querySelectorAll('form');
    for (const el of forms) {
      if (isVisible(el)) {
        interactiveElements.forms.push(createElementInfo(el, `e${refCounter++}`, 'form'));
      }
    }

    // 查找输入框
    const inputs = document.querySelectorAll('input:not([type="search"]):not([type="button"]):not([type="submit"]), textarea, select');
    for (const el of inputs) {
      if (isVisible(el)) {
        interactiveElements.inputs.push(createElementInfo(el, `e${refCounter++}`, 'input'));
      }
    }

    return {
      success: true,
      pageInfo: {
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname
      },
      interactiveElements,
      stats: {
        totalRefs: refCounter - 1,
        activeRefs: refCounter - 1,
        timestamp: Date.now()
      }
    };
  } catch (error) {
    console.error('[ContentScript] Page analysis failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function createElementInfo(element, ref, category) {
  const rect = element.getBoundingClientRect();
  
  return {
    ref,
    type: element.tagName.toLowerCase(),
    role: element.getAttribute('role') || element.tagName.toLowerCase(),
    label: getAccessibleName(element),
    value: element.value || element.textContent?.trim().substring(0, 100) || '',
    description: element.title || element.getAttribute('aria-label') || '',
    state: {
      focused: document.activeElement === element,
      disabled: element.disabled || false,
      required: element.required || false,
      checked: element.checked || false
    },
    bounds: {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    },
    confidence: calculateConfidence(element, category)
  };
}

function getAccessibleName(element) {
  // aria-label
  if (element.hasAttribute('aria-label')) {
    return element.getAttribute('aria-label');
  }
  
  // aria-labelledby
  if (element.hasAttribute('aria-labelledby')) {
    const id = element.getAttribute('aria-labelledby');
    const labelElement = document.getElementById(id);
    if (labelElement) {
      return labelElement.textContent.trim();
    }
  }
  
  // label 元素
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent.trim();
    }
  }
  
  // placeholder
  if (element.placeholder) {
    return element.placeholder;
  }
  
  // title
  if (element.title) {
    return element.title;
  }
  
  // textContent (button, link 等)
  if (['BUTTON', 'A'].includes(element.tagName)) {
    return element.textContent.trim().substring(0, 50);
  }
  
  return '';
}

function isVisible(element) {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  
  return style.display !== 'none' &&
         style.visibility !== 'hidden' &&
         style.opacity !== '0' &&
         rect.width > 0 &&
         rect.height > 0;
}

function isInternalLink(link) {
  try {
    const url = new URL(link.href);
    return url.hostname === window.location.hostname;
  } catch {
    return false;
  }
}

function calculateConfidence(element, category) {
  let confidence = 0.7;
  
  if (getAccessibleName(element)) confidence += 0.15;
  if (element.id) confidence += 0.05;
  if (element.getAttribute('role')) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
}

// ─── 工具演示功能 ───────────────────────────────────────────────────────────

/**
 * 演示工具执行（高亮元素，不实际操作）
 */
async function demonstrateTool(tool) {
  try {
    console.log('[ContentScript] Demonstrating tool:', tool.name);
    
    // 清除之前的高亮
    clearHighlights();
    
    // 高亮工具使用的元素
    const highlightedCount = await highlightToolElements(tool);
    
    console.log(`[ContentScript] Highlighted ${highlightedCount} elements for tool ${tool.name}`);
    
    return {
      success: true,
      highlightedCount,
      message: `已高亮 ${highlightedCount} 个元素`
    };
  } catch (error) {
    console.error('[ContentScript] Demonstration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 高亮工具使用的元素
 */
async function highlightToolElements(tool) {
  let count = 0;
  
  // 工具的 elements 数组包含 ref 引用（如 "e1", "e2"）
  // 我们需要找到对应的 DOM 元素
  for (const elementInfo of tool.elementDetails || []) {
    const element = findElementByInfo(elementInfo);
    if (element) {
      highlightElement(element, elementInfo.ref, elementInfo.label);
      count++;
    }
  }
  
  return count;
}

/**
 * 根据元素信息查找 DOM 元素
 */
function findElementByInfo(info) {
  // 尝试通过位置和属性匹配元素
  const candidates = document.querySelectorAll(info.type);
  
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    
    // 位置匹配（允许一定误差）
    if (Math.abs(rect.x - info.bounds.x) < 5 &&
        Math.abs(rect.y - info.bounds.y) < 5 &&
        Math.abs(rect.width - info.bounds.width) < 5 &&
        Math.abs(rect.height - info.bounds.height) < 5) {
      return el;
    }
    
    // 标签匹配
    if (info.label && getAccessibleName(el) === info.label) {
      return el;
    }
  }
  
  return null;
}

/**
 * 高亮单个元素
 */
function highlightElement(element, ref, label) {
  const rect = element.getBoundingClientRect();
  
  // 创建高亮覆盖层
  const overlay = document.createElement('div');
  overlay.className = 'webmcp-highlight-overlay';
  overlay.style.cssText = `
    position: fixed;
    left: ${rect.left}px;
    top: ${rect.top}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: 3px solid #22c55e;
    background: rgba(34, 197, 94, 0.1);
    border-radius: 4px;
    pointer-events: none;
    z-index: 999999;
    animation: webmcp-pulse 1.5s ease-in-out infinite;
  `;

  // 创建标签
  const labelEl = document.createElement('div');
  labelEl.className = 'webmcp-highlight-label';
  labelEl.textContent = `${ref}: ${label || element.tagName}`;
  labelEl.style.cssText = `
    position: absolute;
    top: -28px;
    left: 0;
    background: #22c55e;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    font-family: monospace;
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  `;

  overlay.appendChild(labelEl);
  document.body.appendChild(overlay);

  // 添加动画样式（如果还没有）
  if (!document.getElementById('webmcp-highlight-styles')) {
    const style = document.createElement('style');
    style.id = 'webmcp-highlight-styles';
    style.textContent = `
      @keyframes webmcp-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // 滚动到元素可见
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * 清除所有高亮
 */
function clearHighlights() {
  const overlays = document.querySelectorAll('.webmcp-highlight-overlay');
  overlays.forEach(overlay => overlay.remove());
}


