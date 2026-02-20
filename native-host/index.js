#!/usr/bin/env node
/**
 * Native Host 入口
 *
 * 同时扮演两个角色：
 * 1. MCP Server（通过 stdio 与 AI 客户端通信）
 * 2. Chrome Native Messaging 接收端（通过 stdin/stdout 与浏览器扩展通信）
 *
 * 由于 MCP 协议和 Native Messaging 协议都使用 stdin/stdout，
 * 我们通过 "握手消息" 来区分当前是被哪个端启动的：
 *   - 被 Claude Desktop 启动 → stdin 来的是 JSON-RPC MCP 消息
 *   - 被 Chrome 扩展启动    → stdin 来的是 Native Messaging 消息（4字节长度前缀）
 *
 * 实际上，我们把这两个职责分成两个模式：
 *   - 默认启动（node index.js）→ MCP Server 模式（stdio transport）
 *     在 MCP 模式下，通过 Native Messaging 协议连接到扩展
 *
 * 架构：
 *   Claude Desktop --[stdio MCP]--> index.js --[Native Messaging]--> Chrome Extension
 *
 * 注意：Chrome Native Messaging 要求 native host 由浏览器扩展启动，
 * 但 MCP 需要 host 先跑起来等待连接。
 * 解决方案：index.js 作为 MCP Server 运行，同时主动通过 chrome-native-messaging
 * 进行双向通信（用一个独立子进程或持久连接）。
 *
 * 简化实现：
 * index.js 作为 MCP Server（stdio）+ Native Messaging HOST（被扩展连接）
 * 两者通过内部 EventEmitter 连接。
 */

import { McpServer } from "./mcp-server.js";
import { NativeMessagingBridge } from "./bridge.js";

async function main() {
  // 1. 启动 Native Messaging Bridge（监听来自 Chrome 扩展的消息）
  const bridge = new NativeMessagingBridge();

  // 2. 启动 MCP Server（通过 stdio 与 AI 客户端通信）
  const mcpServer = new McpServer(bridge);
  await mcpServer.start();
}

main().catch(err => {
  process.stderr.write(`[WebMCP Native Host] Fatal error: ${err.message}\n`);
  process.exit(1);
});
