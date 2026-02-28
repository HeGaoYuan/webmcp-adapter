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
          name: tool.name,  // 不添加tabId后缀
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

      // 处理网站工具：由扩展自动查找匹配域名的tab
      try {
        // 调用工具（扩展会自动查找匹配域名的tab）
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
