/**
 * Analysis Panel Controller
 * 
 * 控制分析面板的 UI 和交互逻辑
 */

class AnalysisPanelController {
  constructor() {
    this.tabId = null;
    this.analyzer = null;
    this.generator = null;
    this.executor = null;
    this.analysisResult = null;
    this.generatedTools = [];
    this.approvedTools = [];
    this.currentToolIndex = 0;

    this.init();
  }

  async init() {
    // 从 URL 参数获取目标 tab ID
    const urlParams = new URLSearchParams(window.location.search);
    this.tabId = parseInt(urlParams.get('tabId'));

    if (!this.tabId) {
      this.showError('无法获取目标页面信息');
      return;
    }

    // 获取目标 tab 的信息
    try {
      const tab = await chrome.tabs.get(this.tabId);
      
      // 显示页面信息
      document.getElementById('pageTitle').textContent = tab.title;
      document.getElementById('pageUrl').textContent = tab.url;
    } catch (error) {
      this.showError('目标页面已关闭或无法访问');
      return;
    }

    // 绑定事件
    document.getElementById('btnStartAnalysis').addEventListener('click', () => {
      this.startAnalysis();
    });

    document.getElementById('btnRetry').addEventListener('click', () => {
      this.reset();
    });

    document.getElementById('btnComplete').addEventListener('click', () => {
      this.saveAdapter();
    });

    // 从 storage 获取 AI 配置
    const config = await this.getAIConfig();
    if (!config.apiKey) {
      this.showError('请先配置 AI API Key。请在扩展设置中配置。');
      document.getElementById('btnStartAnalysis').disabled = true;
    }
  }

  /**
   * 开始分析
   */
  async startAnalysis() {
    try {
      this.showSection('analyzingSection');
      this.updateStatus('正在分析页面结构...');

      // Phase 1: 页面分析（通过 background script）
      const analysisResult = await chrome.runtime.sendMessage({
        type: 'analyze_page',
        tabId: this.tabId
      });

      if (!analysisResult.success) {
        throw new Error(analysisResult.error);
      }

      this.analysisResult = analysisResult;
      this.updateStatus('正在生成工具...');

      // 显示 AI 调试区域
      document.getElementById('aiDebugSection').classList.remove('hidden');

      // Phase 2: AI 工具生成
      const config = await this.getAIConfig();
      this.generator = new ToolGenerator(config);
      
      // 设置回调来显示 AI 请求和响应
      this.generator.onAIRequest = (prompt) => {
        this.showAIRequest(prompt);
      };
      
      this.generator.onAIResponse = (response) => {
        this.showAIResponse(response);
      };
      
      this.generatedTools = await this.generator.generateTools(this.analysisResult);

      if (this.generatedTools.length === 0) {
        throw new Error('未能生成任何工具，页面可能不适合自动化');
      }

      // 显示结果
      this.showResults();

    } catch (error) {
      console.error('[AnalysisPanel] Analysis failed:', error);
      this.showError(error.message);
    }
  }

  /**
   * 选择并演示指定工具
   */
  async selectAndDemonstrateTool(index) {
    this.currentToolIndex = index;
    await this.demonstrateCurrentTool();
  }

  /**
   * 演示当前工具
   */
  async demonstrateCurrentTool() {
    const tool = this.generatedTools[this.currentToolIndex];
    if (!tool) return;

    try {
      // 高亮当前工具卡片
      this.highlightToolCard(this.currentToolIndex);

      // 准备工具数据（包含完整的元素信息）
      const toolWithDetails = {
        ...tool,
        elementDetails: tool.elements.map(ref => {
          // 从分析结果中查找元素详细信息
          return this.findElementByRef(ref);
        }).filter(Boolean)
      };

      // 在 content script 中执行演示
      const response = await chrome.tabs.sendMessage(this.tabId, {
        type: 'demonstrate_tool',
        tool: toolWithDetails
      });

      if (response && response.success) {
        this.showStatus(`正在演示工具：${tool.name} (已高亮 ${response.highlightedCount} 个元素)`, 'info');
      } else {
        this.showStatus(`演示工具：${tool.name} (部分元素可能不可见)`, 'warning');
      }

    } catch (error) {
      console.error('[AnalysisPanel] Demonstration failed:', error);
      this.showStatus(`演示失败：${error.message}`, 'error');
    }
  }

  /**
   * 根据 ref 查找元素信息
   */
  findElementByRef(ref) {
    if (!this.analysisResult || !this.analysisResult.interactiveElements) {
      return null;
    }

    // 在所有类别中查找
    for (const category of Object.values(this.analysisResult.interactiveElements)) {
      const element = category.find(el => el.ref === ref);
      if (element) {
        return element;
      }
    }

    return null;
  }

