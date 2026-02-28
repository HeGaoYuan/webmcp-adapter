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
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const WS_PORT = 3711;

export class WebSocketBridge extends EventEmitter {
  constructor() {
    super();

    /**
     * 工具注册表：domain -> { tools: [...], tabCount: number }
     * @type {Map<string, {tools: Array, tabCount: number}>}
     */
    this.toolRegistry = new Map();

    /** @type {Map<string, { resolve: Function, reject: Function }>} */
    this._pendingRequests = new Map();
    this._requestCounter = 0;

    /** @type {Set<import('ws').WebSocket>} 所有连接的客户端 */
    this._clients = new Set();
    
    /** @type {import('ws').WebSocket | null} Chrome扩展的连接 */
    this._extensionWs = null;

    this._startServer();
  }

  // ─── WebSocket Server ───────────────────────────────────────────────────────

  _startServer() {
    try {
      this._wss = new WebSocketServer({ port: WS_PORT });
      
      this._wss.on("connection", (ws) => {
        const connectionId = Date.now();
        process.stderr.write(`[Bridge] New connection #${connectionId}\n`);
        
        // 添加到客户端集合
        this._clients.add(ws);
        
        ws.on("message", (data) => {
          try {
            let msg;
            try { msg = JSON.parse(data.toString()); } catch (e) { 
              process.stderr.write(`[Bridge] Failed to parse message: ${e.message}\n`);
              return; 
            }
            
            // 如果是tools_updated消息，说明这是Chrome扩展
            if (msg.type === 'tools_updated') {
              this._extensionWs = ws;
              process.stderr.write(`[Bridge] Identified Chrome extension connection #${connectionId}\n`);
            }
            
            // 根据消息类型判断来源并处理
            if (msg.type === 'tools_updated' || msg.type === 'call_tool_result' || msg.type === 'call_tool_error' || msg.type === 'get_active_tab_result') {
              // 来自Chrome扩展的消息
              this._handleExtensionMessage(msg);
            } else if (msg.type === 'call_tool' || msg.type === 'get_active_tab' || msg.type === 'open_browser' || msg.type === 'reload_extension' || msg.type === 'refresh_registry') {
              // 来自MCP进程或CLI的请求，需要转发给Chrome扩展或处理系统命令
              this._handleMcpRequest(msg);
            } else {
              process.stderr.write(`[Bridge] Unknown message type: ${msg.type}\n`);
            }
          } catch (err) {
            process.stderr.write(`[Bridge] Error handling message: ${err.message}\n${err.stack}\n`);
          }
        });

        ws.on("close", () => {
          this._clients.delete(ws);
          if (this._extensionWs === ws) {
            this._extensionWs = null;
            process.stderr.write(`[Bridge] Chrome extension disconnected #${connectionId}\n`);
          } else {
            process.stderr.write(`[Bridge] Connection #${connectionId} closed\n`);
          }
        });

        ws.on("error", (err) => {
          process.stderr.write(`[Bridge] Connection #${connectionId} error: ${err.message}\n`);
        });
        
        // 如果是新连接，发送当前工具列表
        const allTools = this.getAllTools();
        if (allTools.length > 0) {
          ws.send(JSON.stringify({
            type: 'tools_snapshot',
            tools: allTools
          }));
        }
      });

      this._wss.on("error", (err) => {
        if (err.code === 'EADDRINUSE') {
          process.stderr.write(`[Bridge] FATAL: Port ${WS_PORT} is already in use\n`);
          process.stderr.write(`[Bridge] Another instance may be running. Please stop it first.\n`);
          process.exit(1);
        }
        process.stderr.write(`[Bridge] WS server error: ${err.message}\n${err.stack}\n`);
      });

      process.stderr.write(`[Bridge] WebSocket server listening on ws://localhost:${WS_PORT}\n`);
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        process.stderr.write(`[Bridge] FATAL: Port ${WS_PORT} is already in use\n`);
        process.stderr.write(`[Bridge] Another instance may be running. Please stop it first.\n`);
        process.exit(1);
      }
      process.stderr.write(`[Bridge] Failed to start WebSocket server: ${err.message}\n${err.stack}\n`);
      throw err;
    }
  }
  
  // 广播消息给所有连接的客户端
  _broadcast(msg) {
    if (!this._wss) return;
    
    const msgStr = JSON.stringify(msg);
    this._wss.clients.forEach(client => {
      if (client.readyState === 1 /* OPEN */) {
        client.send(msgStr);
      }
    });
  }

  // ─── 处理来自扩展的消息 ────────────────────────────────────────────────────

  _handleExtensionMessage(msg) {
    process.stderr.write(`[Bridge] <- extension: ${JSON.stringify(msg).substring(0, 200)}\n`);

    if (msg.type === "tools_updated") {
      const { domain, tools, tabCount } = msg;
      if (!tools || tools.length === 0) {
        this.toolRegistry.delete(domain);
        process.stderr.write(`[Bridge] Removed tools for domain ${domain}\n`);
      } else {
        this.toolRegistry.set(domain, { tools, tabCount });
        process.stderr.write(`[Bridge] Registered ${tools.length} tools for domain ${domain} (${tabCount} tabs)\n`);
      }
      this.emit("tools_updated");
      // 广播给所有连接的客户端（包括MCP进程）
      this._broadcast(msg);
      return;
    }

    // 响应待处理请求（来自MCP进程的call_tool请求）
    const pending = this._pendingRequests.get(msg.id);
    if (!pending) {
      process.stderr.write(`[Bridge] No pending request for id ${msg.id}\n`);
      return;
    }
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
  
  // ─── 处理来自MCP进程的请求 ─────────────────────────────────────────────────
  
  async _handleMcpRequest(msg) {
    process.stderr.write(`[Bridge] <- MCP: ${JSON.stringify(msg).substring(0, 200)}\n`);

    // 将请求转发给Chrome扩展，并等待响应
    if (msg.type === 'call_tool') {
      const { toolName, args, id } = msg;
      process.stderr.write(`[Bridge] Forwarding call_tool to extension: ${toolName}\n`);

      try {
        const result = await this.callTool(toolName, args);
        // 将结果发送回MCP进程
        this._broadcast({ type: 'call_tool_result', id, result });
      } catch (err) {
        // 将错误发送回MCP进程
        this._broadcast({ type: 'call_tool_error', id, error: err.message });
      }
    } else if (msg.type === 'get_active_tab') {
      try {
        const tabId = await this.getActiveTabId();
        this._broadcast({ type: 'get_active_tab_result', id: msg.id, tabId });
      } catch (err) {
        this._broadcast({ type: 'get_active_tab_error', id: msg.id, error: err.message });
      }
    } else if (msg.type === 'open_browser') {
      try {
        const result = await this.openBrowser(msg.url);
        this._broadcast({ type: 'call_tool_result', id: msg.id, result });
      } catch (err) {
        this._broadcast({ type: 'call_tool_error', id: msg.id, error: err.message });
      }
    } else if (msg.type === 'reload_extension') {
      process.stderr.write('[Bridge] Forwarding reload_extension to Chrome extension\n');
      this._send({ type: 'reload_extension' });
    } else if (msg.type === 'refresh_registry') {
      process.stderr.write('[Bridge] Forwarding refresh_registry to Chrome extension\n');
      this._send({ type: 'refresh_registry' });
    }
  }

  // ─── 发送消息给扩展 ─────────────────────────────────────────────────────────  // ─── 发送消息给扩展 ─────────────────────────────────────────────────────────

  _send(msg) {
    if (!this._extensionWs || this._extensionWs.readyState !== 1 /* OPEN */) {
      process.stderr.write("[Bridge] Cannot send: Chrome extension not connected\n");
      return false;
    }
    this._extensionWs.send(JSON.stringify(msg));
    process.stderr.write(`[Bridge] -> extension: ${JSON.stringify(msg).substring(0, 200)}\n`);
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
    for (const [domain, domainData] of this.toolRegistry.entries()) {
      for (const tool of domainData.tools) {
        all.push({ ...tool, domain, tabCount: domainData.tabCount });
      }
    }
    return all;
  }

  async getActiveTabId() {
    return this._request({ type: "get_active_tab" });
  }

  async callTool(toolName, args) {
    return this._request({ type: "call_tool", toolName, args });
  }

  // ─── 浏览器控制 ─────────────────────────────────────────────────────────────

  /**
   * 检查Chrome扩展是否已连接
   */
  isExtensionConnected() {
    return this._extensionWs && this._extensionWs.readyState === 1;
  }

  /**
   * 打开浏览器并访问指定URL
   * 优先使用Chrome扩展API（如果已连接），否则使用系统命令
   */
  async openBrowser(url) {
    // Validate URL scheme — only http/https are allowed
    let parsedUrl;
    try { parsedUrl = new URL(url); } catch { throw new Error(`无效的URL: ${url}`); }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error(`不支持的URL协议 "${parsedUrl.protocol}"，只允许 http/https`);
    }

    // 方案1：如果Chrome扩展已连接，使用扩展API打开新tab
    if (this.isExtensionConnected()) {
      try {
        process.stderr.write(`[Bridge] Opening URL via Chrome extension: ${url}\n`);
        const result = await this._request({ type: "open_tab", url }, 5000);
        return {
          success: true,
          method: "extension",
          message: `已在Chrome中打开新标签页: ${url}`,
          tabId: result.tabId
        };
      } catch (err) {
        process.stderr.write(`[Bridge] Failed to open via extension: ${err.message}\n`);
        // 失败则继续尝试系统命令
      }
    }

    // 方案2：使用 execFile（非 shell）打开 Chrome，避免命令注入
    process.stderr.write(`[Bridge] Opening URL via system command: ${url}\n`);

    try {
      if (process.platform === "darwin") {
        await execFileAsync("open", ["-a", "Google Chrome", url]);
      } else if (process.platform === "win32") {
        // `start` is a cmd.exe built-in — must go through cmd /c
        await execFileAsync("cmd", ["/c", "start", "", "chrome", url]);
      } else {
        // Linux: try browsers in order until one succeeds
        const browsers = ["google-chrome", "chromium", "chromium-browser"];
        let opened = false;
        for (const bin of browsers) {
          try { await execFileAsync(bin, [url]); opened = true; break; } catch { /* try next */ }
        }
        if (!opened) throw new Error("找不到可用的 Chrome/Chromium 可执行文件");
      }
      return {
        success: true,
        method: "system_command",
        message: `已使用系统命令打开Chrome: ${url}`,
        note: "请等待几秒让页面加载完成"
      };
    } catch (err) {
      throw new Error(`无法打开Chrome: ${err.message}`);
    }
  }
}
