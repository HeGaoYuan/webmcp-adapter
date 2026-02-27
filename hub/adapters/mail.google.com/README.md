# Gmail Adapter

Adapter for [Gmail](https://mail.google.com) (Google Mail).

Lets AI clients like Claude read, search, and manage your Gmail inbox directly — no manual copy-pasting required.

## Tools

### `mail.google.com.navigate_to_inbox`

Navigates to the Gmail inbox and waits for it to fully load.

**Use this tool** before starting any multi-step operation (e.g. batch downloading attachments) to ensure the page is in a known state.

**Parameters:** none

**Returns:**
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

### `mail.google.com.search_emails`

Searches your inbox by keyword and returns a list of matching email threads.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `keyword` | string | ✅ | Search term, e.g. `invoice`, `meeting`, `receipt` |

**Returns:**
```json
{
  "keyword": "invoice",
  "count": 3,
  "emails": [
    {
      "id": "18f3a2b1c4d5e6f7",
      "sender": "billing@company.com",
      "subject": "Invoice for January 2026",
      "date": "Jan 15, 2026, 10:23 AM",
      "isUnread": false,
      "hasAttachment": true,
      "snippet": "Please find your invoice attached..."
    }
  ]
}
```

Use the returned `id` values with `mail.google.com.open_email`.

---

### `mail.google.com.get_unread_emails`

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
      "id": "18f3a2b1c4d5e6f7",
      "sender": "boss@company.com",
      "subject": "Weekly meeting notes",
      "date": "Feb 20, 2026, 9:00 AM"
    }
  ]
}
```

---

### `mail.google.com.open_email`

Opens a specific email thread and returns its full content including body and attachment list.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `emailId` | string | ✅ | Thread ID from `mail.google.com.search_emails` or `mail.google.com.get_unread_emails` |

**Returns:**
```json
{
  "status": "opened",
  "emailId": "18f3a2b1c4d5e6f7",
  "detail": {
    "subject": "Invoice for January 2026",
    "from": "billing@company.com",
    "to": "me@gmail.com",
    "date": "January 15, 2026 at 10:23 AM",
    "body": "Hi, please find your invoice attached...",
    "attachments": [
      { "name": "invoice_202601.pdf", "size": "245 KB" }
    ],
    "hasAttachment": true
  },
  "loadTime": "1000ms"
}
```

You must call this before `mail.google.com.download_attachment`.

---

### `mail.google.com.download_attachment`

Downloads an attachment from the currently open email. You must call `mail.google.com.open_email` first.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `attachmentName` | string | ✅ | Exact filename (e.g. `invoice.pdf`), or `"all"` to download all as a zip |

**Returns:**
```json
{ "status": "downloading", "attachmentName": "invoice_202601.pdf", "message": "Triggered download of: invoice_202601.pdf" }
```

---

### `get_current_page_info`

Returns information about the current page state — useful for checking whether you're in the inbox, reading an email, or composing.

**Parameters:** none

**Returns:**
```json
{
  "url": "https://mail.google.com/mail/u/0/#inbox",
  "title": "Inbox - me@gmail.com - Gmail",
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
Download all attachments from emails with "invoice" in the subject
```

Claude will:
1. `navigate_to_inbox()` — start from a clean state
2. `search_emails({ keyword: "invoice" })` — find matching emails
3. For each email with an attachment:
   - `open_email({ emailId: "..." })`
   - `download_attachment({ attachmentName: "all" })`
   - `navigate_to_inbox()` — return before the next one

### Check unread emails

```
What unread emails do I have?
```

Claude will call `get_unread_emails()` and summarize the results.

### Read a specific email

```
Open the email with subject "Weekly meeting notes" and tell me what it says
```

Claude will call `search_emails({ keyword: "Weekly meeting notes" })`, then `open_email()` with the matching ID, and summarize the body.

## Notes

- **Verified on:** Gmail, February 2026. Gmail's DOM structure may change — check `verified_on` in `meta.json` for the last confirmed working date.
- The adapter runs in Chrome's isolated world and cannot access Gmail's internal JavaScript state.
- All operations happen locally in your browser. No data is sent to any external server.
- Multi-account Gmail is supported: the adapter preserves the account index (`/mail/u/0/`, `/mail/u/1/`, etc.) when navigating.
