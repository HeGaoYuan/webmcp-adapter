# WebMCP Adapter

将任何网站转换为MCP工具服务器，无需网站做任何改动。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动WebSocket服务
./start-service.sh start

# 3. 启动Claude Desktop

# 4. 直接对话，无需手动打开网站
```

Claude会自动打开浏览器并操作网站。

详细步骤查看 [快速开始指南](docs/QUICKSTART.md)

## 新功能：自动打开浏览器 🎉

现在无需手动打开网站！直接对Claude说：

```
搜索我的163邮箱中包含"发票"的邮件
```

Claude会自动：
1. 打开Chrome浏览器
2. 访问mail.163.com
3. 等待页面加载
4. 执行搜索

详见 [浏览器自动化文档](docs/BROWSER-AUTOMATION.md)

## 文档

- [快速开始](docs/QUICKSTART.md) - 5分钟上手
- [完整安装](docs/SETUP.md) - 详细配置说明
- [浏览器自动化](docs/BROWSER-AUTOMATION.md) - 自动打开浏览器 ⭐ 新功能
- [Domain-Based 架构](docs/DOMAIN-BASED-ARCHITECTURE.md) - 域名为基础的工具管理 ⭐ 新功能
- [MCP 日志说明](docs/MCP-LOGGING.md) - 日志格式和调试技巧
- [工具注册去重](docs/TOOLS-DEDUPLICATION.md) - 性能优化说明
- [导航工具](docs/NAVIGATION-TOOLS-GUIDE.md) - 多步骤操作指南
- [多Tab处理](docs/MULTI-TAB-HANDLING.md) - 多标签页管理
- [项目结构](docs/PROJECT-STRUCTURE.md) - 代码组织说明
- [实现细节](docs/IMPLEMENTATION-SUMMARY.md) - 技术架构

## 架构

```
Claude Desktop (stdio) → MCP进程 (WebSocket) → WebSocket服务
                                                      ↓
                                              Chrome扩展 → 网页DOM
```

WebSocket服务独立运行，管理工具注册和消息转发。

## 安装

详见 [完整安装指南](docs/SETUP.md)

简要步骤：
1. 安装Chrome扩展（`chrome://extensions` → 加载 `extension/` 文件夹）
2. 安装依赖（`npm install`）
3. 配置Claude Desktop（编辑 `claude_desktop_config.json`）
4. 启动服务（`./start-service.sh start`）

## 支持的网站

- **163邮箱**: 搜索、未读、打开邮件、下载附件、页面导航
- **Gmail**: 搜索、未读、撰写、打开邮件

## 系统工具

- **open_browser**: 自动打开Chrome并访问指定网址

## 常用命令

```bash
./start-service.sh start    # 启动服务
./start-service.sh stop     # 停止服务
./start-service.sh status   # 查看状态
./start-service.sh logs -f  # 查看服务日志
webmcp mcp-logs             # 查看MCP日志（最新）
webmcp mcp-logs -f          # 实时跟踪MCP日志
./test-system.sh            # 系统测试
```

## 日志说明

项目有两种日志：

1. **WebSocket服务日志** (`~/.webmcp/service.log`)
   - WebSocket服务的运行日志
   - 查看方式：`./start-service.sh logs -f` 或 `webmcp service logs -f`

2. **MCP服务日志** (`~/.webmcp/mcp-TIMESTAMP.log`)
   - MCP server的运行日志（每次启动创建新文件）
   - 无论哪个AI客户端启动都会记录
   - 查看方式：`webmcp mcp-logs` 或 `webmcp mcp-logs -f`

## 开发

添加新适配器请参考 [项目结构文档](docs/PROJECT-STRUCTURE.md)

## 许可证

MIT
