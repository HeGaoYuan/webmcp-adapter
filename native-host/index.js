#!/usr/bin/env node
/**
 * Native Host 入口
 *
 * 运行模式：
 * 1. 独立服务模式（推荐）：作为后台服务运行，提供WebSocket bridge
 *    启动：node index.js --service
 *    - WebSocket Server (localhost:3711) ← Chrome Extension
 *    - 不启动MCP Server
 *
 * 2. MCP模式：由Claude Desktop通过stdio启动
 *    启动：node index.js (或由Claude Desktop启动)
 *    - MCP Server (stdio) ← Claude Desktop
 *    - 连接到已运行的WebSocket bridge (localhost:3711)
 *
 * 架构：
 *   [独立服务]                    [MCP进程]
 *   WebSocket Server  <--连接-->  MCP Server
 *        ↑                             ↑
 *        |                             |
 *   Chrome Extension          Claude Desktop
 */

import { McpServer } from "./mcp-server.js";
import { NativeMessagingBridge } from "./bridge.js";
import { WebSocket } from "ws";

const WS_PORT = 3711;
const isServiceMode = process.argv.includes('--service');

async function main() {
  process.stderr.write("[WebMCP] Starting native host...\n");
  process.stderr.write(`[WebMCP] Mode: ${isServiceMode ? 'Service' : 'MCP'}\n`);
  
  // 添加全局错误处理
  process.on('uncaughtException', (err) => {
    process.stderr.write(`[WebMCP] Uncaught exception: ${err.message}\n${err.stack}\n`);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    process.stderr.write(`[WebMCP] Unhandled rejection: ${reason}\n`);
  });

  try {
    if (isServiceMode) {
      // ═══════════════════════════════════════════════════════════════
      // 独立服务模式：只启动 WebSocket bridge
      // ═══════════════════════════════════════════════════════════════
      process.stderr.write("[WebMCP] Starting in SERVICE mode (WebSocket bridge only)\n");
      process.stderr.write("[WebMCP] Starting WebSocket bridge...\n");
      
      const bridge = new NativeMessagingBridge();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      process.stderr.write("[WebMCP] Bridge started successfully\n");
      process.stderr.write(`[WebMCP] WebSocket server listening on ws://localhost:${WS_PORT}\n`);
      process.stderr.write("[WebMCP] Service is ready. Waiting for Chrome extension to connect...\n");
      
      // 保持进程运行
      setInterval(() => {
        const toolCount = bridge.getAllTools().length;
        process.stderr.write(`[WebMCP] Service alive - ${toolCount} tools registered\n`);
      }, 60000); // 每分钟输出一次状态
      
    } else {
      // ═══════════════════════════════════════════════════════════════
      // MCP 模式：连接到已运行的 WebSocket bridge
      // ═══════════════════════════════════════════════════════════════
      process.stderr.write("[WebMCP] Starting in MCP mode (connecting to service)\n");
      
      // 检查服务是否运行
      const isServiceRunning = await checkServiceRunning();
      if (!isServiceRunning) {
        process.stderr.write("[WebMCP] ERROR: WebSocket service is not running!\n");
        process.stderr.write("[WebMCP] Please start the service first:\n");
        process.stderr.write("[WebMCP]   ./start-service.sh start\n");
        process.exit(1);
      }
      
      process.stderr.write("[WebMCP] Service is running, starting MCP server...\n");
      
      // 创建一个远程 bridge 客户端（连接到服务）
      const bridge = new RemoteBridge();
      await bridge.connect();
      
      process.stderr.write("[WebMCP] Connected to WebSocket service\n");
      
      // 启动 MCP Server
      const mcpServer = new McpServer(bridge);
      await mcpServer.start();
      process.stderr.write("[WebMCP] MCP server started successfully\n");
      process.stderr.write("[WebMCP] Native host is ready\n");
    }
  } catch (err) {
    process.stderr.write(`[WebMCP] Startup error: ${err.message}\n${err.stack}\n`);
    throw err;
  }
}

