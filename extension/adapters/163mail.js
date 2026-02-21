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

// ─── Tool Handler 函数 ────────────────────────────────────────────────────

/**
 * 解析当前邮件列表，返回结构化数据
 *
 * 基于实际 DOM 结构（2026年2月验证）：
 * - 行容器：div[sign="letter"]
 * - 邮件ID：行容器的 id 属性
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
    const id = row.id || "";
    const sender = row.querySelector('div[sign="start-from"] .nui-user')?.textContent?.trim() ?? "";
    const subject = row.querySelector("span.da0")?.textContent?.trim() ?? "";
    const dateEl = row.querySelector("div.eO0");
    const date = dateEl?.getAttribute("title") ?? dateEl?.textContent?.trim() ?? "";
    const isUnread = !!row.querySelector("b.nui-ico-unread");
    const hasAttachment = !!row.querySelector("div.nui-ico-att");
    const summary = row.querySelector(".fQ0 .il0")?.textContent?.trim() ?? "";

    if (subject && id) {
      emails.push({ id, sender, subject, date, isUnread, hasAttachment, summary });
    }
  }

  return emails;
}

/**
 * 搜索邮件
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Object>} 搜索结果
 * 
 * 测试条件：在163邮箱页面
 * 测试示例：await searchEmails('发票')
 */
async function searchEmails(keyword) {
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
}

/**
 * 获取未读邮件列表
 * @param {number} limit - 最多返回的邮件数量，默认20
 * @returns {Promise<Object>} 未读邮件列表
 * 
 * 测试条件：在163邮箱页面
 * 测试示例：await getUnreadEmails(10)
 */
async function getUnreadEmails(limit = 20) {
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
    const id = row.id || "";
    const sender = row.querySelector('div[sign="start-from"] .nui-user')?.textContent?.trim() ?? "";
    const subject = row.querySelector("span.da0")?.textContent?.trim() ?? "";
    const dateEl = row.querySelector("div.eO0");
    const date = dateEl?.getAttribute("title") ?? dateEl?.textContent?.trim() ?? "";
    if (subject && id) unread.push({ id, sender, subject, date });
    if (unread.length >= limit) break;
  }

  return { count: unread.length, emails: unread };
}

/**
 * 打开指定邮件
 * @param {string} emailId - 邮件的唯一ID
 * @returns {Promise<Object>} 邮件详情
 * 
 * 测试条件：在163邮箱页面，邮件列表中有该邮件
 * 测试示例：await openEmail('1771635701103_741xtbC5RBFmml9PfBxwQAA3D_6fd294bhq81771635724863Dom')
 */
async function openEmail(emailId) {
  try {
    // 查找邮件元素
    const mailElement = document.getElementById(emailId);
    
    if (!mailElement) {
      return { 
        error: "Email not found", 
        emailId,
        message: "指定的邮件ID不存在，可能邮件已被删除或ID不正确"
      };
    }

    // 点击邮件
    mailElement.click();

    // 等待邮件详情加载
    await sleep(2000);

    // 解析邮件详情
    const detail = parseEmailDetail();

    if (detail.error) {
      return {
        status: "clicked",
        emailId,
        warning: detail.error,
        message: "邮件已点击，但无法解析详情内容"
      };
    }

    return {
      status: "opened",
      emailId,
      detail,
    };
  } catch (error) {
    return {
      error: "Failed to open email",
      emailId,
      message: error.message,
    };
  }
}

/**
 * 下载当前打开邮件的附件
 * @param {string} attachmentName - 附件名称（如'发票.pdf'）或'all'表示打包下载所有附件
 * @returns {Promise<Object>} 下载结果
 * 
 * 测试条件：必须先打开一封有附件的邮件
 * 测试示例：
 *   await downloadAttachment('滴滴出行行程报销单.pdf')  // 下载单个附件
 *   await downloadAttachment('all')  // 打包下载所有附件
 */
