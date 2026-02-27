/**
 * Options Page Controller
 */

// 加载保存的配置
async function loadConfig() {
  const result = await chrome.storage.local.get(['aiConfig']);
  const config = result.aiConfig || {
    provider: 'claude',
    baseUrl: '',
    apiKey: '',
    model: 'claude-sonnet-4-6'
  };

  document.getElementById('provider').value = config.provider;
  document.getElementById('baseUrl').value = config.baseUrl || '';
  document.getElementById('apiKey').value = config.apiKey;
  document.getElementById('model').value = config.model;

  // 根据 provider 更新 model 选项
  updateModelOptions(config.provider);
}

// 更新模型选项
function updateModelOptions(provider) {
  const modelSelect = document.getElementById('model');
  
  if (provider === 'claude') {
    modelSelect.innerHTML = `
      <option value="claude-opus-4-6">Claude Opus 4.6 (最强)</option>
      <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (推荐)</option>
      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
      <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (快速)</option>
      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
    `;
  } else if (provider === 'openai') {
    modelSelect.innerHTML = `
      <option value="gpt-4o">GPT-4o (推荐)</option>
      <option value="gpt-4o-mini">GPT-4o Mini (快速)</option>
      <option value="gpt-4-turbo">GPT-4 Turbo</option>
      <option value="gpt-4">GPT-4</option>
      <option value="gpt-3.5-turbo">GPT-3.5 Turbo (经济)</option>
    `;
  }
}

// 保存配置
async function saveConfig() {
  const config = {
    provider: document.getElementById('provider').value,
    baseUrl: document.getElementById('baseUrl').value.trim(),
    apiKey: document.getElementById('apiKey').value.trim(),
    model: document.getElementById('model').value
  };

  if (!config.apiKey) {
    showStatus('请输入 API Key', 'error');
    return;
  }

  try {
    await chrome.storage.local.set({ aiConfig: config });
    showStatus('设置已保存', 'success');
  } catch (error) {
    showStatus('保存失败：' + error.message, 'error');
  }
}

