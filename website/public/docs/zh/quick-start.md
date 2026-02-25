# 5 分钟上手

让 WebMCP Adapter 在 5 分钟内跑起来。

## 前置条件

- macOS（Windows 支持规划中）
- [Node.js](https://nodejs.org/) 18+
- Google Chrome
- [Claude Desktop](https://claude.ai/download)

## 第一步 — 安装

```bash
npm install -g github:HeGaoYuan/webmcp-adapter
```

这会全局安装 `webmcp` 命令行工具，并包含 Chrome 扩展包。

## 第二步 — 加载 Chrome 扩展

找到扩展的安装路径：

```bash
webmcp extension-path
# 示例输出：/usr/local/lib/node_modules/webmcp-adapter/extension
```

在 Chrome 中加载：

1. 打开 `chrome://extensions`
2. 开启右上角的**开发者模式**
3. 点击**加载已解压的扩展程序**
4. 选择上方命令打印的路径

## 第三步 — 启动 WebSocket 服务

```bash
webmcp service start -d
```

这会在后台启动 bridge。验证是否运行：

```bash
webmcp service status
```

## 第四步 — 安装 Adapter

Adapter 是针对特定网站的插件：

```bash
webmcp adapter install mail.163.com --reload
webmcp adapter install mail.google.com --reload
```

## 第五步 — 配置 Claude Desktop

编辑配置文件：

- **macOS：** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows：** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "webmcp-adapter": {
      "command": "webmcp",
      "args": ["mcp"]
    }
  }
}
```

保存后重启 Claude Desktop。

## 第六步 — 测试

1. 在 Chrome 中打开支持的网站（如 [mail.163.com](https://mail.163.com)）并等待加载完成
2. 问 Claude：`请列出可用的工具`
3. 你应该看到 `search_emails`、`get_unread_emails` 等工具

## 验证清单

- [ ] `webmcp service status` 显示服务正在运行
- [ ] 扩展在 `chrome://extensions` 已启用
- [ ] `webmcp adapter list` 显示目标网站的 adapter
- [ ] Chrome 中已打开支持的网站
- [ ] `claude_desktop_config.json` 中有 `"command": "webmcp", "args": ["mcp"]`
- [ ] 修改配置后已重启 Claude Desktop

## 常用服务命令

```bash
webmcp service start -d    # 在后台启动
webmcp service stop        # 停止后台服务
webmcp service status      # 查看状态
webmcp service logs -f     # 实时查看日志
```

## 下一步

- [CLI 参考](/docs/cli-reference) — 完整命令文档
- [完整安装](/docs/installation) — 开机自启、多种 AI 客户端
- [故障排除](/docs/troubleshooting) — 遇到问题时查看
