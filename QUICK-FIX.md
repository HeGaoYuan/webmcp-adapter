# 快速修复指南

## 当前问题

Claude Desktop无法看到MCP工具，因为第一次请求工具列表时超时了。

## 已修复

1. 减少等待时间从25秒到3秒，避免Claude Desktop超时
2. 添加详细日志帮助调试
3. 改进工具列表响应逻辑

## 立即操作步骤

### 1. 重启服务

```bash
# 停止所有native host进程
pkill -f 'node.*webmcp-adapter/native-host/index.js'

# 完全退出Claude Desktop（Command+Q）
# 然后重新启动Claude Desktop
```

### 2. 打开支持的网站

在Chrome中打开以下任一网站：
- Gmail: https://mail.google.com
- 163邮箱: https://mail.163.com

### 3. 等待工具注册

打开网站后，等待约5秒，让扩展注入adapter并注册工具。

### 4. 在Claude Desktop中测试

尝试以下命令：

```
请列出可用的工具
```

或者直接使用工具：

```
搜索我的邮件中包含"发票"的内容
```

## 验证步骤

### 检查Service Worker状态

1. 打开 `chrome://extensions`
2. 找到 WebMCP Adapter
3. 点击 "Service Worker" 查看日志
4. 应该看到类似：
   ```
   [WebMCP] Connected to native host
   [WebMCP] Tab 123456 registered 2 tools: ['search_emails', 'get_unread_emails']
   ```

### 检查Native Host日志

```bash
tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log
```

应该看到：
```
[Bridge] Extension connected
[Bridge] Registered 2 tools for tab 1069644334
[MCP] Tool registry updated, sending list_changed notification
[MCP] Returning 2 tools
```

### 测试MCP连接（可选）

```bash
node test-mcp.js
```

这会启动一个测试客户端，验证MCP server是否正常工作。

## 常见问题

### Q: Claude Desktop仍然看不到工具

**检查清单：**

1. ✓ Native host正在运行
   ```bash
   ps aux | grep "node.*index.js" | grep webmcp
   ```

2. ✓ Chrome扩展已加载并激活
   ```bash
   # 在 chrome://extensions 中检查
   ```

3. ✓ 已打开Gmail或163mail
   ```bash
   # 确保网站完全加载
   ```

4. ✓ Service Worker已连接
   ```bash
   # 在Service Worker日志中查看 "Connected to native host"
   ```

5. ✓ 工具已注册
   ```bash
   # 在Service Worker日志中查看 "registered X tools"
   ```

### Q: 工具列表为空

**原因：** 没有打开支持的网站

**解决：** 
1. 打开 mail.google.com 或 mail.163.com
2. 等待页面完全加载
3. 刷新Claude Desktop（重新发起对话）

### Q: 连接不稳定

**症状：** Service Worker日志显示频繁断开重连

**解决：**
1. 重新加载Chrome扩展
2. 检查是否有防火墙阻止localhost:3711
3. 查看native host日志中的错误信息

## 调试命令

```bash
# 查看最新日志
tail -50 ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log

# 实时监控日志
tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log

# 检查端口占用
lsof -i :3711

# 手动启动native host（用于调试）
node native-host/index.js

# 测试WebSocket连接
open test-connection.html
```

## 成功标志

当一切正常时，你应该看到：

1. **Service Worker日志：**
   ```
   [WebMCP] Connected to native host
   [WebMCP] Tab 123456 registered 2 tools
   ```

2. **Native Host日志：**
   ```
   [Bridge] Extension connected
   [Bridge] Registered 2 tools for tab 123456
   [MCP] Returning 2 tools
   ```

3. **Claude Desktop：**
   - 能看到工具列表
   - 工具调用不再超时
   - 能成功执行邮件搜索等操作

## 下一步

如果问题仍然存在，请：

1. 收集完整日志
2. 运行 `./diagnose.sh`
3. 提供详细的错误信息
