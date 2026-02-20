/**
 * 163邮箱适配脚本
 *
 * 注意：运行在 isolated world，只能操作 DOM，不能访问页面 JS 变量
 *
 * 验证版本：163邮箱 2026年2月
 * 维护者：webmcp-adapter 项目
 */

// ─── 工具函数 ──────────────────────────────────────────────────────────────

/**
 * 等待某个选择器出现在 DOM 中
 * @param {string} selector
 * @param {number} timeout 毫秒
 */
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

/**
 * 等待一段时间
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 设置 input 的值并触发框架需要的事件
 * 注意：163邮箱使用自有框架（非 React），直接赋值即可
 */
function setInputValue(input, value) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * 解析当前邮件列表，返回结构化数据
 *
 * 基于实际 DOM 结构（2026年2月验证）：
 * - 行容器：div[sign="letter"]
 * - 发件人：div[sign="start-from"] .nui-user
 * - 主题：span.da0
 * - 日期：div.eO0（title 属性含完整日期）
 * - 未读标记：b.nui-ico-unread
 * - 附件标记：div.nui-ico-att
 * - 摘要：.fQ0 .il0
 */
function parseEmailList() {
  const emails = [];

  const rows = document.querySelectorAll('div[sign="letter"]');

  for (const row of rows) {
    const sender = row.querySelector('div[sign="start-from"] .nui-user')?.textContent?.trim() ?? "";
    const subject = row.querySelector("span.da0")?.textContent?.trim() ?? "";
    const dateEl = row.querySelector("div.eO0");
    const date = dateEl?.getAttribute("title") ?? dateEl?.textContent?.trim() ?? "";
    const isUnread = !!row.querySelector("b.nui-ico-unread");
    const hasAttachment = !!row.querySelector("div.nui-ico-att");
    const summary = row.querySelector(".fQ0 .il0")?.textContent?.trim() ?? "";

    if (subject) {
      emails.push({ sender, subject, date, isUnread, hasAttachment, summary });
    }
  }

  return emails;
}

// ─── 适配器注册 ────────────────────────────────────────────────────────────
// 不使用 ES module export，由 background 通过 executeScript 注入后调用 __webmcpRegister

window.__webmcpRegister({
  name: "163-mail-adapter",
  match: ["mail.163.com"],
  tools: [
    {
      name: "search_emails",
      description: "在163邮箱中搜索邮件，支持按关键词搜索",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "搜索关键词，例如「发票」「合同」「会议」",
          },
        },
        required: ["keyword"],
      },
      handler: async ({ keyword }) => {
        // 找到搜索输入框（用 aria-label 比 ID 更稳定）
        const searchInput = await waitForElement(
          'input[aria-label*="搜索"], input.nui-ipt-input'
        );

        // 清空并输入关键词
        searchInput.focus();
        setInputValue(searchInput, keyword);

        // 触发搜索（keyup Enter）
        searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
        searchInput.dispatchEvent(new KeyboardEvent("keyup",  { key: "Enter", keyCode: 13, bubbles: true }));

        // 等待搜索结果加载
        await sleep(2000);

        const emails = parseEmailList();
        return {
          keyword,
          count: emails.length,
          emails,
        };
      },
    },

    {
      name: "get_unread_emails",
      description: "获取163邮箱收件箱中的未读邮件列表",
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
        // 点击收件箱
        const inboxLink = document.querySelector('[title="收件箱"], [sign="inbox"]');
        if (inboxLink) {
          inboxLink.click();
          await sleep(1500);
        }

        const rows = document.querySelectorAll('div[sign="letter"]');
        const unread = [];
        for (const row of rows) {
          if (!row.querySelector("b.nui-ico-unread")) continue;
          const sender = row.querySelector('div[sign="start-from"] .nui-user')?.textContent?.trim() ?? "";
          const subject = row.querySelector("span.da0")?.textContent?.trim() ?? "";
          const dateEl = row.querySelector("div.eO0");
          const date = dateEl?.getAttribute("title") ?? dateEl?.textContent?.trim() ?? "";
          if (subject) unread.push({ sender, subject, date });
          if (unread.length >= limit) break;
        }

        return { count: unread.length, emails: unread };
      },
    },

    /*
    {
      name: "compose_email",
      description: "在163邮箱中打开写信界面，填入收件人、主题和正文",
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
            description: "邮件正文内容",
          },
        },
        required: ["to"],
      },
      handler: async ({ to, subject = "", body = "" }) => {
        // 点击写信按钮
        const composeBtn = await waitForElement(
          '.compose-btn, button[class*="compose"], a[class*="write"], [title="写信"]'
        );
        composeBtn.click();
        await sleep(1500);

        // 填写收件人
        const toInput = await waitForElement('input[placeholder*="收件人"], .to-input input');
        setInputValue(toInput, to);
        toInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
        await sleep(300);

        // 填写主题
        if (subject) {
          const subjectInput = document.querySelector('input[placeholder*="主题"], .subject-input input');
          if (subjectInput) setInputValue(subjectInput, subject);
        }

        // 填写正文
        if (body) {
          const bodyArea = document.querySelector(
            '.compose-body [contenteditable], textarea[class*="body"], .editor-content'
          );
          if (bodyArea) {
            bodyArea.focus();
            bodyArea.textContent = body;
            bodyArea.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }

        return {
          status: "compose_opened",
          to,
          subject,
          message: "写信界面已打开并填写完毕，请用户确认后手动发送",
        };
      },
    },
    */
  ],
});
