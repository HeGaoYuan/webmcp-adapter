# 163邮箱 Adapter

适用于 [163邮箱（网易）](https://mail.163.com) 的 WebMCP Adapter。

让 Claude 等 AI 客户端直接读取、搜索和管理你的 163 收件箱，无需手动复制粘贴。

## 工具列表

### `navigate_to_inbox`

导航回 163 邮箱收件箱首页，并等待页面完全加载。

**适用场景：** 开始多步骤操作（如批量下载附件）前，先调用此工具确保页面处于已知状态。

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

---

### `search_emails`

按关键词搜索邮件，返回匹配的邮件列表。

**参数：**

| 名称 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `keyword` | string | ✅ | 搜索关键词，如 `发票`、`合同`、`会议` |

**返回值：**
```json
{
  "keyword": "发票",
  "count": 3,
  "emails": [
    {
      "id": "177163570...",
      "sender": "finance@company.com",
      "subject": "2026年1月发票",
      "date": "2026-01-15 10:23",
      "isUnread": false,
      "hasAttachment": true,
      "summary": "附本月发票，请查收..."
    }
  ]
}
```

返回的 `id` 字段可用于 `open_email`。

---

### `get_unread_emails`

获取收件箱中的未读邮件列表。

**参数：**

| 名称 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `limit` | number | ❌ | 最多返回的邮件数量，默认 `20` |

**返回值：**
```json
{
  "count": 2,
  "emails": [
    {
      "id": "177163570...",
      "sender": "boss@company.com",
      "subject": "周会纪要",
      "date": "2026-02-20 09:00"
    }
  ]
}
```

---

### `open_email`

打开指定邮件，返回完整内容，包括正文和附件列表。

**参数：**

| 名称 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `emailId` | string | ✅ | 邮件唯一 ID，来自 `search_emails` 或 `get_unread_emails` 的返回结果 |

**返回值：**
```json
{
  "status": "opened",
  "emailId": "177163570...",
  "detail": {
    "subject": "2026年1月发票",
    "from": "finance@company.com",
    "to": "me@163.com",
    "date": "2026-01-15 10:23:00",
    "body": "您好，附本月发票...",
    "attachments": [
      { "name": "发票_202601.pdf", "size": "245K" }
    ],
    "hasAttachment": true
  }
}
```

调用 `download_attachment` 前必须先调用此工具。

---

### `download_attachment`

下载当前打开邮件的附件。必须先调用 `open_email`。

**参数：**

| 名称 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `attachmentName` | string | ✅ | 附件完整文件名（如 `发票.pdf`），或填 `"all"` 打包下载所有附件 |

**返回值：**
```json
{ "status": "downloading", "attachmentName": "发票_202601.pdf", "message": "已触发下载附件" }
```

---

### `get_current_page_info`

获取当前页面状态，可判断现在处于收件箱、邮件详情还是写信界面。

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
  "emailListInfo": { "totalEmails": 25, "hasEmails": true },
  "readyState": "complete"
}
```

`pageType` 的值为 `"inbox"`、`"email_detail"` 或 `"composing"` 之一。

## 使用示例

### 批量下载发票附件

```
请帮我把收件箱里所有包含"发票"的邮件的附件都下载下来
```

Claude 的执行步骤：
1. `navigate_to_inbox()` — 回到初始状态
2. `search_emails({ keyword: "发票" })` — 搜索匹配邮件
3. 对每封有附件的邮件：
   - `open_email({ emailId: "..." })`
   - `download_attachment({ attachmentName: "all" })`
   - `navigate_to_inbox()` — 返回再处理下一封

### 查看未读邮件

```
我有哪些未读邮件？
```

Claude 调用 `get_unread_emails()` 并汇总结果。

### 阅读指定邮件

```
打开那封主题是"周会纪要"的邮件，告诉我内容
```

Claude 调用 `search_emails({ keyword: "周会纪要" })`，再用匹配的 ID 调用 `open_email()`，然后总结正文内容。

## 注意事项

- **验证日期：** 163邮箱，2026 年 2 月。网站 DOM 结构可能随时变化，以 `meta.json` 中的 `verified_on` 为准。
- Adapter 运行在 Chrome 的 isolated world 中，无法访问 163 邮箱的内部 JavaScript 状态。
- 所有操作均在本地浏览器中执行，不会向任何外部服务器发送数据。
