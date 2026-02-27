/**
 * Ref Manager
 * 
 * 管理元素引用系统，类似 OpenClaw 的 ref 机制
 * 格式：e1, e2, e3...
 */

class RefManager {
  constructor() {
    this.refMap = new Map(); // ref -> node
    this.nodeMap = new WeakMap(); // node -> ref
    this.counter = 1;
  }

  /**
   * 为节点分配 ref
   * @param {Object} node - chrome.automation 节点
   * @returns {string} ref (e.g., "e1")
   */
  assignRef(node) {
    if (this.nodeMap.has(node)) {
      return this.nodeMap.get(node);
    }

    const ref = `e${this.counter++}`;
    this.refMap.set(ref, node);
    this.nodeMap.set(node, ref);

    return ref;
  }

  /**
   * 通过 ref 获取节点
   * @param {string} ref
   * @returns {Object|null}
   */
  getNode(ref) {
    return this.refMap.get(ref) || null;
  }

  /**
   * 清除所有 ref（页面导航后调用）
   */
  clear() {
    this.refMap.clear();
    this.counter = 1;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalRefs: this.counter - 1,
      activeRefs: this.refMap.size
    };
  }
}

// 导出为全局可用（Content Script 环境）
if (typeof window !== 'undefined') {
  window.RefManager = RefManager;
}
