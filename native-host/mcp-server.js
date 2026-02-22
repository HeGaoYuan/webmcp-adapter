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
   */
  constructor(bridge) {
    this.bridge = bridge;
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

  _setupHandlers() {
    // ── list_tools ─────────────────────────────────────────────────────────
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.bridge.getAllTools();

      // 添加系统级工具（浏览器控制）
      const systemTools = [
        {
          name: "open_browser",
          description: "打开Chrome浏览器并访问指定网址。如果Chrome已打开，会在新标签页中打开。支持的网站：mail.163.com, mail.google.com",
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

      process.stderr.write(`[MCP] Returning ${allTools.length} tools (${systemTools.length} system + ${uniqueTools.size} web)\n`);

      return {
        tools: allTools,
      };
    });

    // ── call_tool ──────────────────────────────────────────────────────────
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name: toolName, arguments: args } = request.params;

      // 处理系统级工具
      if (toolName === "open_browser") {
        try {
          const result = await this.bridge.openBrowser(args.url);
          const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
          return {
            content: [{ type: "text", text }],
          };
        } catch (err) {
          return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
          };
        }
      }

      // 处理网站工具：自动使用活跃tab
      try {
        // 获取当前活跃的tab
        const activeTabId = await this.bridge.getActiveTabId();
        
        if (activeTabId == null) {
          return {
            content: [{ 
              type: "text", 
              text: "Error: 没有找到活跃的浏览器标签页。请确保Chrome已打开并且有邮箱页面。" 
            }],
            isError: true,
          };
        }

        // 检查活跃tab是否有工具注册
        const allTools = this.bridge.getAllTools();
        const tabTools = allTools.filter(t => t.tabId === activeTabId);
        const hasTool = tabTools.some(t => t.name === toolName);
        
        if (!hasTool) {
          return {
            content: [{ 
              type: "text", 
              text: `Error: 当前页面不支持 "${toolName}" 操作。请确保当前标签页是邮箱页面（163mail或Gmail）。` 
            }],
            isError: true,
          };
        }

        // 调用工具
        process.stderr.write(`[MCP] Calling tool "${toolName}" on active tab ${activeTabId}\n`);
        const result = await this.bridge.callTool(activeTabId, toolName, args ?? {});
        
        const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
        return {
          content: [{ type: "text", text }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    });

    // 工具列表更新时通知 Claude Desktop 重新查询
    this.bridge.on("tools_updated", async () => {
      process.stderr.write("[MCP] Tool registry updated, sending list_changed notification\n");
      
      // 等待一小段时间确保 MCP 连接已建立
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        if (this._isConnected) {
          await this.server.notification({
            method: "notifications/tools/list_changed",
            params: {},
          });
        } else {
          process.stderr.write("[MCP] Skipping list_changed: MCP not connected yet\n");
        }
      } catch (err) {
        // 客户端可能尚未连接，忽略
        process.stderr.write(`[MCP] Failed to send list_changed: ${err.message}\n`);
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this._isConnected = true;
    process.stderr.write("[MCP] WebMCP Adapter MCP Server started (stdio)\n");
  }
}
