/**
 * Gmail 适配脚本
 *
 * 注意：运行在 isolated world，只能操作 DOM，不能访问页面 JS 变量
 *
 * 验证版本：Gmail 2025年 UI
 * 维护者：webmcp-adapter 项目
 */

// ─── 工具函数 ──────────────────────────────────────────────────────────────

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setInputValue(input, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * 解析 Gmail 邮件列表行
 */
function parseGmailEmailList() {
  const emails = [];
  // Gmail 邮件行：aria-label 包含信息，或通过 td 结构解析
  const rows = document.querySelectorAll("tr.zA");

  for (const row of rows) {
    const isUnread = row.classList.contains("zE");
    const senderEl = row.querySelector(".yW span, .zF");
    const subjectEl = row.querySelector(".y6 span:first-child, .bog");
    const dateEl = row.querySelector(".xW span, .xY span");
    const snippetEl = row.querySelector(".y2");

    const sender = senderEl?.getAttribute("email") ?? senderEl?.textContent?.trim() ?? "";
    const subject = subjectEl?.textContent?.trim() ?? "";
    const date = dateEl?.getAttribute("title") ?? dateEl?.textContent?.trim() ?? "";
    const snippet = snippetEl?.textContent?.trim() ?? "";

    if (subject) {
      emails.push({ sender, subject, date, snippet, isUnread });
    }
  }

  return emails;
}

// ─── 适配器定义 ────────────────────────────────────────────────────────────

export default {
  name: "gmail-adapter",
  match: ["mail.google.com"],
  tools: [
    {
      name: "search_emails",
      description: "在Gmail中搜索邮件，支持Gmail搜索语法（如 from:, subject:, has:attachment 等）",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: '搜索词或Gmail搜索语法，例如 "发票"、"from:boss@company.com"、"subject:合同 has:attachment"',
          },
        },
        required: ["query"],
      },
      handler: async ({ query }) => {
        // Gmail 搜索框
        const searchInput = await waitForElement('input[name="q"], input[aria-label*="Search"]');

        searchInput.focus();
        setInputValue(searchInput, query);

        // 按 Enter 触发搜索
        searchInput.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true })
        );
        searchInput.form?.submit?.();

        await sleep(2500);

        const emails = parseGmailEmailList();
        return {
          query,
          count: emails.length,
          emails,
        };
      },
    },

    {
      name: "get_unread_emails",
      description: "获取Gmail收件箱中的未读邮件列表",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "最多返回的邮件数量，默认20",
          },
        },
        required: [],
      },
      handler: async ({ limit = 20 }) => {
        // 导航到收件箱
        const inboxLink = document.querySelector('a[href*="#inbox"], .aim[data-section="inbox"]');
        if (inboxLink) {
          inboxLink.click();
          await sleep(1500);
        }

        const allEmails = parseGmailEmailList();
        const unread = allEmails.filter(e => e.isUnread).slice(0, limit);

        return { count: unread.length, emails: unread };
      },
    },

    {
      name: "compose_email",
      description: "在Gmail中打开写信界面，填入收件人、主题和正文（不会自动发送，需用户确认）",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "收件人邮箱地址",
          },
          subject: {
            type: "string",
            description: "邮件主题",
          },
          body: {
            type: "string",
            description: "邮件正文",
          },
        },
        required: ["to"],
      },
      handler: async ({ to, subject = "", body = "" }) => {
        // 点击 Compose 按钮
        const composeBtn = await waitForElement(
          '.T-I.T-I-KE, div[data-tooltip*="Compose"], div[gh="cm"]'
        );
        composeBtn.click();
        await sleep(1000);

        // 收件人
        const toInput = await waitForElement('input[name="to"], textarea[name="to"]');
        setInputValue(toInput, to);
        toInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", keyCode: 9, bubbles: true }));
        await sleep(300);

        // 主题
        if (subject) {
          const subjectInput = document.querySelector('input[name="subjectbox"]');
          if (subjectInput) setInputValue(subjectInput, subject);
        }

        // 正文（Gmail 用 contenteditable div）
        if (body) {
          const bodyEl = document.querySelector(
            'div[aria-label*="Message Body"], div[g_editable="true"], div[contenteditable="true"].Am'
          );
          if (bodyEl) {
            bodyEl.focus();
            // 使用 execCommand 兼容 Gmail 的富文本编辑器
            document.execCommand("insertText", false, body);
          }
        }

        return {
          status: "compose_opened",
          to,
          subject,
          message: "写信界面已打开并填写完毕，请用户确认后手动点击发送",
        };
      },
    },

    {
      name: "open_email",
      description: "打开当前邮件列表中第N封邮件（从1开始计数）",
      parameters: {
        type: "object",
        properties: {
          index: {
            type: "number",
            description: "邮件序号，从1开始，例如1表示第一封邮件",
          },
        },
        required: ["index"],
      },
      handler: async ({ index }) => {
        const rows = document.querySelectorAll("tr.zA");
        const target = rows[index - 1];
        if (!target) {
          throw new Error(`没有找到第 ${index} 封邮件，当前列表共 ${rows.length} 封`);
        }

        target.click();
        await sleep(2000);

        // 读取邮件内容
        const subject = document.querySelector("h2.hP")?.textContent?.trim() ?? "";
        const body = document.querySelector(".a3s.aiL, .ii.gt")?.textContent?.trim() ?? "";
        const sender = document.querySelector(".gD")?.getAttribute("email") ?? "";
        const date = document.querySelector(".g3")?.textContent?.trim() ?? "";

        return { subject, sender, date, body };
      },
    },
  ],
};
