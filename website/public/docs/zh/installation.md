# 完整安装

详细的安装和配置说明。

## 系统要求

| 组件 | 要求 |
|---|---|
| 操作系统 | macOS（Windows 规划中） |
| Node.js | 18 或更高版本 |
| 浏览器 | Google Chrome |
| AI 客户端 | Claude Desktop |

## 1. 安装依赖

```bash
cd webmcp-adapter
npm install
```

## 2. 安装 Chrome 扩展

1. 在 Chrome 中打开 `chrome://extensions`
2. 开启右上角**开发者模式**
3. 点击**加载已解压的扩展程序**
4. 选择仓库中的 `extension/` 目录

扩展卡片上会显示一个扩展 ID，调试时可能用到。

## 3. 配置 Claude Desktop

### 找到配置文件

| 平台 | 路径 |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

### 编辑配置

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

> **重要：** 必须使用绝对路径。相对路径不起作用，因为 Claude Desktop 从不同的工作目录启动进程。

获取绝对路径：
```bash
cd webmcp-adapter
pwd
# 示例输出：/Users/yourname/projects/webmcp-adapter
```

则 `args` 应填 `["/Users/yourname/projects/webmcp-adapter/native-host/index.js"]`。

## 4. 启动 WebSocket 服务

```bash
./start-service.sh start
```

验证服务已启动：
```bash
./start-service.sh status
# ✓ Native host is running (PID: xxxxx)
```

## 5. 重启 Claude Desktop

编辑配置后，需要完全退出并重新启动 Claude Desktop，才能加载新的 MCP 服务器。

## 开机自启（可选）

### macOS — launchd

创建文件 `~/Library/LaunchAgents/com.webmcp.adapter.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.webmcp.adapter</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/绝对路径/到/webmcp-adapter/native-host/index.js</string>
    <string>--service</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/webmcp-adapter.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/webmcp-adapter-error.log</string>
</dict>
</plist>
```

加载服务（开机自启生效）：
```bash
launchctl load ~/Library/LaunchAgents/com.webmcp.adapter.plist
```

卸载（取消自启）：
```bash
launchctl unload ~/Library/LaunchAgents/com.webmcp.adapter.plist
```

> **提示：** 运行 `which node` 获取 node 的正确路径。

## 验证安装

运行完整系统测试：

```bash
./test-system.sh
```

该脚本会检查：
- Node.js 依赖已安装
- WebSocket 服务在端口 3711 上监听
- Chrome 扩展已连接
- 工具已注册
- Claude Desktop 配置存在

## 卸载

1. 从 Claude Desktop 配置中删除 `webmcp-adapter` 条目
2. 停止服务：`./start-service.sh stop`
3. 在 `chrome://extensions` 中移除 Chrome 扩展
4. 删除仓库目录
