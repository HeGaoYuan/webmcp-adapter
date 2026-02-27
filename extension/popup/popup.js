const GITHUB_REPO = "https://github.com/HeGaoYuan/webmcp-adapter";
const GITHUB_NEW_ISSUE = `${GITHUB_REPO}/issues/new?template=adapter-request.md`;
const GITHUB_CONTRIBUTING = `${GITHUB_REPO}/blob/main/hub/CONTRIBUTING.md`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function openTab(url) {
  chrome.tabs.create({ url });
}

function showOnly(id) {
  for (const el of document.querySelectorAll("[id^='state']")) {
    el.hidden = el.id !== id;
  }
}

function setHeaderBadge(type, text) {
  const badge = document.getElementById("headerBadge");
  badge.className = `header-badge badge-${type}`;
  document.getElementById("headerBadgeText").textContent = text;
}

function setWsStatus(connected) {
  const dot = document.getElementById("wsDot");
  const label = document.getElementById("wsLabel");
  if (connected) {
    dot.className = "ws-dot ws-dot-on";
    label.textContent = "已连接 MCP host";
  } else {
    dot.className = "ws-dot ws-dot-off";
    label.textContent = "未连接 MCP host";
  }
}

// ── Render helpers ────────────────────────────────────────────────────────────

function renderActive(tools) {
  setHeaderBadge("active", `${tools.length} 个工具已就绪`);

  document.getElementById("toolCountLabel").textContent =
    `已加载 ${tools.length} 个工具`;

  const list = document.getElementById("toolList");
  list.innerHTML = "";
  for (const tool of tools) {
    const item = document.createElement("div");
    item.className = "tool-item";
    item.innerHTML = `
      <div class="tool-name">${escHtml(tool.name)}</div>
      <div class="tool-desc">${escHtml(tool.description || "")}</div>
    `;
    
    // 点击工具打开测试模态框
    item.addEventListener("click", () => {
      openToolTestModal(tool);
    });
    
    list.appendChild(item);
  }

  showOnly("stateActive");
}

function renderAvailable(adapterMeta) {
  setHeaderBadge("available", "发现可用适配器");

  document.getElementById("adapterName").textContent = adapterMeta.name ?? adapterMeta.id;
  document.getElementById("adapterDesc").textContent = adapterMeta.description ?? "";
  document.getElementById("adapterAuthor").textContent =
    adapterMeta.author ? `作者：${adapterMeta.author}` : "";

  const verifiedEl = document.getElementById("adapterVerified");
  verifiedEl.hidden = !adapterMeta.verified_on;

  // Show CLI install command
  const cmd = `node index.js adapter install ${adapterMeta.id} --reload`;
  document.getElementById("installCmd").textContent = cmd;

  // Copy button
  const btnCopy = document.getElementById("btnCopyCmd");
  btnCopy.onclick = () => {
    navigator.clipboard.writeText(cmd).then(() => {
      btnCopy.textContent = "已复制";
      btnCopy.classList.add("copied");
      setTimeout(() => {
        btnCopy.textContent = "复制";
        btnCopy.classList.remove("copied");
      }, 1500);
    });
  };

  // View source — only open http/https URLs
  document.getElementById("btnViewSource").onclick = () => {
    const href = adapterMeta.homepage ?? GITHUB_REPO;
    try {
      const u = new URL(href);
      if (u.protocol === "https:" || u.protocol === "http:") openTab(href);
    } catch { /* invalid URL, do nothing */ }
  };

  showOnly("stateAvailable");
}

function renderInstallSuccess() {
  // no-op: install is now done via CLI, not in-popup
}

function renderNone() {
  setHeaderBadge("none", "无适配器");
  showOnly("stateNone");
}

function renderError(msg) {
  setHeaderBadge("none", "—");
  document.getElementById("errorMsg").textContent = msg;
  showOnly("stateError");
}

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Tool Test Modal ───────────────────────────────────────────────────────────

let currentTool = null;
let currentTabId = null;

function openToolTestModal(tool) {
  currentTool = tool;
  
  const modal = document.getElementById("toolModal");
  const modalToolName = document.getElementById("modalToolName");
  const modalForm = document.getElementById("modalForm");
  const modalResult = document.getElementById("modalResult");
  const btnExecute = document.getElementById("btnModalExecute");
  
  modalToolName.textContent = tool.name;
  modalResult.hidden = true;
  modalResult.textContent = "";
  btnExecute.disabled = false;
  btnExecute.textContent = "执行";
  
  // 生成参数表单
  const params = tool.parameters?.properties || {};
  const required = tool.parameters?.required || [];
  
  if (Object.keys(params).length === 0) {
    modalForm.innerHTML = '<div style="color: #6b7280; font-size: 12px;">此工具无需参数</div>';
  } else {
    let formHtml = '';
    for (const [key, schema] of Object.entries(params)) {
      const isRequired = required.includes(key);
      const label = key + (isRequired ? ' *' : '');
      const description = schema.description || '';
      const type = schema.type || 'string';
      
      let inputHtml = '';
      if (schema.enum) {
        // 枚举类型使用下拉框
        inputHtml = `<select class="form-input" data-param="${key}" ${isRequired ? 'required' : ''}>`;
        if (!isRequired) {
          inputHtml += '<option value="">-- 请选择 --</option>';
        }
        for (const val of schema.enum) {
          const selected = schema.default === val ? 'selected' : '';
          inputHtml += `<option value="${escHtml(String(val))}" ${selected}>${escHtml(String(val))}</option>`;
        }
        inputHtml += '</select>';
      } else if (type === 'number') {
        const defaultVal = schema.default !== undefined ? schema.default : '';
        inputHtml = `<input type="number" class="form-input" data-param="${key}" value="${defaultVal}" ${isRequired ? 'required' : ''} />`;
      } else if (type === 'boolean') {
        const checked = schema.default === true ? 'checked' : '';
        inputHtml = `<input type="checkbox" data-param="${key}" ${checked} />`;
      } else {
        // 默认文本输入
        const defaultVal = schema.default !== undefined ? escHtml(String(schema.default)) : '';
        inputHtml = `<input type="text" class="form-input" data-param="${key}" value="${defaultVal}" ${isRequired ? 'required' : ''} placeholder="${escHtml(description)}" />`;
      }
      
      formHtml += `
        <div class="form-group">
          <label class="form-label">${escHtml(label)}</label>
          ${inputHtml}
          ${description ? `<div class="form-hint">${escHtml(description)}</div>` : ''}
        </div>
      `;
    }
    modalForm.innerHTML = formHtml;
  }
  
  modal.hidden = false;
}

