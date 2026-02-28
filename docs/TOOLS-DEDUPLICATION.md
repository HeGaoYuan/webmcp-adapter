# 工具注册去重优化

## 问题背景

在优化前，每次 content script 调用 `register_tools` 都会无条件触发 `tools_updated` 消息，即使工具列表没有任何变化。这导致：

1. **频繁的无效通知**: 用户在页面上的每次点击都可能触发工具重新注册
2. **MCP 协议开销**: 每次 `tools_updated` 都会触发 `notifications/tools/list_changed`
3. **AI 客户端性能影响**: 客户端需要频繁重新查询工具列表

### 触发场景示例

- 用户在 163 邮箱页面点击任何按钮
- 页面 DOM 发生变化
- Content script 重新执行工具注册逻辑
- 即使工具列表完全相同，也会发送 `tools_updated`

## 解决方案

### 1. 工具列表比较

添加 `toolsAreEqual` 函数，深度比较两个工具列表：

```javascript
function toolsAreEqual(tools1, tools2) {
  if (tools1.length !== tools2.length) return false;

  // 按名称排序后比较（避免顺序不同导致误判）
  const sorted1 = [...tools1].sort((a, b) => a.name.localeCompare(b.name));
  const sorted2 = [...tools2].sort((a, b) => a.name.localeCompare(b.name));

  for (let i = 0; i < sorted1.length; i++) {
    const t1 = sorted1[i];
    const t2 = sorted2[i];

    // 比较关键字段
    if (t1.name !== t2.name ||
        t1.description !== t2.description ||
        JSON.stringify(t1.parameters) !== JSON.stringify(t2.parameters)) {
      return false;
    }
  }

  return true;
}
```

**特点**:
- 按名称排序后比较，避免顺序不同导致误判
- 比较工具的关键字段：name、description、parameters
- 使用 JSON.stringify 比较复杂的 parameters 对象

### 2. 条件触发通知

只在工具列表真正变化时才发送 `tools_updated`：

```javascript
if (msg.type === "register_tools") {
  const oldTools = toolRegistry.get(tabId);
  const newTools = msg.tools;

  // 检查工具列表是否真的变化了
  const hasChanged = !oldTools ||
                     oldTools.length !== newTools.length ||
                     !toolsAreEqual(oldTools, newTools);

  if (hasChanged) {
    toolRegistry.set(tabId, newTools);
    console.log(`[WebMCP] Tab ${tabId} registered ${newTools.length} tools (changed)`);
    sendToNative({ type: "tools_updated", tabId, tools: newTools });
  } else {
    console.log(`[WebMCP] Tab ${tabId} tools unchanged, skipping notification`);
  }

  // Badge 更新逻辑保持不变
  // ...
}
```

## 效果对比

### 优化前

```
[WebMCP] Tab 1069648863 registered 6 tools
[WebMCP] -> native: {type: "tools_updated", tabId: 1069648863, tools: [...]}
[MCP] ⚡ Event: tools_updated from bridge
[MCP] → Sending: notifications/tools/list_changed

[WebMCP] Tab 1069648863 registered 6 tools
[WebMCP] -> native: {type: "tools_updated", tabId: 1069648863, tools: [...]}
[MCP] ⚡ Event: tools_updated from bridge
[MCP] → Sending: notifications/tools/list_changed

[WebMCP] Tab 1069648863 registered 6 tools
[WebMCP] -> native: {type: "tools_updated", tabId: 1069648863, tools: [...]}
[MCP] ⚡ Event: tools_updated from bridge
[MCP] → Sending: notifications/tools/list_changed
```

**问题**: 相同的工具列表触发了 3 次通知

### 优化后

```
[WebMCP] Tab 1069648863 registered 6 tools (changed)
[WebMCP] -> native: {type: "tools_updated", tabId: 1069648863, tools: [...]}
[MCP] ⚡ Event: tools_updated from bridge
[MCP] → Sending: notifications/tools/list_changed

[WebMCP] Tab 1069648863 tools unchanged, skipping notification

[WebMCP] Tab 1069648863 tools unchanged, skipping notification
```

**改进**: 只在首次注册时触发通知，后续重复注册被过滤

## 性能提升

### 消息数量减少

