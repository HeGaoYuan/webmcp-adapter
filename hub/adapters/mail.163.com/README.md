# 163 Mail Adapter

Adapter for [163 Mail](https://mail.163.com) (NetEase 网易邮箱).

Lets AI clients like Claude read, search, and manage your 163 inbox directly — no manual copy-pasting required.

## Tools

### `mail.163.com.navigate_to_inbox`

Navigates back to the 163 Mail inbox homepage and waits for it to fully load.

**Use this tool** before starting any multi-step operation (e.g. batch downloading attachments) to ensure the page is in a known state.

**Parameters:** none

**Returns:**
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

### `mail.163.com.search_emails`

Searches your inbox by keyword and returns a list of matching emails.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `keyword` | string | ✅ | Search term, e.g. `发票`, `合同`, `会议` |

**Returns:**
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

Use the returned `id` values with `mail.163.com.open_email`.

---

### `mail.163.com.get_unread_emails`

Returns a list of unread emails from your inbox.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `limit` | number | ❌ | Maximum emails to return. Default: `20` |

**Returns:**
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

### `mail.163.com.open_email`

Opens a specific email and returns its full content including body and attachment list.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `emailId` | string | ✅ | Email ID from `mail.163.com.search_emails` or `mail.163.com.get_unread_emails` |

**Returns:**
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

You must call this before `mail.163.com.download_attachment`.

---

### `mail.163.com.download_attachment`

Downloads an attachment from the currently open email. You must call `mail.163.com.open_email` first.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `attachmentName` | string | ✅ | Exact filename (e.g. `发票.pdf`), or `"all"` to download all as a zip |

**Returns:**
```json
{ "status": "downloading", "attachmentName": "发票_202601.pdf", "message": "已触发下载附件" }
```

---

### `get_current_page_info`

Returns information about the current page state — useful for checking whether you're on the inbox, reading an email, or composing.

**Parameters:** none

**Returns:**
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

`pageType` is one of `"inbox"`, `"email_detail"`, or `"composing"`.

## Example usage

### Download all invoice attachments

```
请帮我把收件箱里所有包含"发票"的邮件的附件都下载下来
```

Claude will:
1. `mail.163.com.navigate_to_inbox()` — start from a clean state
2. `mail.163.com.search_emails({ keyword: "发票" })` — find matching emails
3. For each email with an attachment:
   - `mail.163.com.open_email({ emailId: "..." })`
   - `mail.163.com.download_attachment({ attachmentName: "all" })`
   - `mail.163.com.navigate_to_inbox()` — return before the next one

### Check unread emails

```
我有哪些未读邮件？
```

Claude will call `mail.163.com.get_unread_emails()` and summarize the results.

### Read a specific email

```
打开那封主题是"周会纪要"的邮件，告诉我内容
```

Claude will call `mail.163.com.search_emails({ keyword: "周会纪要" })`, then `mail.163.com.open_email()` with the matching ID, and summarize the body.

## Notes

- **Verified on:** 163 Mail, February 2026. The site's DOM structure may change — check `verified_on` in `meta.json` for the last confirmed working date.
- The adapter runs in Chrome's isolated world and cannot access 163 Mail's internal JavaScript state.
- All operations happen locally in your browser. No data is sent to any external server.