// 检查服务是否运行
async function checkServiceRunning() {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
    
    const timeout = setTimeout(() => {
      ws.close();
      resolve(false);
    }, 2000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    });
    
    ws.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

// 远程 Bridge 客户端（MCP模式使用）
class RemoteBridge {
  constructor() {
    this.ws = null;
    this.toolRegistry = new Map();
    this._pendingRequests = new Map();
    this._requestCounter = 0;
    this._listeners = new Map();
  }
  
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      this.ws.on('open', () => {
        process.stderr.write("[RemoteBridge] Connected to service\n");
        resolve();
      });
      
      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this._handleMessage(msg);
        } catch (err) {
          process.stderr.write(`[RemoteBridge] Failed to parse message: ${err.message}\n`);
        }
      });
      
      this.ws.on('close', () => {
        process.stderr.write("[RemoteBridge] Disconnected from service\n");
        // MCP模式下断开连接应该退出
        process.exit(1);
      });
      
      this.ws.on('error', (err) => {
        process.stderr.write(`[RemoteBridge] Error: ${err.message}\n`);
        reject(err);
      });
    });
  }
  
  _handleMessage(msg) {
    if (msg.type === 'tools_updated') {
      const { tabId, tools } = msg;
      if (!tools || tools.length === 0) {
        this.toolRegistry.delete(tabId);
      } else {
        this.toolRegistry.set(tabId, tools.map(t => ({ ...t, tabId })));
      }
      this._emit('tools_updated');
      return;
    }
    
    if (msg.type === 'tools_snapshot') {
      // 初始连接时收到的工具快照
      process.stderr.write(`[RemoteBridge] Received tools snapshot: ${msg.tools.length} tools\n`);
      this.toolRegistry.clear();
      for (const tool of msg.tools) {
        const tabId = tool.tabId;
        if (!this.toolRegistry.has(tabId)) {
          this.toolRegistry.set(tabId, []);
        }
        this.toolRegistry.get(tabId).push(tool);
      }
      this._emit('tools_updated');
      return;
    }
    
    // 响应待处理请求
    const pending = this._pendingRequests.get(msg.id);
    if (!pending) return;
    this._pendingRequests.delete(msg.id);
    
    if (msg.type === 'call_tool_result') {
      pending.resolve(msg.result);
    } else if (msg.type === 'call_tool_error') {
      pending.reject(new Error(msg.error));
    } else if (msg.type === 'get_active_tab_result') {
      pending.resolve(msg.tabId);
    }
  }
  
  _send(msg) {
    if (!this.ws || this.ws.readyState !== 1) {
      throw new Error('Not connected to service');
    }
    this.ws.send(JSON.stringify(msg));
  }
  
  _request(msg, timeout = 10000) {
    const id = String(++this._requestCounter);
    return new Promise((resolve, reject) => {
      this._pendingRequests.set(id, { resolve, reject });
      this._send({ ...msg, id });
      setTimeout(() => {
        if (this._pendingRequests.has(id)) {
          this._pendingRequests.delete(id);
          reject(new Error(`Request "${msg.type}" timed out`));
        }
      }, timeout);
    });
  }
  
  getAllTools() {
    const all = [];
    for (const tools of this.toolRegistry.values()) {
      all.push(...tools);
    }
    return all;
  }
  
  async getActiveTabId() {
    return this._request({ type: 'get_active_tab' });
  }
  
  async callTool(tabId, toolName, args) {
    return this._request({ type: 'call_tool', tabId, toolName, args });
  }
  
  on(event, listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(listener);
  }
  
  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      const listeners = this._listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(wrapper);
        if (index > -1) listeners.splice(index, 1);
      }
    };
    this.on(event, wrapper);
  }
  
  _emit(event, ...args) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }
}

main().catch(err => {
  process.stderr.write(`[WebMCP Native Host] Fatal error: ${err.message}\n`);
  process.exit(1);
});