function closeToolTestModal() {
  document.getElementById("toolModal").hidden = true;
  currentTool = null;
}

async function executeCurrentTool() {
  if (!currentTool || !currentTabId) return;
  
  const modalForm = document.getElementById("modalForm");
  const modalResult = document.getElementById("modalResult");
  const btnExecute = document.getElementById("btnModalExecute");
  
  // 收集参数
  const args = {};
  const inputs = modalForm.querySelectorAll("[data-param]");
  
  for (const input of inputs) {
    const key = input.dataset.param;
    let value;
    
    if (input.type === 'checkbox') {
      value = input.checked;
    } else if (input.type === 'number') {
      value = input.value ? Number(input.value) : undefined;
    } else {
      value = input.value || undefined;
    }
    
    if (value !== undefined && value !== '') {
      args[key] = value;
    }
  }
  
  // 显示执行中状态
  btnExecute.disabled = true;
  btnExecute.textContent = "执行中...";
  modalResult.hidden = true;
  
  try {
    // 调用工具
    const response = await chrome.runtime.sendMessage({
      type: "test_call_tool",
      tabId: currentTabId,
      toolName: currentTool.name,
      args: args
    });
    
    // 显示结果
    modalResult.hidden = false;
    if (response.error) {
      modalResult.className = "result-box result-error";
      modalResult.textContent = `错误：${response.error}`;
    } else {
      modalResult.className = "result-box result-success";
      modalResult.textContent = JSON.stringify(response.result, null, 2);
    }
  } catch (error) {
    modalResult.hidden = false;
    modalResult.className = "result-box result-error";
    modalResult.textContent = `执行失败：${error.message}`;
  } finally {
    btnExecute.disabled = false;
    btnExecute.textContent = "执行";
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function init() {
  // Modal 事件绑定
  document.getElementById("btnModalCancel").addEventListener("click", closeToolTestModal);
  document.getElementById("btnModalExecute").addEventListener("click", executeCurrentTool);
  document.getElementById("toolModal").addEventListener("click", (e) => {
    if (e.target.id === "toolModal") {
      closeToolTestModal();
    }
  });
  
  // Footer links
  document.getElementById("linkGitHub").onclick = () => openTab(GITHUB_REPO);
  document.getElementById("linkDocs").onclick = () =>
    openTab(`${GITHUB_REPO}#readme`);
  document.getElementById("btnNewIssue").onclick = () => openTab(GITHUB_NEW_ISSUE);
  document.getElementById("btnContribute").onclick = () => openTab(GITHUB_CONTRIBUTING);

  // Refresh registry button
  const linkRefresh = document.getElementById("linkRefresh");
  linkRefresh.onclick = async () => {
    linkRefresh.textContent = "刷新中…";
    linkRefresh.classList.add("link-muted");
    try {
      const result = await chrome.runtime.sendMessage({ type: "refresh_registry" });
      if (result?.ok) {
        linkRefresh.textContent = `✓ ${result.count} 个适配器`;
        setTimeout(() => {
          linkRefresh.textContent = "↺ 刷新列表";
          linkRefresh.classList.remove("link-muted");
          init(); // re-render with fresh registry
        }, 1200);
      } else {
        linkRefresh.textContent = "刷新失败";
        setTimeout(() => {
          linkRefresh.textContent = "↺ 刷新列表";
          linkRefresh.classList.remove("link-muted");
        }, 2000);
      }
    } catch {
      linkRefresh.textContent = "↺ 刷新列表";
      linkRefresh.classList.remove("link-muted");
    }
  };

  showOnly("stateLoading");

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab?.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
    renderError("此页面不支持 WebMCP");
    setWsStatus(false);
    return;
  }

  // 保存当前 tabId 供工具测试使用
  currentTabId = tab.id;

  // Ask background for this tab's state
  let info;
  try {
    info = await chrome.runtime.sendMessage({
      type: "get_tab_info",
      tabId: tab.id,
      url: tab.url,
    });
  } catch (e) {
    renderError("无法连接到扩展后台，请重新加载扩展");
    setWsStatus(false);
    return;
  }

  setWsStatus(info.isConnected ?? false);

  if (info.state === "active") {
    renderActive(info.tools);
  } else if (info.state === "available") {
    renderAvailable(info.adapterMeta);
  } else {
    renderNone();
  }
}

init();
