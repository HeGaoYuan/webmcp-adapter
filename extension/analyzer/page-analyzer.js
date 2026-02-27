/**
 * Page Analyzer
 * 
 * 使用 chrome.automation API 分析页面结构
 * 构建可操作树，类似 OpenClaw 的 snapshot 功能
 */

class PageAnalyzer {
  constructor(tabId) {
    this.tabId = tabId;
    this.refManager = new RefManager();
  }

  /**
   * 主入口：分析页面
   * @returns {Promise<Object>} 分析结果
   */
  async analyze() {
    try {
      const tree = await this.getAccessibilityTree();
      
      return {
        success: true,
        pageInfo: this.extractPageInfo(tree),
        interactiveElements: this.buildInteractiveTree(tree),
        stats: this.calculateStats()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取可访问性树
   * @returns {Promise<Object>}
   */
  getAccessibilityTree() {
    return new Promise((resolve, reject) => {
      chrome.automation.getTree(this.tabId, (tree) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!tree) {
          reject(new Error('Failed to get accessibility tree'));
        } else {
          resolve(tree);
        }
      });
    });
  }

  /**
   * 提取页面基础信息
   */
  extractPageInfo(tree) {
    return {
      url: tree.docUrl || '',
      title: tree.name || '',
      domain: this.extractDomain(tree.docUrl)
    };
  }

  /**
   * 构建可操作树
   */
  buildInteractiveTree(tree) {
    const elements = {
      search: [],
      navigation: [],
      actions: [],
      lists: [],
      forms: [],
      inputs: []
    };

    this.traverseTree(tree, (node) => {
      const category = this.categorizeNode(node);
      if (category && elements[category]) {
        const elementInfo = this.createElementInfo(node, category);
        if (elementInfo) {
          elements[category].push(elementInfo);
        }
      }
    });

    return elements;
  }

  /**
   * 递归遍历可访问性树
   */
  traverseTree(node, callback) {
    if (!node) return;

    // 只处理可见且可交互的元素
    if (this.isInteractive(node) && this.isVisible(node)) {
      callback(node);
    }

    // 递归处理子节点
    if (node.children) {
      for (const child of node.children) {
        this.traverseTree(child, callback);
      }
    }
  }

  /**
   * 判断节点是否可交互
   */
  isInteractive(node) {
    const interactiveRoles = [
      'button', 'link', 'textBox', 'searchBox', 'comboBox',
      'listBox', 'checkBox', 'radio', 'slider', 'tab',
      'menuItem', 'menuItemCheckBox', 'menuItemRadio',
      'textField', 'search'
    ];

    return interactiveRoles.includes(node.role);
  }

  /**
   * 判断节点是否可见
   */
  isVisible(node) {
    // 检查状态
    if (node.state) {
      if (node.state.offscreen || node.state.invisible) {
        return false;
      }
    }

    // 检查位置信息
    if (node.location) {
      return node.location.width > 0 && node.location.height > 0;
    }

    return true;
  }

  /**
   * 对节点进行分类
   */
  categorizeNode(node) {
    const role = node.role;

    // 搜索框
    if (role === 'searchBox' || role === 'search') {
      return 'search';
    }

    // 链接（导航）
    if (role === 'link') {
      return 'navigation';
    }

    // 按钮（操作）
    if (role === 'button') {
      return 'actions';
    }

    // 列表
    if (role === 'list' || role === 'listBox') {
      return 'lists';
    }

    // 表单
    if (role === 'form') {
      return 'forms';
    }

    // 输入框
    if (role === 'textBox' || role === 'textField' || 
        role === 'comboBox' || role === 'checkBox' || role === 'radio') {
      return 'inputs';
    }

    return null;
  }

  /**
   * 创建元素信息对象
   */
  createElementInfo(node, category) {
    try {
      const ref = this.refManager.assignRef(node);

      return {
        ref,
        type: this.mapRoleToType(node.role),
        role: node.role,
        label: node.name || '',
        value: node.value || '',
        description: node.description || '',
        state: this.extractState(node),
        bounds: this.extractBounds(node),
        htmlAttributes: node.htmlAttributes || {},
        confidence: this.calculateConfidence(node, category)
      };
    } catch (error) {
      console.warn('[PageAnalyzer] Failed to create element info:', error);
      return null;
    }
  }

  /**
   * 提取节点状态
   */
  extractState(node) {
    if (!node.state) return {};

    return {
      focused: node.state.focused || false,
      disabled: node.state.disabled || false,
      required: node.state.required || false,
      checked: node.state.checked || false,
      expanded: node.state.expanded || false,
      selected: node.state.selected || false
    };
  }

  /**
   * 提取节点位置信息
   */
  extractBounds(node) {
    if (!node.location) return null;

    return {
      x: node.location.left,
      y: node.location.top,
      width: node.location.width,
      height: node.location.height
    };
  }

  /**
   * 映射 role 到类型
   */
  mapRoleToType(role) {
    const roleMap = {
      'searchBox': 'input',
      'search': 'input',
      'textBox': 'input',
      'textField': 'input',
      'button': 'button',
      'link': 'link',
      'checkBox': 'checkbox',
      'radio': 'radio',
      'comboBox': 'select',
      'listBox': 'select',
      'list': 'list'
    };
    return roleMap[role] || role;
  }

  /**
   * 计算置信度
   */
  calculateConfidence(node, category) {
    let confidence = 0.7; // 基础分数

    // 有 name 加分
    if (node.name && node.name.trim()) {
      confidence += 0.15;
    }

    // 有明确的 role 加分
    if (node.role) {
      confidence += 0.1;
    }

    // 有位置信息加分
    if (node.location && node.location.width > 0) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 计算统计信息
   */
  calculateStats() {
    return {
      ...this.refManager.getStats(),
      timestamp: Date.now()
    };
  }

  /**
   * 提取域名
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  /**
   * 清除分析结果
   */
  clear() {
    this.refManager.clear();
  }
}

// 导出为全局可用
if (typeof window !== 'undefined') {
  window.PageAnalyzer = PageAnalyzer;
}
