# WebMCP Adapter 快速开始

## 🚀 5分钟快速上手

### 第一步：启动WebSocket服务

```bash
./start-service.sh start
```

你应该看到：
```
✓ Native host started successfully (PID: xxxxx)
  Log file: /Users/dear/myProject/webmcp-adapter/native-host.log
  WebSocket: ws://localhost:3711
```

### 第二步：打开支持的网站

在Chrome中打开以下任一网站：
- **Gmail**: https://mail.google.com
- **163邮箱**: https://mail.163.com

等待页面完全加载（约5-10秒）。

### 第三步：验证工具已注册

```bash
./start-service.sh status
```

你应该在日志中看到类似：
```
[Bridge] Registered X tools for tab xxxxx
```

### 第四步：启动Claude Desktop

如果Claude Desktop已经在运行，重启它（Command+Q 然后重新打开）。

### 第五步：测试

在Claude Desktop中输入：
```
请列出可用的工具
```

你应该看到类似：
- `search_emails` - 在邮箱中搜索邮件
- `get_unread_emails` - 获取未读邮件
- `navigate_to_inbox` - 返回收件箱首页

然后尝试使用工具：
```
搜索我的邮件中包含"发票"的内容
```

## ✅ 验证清单

如果遇到问题，按照这个清单检查：

### 1. WebSocket服务是否运行？
```bash
./start-service.sh status
```
应该显示：`✓ Native host is running`

### 2. Chrome扩展是否已加载？
- 打开 `chrome://extensions`
- 找到 "WebMCP Adapter"
- 确认已启用

### 3. 工具是否已注册？
```bash
./start-service.sh logs | grep "Registered"
```
应该看到：`[Bridge] Registered X tools for tab xxxxx`

### 4. Claude Desktop配置是否正确？
```bash
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```
应该包含webmcp-adapter配置。

## 🔧 常用命令

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
./start-service.sh logs

# 实时查看日志
./start-service.sh logs -f
```

## 🐛 常见问题

### 问题1：服务启动失败，提示"Port 3711 is already in use"

**解决：**
```bash
# 停止占用端口的进程
lsof -ti :3711 | xargs kill -9

# 重新启动
./start-service.sh start
```

### 问题2：Chrome扩展显示"ERR_CONNECTION_REFUSED"

**原因：** WebSocket服务未运行

**解决：**
```bash
./start-service.sh start
```

### 问题3：工具列表为空

**原因：** 未打开支持的网站

**解决：**
1. 在Chrome中打开 Gmail 或 163mail
2. 等待页面完全加载
3. 验证工具已注册：`./start-service.sh logs | grep Registered`

### 问题4：工具调用超时

**检查：**
```bash
# 查看实时日志
./start-service.sh logs -f

# 在Claude Desktop中调用工具，观察日志输出
```

## 💡 使用技巧

### 修改adapter后如何生效

1. 刷新网页（Command+R）
2. 等待2-3秒让adapter重新注入
3. 在Claude Desktop中测试

### 批量操作

使用`navigate_to_inbox`工具在操作之间返回首页：

```
请帮我下载所有包含"发票"的邮件的附件
```

Claude会自动：
1. 返回首页
2. 搜索邮件
3. 依次打开并下载附件

详见 [NAVIGATION-TOOLS-GUIDE.md](NAVIGATION-TOOLS-GUIDE.md)

## 📚 更多文档

- [完整安装指南](SETUP.md) - 详细的安装和配置
- [导航工具指南](NAVIGATION-TOOLS-GUIDE.md) - 多步骤操作
- [项目结构](PROJECT-STRUCTURE.md) - 代码组织说明
- [实现细节](IMPLEMENTATION-SUMMARY.md) - 技术架构

## 🎉 开始使用

现在你可以在Claude Desktop中使用网页工具了！

试试让Claude帮你：
- 搜索邮件
- 整理收件箱
- 下载附件
- 管理邮件

祝使用愉快！ 🚀

