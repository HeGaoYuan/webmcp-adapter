# WebMCP Adapter 项目结构

## 📁 目录结构

```
webmcp-adapter/
├── extension/                      # Chrome扩展
│   ├── manifest.json              # 扩展配置
│   ├── background/
│   │   └── service-worker.js      # WebSocket客户端 + 工具注册
│   ├── content/
│   │   └── injector.js            # 加载adapters，处理工具调用
│   ├── adapters/
│   │   ├── 163mail.js             # 163邮箱适配器
│   │   └── gmail.js               # Gmail适配器
│   └── test/
│       ├── test.html              # 测试页面
│       └── test.js                # 测试脚本
│
├── native-host/                    # MCP Server + WebSocket Bridge
│   ├── index.js                   # 入口（服务模式/MCP模式）
│   ├── mcp-server.js              # MCP协议实现
│   ├── bridge.js                  # WebSocket服务器
│   └── install.js                 # 安装脚本（已废弃）
│
├── start-service.sh               # 服务管理脚本 ⭐
├── test-system.sh                 # 系统测试脚本
│
├── README.md                      # 项目说明
├── QUICKSTART.md                  # 快速开始指南
├── SETUP.md                       # 完整安装指南
├── NAVIGATION-TOOLS-GUIDE.md      # 导航工具使用指南
├── IMPLEMENTATION-SUMMARY.md      # 实现细节和技术总结
│
├── package.json                   # Node.js依赖
├── package-lock.json
└── .gitignore
```

## 📄 核心文件说明

### 用户文档

| 文件 | 用途 | 目标读者 |
|------|------|---------|
| `README.md` | 项目概述、快速开始、架构说明 | 所有用户 |
| `QUICKSTART.md` | 5分钟快速上手指南 | 新用户 |
| `SETUP.md` | 详细安装和配置说明 | 需要深入配置的用户 |
| `NAVIGATION-TOOLS-GUIDE.md` | 导航工具和多步骤操作指南 | 高级用户 |
| `IMPLEMENTATION-SUMMARY.md` | 技术实现细节和架构决策 | 开发者 |

### 核心脚本

| 文件 | 用途 | 使用频率 |
|------|------|---------|
| `start-service.sh` | 服务管理（启动/停止/重启/状态/日志） | 每次使用 |
| `test-system.sh` | 系统测试，验证所有组件 | 安装后/故障排除 |

### 代码文件

#### Chrome扩展

| 文件 | 职责 |
|------|------|
| `extension/manifest.json` | 扩展配置和权限声明 |
| `extension/background/service-worker.js` | WebSocket客户端，工具注册，消息转发 |
| `extension/content/injector.js` | 注入adapters到网页，处理工具调用 |
| `extension/adapters/163mail.js` | 163邮箱的DOM操作工具 |
| `extension/adapters/gmail.js` | Gmail的DOM操作工具 |

#### Native Host

| 文件 | 职责 |
|------|------|
| `native-host/index.js` | 入口，支持服务模式和MCP模式 |
| `native-host/bridge.js` | WebSocket服务器，管理连接和消息转发 |
| `native-host/mcp-server.js` | MCP协议实现，与Claude Desktop通信 |

## 🔄 数据流

### 工具注册流程

```
1. 用户打开Gmail/163mail
   ↓
2. injector.js 检测域名，加载对应adapter
   ↓
3. adapter注册工具到injector
   ↓
4. injector发送工具列表到service-worker
   ↓
5. service-worker通过WebSocket发送到bridge
   ↓
6. bridge存储工具列表，广播给所有连接的客户端
   ↓
7. MCP进程接收工具列表，报告给Claude Desktop
```

### 工具调用流程

```
1. Claude Desktop调用工具
   ↓
2. MCP进程接收调用请求
   ↓
3. MCP进程通过WebSocket发送到bridge
   ↓
4. bridge转发给service-worker
   ↓
5. service-worker发送消息到对应tab的injector
   ↓
6. injector调用adapter的handler
   ↓
7. handler操作DOM，返回结果
   ↓
8. 结果原路返回到Claude Desktop
```

## 🚀 快速命令参考

```bash
# 服务管理
./start-service.sh start      # 启动服务
./start-service.sh stop       # 停止服务
./start-service.sh restart    # 重启服务
./start-service.sh status     # 查看状态
./start-service.sh logs       # 查看日志
./start-service.sh logs -f    # 实时日志

# 系统测试
./test-system.sh              # 运行完整测试

# 开发
npm install                   # 安装依赖
```

## 📝 开发指南

### 添加新的adapter

1. 在 `extension/adapters/` 创建新文件
2. 实现工具定义和handler
3. 在 `extension/background/service-worker.js` 的 `ADAPTER_MAP` 中注册
4. 刷新网页测试

### 修改现有adapter

1. 编辑 `extension/adapters/xxx.js`
2. 刷新网页（Command+R）
3. 在Claude Desktop中测试

### 调试

```bash
# 查看WebSocket服务日志
./start-service.sh logs -f

# 查看Chrome扩展日志
# 打开 chrome://extensions
# 点击 "Service Worker" 查看日志

# 查看Claude Desktop日志
tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log
```

## 🔧 配置文件

### Claude Desktop配置

位置：`~/Library/Application Support/Claude/claude_desktop_config.json`

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

### 服务配置

- 端口：3711（硬编码在 `native-host/bridge.js`）
- 日志：`native-host.log`
- PID文件：`.webmcp-native-host.pid`

## 📊 依赖关系

```
Claude Desktop
    ↓ (启动)
MCP进程 (native-host/index.js)
    ↓ (连接)
WebSocket服务 (native-host/bridge.js)
    ↑ (连接)
Chrome扩展 (service-worker.js)
    ↑ (注入)
网页 (Gmail/163mail)
```

## 🎯 关键概念

### 独立服务架构

- WebSocket服务独立运行，不依赖Claude Desktop
- MCP进程作为客户端连接到WebSocket服务
- Chrome扩展也作为客户端连接到WebSocket服务
- 服务作为中心枢纽，转发消息和管理工具注册表

### 两种运行模式

1. **服务模式** (`--service`)
   - 启动WebSocket服务器
   - 监听端口3711
   - 管理工具注册表

2. **MCP模式** (默认)
   - 连接到WebSocket服务
   - 实现MCP协议
   - 与Claude Desktop通信

### Isolated World

- Adapters运行在Chrome的isolated world
- 可以操作DOM，但无法访问页面JavaScript变量
- 保证安全性和隔离性

## 🔐 安全考虑

1. WebSocket只监听localhost，不对外暴露
2. Adapters无法访问页面JavaScript
3. 写操作不会自动提交，需要用户确认
4. 所有通信都在本地进行

## 📈 性能特点

- WebSocket长连接，低延迟
- 工具注册表缓存在内存中
- 支持多个客户端同时连接
- 异步消息处理，不阻塞

## 🐛 常见问题定位

| 问题 | 检查位置 |
|------|---------|
| 服务无法启动 | `./start-service.sh status` |
| 工具未注册 | Chrome扩展的Service Worker日志 |
| 工具调用失败 | `./start-service.sh logs -f` |
| MCP连接问题 | `~/Library/Logs/Claude/mcp-server-webmcp-adapter.log` |

## 📚 相关资源

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Chrome Extension MV3](https://developer.chrome.com/docs/extensions/mv3/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
