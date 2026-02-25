# 故障排除

常见问题的诊断与修复。

## 快速诊断

```bash
webmcp service status    # 服务是否在运行？
webmcp adapter list      # adapter 是否已安装？
```

实时查看服务日志：
```bash
webmcp service logs -f
```

---

## 问题：服务无法启动 — "Port 3711 is already in use"

之前的服务实例还在运行。

```bash
# 找到并终止占用进程
lsof -ti :3711 | xargs kill -9

# 重新启动
webmcp service start -d
```

---

## 问题：Chrome 扩展显示 ERR\_CONNECTION\_REFUSED

WebSocket 服务未在运行。

```bash
webmcp service start -d
webmcp service status
```

---

## 问题：Claude Desktop 中工具列表为空

按以下步骤逐项排查：

1. **服务在运行吗？**
   ```bash
   webmcp service status
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

调用工具时实时查看服务日志：

```bash
webmcp service logs -f
```

同时查看 Claude Desktop 日志：
```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log
```

重点排查：
- 服务是否收到了调用？（应出现 `call_tool` 消息）
- 扩展是否响应了？（查看 `call_tool_result` 或 `call_tool_error`）
- 目标标签页是否还在打开，且在正确的页面？

---

## 问题：在网站内导航后工具消失

导航到新页面时，adapter 会重新注入（约 2～3 秒）。等待后重试即可。

如果扩展控制台显示导航后未注册，说明新页面的 hostname 可能不在 adapter 的 `match` 列表中。

---

## 问题：Claude Desktop 无法连接

验证配置文件内容：

```bash
# macOS
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

检查：
- `"command": "webmcp"` 和 `"args": ["mcp"]` 均存在
- JSON 格式正确（无多余逗号、无语法错误）
- `webmcp` 在 PATH 中：`which webmcp`

---

## 问题：`webmcp adapter install` 报 "fetch failed"

可能处于代理网络。CLI 会自动回退到 `curl`，如果也失败，手动设置代理：

```bash
export HTTPS_PROXY=http://127.0.0.1:<port>
webmcp adapter install mail.163.com --reload
```

---

## 查看日志

| 日志来源 | 命令 |
|---|---|
| WebSocket 服务 | `webmcp service logs -f` |
| Chrome 扩展 | `chrome://extensions` → WebMCP Adapter → **Service Worker** |
| Claude Desktop MCP | `tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log` |

---

## 仍然有问题？

在 [GitHub](https://github.com/HeGaoYuan/webmcp-adapter/issues) 提交 Issue，并附上：
- `webmcp service status` 的输出
- Chrome 扩展 Service Worker 控制台的输出
- 你的 `claude_desktop_config.json`（敏感路径可脱敏）
- macOS：`~/Library/Logs/Claude/mcp-server-webmcp-adapter.log` 的相关内容