  /**
   * 显示结果
   */
  showResults() {
    this.showSection('resultsSection');

    // 更新统计信息
    const totalElements = Object.values(this.analysisResult.interactiveElements)
      .reduce((sum, arr) => sum + arr.length, 0);
    
    const avgConfidence = this.generatedTools.length > 0
      ? Math.round(this.generatedTools.reduce((sum, t) => sum + t.confidence, 0) / this.generatedTools.length * 100)
      : 0;

    document.getElementById('statElements').textContent = totalElements;
    document.getElementById('statTools').textContent = this.generatedTools.length;
    document.getElementById('statConfidence').textContent = avgConfidence + '%';

    // 渲染工具列表
    this.renderTools();
    
    // 显示提示信息
    this.showStatus('点击工具卡片查看演示，然后选择批准或拒绝', 'info');
  }

  /**
   * 渲染工具列表
   */
  renderTools() {
    const container = document.getElementById('toolsList');
    container.innerHTML = '';

    this.generatedTools.forEach((tool, index) => {
      const card = this.createToolCard(tool, index);
      container.appendChild(card);
    });
  }

  /**
   * 创建工具卡片
   */
  createToolCard(tool, index) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.id = `tool-card-${index}`;

    const confidenceClass = tool.confidence >= 0.8 ? 'high' : '';
    const confidenceText = Math.round(tool.confidence * 100) + '%';

    card.innerHTML = `
      <div class="tool-header">
        <div class="tool-name">${this.escapeHtml(tool.name)}</div>
        <div class="tool-confidence ${confidenceClass}">${confidenceText}</div>
      </div>
      <div class="tool-description">${this.escapeHtml(tool.description)}</div>
      <div class="tool-elements">
        使用元素: ${tool.elements.map(ref => `<code>${ref}</code>`).join(' ')}
      </div>
      ${tool.reasoning ? `<div class="tool-elements">原因: ${this.escapeHtml(tool.reasoning)}</div>` : ''}
      <div class="tool-actions">
        <button class="btn btn-primary" data-action="approve" data-index="${index}">
          ✓ 批准
        </button>
        <button class="btn btn-danger" data-action="reject" data-index="${index}">
          ✗ 拒绝
        </button>
      </div>
      <div class="feedback-box" id="feedback-${index}">
        <textarea placeholder="请说明问题..."></textarea>
        <button class="btn btn-secondary" data-action="submit-feedback" data-index="${index}">
          提交反馈
        </button>
      </div>
    `;