// 显示状态消息
function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status status-${type} show`;

  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 3000);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();

  document.getElementById('provider').addEventListener('change', (e) => {
    updateModelOptions(e.target.value);
  });

  document.getElementById('btnSave').addEventListener('click', saveConfig);
});


// ─── 标签页切换 ──────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    
    // 切换标签激活状态
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // 切换内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    // 如果切换到适配器管理，加载列表
    if (tabName === 'adapters') {
      loadAdapters();
    }
  });
});

// ─── 适配器管理 ──────────────────────────────────────────────────────────

async function loadAdapters() {
  try {
    const all = await chrome.storage.local.get(null);
    const adapters = [];
    
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith('generated_adapter_')) {
        const domain = key.replace('generated_adapter_', '');
        adapters.push({
          key,
          domain,
          ...value
        });
      }
    }
    
    renderAdapters(adapters);
  } catch (error) {
    showAdapterStatus('加载失败：' + error.message, 'error');
  }
}

function renderAdapters(adapters) {
  const container = document.getElementById('adapterList');
  
  if (adapters.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无自动生成的适配器</div>';
    return;
  }
  
  container.innerHTML = adapters.map(adapter => {
    const createdAt = new Date(adapter.createdAt).toLocaleString('zh-CN');
    const toolCount = adapter.metadata?.tools?.length || 0;
    const highlightedCode = highlightJS(adapter.code || '// 代码不可用');
    
    return `
      <div class="adapter-item" data-key="${adapter.key}">
        <div class="adapter-header">
          <div class="adapter-info">
            <div class="adapter-name">${adapter.domain}</div>
            <div class="adapter-meta">
              ${toolCount} 个工具 · 创建于 ${createdAt}
            </div>
          </div>
          <div class="adapter-actions">
            <button class="btn btn-secondary btn-small btn-view" data-key="${adapter.key}">
              查看代码
            </button>
            <button class="btn btn-secondary btn-small btn-download" data-key="${adapter.key}">
              下载
            </button>
            <button class="btn btn-danger btn-small btn-delete" data-key="${adapter.key}">
              删除
            </button>
          </div>
        </div>
        <div class="adapter-code" id="code-${adapter.key}">
          <pre><code>${highlightedCode}</code></pre>
        </div>
      </div>
    `;
  }).join('');
  
  // 绑定事件（使用事件委托）
  container.querySelectorAll('.btn-view').forEach(btn => {
    btn.addEventListener('click', () => {
      toggleCode(btn.dataset.key, btn);
    });
  });
  
  container.querySelectorAll('.btn-download').forEach(btn => {
    btn.addEventListener('click', () => {
      downloadAdapter(btn.dataset.key);
    });
  });
  
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteAdapter(btn.dataset.key);
    });
  });
}

function toggleCode(key, button) {
  const codeElement = document.getElementById(`code-${key}`);
  const isShowing = codeElement.classList.contains('show');
  
  if (isShowing) {
    codeElement.classList.remove('show');
    button.textContent = '查看代码';
  } else {
    codeElement.classList.add('show');
    button.textContent = '隐藏代码';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─── JavaScript 语法高亮 ──────────────────────────────────────────────────

function highlightJS(code) {
  // 使用标记数组来跟踪哪些字符已经被高亮
  const highlighted = new Array(code.length).fill(false);
  const segments = [];
  
  // 辅助函数：添加高亮片段
  function addSegment(start, end, type) {
    // 检查是否已经被高亮
    for (let i = start; i < end; i++) {
      if (highlighted[i]) return false;
    }
    
    // 标记为已高亮
    for (let i = start; i < end; i++) {
      highlighted[i] = true;
    }
    
    segments.push({ start, end, type, text: code.substring(start, end) });
    return true;
  }
  
  // 1. 多行注释
  let regex = /\/\*[\s\S]*?\*\//g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    addSegment(match.index, match.index + match[0].length, 'comment');
  }
  
  // 2. 单行注释
  regex = /\/\/.*/g;
  while ((match = regex.exec(code)) !== null) {
    addSegment(match.index, match.index + match[0].length, 'comment');
  }
  
  // 3. 字符串
  regex = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
  while ((match = regex.exec(code)) !== null) {
    addSegment(match.index, match.index + match[0].length, 'string');
  }
  
  // 4. 关键字
  const keywords = ['async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 
    'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 
    'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'return', 'static', 
    'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield'];
  
  for (const keyword of keywords) {
    regex = new RegExp(`\\b${keyword}\\b`, 'g');
    while ((match = regex.exec(code)) !== null) {
      addSegment(match.index, match.index + match[0].length, 'keyword');
    }
  }
  
  // 5. 数字
  regex = /\b\d+\.?\d*\b/g;
  while ((match = regex.exec(code)) !== null) {
    addSegment(match.index, match.index + match[0].length, 'number');
  }
  
  // 按位置排序
  segments.sort((a, b) => a.start - b.start);
  
  // 构建最终的 HTML
  let result = '';
  let pos = 0;
  
  for (const segment of segments) {
    // 添加未高亮的部分
    if (segment.start > pos) {
      result += escapeHtml(code.substring(pos, segment.start));
    }
    
    // 添加高亮的部分
    result += `<span class="hljs-${segment.type}">${escapeHtml(segment.text)}</span>`;
    pos = segment.end;
  }
  
  // 添加剩余部分
  if (pos < code.length) {
    result += escapeHtml(code.substring(pos));
  }
  
  return result;
}

async function deleteAdapter(key) {
  if (!confirm('确定要删除这个适配器吗？')) {
    return;
  }
  
  try {
    await chrome.storage.local.remove([key]);
    showAdapterStatus('删除成功', 'success');
    loadAdapters();
  } catch (error) {
    showAdapterStatus('删除失败：' + error.message, 'error');
  }
}

async function downloadAdapter(key) {
  try {
    const result = await chrome.storage.local.get([key]);
    const adapter = result[key];
    
    if (!adapter || !adapter.code) {
      throw new Error('适配器数据不完整');
    }
    
    const blob = new Blob([adapter.code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const domain = key.replace('generated_adapter_', '');
    
    // 创建临时下载链接
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // 清理 URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    showAdapterStatus('下载成功', 'success');
  } catch (error) {
    showAdapterStatus('下载失败：' + error.message, 'error');
  }
}

async function clearAllAdapters() {
  if (!confirm('确定要清除所有自动生成的适配器吗？此操作不可恢复！')) {
    return;
  }
  
  try {
    const all = await chrome.storage.local.get(null);
    const keysToRemove = [];
    
    for (const key of Object.keys(all)) {
      if (key.startsWith('generated_adapter_')) {
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      showAdapterStatus(`已清除 ${keysToRemove.length} 个适配器`, 'success');
      loadAdapters();
    } else {
      showAdapterStatus('没有需要清除的适配器', 'error');
    }
  } catch (error) {
    showAdapterStatus('清除失败：' + error.message, 'error');
  }
}

function showAdapterStatus(message, type) {
  const status = document.getElementById('adapterStatus');
  status.textContent = message;
  status.className = `status status-${type}`;
  status.classList.remove('hidden');
  
  setTimeout(() => {
    status.classList.add('hidden');
  }, 3000);
}

// 绑定按钮事件
document.getElementById('btnRefreshAdapters').addEventListener('click', loadAdapters);
document.getElementById('btnClearAll').addEventListener('click', clearAllAdapters);
