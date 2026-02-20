/**
 * Chrome Native Messaging Bridge
 *
 * Chrome Native Messaging 协议：
 * - 每条消息格式：[4字节小端序长度][JSON字节]
 * - 双向：stdin 接收扩展消息，stdout 发送消息给扩展
 *
 * 这个 Bridge 维护与浏览器扩展的通信，并暴露：
 * - toolRegistry: 当前所有已注册工具
 * - callTool(tabId, toolName, args): 调用指定 Tab 的工具
 * - on("tools_updated", handler): 工具列表变化事件
 */

import { EventEmitter } from "events";

export class NativeMessagingBridge extends EventEmitter {
  constructor() {
    super();

    /**
     * 工具注册表：tabId -> [{ name, description, parameters }]
     * @type {Map<number, Array<{name: string, description: string, parameters: object, tabId: number}>>}
     */
    this.toolRegistry = new Map();

    /**
     * 待响应的请求：requestId -> { resolve, reject }
     * @type {Map<string, { resolve: Function, reject: Function }>}
     */
    this._pendingRequests = new Map();

    this._requestCounter = 0;

    // 启动 Native Messaging 读取循环
    this._startReading();
  }

  // ─── 读取来自扩展的消息 ────────────────────────────────────────────────────

  _startReading() {
    let buffer = Buffer.alloc(0);

    process.stdin.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length >= 4) {
        const msgLength = buffer.readUInt32LE(0);

        if (buffer.length < 4 + msgLength) break; // 消息未完整到达

        const msgBuffer = buffer.slice(4, 4 + msgLength);
        buffer = buffer.slice(4 + msgLength);

        let msg;
        try {
          msg = JSON.parse(msgBuffer.toString("utf8"));
        } catch (err) {
          process.stderr.write(`[Bridge] Failed to parse message: ${err.message}\n`);
          continue;
        }

        this._handleExtensionMessage(msg);
      }
    });

    process.stdin.on("end", () => {
      process.stderr.write("[Bridge] stdin closed, extension disconnected\n");
      process.exit(0);
    });
  }

  // ─── 处理来自扩展的消息 ────────────────────────────────────────────────────

  _handleExtensionMessage(msg) {
    process.stderr.write(`[Bridge] <- extension: ${JSON.stringify(msg)}\n`);

    // 工具列表更新
    if (msg.type === "tools_updated") {
      const { tabId, tools } = msg;
      if (tools.length === 0) {
        this.toolRegistry.delete(tabId);
      } else {
        this.toolRegistry.set(tabId, tools.map(t => ({ ...t, tabId })));
      }
      this.emit("tools_updated");
      return;
    }

    // 响应：工具调用结果
    if (msg.type === "call_tool_result" || msg.type === "call_tool_error") {
      const pending = this._pendingRequests.get(msg.id);
      if (!pending) return;
      this._pendingRequests.delete(msg.id);

      if (msg.type === "call_tool_result") {
        pending.resolve(msg.result);
      } else {
        pending.reject(new Error(msg.error));
      }
      return;
    }

    // 响应：工具列表
    if (msg.type === "list_tools_result") {
      const pending = this._pendingRequests.get(msg.id);
      if (!pending) return;
      this._pendingRequests.delete(msg.id);
      pending.resolve(msg.tools);
      return;
    }

    // 响应：当前活跃 Tab
    if (msg.type === "get_active_tab_result") {
      const pending = this._pendingRequests.get(msg.id);
      if (!pending) return;
      this._pendingRequests.delete(msg.id);
      pending.resolve(msg.tabId);
      return;
    }
  }

  // ─── 发送消息给扩展 ─────────────────────────────────────────────────────────

  _sendToExtension(msg) {
    const json = JSON.stringify(msg);
    const bytes = Buffer.from(json, "utf8");
    const header = Buffer.alloc(4);
    header.writeUInt32LE(bytes.length, 0);
    process.stdout.write(Buffer.concat([header, bytes]));
    process.stderr.write(`[Bridge] -> extension: ${json}\n`);
  }

  _nextId() {
    return String(++this._requestCounter);
  }

  /**
   * 向扩展发送请求并等待响应
   */
  _request(msg, timeout = 10000) {
    const id = this._nextId();
    return new Promise((resolve, reject) => {
      this._pendingRequests.set(id, { resolve, reject });
      this._sendToExtension({ ...msg, id });

      setTimeout(() => {
        if (this._pendingRequests.has(id)) {
          this._pendingRequests.delete(id);
          reject(new Error(`Request "${msg.type}" timed out after ${timeout}ms`));
        }
      }, timeout);
    });
  }

  // ─── 公开 API ─────────────────────────────────────────────────────────────

  /**
   * 获取所有已注册工具（合并所有 Tab）
   * @returns {Array<{name, description, parameters, tabId}>}
   */
  getAllTools() {
    const all = [];
    for (const tools of this.toolRegistry.values()) {
      all.push(...tools);
    }
    return all;
  }

  /**
   * 从扩展同步最新工具列表（一般工具列表通过 tools_updated 事件维护，此方法备用）
   */
  async refreshTools() {
    const tools = await this._request({ type: "list_tools" });
    this.toolRegistry.clear();
    for (const tool of tools) {
      const list = this.toolRegistry.get(tool.tabId) ?? [];
      list.push(tool);
      this.toolRegistry.set(tool.tabId, list);
    }
  }

  /**
   * 获取当前活跃的 Tab ID
   */
  async getActiveTabId() {
    return this._request({ type: "get_active_tab" });
  }

  /**
   * 调用指定 Tab 上的工具
   */
  async callTool(tabId, toolName, args) {
    return this._request({ type: "call_tool", tabId, toolName, args });
  }
}
