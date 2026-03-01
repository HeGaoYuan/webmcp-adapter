# 5 分钟上手

让 WebMCP Adapter 在 5 分钟内跑起来。

## 前置条件

- [Node.js](https://nodejs.org/) 18+
- Google Chrome
- [Claude Code](https://docs.claude.ai/docs/claude-code)

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
3. 点击**加载未打包的扩展程序**
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

打开你想要操作的网站（如 [mail.163.com](https://mail.163.com)），扩展会自动检测是否有可用的 adapter。如果有，扩展图标会显示橙色提示，点击即可安装。

你也可以在 [Adapter Hub](/adapters) 查看所有可用的 adapter，或使用命令行安装：

```bash
webmcp adapter install mail.163.com --reload
webmcp adapter install mail.google.com --reload
```

## 第五步 — 配置 Claude Code

编辑配置文件 `~/.claude/settings.json`（如果不存在则创建）：

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

保存后重启 Claude Code。

## 第六步 — 测试工具

1. 在 Chrome 中打开已安装 adapter 的网站（如 [mail.163.com](https://mail.163.com)）并等待加载完成
2. 在 Claude Code 中输入：`请列出可用的工具`
3. 你应该看到该网站的工具列表（如 `mail_163_com_search_emails`、`mail_163_com_get_unread_emails` 等）

## 第七步 — 完整测试

现在可以让 Claude 执行实际操作了：

```
"帮我搜索本月收件箱里所有关于发票的邮件"
```

Claude 会自动调用工具，在浏览器中执行搜索，并返回结果。

## 下一步

- [CLI 参考](/docs/cli-reference) — 完整命令文档
- [完整安装](/docs/installation) — 开机自启、多种 AI 客户端
- [故障排除](/docs/troubleshooting) — 遇到问题时查看
