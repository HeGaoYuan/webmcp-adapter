# Domain-Based 架构说明

## 概述

WebMCP Adapter 使用 **domain-based（域名为基础）** 的工具注册和调用架构，而不是 tab-based（标签页为基础）。

## 核心原则

### 1. 工具与域名绑定，而非Tab

- 工具属于域名（如 `mail.163.com`），不属于特定的 tab
- 同一域名的多个 tab 共享同一套工具
- 只有当域名的所有 tab 都关闭时，才清理该域名的工具

### 2. 工具调用时动态查找Tab

- 调用工具时，不需要指定 tabId
- 扩展会自动遍历所有 tab，找到匹配域名的 tab
- 优先使用最新创建的 tab（按 tab.id 倒序）

### 3. 跨Chrome窗口支持

- 支持同一 Chrome profile 下的多个窗口
- `chrome.tabs.query({})` 返回所有窗口的 tab
- **限制**：不支持跨 Chrome profile（每个 profile 有独立的扩展实例）

## 数据结构

### Extension (service-worker.js)

```javascript
// 工具注册表：domain -> { tools, tabIds }
const toolRegistry = new Map();
// 示例：
// "mail.163.com" -> {
//   tools: [{ name: "mcp__webmcp-adapter__mail_163_com_search_emails", ... }],
//   tabIds: Set([123, 456, 789])  // 该域名的所有tab
// }

// Tab到域名的映射：tabId -> domain
const tabDomainMap = new Map();
// 示例：
// 123 -> "mail.163.com"
// 456 -> "mail.163.com"
```

### Native Host (bridge.js / index.js)

```javascript
// 工具注册表：domain -> { tools, tabCount }
this.toolRegistry = new Map();
// 示例：
// "mail.163.com" -> {
//   tools: [{ name: "mcp__webmcp-adapter__mail_163_com_search_emails", ... }],
//   tabCount: 3
// }
```

## 工作流程

### 工具注册流程

1. **Content Script** 注册工具时，发送 `register_tools` 消息
2. **Service Worker** 接收消息：
   - 从 `sender.tab.url` 提取域名
   - 检查该域名的工具是否变化（使用 `toolsAreEqual`）
   - 如果变化，更新 `toolRegistry` 并通知 native-host
   - 记录 tab 到域名的映射
3. **Native Host** 接收 `tools_updated` 消息：
   - 更新本地的 `toolRegistry`
   - 触发 `tools_updated` 事件
   - MCP Server 发送 `notifications/tools/list_changed` 给客户端

### 工具调用流程

1. **MCP Client** 调用工具（如 `mcp__webmcp-adapter__mail_163_com_search_emails`）
2. **MCP Server** 接收 `call_tool` 请求：
   - 不再获取 active tab
   - 直接调用 `bridge.callTool(toolName, args)`
3. **Bridge** 转发请求给扩展：
   - 发送 `{ type: "call_tool", toolName, args }`
4. **Service Worker** 处理请求：
   - 从工具名提取域名（`extractDomainFromToolName`）
   - 查找匹配域名的 tab（`findTabByDomain`）
   - 如果找不到，返回错误提示使用 `open_browser`
   - 如果找到，调用 `callToolInTab(tabId, toolName, args)`
5. **Content Script** 执行工具并返回结果

### Tab关闭清理流程

1. **Chrome** 触发 `chrome.tabs.onRemoved` 事件
2. **Service Worker** 处理：
   - 从 `tabDomainMap` 获取该 tab 的域名
   - 从域名的 `tabIds` 集合中移除该 tab
   - 如果 `tabIds.size === 0`，清除该域名的工具
   - 通知 native-host：`{ type: "tools_updated", domain, tools: [], tabCount: 0 }`
3. **Native Host** 更新 `toolRegistry`，删除该域名

## 域名提取规则

### 从工具名提取域名

工具名格式：`<domain>.<action>`

示例：
- `mail.163.com.search_emails` → `mail.163.com`
- `mail.google.com.compose` → `mail.google.com`

