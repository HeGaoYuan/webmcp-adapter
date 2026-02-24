# 5 分钟上手

让 WebMCP Adapter 在 5 分钟内跑起来。

## 前置条件

- macOS（Windows 支持规划中）
- [Node.js](https://nodejs.org/) 18+
- Google Chrome
- [Claude Desktop](https://claude.ai/download)

## 第一步 — 安装

```bash
npm install -g webmcp-adapter
```

这会全局安装 `webmcp` 命令行工具，并包含 Chrome 扩展包。

## 第二步 — 加载 Chrome 扩展

找到扩展的安装路径：

```bash
webmcp extension-path
# 示例输出：/usr/local/lib/node_modules/webmcp-adapter/extension
```

然后在 Chrome 中加载：

1. 打开 `chrome://extensions`
2. 开启右上角的**开发者模式**
3. 点击**加载已解压的扩展程序**
4. 选择 `webmcp extension-path` 打印的路径

扩展图标会出现在 Chrome 工具栏中。

## 第三步 — 配置 Claude Desktop

编辑 Claude Desktop 配置文件：

- **macOS：** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows：** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "webmcp-adapter": {
      "command": "webmcp"
    }
  }
}
```

## 第四步 — 启动 WebSocket 服务

```bash
webmcp start
```

使用 Claude 期间保持此命令在终端中运行。如需开机自启，参见[完整安装](/docs/installation)。

## 第五步 — 安装 Adapter

Adapter 是针对特定网站的插件，安装你需要使用的网站对应的 adapter：

```bash
# 163 邮箱
webmcp adapter install mail.163.com --reload

# Gmail
webmcp adapter install mail.google.com --reload
```

`--reload` 会在安装完成后自动刷新 Chrome 扩展。

## 第六步 — 测试

1. 在 Chrome 中打开已支持的网站（如 [mail.163.com](https://mail.163.com)）
2. 等待页面完全加载（约 5 秒）
3. 打开（或重启）Claude Desktop
4. 问 Claude：

```
请列出可用的工具
```

你应该看到 `search_emails`、`get_unread_emails` 等工具。然后尝试：

```
搜索我收件箱中包含"发票"的邮件
```

## 验证清单

如果有问题，逐项排查：

- [ ] **服务在运行？** 在终端执行 `webmcp start`
- [ ] **扩展已加载？** 在 `chrome://extensions` 确认 WebMCP Adapter 已启用
- [ ] **Adapter 已安装？** 执行 `webmcp adapter list`，确认目标网站的 adapter 存在
- [ ] **已打开支持的网站？** 在 Chrome 中打开并等待完全加载
- [ ] **配置正确？** 检查 `claude_desktop_config.json` 中是否有 `"command": "webmcp"`
- [ ] **Claude 已重启？** 修改配置后需要完全退出并重新启动 Claude Desktop

## Adapter 管理命令

```bash
webmcp adapter list                                # 列出已安装的 adapter
webmcp adapter install <id> --reload               # 从 Hub 安装
webmcp adapter install --url <url> --reload        # 从自定义 URL 安装
webmcp adapter install --file <path> --reload      # 从本地文件安装
webmcp adapter remove <id> --reload                # 移除
webmcp adapter refresh                             # 强制刷新 Hub 注册表缓存
```

## 下一步

- [完整安装](/docs/installation) — 开机自启、Windows 设置
- [故障排除](/docs/troubleshooting) — 遇到问题时查看
