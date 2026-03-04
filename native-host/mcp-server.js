/**
 * MCP Server
 *
 * 实现 Model Context Protocol (MCP) 的 stdio transport
 * 对接 Claude Desktop / Cline / Cursor 等支持 MCP 的 AI 客户端
 *
 * 工具列表动态来自 NativeMessagingBridge（即浏览器扩展中注册的工具）
 * 工具调用通过 Bridge 转发给浏览器扩展执行
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

export class McpServer {
  /**
   * @param {import('./bridge.js').NativeMessagingBridge} bridge
   * @param {import('./logger.js').DualLogger} logger
   */
  constructor(bridge, logger = null) {
    this.bridge = bridge;
    this.logger = logger;
    this._isConnected = false;

    this.server = new Server(
      {
        name: "webmcp-adapter",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {
            listChanged: true,  // 声明支持工具列表变更通知
          },
        },
      }
    );

    this._setupHandlers();
  }

  _log(message) {
    if (this.logger) {
      this.logger.log(message);
    } else {
      process.stderr.write(`[MCP] ${message}\n`);
    }
  }

  _setupHandlers() {
    // ── list_tools ─────────────────────────────────────────────────────────
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this._log("← Received: list_tools request");

      const tools = this.bridge.getAllTools();

      // 添加系统级工具（浏览器控制）
      const systemTools = [
        {
          name: "open_browser",
          description: "打开Chrome浏览器并访问指定网址。如果Chrome已打开，会在新标签页中打开。",
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "要访问的完整URL，例如 https://mail.163.com 或 https://mail.google.com"
              }
            },
            required: ["url"]
          }
        },
        {
          name: "capture_screenshot",
          description: "对当前浏览器标签页进行截图，返回高清JPEG图片（最大1200x800，<800KB）。截取页面中心区域，保持原始清晰度，不压缩画质。符合Claude Code的图片大小限制。",
          inputSchema: {
            type: "object",
            properties: {
              fullPage: {
                type: "boolean",
                description: "是否截取整个页面（包括滚动区域），默认false只截取可见区域"
              }
            },
            required: []
          }
        }
      ];

      // 去重：相同名称的工具只保留一个（使用最新注册的）
      const uniqueTools = new Map();
      for (const tool of tools) {
        uniqueTools.set(tool.name, tool);
      }

      const allTools = [
        ...systemTools,
        ...Array.from(uniqueTools.values()).map(tool => ({
          name: tool.name,  // 保持原始工具名（带点号）
          description: tool.description,
          inputSchema: tool.parameters ?? { type: "object", properties: {} },
        }))
      ];

      this._log(`→ Response: ${allTools.length} tools (${systemTools.length} system + ${uniqueTools.size} web)`);
      if (uniqueTools.size > 0) {
        this._log(`  Web tools: ${Array.from(uniqueTools.keys()).join(", ")}`);
      }

      return {
        tools: allTools,
      };
    });

    // ── call_tool ──────────────────────────────────────────────────────────
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name: toolName, arguments: args } = request.params;

      this._log(`← Received: call_tool request`);
      this._log(`  Tool: ${toolName}`);
      this._log(`  Args: ${JSON.stringify(args)}`);

      // 处理系统级工具
      if (toolName === "open_browser") {
        try {
          this._log(`  Executing system tool: open_browser`);
          const result = await this.bridge.openBrowser(args.url);
          const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
          this._log(`→ Response: Success`);
          return {
            content: [{ type: "text", text }],
          };
        } catch (err) {
          this._log(`→ Response: Error - ${err.message}`);
          return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
          };
        }
      }

      if (toolName === "capture_screenshot") {
        try {
          this._log(`  Executing system tool: capture_screenshot`);
          const result = await this.bridge.captureScreenshot(args.fullPage ?? false);

          // 清理 base64 数据：移除所有空白字符（换行、空格等）
          const cleanBase64 = result.data.replace(/\s/g, '');

          this._log(`→ Response: Success (screenshot captured, original length: ${result.data?.length || 0}, cleaned length: ${cleanBase64.length})`);

          // 验证 base64 字符串
          const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
          if (!base64Regex.test(cleanBase64)) {
            this._log(`  WARNING: Base64 validation failed! First 100 chars: ${cleanBase64.substring(0, 100)}`);
            this._log(`  Last 100 chars: ${cleanBase64.substring(cleanBase64.length - 100)}`);
          }

          // 计算图片大小（KB）
          const sizeKB = Math.round(cleanBase64.length * 0.75 / 1024);

          // MCP 协议：同时返回文本说明和图片数据
          return {
            content: [
              {
                type: "text",
                text: `Screenshot captured successfully (${sizeKB}KB JPEG, ${args.fullPage ? 'full page' : 'visible area'})`
              },
              {
                type: "image",
                data: cleanBase64,
                mimeType: "image/jpeg"
              }
            ],
          };
        } catch (err) {
          this._log(`→ Response: Error - ${err.message}`);
          return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
          };
        }
      }

      // 处理网站工具：由扩展自动查找匹配域名的tab
      try {
        // 直接使用工具名调用（保持点号格式）
        this._log(`  Calling tool "${toolName}"...`);
        const result = await this.bridge.callTool(toolName, args ?? {});

        const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
        this._log(`→ Response: Success (${text.length} chars)`);

        return {
          content: [{ type: "text", text }],
        };
      } catch (err) {
        this._log(`→ Response: Error - ${err.message}`);
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    });

    // 工具列表更新时通知 Claude Desktop 重新查询
    this.bridge.on("tools_updated", async () => {
      this._log("⚡ Event: tools_updated from bridge");

      // 等待一小段时间确保 MCP 连接已建立
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        if (this._isConnected) {
          this._log("→ Sending: notifications/tools/list_changed");
          await this.server.notification({
            method: "notifications/tools/list_changed",
            params: {},
          });
          this._log("  Notification sent successfully");
        } else {
          this._log("  Skipped: MCP not connected yet");
        }
      } catch (err) {
        // 客户端可能尚未连接，忽略
        this._log(`  Failed to send notification: ${err.message}`);
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this._isConnected = true;
    this._log("✓ MCP Server connected and ready");
  }
}
