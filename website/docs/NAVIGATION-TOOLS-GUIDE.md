# 163邮箱导航工具使用指南

## 新增工具

### 1. navigate_to_inbox
返回163邮箱收件箱首页

**用途：**
- 在执行多步骤操作前，确保从已知状态开始
- 当页面状态不明确时，重置到初始状态
- 批量操作时，在每个操作之间返回首页

**参数：** 无

**返回值：**
```json
{
  "status": "success",
  "message": "已返回收件箱首页",
  "previousUrl": "https://mail.163.com/...",
  "currentUrl": "https://mail.163.com/js6/main.jsp",
  "pageLoaded": true
}
```

### 2. get_current_page_info
获取当前页面状态信息

**用途：**
- 判断当前在哪个页面（收件箱、邮件详情、写信）
- 检查页面是否加载完成
- 获取当前页面的基本信息

**参数：** 无

**返回值：**
```json
{
  "url": "https://mail.163.com/js6/main.jsp",
  "title": "163网易免费邮",
  "pageType": "inbox",
  "isInbox": true,
  "isEmailDetail": false,
  "isComposing": false,
  "emailListInfo": {
    "totalEmails": 25,
    "hasEmails": true
  },
  "readyState": "complete"
}
```

## 使用场景

### 场景1：批量下载邮件附件

**需求：** 下载所有包含"发票"的邮件的附件

**工具调用序列：**
```
1. navigate_to_inbox()           # 返回首页
2. search_emails(keyword="发票")  # 搜索邮件
3. open_email(emailId="xxx")      # 打开第一封
4. download_attachment("all")     # 下载所有附件
5. navigate_to_inbox()           # 返回首页
6. open_email(emailId="yyy")      # 打开第二封
7. download_attachment("all")     # 下载所有附件
... 重复
```

**Claude Desktop使用示例：**
```
请帮我下载所有包含"发票"的邮件的附件
```

Claude会自动：
1. 先返回收件箱
2. 搜索"发票"
3. 依次打开每封邮件
4. 下载附件
5. 返回首页继续下一封

### 场景2：检查页面状态

**需求：** 在执行操作前，确认当前页面状态

**工具调用序列：**
```
1. get_current_page_info()        # 检查当前页面
2. 如果不在收件箱：
   navigate_to_inbox()            # 返回首页
3. search_emails(keyword="...")   # 执行搜索
```

**Claude Desktop使用示例：**
```
请先检查当前页面状态，然后搜索"合同"相关的邮件
```

### 场景3：多步骤操作

**需求：** 搜索邮件 → 打开 → 查看详情 → 返回 → 继续

**工具调用序列：**
```
1. navigate_to_inbox()                    # 确保在首页
2. search_emails(keyword="会议")          # 搜索
3. open_email(emailId="xxx")              # 打开邮件
4. get_current_page_info()                # 确认已打开
5. (查看邮件内容)
6. navigate_to_inbox()                    # 返回首页
7. get_unread_emails(limit=10)            # 查看未读
```

**Claude Desktop使用示例：**
```
请帮我：
1. 搜索包含"会议"的邮件
2. 打开第一封查看详情
3. 然后返回首页
4. 查看未读邮件
```

## 最佳实践

### 1. 操作前先返回首页

```
# 好的做法
navigate_to_inbox()  # 先返回首页
search_emails(...)   # 再执行操作

# 不好的做法
search_emails(...)   # 直接操作，可能当前不在首页
```

### 2. 使用页面状态检查

```
# 好的做法
get_current_page_info()  # 检查状态
if not isInbox:
    navigate_to_inbox()  # 需要时才返回

# 不好的做法
navigate_to_inbox()      # 盲目返回，浪费时间
```

### 3. 批量操作时的节奏控制

```
for each email:
    navigate_to_inbox()      # 返回首页
    open_email(emailId)      # 打开邮件
    download_attachment()    # 下载附件
    # 自动等待2.5秒（navigate_to_inbox内置）
```

## 技术细节

### navigate_to_inbox 实现

```javascript
handler: async () => {
  // 1. 记录当前URL
  const currentUrl = window.location.href;
  
  // 2. 导航到首页
  window.location.href = "https://mail.163.com/js6/main.jsp";
  
  // 3. 等待页面加载（最多5秒）
  await sleep(1000);
  let waitTime = 0;
  while (document.readyState !== 'complete' && waitTime < 5000) {
    await sleep(100);
    waitTime += 100;
  }
  
  // 4. 额外等待1.5秒确保邮件列表加载
  await sleep(1500);
  
  return { status: "success", ... };
}
```

**等待时间说明：**
- 初始等待：1秒（页面开始加载）
- 加载检查：最多5秒（等待document.readyState = 'complete'）
- 额外等待：1.5秒（确保动态内容加载）
- **总计：最多7.5秒**

### get_current_page_info 实现

```javascript
handler: async () => {
  // 1. 获取基本信息
  const url = window.location.href;
  const title = document.title;
  
  // 2. 判断页面类型
  const isInbox = url.includes('main.jsp');
  const isEmailDetail = !!document.querySelector('[id*="read.ReadModule"]');
  
  // 3. 根据页面类型获取详细信息
  if (isEmailDetail) {
    // 解析邮件详情
  } else {
    // 解析邮件列表
  }
  
  return { url, title, pageType, ... };
}
```

## 故障排除

### 问题1：navigate_to_inbox 后页面未加载完成

**症状：** 返回值中 `pageLoaded: false`

**原因：** 网络慢或页面加载时间超过5秒

**解决：**
1. 再次调用 `navigate_to_inbox()`
2. 或使用 `get_current_page_info()` 检查状态
3. 如果 `readyState !== 'complete'`，等待一会儿再操作

### 问题2：导航后工具列表消失

**症状：** Claude Desktop显示"工具不可用"

**原因：** 页面导航后，adapter需要重新注入

**解决：**
1. 等待2-3秒让adapter重新注入
2. 刷新Claude Desktop的工具列表
3. 查看Service Worker日志确认工具已重新注册

### 问题3：批量操作时部分失败

**症状：** 某些邮件的附件下载失败

**原因：** 页面加载时间不够或网络延迟

**解决：**
1. 在每个操作之间增加等待时间
2. 使用 `get_current_page_info()` 确认页面状态
3. 失败时重试该邮件

## 测试

### 测试1：基本导航

```
1. 在Claude Desktop中输入：
   "请返回收件箱首页"

2. 预期结果：
   - 页面导航到 https://mail.163.com/js6/main.jsp
   - 返回成功消息
   - pageLoaded: true
```

### 测试2：页面状态检查

```
1. 在Claude Desktop中输入：
   "请告诉我当前在哪个页面"

2. 预期结果：
   - 返回当前URL
   - 显示页面类型（inbox/email_detail/composing）
   - 如果在收件箱，显示邮件数量
```

### 测试3：批量下载

```
1. 在Claude Desktop中输入：
   "请下载所有包含'测试'的邮件的附件"

2. 预期结果：
   - 自动返回首页
   - 搜索邮件
   - 依次打开并下载
   - 每个操作之间自动返回首页
```

## 更新日志

### v0.2.1 - 2026-02-20
- ✅ 添加 `navigate_to_inbox` 工具
- ✅ 添加 `get_current_page_info` 工具
- ✅ 支持多步骤操作和批量处理
- ✅ 改进页面加载等待逻辑

## 下一步

可以考虑添加的工具：
1. `navigate_to_folder(folderName)` - 导航到指定文件夹
2. `wait_for_page_load(timeout)` - 显式等待页面加载
3. `refresh_page()` - 刷新当前页面
4. `go_back()` - 返回上一页
