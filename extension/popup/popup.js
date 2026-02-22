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
    list.appendChild(item);
  }

  showOnly("stateActive");
}

function renderAvailable(adapterMeta, tabId, url) {
  setHeaderBadge("available", "发现可用适配器");

  document.getElementById("adapterName").textContent = adapterMeta.name ?? adapterMeta.id;
  document.getElementById("adapterDesc").textContent = adapterMeta.description ?? "";
  document.getElementById("adapterAuthor").textContent =
    adapterMeta.author ? `作者：${adapterMeta.author}` : "";

  const verifiedEl = document.getElementById("adapterVerified");
  verifiedEl.hidden = !adapterMeta.verified_on;

  // View source
  const btnSource = document.getElementById("btnViewSource");
  btnSource.onclick = () => openTab(adapterMeta.homepage ?? GITHUB_REPO);

  // Install
  const btnInstall = document.getElementById("btnInstall");
  btnInstall.onclick = async () => {
    btnInstall.disabled = true;
    btnInstall.textContent = "安装中…";
    const result = await chrome.runtime.sendMessage({
      type: "install_adapter",
      adapterId: adapterMeta.id,
      tabId,
      url,
    });
    if (result?.ok) {
      renderInstallSuccess(tabId);
    } else {
      btnInstall.disabled = false;
      btnInstall.textContent = "安装适配器";
      alert(`安装失败：${result?.error ?? "未知错误"}`);
    }
  };

  showOnly("stateAvailable");
}

function renderInstallSuccess(tabId) {
  setHeaderBadge("active", "安装成功");
  document.getElementById("btnReload").onclick = () => {
    chrome.tabs.reload(tabId);
    window.close();
  };
  showOnly("stateInstallSuccess");
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function init() {
  // Footer links
  document.getElementById("linkGitHub").onclick = () => openTab(GITHUB_REPO);
  document.getElementById("linkDocs").onclick = () =>
    openTab(`${GITHUB_REPO}#readme`);
  document.getElementById("btnNewIssue").onclick = () => openTab(GITHUB_NEW_ISSUE);
  document.getElementById("btnContribute").onclick = () => openTab(GITHUB_CONTRIBUTING);

  showOnly("stateLoading");

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab?.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
    renderError("此页面不支持 WebMCP");
    setWsStatus(false);
    return;
  }

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
    renderAvailable(info.adapterMeta, tab.id, tab.url);
  } else {
    renderNone();
  }
}

init();
