# 解决方案：确保 Claude Desktop 能看到工具

## 问题原因

从日志分析，问题是时序问题：
1. Claude Desktop 启动并请求工具列表
2. MCP server 等待工具注册（最多15秒）
3. 但工具注册需要时间（打开网站 → 注入adapter → 注册工具）
4. 如果15秒内工具未注册，返回空列表

## 最佳解决方案

### 方法1：先开网站，后启动Claude（推荐）

这是最可靠的方法：

1. **打开Chrome并加载网站**
   ```
   在Chrome中打开：
   - Gmail: https://mail.google.com
   - 或 163邮箱: https://mail.163.com
   ```

2. **等待页面完全加载**（约5-10秒）

3. **验证工具已注册**
   - 打开 `chrome://extensions`
   - 找到 WebMCP Adapter
   - 点击 "Service Worker"
   - 确认看到：`[WebMCP] Tab XXXXX registered X tools`

4. **启动Claude Desktop**
   - 如果已经运行，完全退出（Command+Q）
   - 重新启动

5. **测试**
   ```
   请列出可用的工具
   ```

### 方法2：使用15秒等待时间

如果你想先启动Claude Desktop：

1. **启动Claude Desktop**

2. **在15秒内打开网站**
   - 快速在Chrome中打开 Gmail 或 163mail
   - 等待页面加载

3. **Claude Desktop会自动检测到工具**
   - MCP server 每秒检查一次
   - 一旦检测到工具，立即返回

4. **如果超过15秒**
   - 返回空列表
   - 需要重新发起对话或重启Claude Desktop

## 当前配置

已将等待时间设置为15秒，并添加了：
- 每秒检查工具是否注册
- 详细的等待进度日志
- 友好的提示信息

## 验证步骤

### 1. 查看MCP server日志

```bash
tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log
```

成功的日志应该是：
```
[MCP] Tool list empty, waiting up to 15s for tools to register...
[MCP] Tip: Open Gmail or 163mail in Chrome to register tools
[MCP] Still waiting... (1s elapsed)
[MCP] Still waiting... (2s elapsed)
[Bridge] Extension connected
[Bridge] Registered 2 tools for tab 1069644367
[MCP] Tools registered! Found 2 tools after 3s
[MCP] Returning 2 tools
```

失败的日志：
```
[MCP] Tool list empty, waiting up to 15s for tools to register...
[MCP] Still waiting... (1s elapsed)
...
[MCP] Still waiting... (15s elapsed)
[MCP] Wait timeout after 15s, returning empty tool list
[MCP] Make sure you have Gmail or 163mail open in Chrome
[MCP] Returning 0 tools
```

### 2. 查看Service Worker日志

在 `chrome://extensions` → WebMCP Adapter → Service Worker：

成功：
```
[WebMCP] Connected to native host
[WebMCP] Tab 1069644367 registered 2 tools: ['search_emails', 'get_unread_emails']
```

失败：
```
[WebMCP] Native host disconnected, reconnecting in 1s...
```
或没有 "registered X tools" 的消息

## 故障排除

### Q: 等待15秒后仍然返回空列表

**检查：**
1. Chrome中是否打开了Gmail或163mail？
2. 网站是否完全加载？
3. Service Worker是否显示工具已注册？

**解决：**
- 刷新网站
- 重新加载Chrome扩展
- 查看Service Worker日志中的错误

### Q: Service Worker显示工具已注册，但Claude Desktop看不到

**原因：** 工具注册晚于Claude Desktop的请求

**解决：**
1. 重启Claude Desktop
2. 或者在Claude Desktop中发起新对话
3. 确保下次先打开网站再启动Claude Desktop

### Q: 工具列表显示但调用超时

**原因：** WebSocket连接不稳定

**解决：**
1. 查看Service Worker日志，确认连接稳定
2. 检查是否有防火墙阻止localhost:3711
3. 重新加载扩展

## 自动化脚本

使用准备脚本确保一切就绪：

```bash
./prepare-tools.sh
```

这个脚本会：
- 检查Chrome是否运行
- 提示打开网站
- 验证工具已注册
- 确认可以启动Claude Desktop

## 长期改进建议

1. **预加载工具定义**
   - 在MCP server启动时，加载静态工具定义
   - 即使网站未打开，也能显示工具（标记为"需要打开网站"）

2. **改进Claude Desktop集成**
   - 让Claude Desktop在收到`list_changed`通知后自动重新请求
   - 或者提供手动刷新工具列表的按钮

3. **优化工具注册速度**
   - 减少adapter注入延迟
   - 使用持久化存储缓存工具定义

## 总结

最可靠的使用流程：
1. 打开Chrome
2. 打开Gmail或163mail
3. 等待页面加载（5-10秒）
4. 启动Claude Desktop
5. 测试工具

如果已经启动了Claude Desktop：
1. 快速打开网站（15秒内）
2. 等待MCP server检测到工具
3. 如果超时，重启Claude Desktop
