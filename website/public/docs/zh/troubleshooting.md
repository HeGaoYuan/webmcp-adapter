# 故障排除

诊断和修复常见问题。

## 快速诊断

先运行这个命令——它会一次性检查所有组件：

```bash
./test-system.sh
```

或手动检查服务状态：

```bash
./start-service.sh status
./start-service.sh logs -f   # 实时查看日志
```

---

## 问题：服务无法启动 — "Port 3711 is already in use"

另一个进程占用了 3711 端口（可能是之前的服务实例）。

```bash
# 找到并杀死占用进程
lsof -ti :3711 | xargs kill -9

# 重新启动
./start-service.sh start
```

---

## 问题：Chrome 扩展显示 ERR\_CONNECTION\_REFUSED

扩展无法连接到 WebSocket 服务——服务未运行。

```bash
./start-service.sh start
./start-service.sh status
```

---

## 问题：Claude Desktop 中工具列表为空

Claude 看不到任何工具。按以下清单逐项排查：

1. **服务在运行吗？**
   ```bash
   ./start-service.sh status
   ```
2. **Chrome 中是否打开了支持的网站？** 只有在匹配的页面加载时工具才会出现。
3. **页面是否完全加载？** 等待 5-10 秒。
4. **扩展是否成功注册了工具？** 检查日志：
   ```bash
   ./start-service.sh logs | grep Registered
   # 应看到：[Bridge] Registered X tools for tab NNNNN
   ```
5. **Claude Desktop 是否在修改配置后重启了？** 需要完全退出（⌘Q）并重新启动。

---

## 问题：工具调用超时

Claude 调用工具，但请求挂起或返回超时错误。

在触发工具调用时查看实时日志：

```bash
./start-service.sh logs -f
```

同时检查 Claude Desktop 日志：

```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log
```

关注以下内容：
- WebSocket 服务是否收到了调用？（应该看到 `call_tool` 消息）
- Chrome 扩展是否有响应？（查找 `call_tool_result` 或 `call_tool_error`）
- 目标 Tab 是否仍然打开并在正确的页面？

---

## 问题：在网站内导航后工具消失

页面跳转后，adapter 会重新注入，这需要 2-3 秒。等待后重试工具调用。

如果扩展控制台显示导航后没有注册，说明新页面的主机名可能不匹配 adapter 的 `match` 列表。

---

## 问题：Claude Desktop 启动时无法连接

验证配置文件路径和内容：

```bash
# macOS
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

检查：
- `args` 中的路径是绝对路径（以 `/` 开头）
- 该路径下 `native-host/index.js` 存在：`ls /你的路径/native-host/index.js`
- JSON 格式正确（无多余逗号，无语法错误）

---

## 查看日志

| 日志来源 | 命令 |
|---|---|
| WebSocket 服务 | `./start-service.sh logs -f` |
| Chrome 扩展 | `chrome://extensions` → WebMCP Adapter → **Service Worker** |
| Claude Desktop MCP | `tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log` |

---

## 仍然解决不了？

在 [GitHub](https://github.com/HeGaoYuan/webmcp-adapter/issues) 提交 issue，附上：
- `./start-service.sh status` 的输出
- `./start-service.sh logs` 的相关片段
- Chrome 扩展 Service Worker 控制台输出
- 你的 `claude_desktop_config.json`（可脱敏路径中的敏感信息）
