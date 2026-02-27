/**
 * Tool Executor
 * 
 * 自动执行工具演示，高亮显示操作元素
 */

class ToolExecutor {
  constructor(refManager) {
    this.refManager = refManager;
    this.highlightedElements = [];
  }

  /**
   * 演示工具执行
   * @param {Object} tool - 工具定义
   * @param {Object} testArgs - 测试参数
   * @returns {Promise<Object>} 执行结果
   */
  async demonstrateTool(tool, testArgs = {}) {
    try {
      const steps = [];

      // 1. 高亮所有相关元素
      for (const ref of tool.elements) {
        const node = this.refManager.getNode(ref);
        if (node) {
          await this.highlightElement(node, ref);
          steps.push({
            type: 'highlight',
            ref,
            label: node.name || node.role,
            success: true
          });
        } else {
          steps.push({
            type: 'highlight',
            ref,
            success: false,
            error: 'Element not found'
          });
        }
      }

      // 2. 等待用户观察
      await this.sleep(1000);

      // 3. 模拟执行步骤（不实际操作，只是演示）
      const executionSteps = this.generateExecutionSteps(tool, testArgs);
      
      for (const step of executionSteps) {
        steps.push(step);
        await this.sleep(500);
      }

      return {
        success: true,
        tool: tool.name,
        steps,
        message: '演示完成，请确认工具是否正确'
      };
    } catch (error) {
      return {
        success: false,
        tool: tool.name,
        error: error.message
      };
    } finally {
      // 清除高亮
      await this.sleep(2000);
      this.clearHighlights();
    }
  }

  /**
   * 高亮元素
   */
  async highlightElement(node, ref) {
    if (!node.location) return;

    // 创建高亮覆盖层
    const overlay = document.createElement('div');
    overlay.className = 'webmcp-highlight-overlay';
    overlay.style.cssText = `
      position: fixed;
      left: ${node.location.left}px;
      top: ${node.location.top}px;
      width: ${node.location.width}px;
      height: ${node.location.height}px;
      border: 3px solid #22c55e;
      background: rgba(34, 197, 94, 0.1);
      border-radius: 4px;
      pointer-events: none;
      z-index: 999999;
      animation: webmcp-pulse 1.5s ease-in-out infinite;
    `;

    // 创建标签
    const label = document.createElement('div');
    label.className = 'webmcp-highlight-label';
    label.textContent = ref;
    label.style.cssText = `
      position: absolute;
      top: -24px;
      left: 0;
      background: #22c55e;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      font-family: monospace;
    `;

    overlay.appendChild(label);
    document.body.appendChild(overlay);
    this.highlightedElements.push(overlay);

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
  }

  /**
   * 清除所有高亮
   */
  clearHighlights() {
    for (const overlay of this.highlightedElements) {
      overlay.remove();
    }
    this.highlightedElements = [];
  }

  /**
   * 生成执行步骤（模拟）
   */
  generateExecutionSteps(tool, testArgs) {
    const steps = [];

    // 根据工具名称推断操作类型
    if (tool.name.startsWith('search_')) {
      steps.push({
        type: 'input',
        ref: tool.elements[0],
        action: 'type',
        value: testArgs.query || '测试搜索',
        description: '在搜索框输入关键词'
      });

      if (tool.elements[1]) {
        steps.push({
          type: 'click',
          ref: tool.elements[1],
          action: 'click',
          description: '点击搜索按钮'
        });
      }
    } else if (tool.name.startsWith('get_') && tool.name.endsWith('_list')) {
      steps.push({
        type: 'extract',
        ref: tool.elements[0],
        action: 'extract',
        description: '提取列表数据'
      });
    } else if (tool.name.startsWith('navigate_to_')) {
      steps.push({
        type: 'click',
        ref: tool.elements[0],
        action: 'click',
        description: '点击导航链接'
      });
    } else {
      // 通用操作
      for (const ref of tool.elements) {
        steps.push({
          type: 'action',
          ref,
          action: 'interact',
          description: '与元素交互'
        });
      }
    }

    return steps;
  }

  /**
   * 等待
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出为全局可用
if (typeof window !== 'undefined') {
  window.ToolExecutor = ToolExecutor;
}