async function downloadAttachment(attachmentName) {
  try {
    const readModule = document.querySelector('[id*="read.ReadModule"]');
    
    if (!readModule) {
      return {
        error: "No email opened",
        message: "未找到打开的邮件，请先打开一封邮件"
      };
    }

    // 如果是下载所有附件
    if (attachmentName === "all") {
      const downloadAllLink = readModule.querySelector('a[title*="下载全部"]');
      
      if (!downloadAllLink) {
        return {
          error: "Download all button not found",
          message: "未找到打包下载按钮，可能该邮件没有附件"
        };
      }

      // 点击打包下载
      downloadAllLink.click();

      return {
        status: "downloading",
        attachmentName: "all",
        message: "已触发打包下载所有附件"
      };
    }

    // 下载单个附件
    const attItems = readModule.querySelectorAll('ul.qs0 > li.lh0');
    
    for (const item of attItems) {
      const nameEl = item.querySelector('strong.dh0');
      const name = nameEl?.textContent?.trim() ?? "";
      
      if (name === attachmentName) {
        // 查找该附件的下载链接
        const downloadLink = Array.from(item.querySelectorAll('a')).find(
          link => link.textContent?.trim() === '下载' && link.href
        );
        
        if (!downloadLink) {
          return {
            error: "Download link not found",
            attachmentName,
            message: "找到了附件但未找到下载链接"
          };
        }

        // 点击下载
        downloadLink.click();

        return {
          status: "downloading",
          attachmentName,
          message: `已触发下载附件: ${attachmentName}`
        };
      }
    }

    // 未找到指定的附件
    const availableAttachments = Array.from(attItems).map(item => 
      item.querySelector('strong.dh0')?.textContent?.trim()
    ).filter(Boolean);

    return {
      error: "Attachment not found",
      attachmentName,
      availableAttachments,
      message: `未找到名为"${attachmentName}"的附件`
    };

  } catch (error) {
    return {
      error: "Failed to download attachment",
      attachmentName,
      message: error.message,
    };
  }
}

/**
 * 解析打开后的邮件详情
 *
 * 基于实际 DOM 结构（2026年2月验证）：
 * - 邮件详情容器：[id*="read.ReadModule"]
 * - 主题：h1[id*="h1Subject"]
 * - 发件人/收件人/时间：通过正则从文本中提取
 * - 正文：在 iframe[id*="frameBody"] 内的 #content 元素中
 * - 附件：ul.qs0 > li.lh0，文件名在 strong.dh0 中
 */
function parseEmailDetail() {
  try {
    // 查找邮件详情模块
    const readModule = document.querySelector('[id*="read.ReadModule"]');
    if (!readModule) {
      return { error: "邮件详情模块未找到" };
    }

    // 解析主题
    const subjectEl = readModule.querySelector('h1[id*="h1Subject"]');
    const subject = subjectEl?.textContent?.trim() ?? "";

    // 从文本中提取发件人、收件人、时间
    const fullText = readModule.textContent;
    
    const fromMatch = fullText.match(/发件人[：:]\s*([^收]+?)(?=收件人|$)/s);
    let from = fromMatch?.[1]?.trim().replace(/\s+/g, ' ') ?? "";
    // 清理发件人中的广告文本
    from = from.replace(/\s*\+\(.*?\).*$/, '').trim();
    
    const toMatch = fullText.match(/收件人[：:]\s*([^时]+?)(?=时\s*间|$)/s);
    let to = toMatch?.[1]?.trim().replace(/\s+/g, ' ') ?? "";
    // 清理收件人中的多余符号
    to = to.replace(/\s*\+\s*$/, '').trim();
    
    const dateMatch = fullText.match(/时\s*间[：:]\s*([^\n附]+?)(?=附\s*件|$)/s);
    const date = dateMatch?.[1]?.trim() ?? "";

    // 解析正文（从iframe中获取）
    let body = "";
    try {
      const iframe = document.querySelector('iframe[id*="frameBody"]');
      if (iframe) {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const contentEl = iframeDoc.getElementById('content');
        body = contentEl?.textContent?.trim() ?? "";
      }
    } catch (e) {
      body = `[无法读取邮件正文: ${e.message}]`;
    }

    // 解析附件列表
    const attachments = [];
    const attList = readModule.querySelectorAll('ul.qs0 > li.lh0');
    for (const attItem of attList) {
      const nameEl = attItem.querySelector('strong.dh0');
      const sizeEl = attItem.querySelector('td.gx0');
      
      if (nameEl) {
        const name = nameEl.textContent?.trim() ?? "";
        const fullText = sizeEl?.textContent?.trim() ?? "";
        // 从 "文件名.pdf123.45K" 中提取大小
        const sizeMatch = fullText.match(/(\d+\.?\d*[KMG]B?)$/i);
        const size = sizeMatch?.[1] ?? "";
        
        if (name) {
          attachments.push({ name, size });
        }
      }
    }

    return {
      subject,
      from,
      to,
      date,
      body: body.substring(0, 5000), // 限制正文长度，避免过长
      attachments,
      hasAttachment: attachments.length > 0,
    };
  } catch (error) {
    return { error: `解析邮件详情失败: ${error.message}` };
  }
}