实现：
```javascript
function extractDomainFromToolName(toolName) {
  // 找到最后一个点的位置，之前的部分是域名
  const lastDotIndex = toolName.lastIndexOf('.');
  if (lastDotIndex === -1) return null;
  return toolName.substring(0, lastDotIndex);
}
```

### 从URL提取域名

```javascript
const domain = new URL(tabUrl).hostname;
// "https://mail.163.com/..." → "mail.163.com"
```

## Tab查找策略

```javascript
async function findTabByDomain(domain) {
  const domainData = toolRegistry.get(domain);
  if (!domainData || domainData.tabIds.size === 0) {
    return null;
  }

  // 获取所有tab，按id倒序（id越大越新）
  const tabs = await chrome.tabs.query({});
  const sortedTabs = tabs.sort((a, b) => b.id - a.id);

  // 找到第一个匹配域名的tab
  for (const tab of sortedTabs) {
    if (domainData.tabIds.has(tab.id)) {
      // 激活该tab，让用户能看到操作过程
      await chrome.tabs.update(tab.id, { active: true });
      // 激活该tab所在的窗口
      await chrome.windows.update(tab.windowId, { focused: true });

      return tab.id;
    }
  }

  return null;
}
```

**特点**：
- 按 tab.id 倒序遍历（最新的优先）
- 只返回已注册工具的 tab
- 跨所有 Chrome 窗口查找（同一 profile）
- **自动激活找到的 tab**：让用户能看到操作过程
- **自动聚焦窗口**：如果 tab 在其他窗口，会自动切换到该窗口

## 错误处理

### 找不到匹配域名的Tab

```
Error: 未找到域名 "mail.163.com" 的标签页。请先使用 open_browser 工具打开 https://mail.163.com
```

**原因**：
- 该域名的所有 tab 都已关闭
- 或者 tab 还未完成工具注册

**解决方案**：
- 使用 `open_browser` 工具打开对应网站
- 等待页面加载完成，工具会自动注册

## 优势

### 1. 用户体验更好

- 不需要关心哪个 tab 是活跃的
- 可以在任意窗口操作，扩展会自动找到正确的 tab
- 多个 tab 打开同一网站时，自动使用最新的

### 2. 架构更清晰

- 工具与域名的关系更直观
- 不需要维护复杂的 tab 状态
- 清理逻辑更简单（只在所有 tab 关闭时清理）

### 3. 性能更好

- 工具去重更彻底（同一域名只注册一次）
- 减少不必要的 `tools_updated` 通知
- Tab 切换不会触发工具列表变化

## 限制

### 1. Chrome Profile 隔离

- 每个 Chrome profile 有独立的扩展实例
- Profile A 看不到 Profile B 的 tab
- 如果需要跨 profile 支持，需要完全不同的架构

### 2. 域名提取依赖工具命名规范

- 工具名必须遵循 `<domain>.<action>` 格式
- 域名和操作之间用 `.` 分隔
- 如果工具名不符合规范，无法提取域名

## 相关文件

- [extension/background/service-worker.js](../extension/background/service-worker.js) - 扩展端实现
- [native-host/bridge.js](../native-host/bridge.js) - WebSocketBridge 实现
- [native-host/index.js](../native-host/index.js) - WebSocketClient 实现
- [native-host/mcp-server.js](../native-host/mcp-server.js) - MCP Server 实现
- [docs/TOOLS-DEDUPLICATION.md](./TOOLS-DEDUPLICATION.md) - 工具去重优化

## 迁移说明

从 tab-based 迁移到 domain-based 的主要变化：

1. **工具注册表结构变化**：
   - 旧：`Map<tabId, tools[]>`
   - 新：`Map<domain, {tools, tabIds}>`

2. **工具调用不再需要 tabId**：
   - 旧：`callTool(tabId, toolName, args)`
   - 新：`callTool(toolName, args)`

3. **清理逻辑变化**：
   - 旧：tab 关闭立即清理
   - 新：域名的所有 tab 关闭才清理

4. **错误提示变化**：
   - 旧：提示切换到正确的 tab
   - 新：提示使用 `open_browser` 打开网站
