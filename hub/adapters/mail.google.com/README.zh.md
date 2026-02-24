# Gmail 适配器

适用于 [Gmail](https://mail.google.com)（Google 邮箱）的 WebMCP 适配器。

让 AI 客户端（如 Claude）直接读取、搜索和管理你的 Gmail 收件箱，无需手动复制粘贴。

## 工具说明

### `navigate_to_inbox`

导航到 Gmail 收件箱首页并等待完全加载。

**使用场景：** 在执行多步骤操作（如批量下载附件）之前调用此工具，确保页面处于已知状态。

**参数：** 无

**返回值：**
```json
{
  "status": "success",
  "message": "Navigated to Gmail inbox",
  "previousUrl": "https://mail.google.com/...",
  "currentUrl": "https://mail.google.com/mail/u/0/#inbox",
  "pageLoaded": true
}
```

---

### `search_emails`

按关键词搜索邮件，返回匹配的邮件线程列表。

**参数：**

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `keyword` | string | ✅ | 搜索关键词，例如 `发票`、`合同`、`会议` |

**返回值：**
```json
{
  "keyword": "发票",
  "count": 3,
  "emails": [
    {
      "id": "18f3a2b1c4d5e6f7",
      "sender": "finance@company.com",
      "subject": "2026年1月发票",
      "date": "Jan 15, 2026, 10:23 AM",
      "isUnread": false,
      "hasAttachment": true,
      "snippet": "请查收本月发票..."
    }
  ]
}
```

返回的 `id` 可用于 `open_email`。

---

### `get_unread_emails`

获取收件箱中的未读邮件列表。

**参数：**

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `limit` | number | ❌ | 最多返回的邮件数量，默认 `20` |

**返回值：**
```json
{
  "count": 2,
  "emails": [
    {
      "id": "18f3a2b1c4d5e6f7",
      "sender": "boss@company.com",
      "subject": "周会纪要",
      "date": "Feb 20, 2026, 9:00 AM"
    }
  ]
}
```

---

### `open_email`

打开指定邮件线程，返回完整内容（包括正文和附件列表）。

**参数：**

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `emailId` | string | ✅ | 来自 `search_emails` 或 `get_unread_emails` 的线程 ID |

**返回值：**
```json
{
  "status": "opened",
  "emailId": "18f3a2b1c4d5e6f7",
  "detail": {
    "subject": "2026年1月发票",
    "from": "finance@company.com",
    "to": "me@gmail.com",
    "date": "January 15, 2026 at 10:23 AM",
    "body": "您好，附本月发票，请查收...",
    "attachments": [
      { "name": "invoice_202601.pdf", "size": "245 KB" }
    ],
    "hasAttachment": true
  },
  "loadTime": "1000ms"
}
```

调用 `download_attachment` 之前必须先调用此工具。

---

### `download_attachment`

下载当前打开邮件的附件。必须先调用 `open_email`。

**参数：**

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `attachmentName` | string | ✅ | 附件文件名（例如 `invoice.pdf`），或使用 `"all"` 打包下载所有附件 |

**返回值：**
```json
{ "status": "downloading", "attachmentName": "invoice_202601.pdf", "message": "Triggered download of: invoice_202601.pdf" }
```

---

### `get_current_page_info`

获取当前 Gmail 页面状态，用于判断当前是在收件箱、阅读邮件还是写信界面。

**参数：** 无

**返回值：**
```json
{
  "url": "https://mail.google.com/mail/u/0/#inbox",
  "title": "收件箱 - me@gmail.com - Gmail",
  "pageType": "inbox",
  "isInbox": true,
  "isEmailDetail": false,
  "isComposing": false,
  "emailListInfo": { "totalEmails": 25, "hasEmails": true },
  "readyState": "complete"
}
```

`pageType` 的取值：`"inbox"`、`"email_detail"`、`"composing"`。

## 使用示例

### 批量下载发票附件

```
帮我把收件箱里所有包含"发票"的邮件的附件都下载下来
```

Claude 会依次执行：
1. `navigate_to_inbox()` — 从干净状态开始
2. `search_emails({ keyword: "发票" })` — 找到匹配的邮件
3. 对每封有附件的邮件：
   - `open_email({ emailId: "..." })`
   - `download_attachment({ attachmentName: "all" })`
   - `navigate_to_inbox()` — 返回后处理下一封

### 查看未读邮件

```
我有哪些未读邮件？
```

Claude 会调用 `get_unread_emails()` 并汇总结果。

### 阅读指定邮件

```
打开那封主题是"周会纪要"的邮件，告诉我内容
```

Claude 会先调用 `search_emails({ keyword: "周会纪要" })`，再用匹配的 ID 调用 `open_email()`，最后总结正文内容。

## 注意事项

- **验证时间：** 2026 年 2 月。Gmail 的 DOM 结构可能会更新，请参考 `meta.json` 中的 `verified_on` 字段了解最近验证日期。
- 适配器运行在 Chrome 的隔离沙盒中，无法访问 Gmail 的内部 JavaScript 状态。
- 所有操作均在本地浏览器中完成，不会向任何外部服务器发送数据。
- 支持 Gmail 多账号：导航时会自动保留账号序号（`/mail/u/0/`、`/mail/u/1/` 等）。
