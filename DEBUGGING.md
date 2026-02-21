# WebMCP Adapter 调试指南

## 问题诊断

你遇到的问题是：Chrome扩展的Service Worker能连接到native host，但连接立即断开，导致工具调用超时。

### 根本原因

从日志分析，问题是：
1. Service Worker不断重连WebSocket
2. 每次新连接会触发bridge.js关闭旧连接
3. 形成无限重连循环

### 已修复的问题

1. **防止重复连接**：在Service Worker中添加了`isConnecting`标志
2. **改进错误处理**：添加了详细的日志和错误信息
3. **优化连接管理**：不主动关闭旧连接，让其自然超时

## 调试步骤

### 1. 清理环境

```bash
# 停止所有残留进程
pkill -f 'node.*webmcp-adapter/native-host/index.js'

# 运行诊断脚本
./diagnose.sh
```

### 2. 重新加载Chrome扩展

1. 打开 `chrome://extensions`
2. 找到 WebMCP Adapter
3. 点击"重新加载"按钮
4. 点击"Service Worker"查看日志

### 3. 重启Claude Desktop

1. 完全退出Claude Desktop（确保进程结束）
2. 重新启动Claude Desktop
3. 等待MCP server启动（约5-10秒）

### 4. 测试连接

打开 `test-connection.html` 在浏览器中测试WebSocket连接：

```bash
open test-connection.html
```

这个页面会：
- 自动连接到 ws://localhost:3711
- 显示连接状态
- 允许发送测试消息
- 显示详细日志

### 5. 查看日志

#### Native Host日志（Claude Desktop启动的）
```bash
tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log
```

#### 手动启动native host（用于调试）
```bash
node native-host/index.js
```

这会在终端显示所有日志，包括：
- `[WebMCP]` - 主进程日志
- `[Bridge]` - WebSocket bridge日志
- `[MCP]` - MCP server日志

### 6. 测试工具调用

在Claude Desktop中尝试：
```
请列出可用的工具
```

或者：
```
搜索我的邮件
```

## 常见问题

### Q: Service Worker不断重连

**症状**：日志显示 `Extension connected` → `Extension disconnected` 循环

**原因**：
- Service Worker被Chrome挂起后重启
- 多个Service Worker实例同时运行
- WebSocket连接被意外关闭

**解决**：
1. 重新加载扩展
2. 检查是否有多个扩展实例
3. 查看Service Worker日志中的错误信息

### Q: 工具调用超时

**症状**：Claude Desktop显示工具调用超时

**原因**：
- Native host未运行
- WebSocket连接不稳定
- 工具注册失败

**解决**：
1. 确认native host正在运行：`ps aux | grep "node.*index.js"`
2. 检查端口3711是否可用：`lsof -i :3711`
3. 查看native host日志

### Q: 工具列表为空

**症状**：Claude Desktop看不到任何工具

**原因**：
- 没有打开支持的网站（Gmail或163mail）
- Adapter未注入
- 工具注册失败

**解决**：
1. 打开 mail.google.com 或 mail.163.com
2. 检查Service Worker日志，确认adapter已注入
3. 刷新页面

## 手动测试流程

### 测试1：WebSocket连接

```bash
# 终端1：启动native host
node native-host/index.js

# 终端2：测试连接
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3711');
ws.on('open', () => {
  console.log('Connected');
  ws.send(JSON.stringify({type: 'tools_updated', tabId: 123, tools: []}));
});
ws.on('message', (data) => console.log('Received:', data.toString()));
ws.on('close', () => console.log('Disconnected'));
ws.on('error', (err) => console.error('Error:', err.message));
"
```

### 测试2：MCP工具列表

在Claude Desktop中：
```
请使用list_tools查看可用工具
```

### 测试3：工具调用

1. 打开Gmail
2. 在Claude Desktop中：
```
搜索包含"invoice"的邮件
```

## 性能优化

如果连接稳定但性能不佳：

1. **减少日志输出**：注释掉详细日志
2. **调整keepAlive间隔**：修改Service Worker中的`periodInMinutes`
3. **优化工具注册**：减少不必要的`tools_updated`消息

## 获取帮助

如果问题仍然存在：

1. 收集完整日志：
   ```bash
   # Native host日志
   cat ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log > debug.log
   
   # Service Worker日志（从Chrome DevTools复制）
   ```

2. 检查环境：
   ```bash
   node --version
   npm list
   ```

3. 提供详细的错误信息和重现步骤