// ─── 适配器注册 ────────────────────────────────────────────────────────────
// 不使用 ES module export，由 background 通过 executeScript 注入后调用 __webmcpRegister

window.__webmcpRegister({
  name: "163-mail-adapter",
  match: ["mail.163.com"],
  tools: [
    {
      name: "navigate_to_inbox",
      description: "返回163邮箱收件箱首页。当需要执行多步骤操作（如批量下载附件）或当前页面状态不明确时，使用此工具返回初始状态。",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      handler: async () => {
        try {
          // 记录当前URL
          const currentUrl = window.location.href;
          
          // 导航到收件箱首页
          window.location.href = "https://mail.163.com/js6/main.jsp";
          
          // 等待页面开始加载
          await sleep(1000);
          
          // 等待页面加载完成
          let waitTime = 0;
          const maxWait = 5000;
          while (document.readyState !== 'complete' && waitTime < maxWait) {
            await sleep(100);
            waitTime += 100;
          }
          
          // 额外等待一点时间确保邮件列表加载
          await sleep(1500);
          
          return {
            status: "success",
            message: "已返回收件箱首页",
            previousUrl: currentUrl,
            currentUrl: window.location.href,
            pageLoaded: document.readyState === 'complete'
          };
        } catch (error) {
          return {
            status: "error",
            message: `导航失败: ${error.message}`,
            error: error.message
          };
        }
      },
    },

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
      handler: async ({ keyword }) => searchEmails(keyword),
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
      handler: async ({ limit = 20 }) => getUnreadEmails(limit),
    },

    {
      name: "open_email",
      description: "打开163邮箱中的指定邮件，查看完整内容。邮件ID可以从search_emails或get_unread_emails的返回结果中获取",
      parameters: {
        type: "object",
        properties: {
          emailId: {
            type: "string",
            description: "邮件的唯一ID，例如：1771635701103_741xtbC5RBFmml9PfBxwQAA3D_6fd294bhq81771635724863Dom",
          },
        },
        required: ["emailId"],
      },
      handler: async ({ emailId }) => openEmail(emailId),
    },

    {
      name: "download_attachment",
      description: "下载163邮箱中当前打开邮件的附件。使用前需要先调用open_email打开邮件。",
      parameters: {
        type: "object",
        properties: {
          attachmentName: {
            type: "string",
            description: "要下载的附件名称（例如：'发票.pdf'），或使用'all'打包下载所有附件",
          },
        },
        required: ["attachmentName"],
      },
      handler: async ({ attachmentName }) => downloadAttachment(attachmentName),
    },

    {
      name: "get_current_page_info",
      description: "获取当前163邮箱页面的状态信息，用于判断当前在哪个页面（收件箱、邮件详情等）",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      handler: async () => {
        try {
          const url = window.location.href;
          const title = document.title;
          
          // 判断页面类型
          const isInbox = url.includes('main.jsp') || url.includes('inbox');
          const isEmailDetail = !!document.querySelector('[id*="read.ReadModule"]');
          const isComposing = !!document.querySelector('.compose-container, [class*="compose"]');
          
          // 获取邮件列表信息
          let emailListInfo = null;
          if (!isEmailDetail && !isComposing) {
            const emailRows = document.querySelectorAll('div[sign="letter"]');
            emailListInfo = {
              totalEmails: emailRows.length,
              hasEmails: emailRows.length > 0
            };
          }
          
          // 获取邮件详情信息
          let emailDetailInfo = null;
          if (isEmailDetail) {
            const subjectEl = document.querySelector('h1[id*="h1Subject"]');
            const subject = subjectEl?.textContent?.trim() ?? "";
            const attachments = document.querySelectorAll('ul.qs0 > li.lh0');
            
            emailDetailInfo = {
              subject,
              hasAttachments: attachments.length > 0,
              attachmentCount: attachments.length
            };
          }
          
          return {
            url,
            title,
            pageType: isEmailDetail ? 'email_detail' : (isComposing ? 'composing' : 'inbox'),
            isInbox,
            isEmailDetail,
            isComposing,
            emailListInfo,
            emailDetailInfo,
            readyState: document.readyState
          };
        } catch (error) {
          return {
            error: "Failed to get page info",
            message: error.message
          };
        }
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
