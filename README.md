# WebMCP Adapter

Community-driven adapter that turns any website into an MCP tool server — without requiring the website to do anything.

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动WebSocket服务
./start-service.sh start

# 3. 在Chrome中打开Gmail或163mail

# 4. 启动Claude Desktop并测试
```

详细步骤请查看 [QUICKSTART.md](QUICKSTART.md)

## 📖 文档

- **[快速开始](QUICKSTART.md)** - 5分钟上手指南
- **[完整安装](SETUP.md)** - 详细安装和配置说明
- **[导航工具](NAVIGATION-TOOLS-GUIDE.md)** - 页面导航和多步骤操作指南

## 架构

**WebMCP Adapter 使用独立服务架构：**

```
┌─────────────────┐
│ Claude Desktop  │  ← MCP Client
└────────┬────────┘
         │ stdio (MCP protocol)
         ▼
┌─────────────────────────┐
│  MCP进程                │  ← 由Claude自动启动
│  (连接到WebSocket)      │
└────────┬────────────────┘
         │ WebSocket (localhost:3711)
         ▼
┌─────────────────────────┐
│  WebSocket服务          │  ← 独立后台服务
│  • 管理工具注册表       │     需要手动启动
│  • 转发工具调用         │
└────────┬────────────────┘
         │ WebSocket
         ▼
┌─────────────────────────┐
│  Chrome Extension       │
│  (Service Worker)       │
└────────┬────────────────┘
         │ chrome.tabs.sendMessage
         ▼
┌─────────────────────────┐
│  Content Script         │
│  (Adapters)             │
└────────┬────────────────┘
         │ DOM manipulation
         ▼
┌─────────────────────────┐
│  Website                │
│  (Gmail, 163mail, ...)  │
└─────────────────────────┘
```

## 服务管理

```bash
# 启动服务
./start-service.sh start

# 停止服务
./start-service.sh stop

# 重启服务
./start-service.sh restart

# 查看状态
./start-service.sh status

# 查看日志
./start-service.sh logs -f
```

## 系统测试

```bash
./test-system.sh
```

验证所有组件是否正常工作。

## 安装

### 1. 安装Chrome扩展

1. 打开 `chrome://extensions`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `extension/` 文件夹

### 2. 安装依赖

```bash
npm install
```

### 3. 配置Claude Desktop

编辑配置文件：
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "webmcp-adapter": {
      "command": "node",
      "args": ["/绝对路径/webmcp-adapter/native-host/index.js"]
    }
  }
}
```

**重要：** 将 `/绝对路径/` 替换为实际的项目路径。

### 4. 启动服务

```bash
./start-service.sh start
```

## 使用

1. 启动WebSocket服务
2. 在Chrome中打开Gmail或163mail
3. 启动Claude Desktop
4. 在Claude中使用工具

**示例：**
```
搜索我的邮件中包含"发票"的内容
```

## 支持的网站

| 网站 | 工具 |
|------|------|
| 163邮箱 (mail.163.com) | `navigate_to_inbox`, `search_emails`, `get_unread_emails`, `open_email`, `download_attachment`, `get_current_page_info` |
| Gmail (mail.google.com) | `search_emails`, `get_unread_emails`, `compose_email`, `open_email` |

## 添加新的适配器

在 `extension/adapters/` 中创建新文件：

```javascript
// extension/adapters/yoursite.js
window.__webmcpRegister({
  name: "yoursite-adapter",
  match: ["yoursite.com"],
  tools: [
    {
      name: "your_tool",
      description: "工具描述",
      parameters: {
        type: "object",
        properties: {
          input: { type: "string", description: "输入参数" }
        },
        required: ["input"]
      },
      handler: async ({ input }) => {
        // DOM操作
        return { success: true };
      }
    }
  ]
});
```

然后在 `extension/background/service-worker.js` 中注册：

```javascript
const ADAPTER_MAP = [
  { match: "yoursite.com", file: "adapters/yoursite.js" },
  // ...
];
```

## 项目结构

```
webmcp-adapter/
├── extension/               # Chrome扩展
│   ├── manifest.json
│   ├── background/
│   │   └── service-worker.js    # WebSocket客户端 + 工具注册
│   ├── content/
│   │   └── injector.js          # 加载adapters，处理工具调用
│   └── adapters/
│       ├── 163mail.js           # 163邮箱适配器
│       └── gmail.js             # Gmail适配器
├── native-host/             # MCP Server + WebSocket Bridge
│   ├── index.js                 # 入口（服务模式/MCP模式）
│   ├── mcp-server.js            # MCP协议实现
│   ├── bridge.js                # WebSocket服务器
│   └── install.js               # 安装脚本（已废弃）
├── start-service.sh         # 服务管理脚本
├── test-system.sh           # 系统测试脚本
└── package.json
```

## 工作原理

1. **WebSocket服务启动**：独立运行，监听端口3711
2. **Chrome扩展连接**：Service Worker连接到WebSocket服务
3. **工具注册**：Adapter注入到网页，工具信息发送到WebSocket服务
4. **Claude Desktop启动**：通过stdio启动MCP进程
5. **MCP进程连接**：连接到WebSocket服务，获取工具列表
6. **工具调用**：Claude → MCP进程 → WebSocket服务 → Chrome扩展 → Adapter → DOM
7. **结果返回**：DOM → Adapter → Chrome扩展 → WebSocket服务 → MCP进程 → Claude

## 安全说明

- Adapters运行在isolated world，无法访问页面JavaScript变量
- 工具只能操作当前页面的DOM
- 写操作（如compose_email）不会自动提交，需要用户确认
- WebSocket服务只监听localhost，不对外暴露

## 技术细节

详见 [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md)

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！
