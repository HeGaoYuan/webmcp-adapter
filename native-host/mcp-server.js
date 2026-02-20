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

      return {
        tools: tools.map(tool => ({
          name: this._qualifyToolName(tool.name, tool.tabId),
          description: tool.description,
          inputSchema: tool.parameters ?? { type: "object", properties: {} },
        })),
      };
    });

    // ── call_tool ──────────────────────────────────────────────────────────
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name: qualifiedName, arguments: args } = request.params;

      // 解析 tabId 和真实 toolName
      const { tabId, toolName } = this._parseQualifiedName(qualifiedName);

      // 如果没有指定 tabId，使用当前活跃 Tab
      const resolvedTabId = tabId ?? await this.bridge.getActiveTabId();

      if (resolvedTabId == null) {
        return {
          content: [{ type: "text", text: "Error: No browser tab found with WebMCP tools registered." }],
          isError: true,
        };
      }

      let result;
      try {
        result = await this.bridge.callTool(resolvedTabId, toolName, args ?? {});
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err.message}` }],
          isError: true,
        };
      }

      // 将结果序列化为 MCP 内容块
      const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      return {
        content: [{ type: "text", text }],
      };
    });

    // 工具列表更新时通知 Claude Desktop 重新查询
    this.bridge.on("tools_updated", async () => {
      process.stderr.write("[MCP] Tool registry updated, sending list_changed notification\n");
      try {
        await this.server.notification({
          method: "notifications/tools/list_changed",
          params: {},
        });
      } catch (err) {
        // 客户端可能尚未连接，忽略
        process.stderr.write(`[MCP] Failed to send list_changed: ${err.message}\n`);
      }
    });
  }

  /**
   * 把工具名加上 tabId 前缀，避免多个 Tab 同名工具冲突
   * 格式：toolName__tab123  (如果只有一个Tab注册了该工具，则不加前缀)
   */
  _qualifyToolName(toolName, tabId) {
    const allTools = this.bridge.getAllTools();
    const sameName = allTools.filter(t => t.name === toolName);
    if (sameName.length <= 1) {
      return toolName; // 不需要区分
    }
    return `${toolName}__tab${tabId}`;
  }

  /**
   * 解析带 tabId 后缀的工具名
   */
  _parseQualifiedName(qualifiedName) {
    const match = qualifiedName.match(/^(.+)__tab(\d+)$/);
    if (match) {
      return { toolName: match[1], tabId: Number(match[2]) };
    }

    // 没有后缀，找第一个匹配的工具
    const tool = this.bridge.getAllTools().find(t => t.name === qualifiedName);
    return { toolName: qualifiedName, tabId: tool?.tabId ?? null };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    process.stderr.write("[MCP] WebMCP Adapter MCP Server started (stdio)\n");
  }
}
