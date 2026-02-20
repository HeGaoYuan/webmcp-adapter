/**
 * WebSocket Bridge
 *
 * 替代 Chrome Native Messaging，使用本地 WebSocket server 与浏览器扩展通信。
 *
 * 原因：Native Messaging 和 MCP StdioServerTransport 都依赖 stdin/stdout，
 * 在同一进程中冲突。WebSocket 使用独立端口，与 MCP stdio 互不干扰。
 *
 * 架构：
 *   Claude Desktop --[stdio MCP]--> native-host/index.js
 *                                         |
 *                                   ws://localhost:3711
 *                                         |
 *                              Chrome Extension (service worker)
 */

import { WebSocketServer } from "ws";
import { EventEmitter } from "events";

const WS_PORT = 3711;

export class NativeMessagingBridge extends EventEmitter {
  constructor() {
    super();

    /**
     * 工具注册表：tabId -> [{ name, description, parameters, tabId }]
     * @type {Map<number, Array>}
     */
    this.toolRegistry = new Map();

    /** @type {Map<string, { resolve: Function, reject: Function }>} */
    this._pendingRequests = new Map();
    this._requestCounter = 0;

    /** @type {import('ws').WebSocket | null} 当前连接的扩展 */
    this._ws = null;

    this._startServer();
  }

  // ─── WebSocket Server ───────────────────────────────────────────────────────

  _startServer() {
    this._wss = new WebSocketServer({ port: WS_PORT });

    this._wss.on("connection", (ws) => {
      // 同时只允许一个扩展连接（断开旧连接）
      if (this._ws) {
        process.stderr.write("[Bridge] New extension connected, closing previous\n");
        this._ws.close();
      }
      this._ws = ws;
      process.stderr.write("[Bridge] Extension connected\n");

      ws.on("message", (data) => {
        let msg;
        try { msg = JSON.parse(data.toString()); } catch { return; }
        this._handleExtensionMessage(msg);
      });

      ws.on("close", () => {
        if (this._ws === ws) this._ws = null;
        process.stderr.write("[Bridge] Extension disconnected\n");
      });

      ws.on("error", (err) => {
        process.stderr.write(`[Bridge] Extension WS error: ${err.message}\n`);
      });
    });

    this._wss.on("error", (err) => {
      process.stderr.write(`[Bridge] WS server error: ${err.message}\n`);
    });

    process.stderr.write(`[Bridge] WebSocket server listening on ws://localhost:${WS_PORT}\n`);
  }

  // ─── 处理来自扩展的消息 ────────────────────────────────────────────────────

  _handleExtensionMessage(msg) {
    process.stderr.write(`[Bridge] <- extension: ${JSON.stringify(msg)}\n`);

    if (msg.type === "tools_updated") {
      const { tabId, tools } = msg;
      if (!tools || tools.length === 0) {
        this.toolRegistry.delete(tabId);
      } else {
        this.toolRegistry.set(tabId, tools.map(t => ({ ...t, tabId })));
      }
      this.emit("tools_updated");
      return;
    }

    // 响应待处理请求
    const pending = this._pendingRequests.get(msg.id);
    if (!pending) return;
    this._pendingRequests.delete(msg.id);

    if (msg.type === "call_tool_result") {
      pending.resolve(msg.result);
    } else if (msg.type === "call_tool_error") {
      pending.reject(new Error(msg.error));
    } else if (msg.type === "list_tools_result") {
      pending.resolve(msg.tools);
    } else if (msg.type === "get_active_tab_result") {
      pending.resolve(msg.tabId);
    }
  }

  // ─── 发送消息给扩展 ─────────────────────────────────────────────────────────

  _send(msg) {
    if (!this._ws || this._ws.readyState !== 1 /* OPEN */) {
      process.stderr.write("[Bridge] Cannot send: extension not connected\n");
      return false;
    }
    this._ws.send(JSON.stringify(msg));
    process.stderr.write(`[Bridge] -> extension: ${JSON.stringify(msg)}\n`);
    return true;
  }

  _nextId() {
    return String(++this._requestCounter);
  }

  _request(msg, timeout = 10000) {
    const id = this._nextId();
    return new Promise((resolve, reject) => {
      this._pendingRequests.set(id, { resolve, reject });
      if (!this._send({ ...msg, id })) {
        this._pendingRequests.delete(id);
        reject(new Error("Extension not connected"));
        return;
      }
      setTimeout(() => {
        if (this._pendingRequests.has(id)) {
          this._pendingRequests.delete(id);
          reject(new Error(`Request "${msg.type}" timed out after ${timeout}ms`));
        }
      }, timeout);
    });
  }

  // ─── 公开 API ─────────────────────────────────────────────────────────────

  getAllTools() {
    const all = [];
    for (const tools of this.toolRegistry.values()) {
      all.push(...tools);
    }
    return all;
  }

  async getActiveTabId() {
    return this._request({ type: "get_active_tab" });
  }

  async callTool(tabId, toolName, args) {
    return this._request({ type: "call_tool", tabId, toolName, args });
  }
}