    // 绑定卡片点击事件 - 点击卡片演示工具
    card.addEventListener('click', (e) => {
      // 如果点击的是按钮，不触发卡片点击
      const btn = e.target.closest('[data-action]');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const action = btn.dataset.action;
        const idx = parseInt(btn.dataset.index);
        console.log('[AnalysisPanel] Button clicked:', action, idx);
        this.handleToolAction(action, idx);
      } else {
        // 点击卡片其他区域 - 演示该工具
        console.log('[AnalysisPanel] Card clicked, demonstrating tool:', index);
        this.selectAndDemonstrateTool(index);
      }
    });

    return card;
  }

  /**
   * 处理工具操作
   */
  async handleToolAction(action, index) {
    console.log('[AnalysisPanel] Tool action:', action, 'index:', index);
    
    const tool = this.generatedTools[index];
    if (!tool) {
      console.error('[AnalysisPanel] Tool not found at index:', index);
      return;
    }

    if (action === 'approve') {
      // 批准工具
      if (!this.approvedTools.find(t => t.name === tool.name)) {
        this.approvedTools.push(tool);
      }
      
      // 标记卡片为已批准
      const card = document.getElementById(`tool-card-${index}`);
      if (card) {
        card.classList.add('approved');
      }
      
      this.showStatus(`已批准工具：${tool.name} (${this.approvedTools.length}/${this.generatedTools.length})`, 'success');
      
      // 检查是否所有工具都已处理
      this.checkCompletion();

    } else if (action === 'reject') {
      // 显示反馈框
      const feedbackBox = document.getElementById(`feedback-${index}`);
      if (feedbackBox) {
        feedbackBox.classList.add('show');
      }

    } else if (action === 'submit-feedback') {
      // 提交反馈
      const feedbackBox = document.getElementById(`feedback-${index}`);
      const feedback = feedbackBox.querySelector('textarea').value;
      
      if (!feedback.trim()) {
        alert('请输入反馈内容');
        return;
      }

      // 标记卡片为已拒绝
      const card = document.getElementById(`tool-card-${index}`);
      if (card) {
        card.classList.add('rejected');
      }

      // TODO: 基于反馈重新生成工具（最多3次）
      this.showStatus(`已记录反馈：${tool.name}`, 'warning');
      feedbackBox.classList.remove('show');
      
      // 检查是否所有工具都已处理
      this.checkCompletion();
    }
  }

  /**
   * 检查是否完成
   */
  checkCompletion() {
    // 显示完成按钮（只要有批准的工具就可以保存）
    if (this.approvedTools.length > 0) {
      document.getElementById('completeSection').classList.remove('hidden');
    } else {
      document.getElementById('completeSection').classList.add('hidden');
    }
  }

  /**
   * 保存适配器
   */
  async saveAdapter() {
    console.log('[AnalysisPanel] saveAdapter called');
    console.log('[AnalysisPanel] Approved tools:', this.approvedTools);
    
    try {
      if (!this.analysisResult || !this.analysisResult.pageInfo) {
        throw new Error('分析结果不完整');
      }

      if (this.approvedTools.length === 0) {
        throw new Error('没有批准任何工具');
      }

      const adapter = {
        name: this.analysisResult.pageInfo.domain,
        domain: this.analysisResult.pageInfo.domain,
        url: this.analysisResult.pageInfo.url,
        tools: this.approvedTools,
        createdAt: Date.now(),
        version: '1.0.0'
      };

      console.log('[AnalysisPanel] Saving adapter:', adapter);
      console.log('[AnalysisPanel] Domain:', adapter.domain);

      // 通知 background script 保存适配器
      const response = await chrome.runtime.sendMessage({
        type: 'adapter_created',
        adapter: adapter
      });

      console.log('[AnalysisPanel] Background response:', response);

      if (!response || !response.ok) {
        throw new Error(response?.error || '保存失败');
      }

      this.showStatus('适配器已保存！刷新页面后生效。', 'success');

      // 3秒后关闭面板
      setTimeout(() => {
        window.close();
      }, 3000);

    } catch (error) {
      console.error('[AnalysisPanel] Failed to save adapter:', error);
      this.showStatus(`保存失败：${error.message}`, 'error');
    }
  }

  /**
   * 高亮工具卡片
   */
  highlightToolCard(index) {
    // 移除所有高亮
    document.querySelectorAll('.tool-card').forEach(card => {
      card.classList.remove('active');
    });

    // 高亮当前卡片
    const card = document.getElementById(`tool-card-${index}`);
    if (card) {
      card.classList.add('active');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * 显示 AI 请求
   */
  showAIRequest(prompt) {
    const requestEl = document.getElementById('aiRequest');
    if (requestEl) {
      // 截取前 500 个字符显示
      const preview = prompt.length > 500 
        ? prompt.substring(0, 500) + '\n\n... (共 ' + prompt.length + ' 字符)'
        : prompt;
      
      requestEl.textContent = preview;
      requestEl.className = 'ai-debug-content';
    }
  }

  /**
   * 显示 AI 响应
   */
  showAIResponse(response) {
    const responseEl = document.getElementById('aiResponse');
    if (responseEl) {
      // 尝试格式化 JSON
      try {
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : response;
        const parsed = JSON.parse(jsonStr);
        const formatted = JSON.stringify(parsed, null, 2);
        
        // 截取前 800 个字符显示
        const preview = formatted.length > 800
          ? formatted.substring(0, 800) + '\n\n... (共 ' + formatted.length + ' 字符)'
          : formatted;
        
        responseEl.textContent = preview;
        responseEl.className = 'ai-debug-content success';
      } catch (e) {
        // 如果不是 JSON，直接显示
        const preview = response.length > 800
          ? response.substring(0, 800) + '\n\n... (共 ' + response.length + ' 字符)'
          : response;
        
        responseEl.textContent = preview;
        responseEl.className = 'ai-debug-content';
      }
    }
  }

  /**
   * 显示状态消息
   */
  showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status status-${type}`;
    statusEl.classList.remove('hidden');
  }

  /**
   * 更新分析状态
   */
  updateStatus(message) {
    const statusEl = document.getElementById('analyzingStatus');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  /**
   * 显示错误
   */
  showError(message) {
    this.showSection('errorSection');
    document.getElementById('errorMessage').textContent = message;
  }

  /**
   * 显示指定区域
   */
  showSection(sectionId) {
    const sections = ['startSection', 'analyzingSection', 'resultsSection', 'errorSection'];
    sections.forEach(id => {
      document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
  }

  /**
   * 重置
   */
  reset() {
    this.analysisResult = null;
    this.generatedTools = [];
    this.approvedTools = [];
    this.currentToolIndex = 0;
    this.showSection('startSection');
  }

  /**
   * 获取 AI 配置
   */
  async getAIConfig() {
    const result = await chrome.storage.local.get(['aiConfig']);
    return result.aiConfig || {
      provider: 'claude',
      baseUrl: '',
      apiKey: '',
      model: 'claude-sonnet-4-6'
    };
  }

  /**
   * HTML 转义
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 初始化
const controller = new AnalysisPanelController();
