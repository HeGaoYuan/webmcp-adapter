# 5 分钟上手

让 WebMCP Adapter 在 5 分钟内跑起来。

## 前置条件

- macOS（Windows 支持规划中）
- [Node.js](https://nodejs.org/) 18+
- Google Chrome
- [Claude Desktop](https://claude.ai/download)

## 第一步 — 克隆并安装依赖

```bash
git clone https://github.com/HeGaoYuan/webmcp-adapter.git
cd webmcp-adapter
npm install
```

## 第二步 — 安装 Chrome 扩展

1. 打开 Chrome，访问 `chrome://extensions`
2. 开启右上角的**开发者模式**
3. 点击**加载已解压的扩展程序**
4. 选择仓库中的 `extension/` 文件夹

扩展图标会出现在 Chrome 工具栏中。

## 第三步 — 配置 Claude Desktop

编辑 Claude Desktop 配置文件：

- **macOS：** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows：** `%APPDATA%\Claude\claude_desktop_config.json`

添加以下内容（将 `/绝对路径/到` 替换为实际路径）：

```json
{
  "mcpServers": {
    "webmcp-adapter": {
      "command": "node",
      "args": ["/绝对路径/到/webmcp-adapter/native-host/index.js"]
    }
  }
}
```

## 第四步 — 启动 WebSocket 服务

```bash
./start-service.sh start
```

看到以下输出说明成功：

```
✓ Native host started successfully (PID: xxxxx)
  WebSocket: ws://localhost:3711
```

## 第五步 — 测试

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

- [ ] **服务在运行？** 执行 `./start-service.sh status` — 应显示 `✓ Native host is running`
- [ ] **扩展已加载？** 在 `chrome://extensions` 确认 WebMCP Adapter 已启用
- [ ] **已打开支持的网站？** 在 Chrome 中打开并等待完全加载
- [ ] **配置路径正确？** 检查 `claude_desktop_config.json` 中的路径是绝对路径
- [ ] **Claude 已重启？** 修改配置后需要完全退出并重新启动 Claude Desktop

## 服务管理命令

```bash
./start-service.sh start     # 启动
./start-service.sh stop      # 停止
./start-service.sh restart   # 重启
./start-service.sh status    # 查看状态
./start-service.sh logs      # 查看日志
./start-service.sh logs -f   # 实时查看日志
```

## 下一步

- [完整安装](/docs/installation) — 开机自启、Windows 设置
- [故障排除](/docs/troubleshooting) — 遇到问题时查看
