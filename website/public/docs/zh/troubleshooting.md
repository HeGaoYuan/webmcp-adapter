# 故障排除

常见问题的诊断与修复。

## 快速诊断

检查服务是否在运行：

```bash
lsof -i :3711   # 应显示一个监听中的 node 进程
```

查看实时服务日志（`webmcp start` 的 stderr 输出）。如果用 pm2 启动：
```bash
pm2 logs webmcp
```

或查看 Claude Desktop 的 MCP 日志：
```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log
```

---

## 问题：服务无法启动 — "Port 3711 is already in use"

端口 3711 被其他进程占用（可能是之前的服务实例）。

```bash
# 找到并终止占用进程
lsof -ti :3711 | xargs kill -9

# 重新启动
webmcp start
```

---

## 问题：Chrome 扩展显示 ERR\_CONNECTION\_REFUSED

扩展无法连接到 WebSocket 服务——说明服务未在运行。

```bash
webmcp start
```

---

## 问题：Claude Desktop 中工具列表为空

Claude 看不到工具。按以下步骤排查：

1. **服务在运行吗？**
   ```bash
   lsof -i :3711
   ```
2. **目标网站的 adapter 已安装吗？**
   ```bash
   webmcp adapter list
   ```
3. **Chrome 中是否打开了支持的网站？** 工具只在打开匹配页面时才会出现。
4. **页面是否完全加载？** 页面显示后再等待 5～10 秒。
5. **修改配置后是否重启了 Claude Desktop？** 需要完全退出（⌘Q）再重新启动。

---

## 问题：工具调用超时

Claude 调用工具时请求挂起或返回超时错误。

调用工具时查看 Claude Desktop 日志：

```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log
```

同时打开 Chrome 扩展的 Service Worker 控制台：
`chrome://extensions` → WebMCP Adapter → **Service Worker**

重点排查：
- WebSocket 服务是否收到了调用？（应出现 `call_tool` 消息）
- Chrome 扩展是否响应了？（查看 `call_tool_result` 或 `call_tool_error`）
- 目标标签页是否还在打开，且在正确的页面上？

---

## 问题：在网站内导航后工具消失

导航到新页面时，adapter 会重新注入，需要 2～3 秒。等待后重新触发工具调用即可。

如果扩展控制台显示导航后没有完成注册，说明新页面的 hostname 可能不在 adapter 的 `match` 列表中。

---

## 问题：Claude Desktop 启动时无法连接

验证配置文件内容：

```bash
# macOS
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

检查：
- `"command": "webmcp"` 已存在
- JSON 格式正确（无多余逗号、无语法错误）
- `webmcp` 在 PATH 中：在终端运行 `which webmcp`

---

## 问题：`webmcp adapter install` 无法从 GitHub 下载

如果你在代理网络后，Node.js 的 `fetch` 可能不走系统代理。CLI 会自动回退到 `curl`（支持系统代理）。也可以手动设置代理环境变量：

```bash
export HTTPS_PROXY=http://127.0.0.1:<port>
webmcp adapter install mail.163.com --reload
```

---

## 查看日志

| 日志来源 | 查看方式 |
|---|---|
| WebSocket 服务 | `webmcp start` 的 stderr，或 `pm2 logs webmcp` |
| Chrome 扩展 | `chrome://extensions` → WebMCP Adapter → **Service Worker** |
| Claude Desktop MCP | `tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log` |

---

## 仍然有问题？

在 [GitHub](https://github.com/HeGaoYuan/webmcp-adapter/issues) 提交 Issue，并附上：
- `lsof -i :3711` 的输出
- Chrome 扩展 Service Worker 控制台的输出
- 你的 `claude_desktop_config.json`（如有敏感路径可脱敏）
- macOS：`~/Library/Logs/Claude/mcp-server-webmcp-adapter.log` 的相关内容