假设用户在页面上进行 10 次操作，每次都触发工具注册：

| 指标 | 优化前 | 优化后 | 减少 |
|------|--------|--------|------|
| tools_updated 消息 | 10 | 1 | 90% |
| notifications/tools/list_changed | 10 | 1 | 90% |
| AI 客户端 list_tools 请求 | 10 | 1 | 90% |

### 计算开销

- **比较开销**: O(n log n) 排序 + O(n) 比较
- **典型工具数量**: 6-10 个
- **实际耗时**: < 1ms（可忽略不计）
- **节省的网络开销**: 远大于比较开销

## 边界情况处理

### 1. 首次注册

```javascript
const oldTools = toolRegistry.get(tabId);  // undefined
const hasChanged = !oldTools || ...;       // true
```

✅ **正确**: 首次注册会触发通知

### 2. 工具清空

```javascript
oldTools = [tool1, tool2]
newTools = []
hasChanged = oldTools.length !== newTools.length  // true
```

✅ **正确**: 清空工具会触发通知

### 3. 工具增加

```javascript
oldTools = [tool1, tool2]
newTools = [tool1, tool2, tool3]
hasChanged = oldTools.length !== newTools.length  // true
```

✅ **正确**: 增加工具会触发通知

### 4. 工具顺序变化

```javascript
oldTools = [toolA, toolB, toolC]
newTools = [toolC, toolB, toolA]
// 排序后比较，内容相同
hasChanged = !toolsAreEqual(oldTools, newTools)  // false
```

✅ **正确**: 仅顺序不同不会触发通知

### 5. 参数变化

```javascript
oldTools = [{ name: "search", parameters: { type: "object", properties: { q: {...} } } }]
newTools = [{ name: "search", parameters: { type: "object", properties: { q: {...}, limit: {...} } } }]
// JSON.stringify 比较会检测到差异
hasChanged = !toolsAreEqual(oldTools, newTools)  // true
```

✅ **正确**: 参数变化会触发通知

## 测试方法

### 1. 手动测试

在 Chrome 扩展的 Service Worker 控制台中观察日志：

1. 打开 163 邮箱页面
2. 观察首次工具注册：应该显示 "registered X tools (changed)"
3. 在页面上点击几次
4. 观察后续注册：应该显示 "tools unchanged, skipping notification"

### 2. 程序化测试

在页面控制台执行：

```javascript
// 第一次注册
chrome.runtime.sendMessage({
  type: "register_tools",
  tools: [
    { name: "search", description: "搜索", parameters: {} },
    { name: "open", description: "打开", parameters: {} }
  ]
});

// 第二次注册（相同内容）
chrome.runtime.sendMessage({
  type: "register_tools",
  tools: [
    { name: "search", description: "搜索", parameters: {} },
    { name: "open", description: "打开", parameters: {} }
  ]
});

// 第三次注册（不同顺序）
chrome.runtime.sendMessage({
  type: "register_tools",
  tools: [
    { name: "open", description: "打开", parameters: {} },
    { name: "search", description: "搜索", parameters: {} }
  ]
});
```

**预期结果**:
- 第一次: "registered 2 tools (changed)"
- 第二次: "tools unchanged, skipping notification"
- 第三次: "tools unchanged, skipping notification"

## 相关文件

- [extension/background/service-worker.js](../extension/background/service-worker.js) - 实现去重逻辑
- [native-host/mcp-server.js](../native-host/mcp-server.js) - 接收 tools_updated 事件
- [docs/MCP-LOGGING.md](./MCP-LOGGING.md) - 查看日志输出

## 注意事项

1. **Badge 更新不受影响**: 即使工具列表未变化，badge 仍会更新（用户体验需要）
2. **首次连接同步**: WebSocket 重连后会同步所有工具，这是必要的
3. **Tab 关闭清理**: Tab 关闭时仍会发送空工具列表通知（清理必要）

## 未来优化方向

1. **批量更新**: 多个 tab 同时更新时，可以批量发送通知
2. **防抖动**: 短时间内多次注册可以合并为一次
3. **增量更新**: 只发送变化的工具，而不是整个列表

但目前的实现已经能够解决 90% 的重复通知问题，性能提升显著。