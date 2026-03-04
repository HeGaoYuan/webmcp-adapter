/**
 * JD.com Adapter Script
 *
 * NOTE: Runs in isolated world — can only access DOM, not page JS variables.
 *
 * Verified: JD.com, March 2026
 * Maintainer: webmcp-adapter project
 */

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Wait for a selector to appear in the DOM.
 * @param {string} selector
 * @param {number} timeout milliseconds
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
 * Sleep for a number of milliseconds.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── DOM Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse order list from the order page.
 *
 * JD.com order DOM structure:
 * - Parent order (split): tbody#parent-{orderId}
 * - Child order: tbody#tb-{orderId} with class="split-tbody"
 * - Independent order: tbody#tb-{orderId} without split-tbody class
 *
 * Order information:
 * - Order ID: in .number span
 * - Order time: in .dealtime
 * - Products: .goods-item with product name, image, quantity
 * - Status: .order-status
 * - Amount: .spmMoney
 * - Consignee: .consignee .txt
 */
function parseOrderList() {
  const orders = [];

  // Find all order tbody elements
  const orderBodies = document.querySelectorAll('tbody[id^="tb-"]');

  for (const tbody of orderBodies) {
    try {
      const orderId = tbody.id.replace('tb-', '');

      // Skip if this is a parent order placeholder (only contains split info)
      if (tbody.id.startsWith('parent-')) continue;

      // Check if this is a split order (child of a parent order)
      const isSplitOrder = tbody.classList.contains('split-tbody');
      const parentOrderId = isSplitOrder ? tbody.getAttribute('data-parentid') : null;

      // Extract order time
      const dealTimeEl = tbody.querySelector('.dealtime');
      const orderTime = dealTimeEl?.getAttribute('title') || dealTimeEl?.textContent?.trim() || '';

      // Extract order number
      const orderNumberEl = tbody.querySelector('.number a');
      const orderNumber = orderNumberEl?.textContent?.trim() || orderId;

      // Extract products
      const products = [];
      const productItems = tbody.querySelectorAll('.goods-item');
      for (const item of productItems) {
        const nameEl = item.querySelector('.p-name a');
        const name = nameEl?.getAttribute('title') || nameEl?.textContent?.trim() || '';
        let link = nameEl?.getAttribute('href') || '';
        // 处理相对URL（//item.jd.com/... -> https://item.jd.com/...）
        if (link.startsWith('//')) {
          link = 'https:' + link;
        }

        const imgEl = item.querySelector('.p-img img');
        let image = imgEl?.getAttribute('src') || '';
        // 处理相对URL
        if (image.startsWith('//')) {
          image = 'https:' + image;
        }

        const quantityEl = item.closest('td')?.querySelector('.goods-number');
        const quantity = quantityEl?.textContent?.trim() || 'x1';

        if (name) {
          products.push({ name, link, image, quantity });
        }
      }

      // Extract consignee
      const consigneeEl = tbody.querySelector('.consignee .txt');
      const consignee = consigneeEl?.textContent?.trim() || '';

      // Extract amount
      const amountEl = tbody.querySelector('.spmMoney');
      const amount = amountEl?.textContent?.trim() || '';

      // Extract payment method
      const paymentEl = tbody.querySelector('.amount .ftx-13');
      const paymentMethod = paymentEl?.textContent?.trim() || '';

      // Extract order status
      const statusEl = tbody.querySelector('.order-status');
      const status = statusEl?.textContent?.trim() || '';

      // Determine order state category
      let statusCategory = 'unknown';
      if (status.includes('已完成')) {
        statusCategory = 'completed';
      } else if (status.includes('已取消')) {
        statusCategory = 'cancelled';
      } else if (status.includes('等待付款')) {
        statusCategory = 'pending_payment';
      } else if (status.includes('出库') || status.includes('配送') || status.includes('等待收货')) {
        statusCategory = 'shipping';
      }

      // Extract tracking info if available
      const trackingEl = tbody.querySelector('.tooltip[_orderid]');
      const hasTracking = !!trackingEl;

      orders.push({
        orderId: orderNumber,
        orderTime,
        products,
        consignee,
        amount,
        paymentMethod,
        status,
        statusCategory,
        hasTracking,
        isSplitOrder,
        parentOrderId,
      });
    } catch (error) {
      console.error(`Failed to parse order ${tbody.id}:`, error);
    }
  }

  // Also parse parent orders (split orders)
  const parentBodies = document.querySelectorAll('tbody[id^="parent-"]');
  for (const tbody of parentBodies) {
    try {
      const parentOrderId = tbody.id.replace('parent-', '');

      // Extract parent order info
      const orderNumberEl = tbody.querySelector('.number a');
      const orderNumber = orderNumberEl?.textContent?.trim() || parentOrderId;

      const dealTimeEl = tbody.querySelector('.dealtime');
      const orderTime = dealTimeEl?.getAttribute('title') || dealTimeEl?.textContent?.trim() || '';

      const amountEl = tbody.querySelector('.order-count em');
      const amount = amountEl?.textContent?.trim() || '';

      const statusEl = tbody.querySelector('.order-status');
      const status = statusEl?.textContent?.trim() || '已拆分';

      // Find all child orders
      const childOrders = orders.filter(o => o.parentOrderId === parentOrderId);

      orders.push({
        orderId: orderNumber,
        orderTime,
        amount,
        status,
        statusCategory: 'split',
        isParentOrder: true,
        childOrderIds: childOrders.map(o => o.orderId),
        childCount: childOrders.length,
      });
    } catch (error) {
      console.error(`Failed to parse parent order ${tbody.id}:`, error);
    }
  }

  return orders;
}

// ─── Tool Handler Functions ──────────────────────────────────────────────────

/**
 * Navigate to the JD.com homepage.
 *
 * 测试示例：await navigateToHomepage()
 */
async function navigateToHomepage() {
  try {
    const currentUrl = window.location.href;

    // 立即返回响应，告诉调用者正在导航
    // 使用 setTimeout 确保响应先发送，然后再导航
    setTimeout(() => {
      window.location.href = 'https://www.jd.com/';
    }, 100);

    return {
      status: 'navigating',
      message: 'Navigating to JD.com homepage. Please wait 3-5 seconds for the page to load.',
      previousUrl: currentUrl,
      targetUrl: 'https://www.jd.com/',
      note: 'The page will navigate to the JD.com homepage. Wait for the page to load.',
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Navigation failed: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * View shopping cart.
 *
 * 鲁棒性策略：
 * 1. 使用 .jdmcc-topbar 作为导航栏的唯一标识
 * 2. 通过 href 或 aria-label 定位购物车链接
 * 3. 等待购物车页面加载完成
 *
 * 测试示例：await viewCart()
 */
async function viewCart() {
  try {
    // 确保在主页
    if (!window.location.href.includes('jd.com')) {
      return {
        error: 'Not on JD.com',
        message: 'Please navigate to JD.com homepage first',
      };
    }

    // 等待导航栏加载
    await waitForElement('.jdmcc-topbar', 5000);

    // 查找购物车链接 - 使用多种策略确保鲁棒性
    let cartLink = null;

    // 策略1: 通过 href 属性查找
    cartLink = document.querySelector('.jdmcc-topbar a[href*="cart.jd.com/cart.action"]');

    // 策略2: 通过 aria-label 查找
    if (!cartLink) {
      const links = document.querySelectorAll('.jdmcc-topbar a[aria-label]');
      for (const link of links) {
        const label = link.getAttribute('aria-label');
        if (label && label.includes('购物车')) {
          cartLink = link;
          break;
        }
      }
    }

    // 策略3: 通过文本内容查找
    if (!cartLink) {
      const links = document.querySelectorAll('.jdmcc-topbar a');
      for (const link of links) {
        if (link.textContent.includes('购物车')) {
          cartLink = link;
          break;
        }
      }
    }

    if (!cartLink) {
      return {
        error: 'Cart link not found',
        message: 'Could not find shopping cart link in navigation bar',
      };
    }

    const cartUrl = cartLink.href;
    const currentUrl = window.location.href;

    // 立即返回响应，告诉调用者正在导航
    // 使用 setTimeout 确保响应先发送，然后再导航
    setTimeout(() => {
      window.location.href = cartUrl;
    }, 100);

    return {
      status: 'navigating',
      message: 'Navigating to shopping cart. Please wait 3-5 seconds for the page to load.',
      cartUrl: cartUrl,
      previousUrl: currentUrl,
      note: 'The page will navigate to the shopping cart. Wait for the page to load.',
    };
  } catch (error) {
    return {
      error: 'Failed to view cart',
      message: error.message,
    };
  }
}

/**
 * View my orders.
 *
 * 鲁棒性策略：
 * 1. 使用 .jdmcc-topbar 作为导航栏的唯一标识
 * 2. 通过 href 或 aria-label 定位订单链接
 * 3. 等待订单页面加载完成
 * 4. 解析订单列表，包括父订单和子订单
 *
 * 测试示例：await viewOrders()
 */
async function viewOrders() {
  try {
    // 如果已经在订单页面，直接解析
    if (window.location.href.includes('order.jd.com/center/list.action')) {
      // 等待订单列表加载
      await sleep(1000);
      const orders = parseOrderList();

      return {
        status: 'success',
        message: 'Order list parsed successfully',
        currentUrl: window.location.href,
        totalOrders: orders.length,
        orders: orders,
      };
    }

    // 确保在京东域名
    if (!window.location.href.includes('jd.com')) {
      return {
        error: 'Not on JD.com',
        message: 'Please navigate to JD.com homepage first',
      };
    }

    // 等待导航栏加载
    await waitForElement('.jdmcc-topbar', 5000);

    // 查找订单链接 - 使用多种策略确保鲁棒性
    let orderLink = null;

    // 策略1: 通过 href 属性查找
    orderLink = document.querySelector('.jdmcc-topbar a[href*="order.jd.com/center/list.action"]');

    // 策略2: 通过 aria-label 查找
    if (!orderLink) {
      const links = document.querySelectorAll('.jdmcc-topbar a[aria-label]');
      for (const link of links) {
        const label = link.getAttribute('aria-label');
        if (label && label === '我的订单') {
          orderLink = link;
          break;
        }
      }
    }

    // 策略3: 通过文本内容查找
    if (!orderLink) {
      const links = document.querySelectorAll('.jdmcc-topbar a');
      for (const link of links) {
        if (link.textContent.trim() === '我的订单') {
          orderLink = link;
          break;
        }
      }
    }

    if (!orderLink) {
      return {
        error: 'Order link not found',
        message: 'Could not find order link in navigation bar',
      };
    }

    const orderUrl = orderLink.href;

    // 立即返回响应，告诉调用者正在导航
    // 使用 setTimeout 确保响应先发送，然后再导航
    setTimeout(() => {
      window.location.href = orderUrl;
    }, 100);

    return {
      status: 'navigating',
      message: 'Navigating to orders page. Please call this tool again in 3-5 seconds to get the order list.',
      orderUrl: orderUrl,
      note: 'The page will navigate to the orders page. Wait for the page to load, then call view_orders again.',
    };
  } catch (error) {
    return {
      error: 'Failed to view orders',
      message: error.message,
    };
  }
}

/**
 * Open a product page.
 *
 * @param {object} args - { url: string }
 * 测试示例：await openProduct({ url: 'https://item.jd.com/100054010576.html' })
 */
async function openProduct(args) {
  try {
    const { url } = args;

    if (!url) {
      return {
        error: 'Missing required parameter',
        message: 'url parameter is required',
      };
    }

    // 验证URL是否为京东商品页
    if (!url.includes('item.jd.com')) {
      return {
        error: 'Invalid URL',
        message: 'URL must be a JD.com product page (item.jd.com)',
      };
    }

    const currentUrl = window.location.href;

    // 立即返回响应，告诉调用者正在导航
    // 使用 setTimeout 确保响应先发送，然后再导航
    setTimeout(() => {
      window.location.href = url;
    }, 100);

    return {
      status: 'navigating',
      message: 'Navigating to product page. Must wait 7-8 seconds for the page to load.',
      productUrl: url,
      previousUrl: currentUrl,
      note: 'The page will navigate to the product page. Wait for at least 7 seconds the page to load before calling buy_now.',
    };
  } catch (error) {
    return {
      error: 'Failed to open product',
      message: error.message,
    };
  }
}

/**
 * Buy the product immediately (must be on a product page).
 *
 * 注意：使用 setTimeout 延迟点击，确保响应先发送后再执行点击操作，
 * 避免点击后页面进入 BFCache 导致消息通道断开。
 *
 * 测试示例：await buyNow()
 */
async function buyNow() {
  try {
    // 确保在商品页面
    if (!window.location.href.includes('item.jd.com')) {
      return {
        error: 'Not on product page',
        message: 'Please open a product page first using www.jd.com.open_product',
      };
    }

    // 等待按钮加载
    await sleep(1000);

    // 查找"立即购买"按钮
    const buyButton = Array.from(document.querySelectorAll('#bottom-btns .first-row div'))
      .find(el => el.textContent.trim() === '立即购买');

    if (!buyButton) {
      return {
        error: 'Buy button not found',
        message: 'Could not find "立即购买" button on the page',
      };
    }

    // 先返回响应，再异步执行点击 + 等待 iframe + 导航到结算页
    // 原因：若在返回响应前执行 window.location.href 跳转，当前页面会进入
    // BFCache，导致 content script 消息通道断开，响应无法送达。
    setTimeout(async () => {
      buyButton.click();

      // 等待结算 iframe 加载完成
      await sleep(3000);

      // 导航到 iframe URL，使结算页成为主文档，
      // 触发 service worker 的 injectAdapters 注入 settlement adapter，
      // 从而注册 pay_now 工具。
      const iframe = document.querySelector('iframe[src*="pc-settlement-lite-pro.pf.jd.com"]');
      if (iframe?.src) {
        window.location.href = iframe.src;
      }
    }, 100);

    return {
      status: 'success',
      message: 'Buy now button will be clicked. Please wait 5-6 seconds for the settlement page to load, then call pay_now.',
      note: 'Wait 5-6 seconds for checkout to load, then call pay_now',
    };
  } catch (error) {
    return {
      error: 'Failed to buy now',
      message: error.message,
    };
  }
}

/**
 * Pay for the order (must be on the checkout confirmation page).
 *
 * @param {object} args - { paymentMethod: string }
 * 测试示例：await payNow({ paymentMethod: '京东支付' })
 */
async function payNow(args) {
  try {
    const { paymentMethod } = args;

    if (!paymentMethod) {
      return {
        error: 'Missing required parameter',
        message: 'paymentMethod parameter is required (e.g., "京东支付", "京东白条", "微信支付", "云闪付", "APP支付")',
      };
    }

    // 检测是否在 iframe 中
    const isInIframe = window.location.hostname.includes('pc-settlement-lite-pro.pf.jd.com');

    // 如果在主页面，检查 iframe 是否存在
    if (!isInIframe) {
      const iframe = document.querySelector('iframe[src*="pc-settlement-lite-pro.pf.jd.com"]');

      if (!iframe) {
        return {
          error: 'Checkout iframe not found',
          message: 'Please click "立即购买" first to open the checkout page',
        };
      }

      // iframe 存在但由于跨域无法操作
      // 等待一段时间让 iframe 中的 adapter 注册完成
      await sleep(2000);

      return {
        error: 'Cross-origin limitation',
        message: 'The checkout page is in a cross-origin iframe. The adapter should be automatically injected into the iframe. Please try calling this tool again in a few seconds.',
        iframe_detected: true,
        iframe_src: iframe.src,
      };
    }

    // 以下代码在 iframe 内部执行
    await sleep(1500);

    // 支付方式映射
    const paymentMethodMap = {
      '京东支付': ['京东支付', 'jdpay'],
      '京东白条': ['京东白条', 'baitiao'],
      '微信支付': ['微信支付', 'wechat'],
      '云闪付': ['云闪付', 'unionpay'],
      'APP支付': ['APP支付', 'app'],
    };

    // 查找匹配的支付方式
    let foundPaymentMethod = null;
    for (const [key, keywords] of Object.entries(paymentMethodMap)) {
      if (keywords.some(keyword => paymentMethod.includes(keyword) || key.includes(paymentMethod))) {
        foundPaymentMethod = key;
        break;
      }
    }

    if (!foundPaymentMethod) {
      return {
        error: 'Invalid payment method',
        message: `Payment method "${paymentMethod}" not recognized. Available options: 京东支付, 京东白条, 微信支付, 云闪付, APP支付`,
      };
    }

    // 查找支付方式对应的checkbox
    let paymentCheckbox = null;

    // 策略1: 通过titleText查找
    const titleElements = document.querySelectorAll('.titleText-afc128');
    for (const titleEl of titleElements) {
      if (titleEl.textContent.includes(foundPaymentMethod)) {
        // 找到对应的checkbox
        const container = titleEl.closest('.modePaymentLi-7dd46f, .jdPayment-13e444');
        if (container) {
          paymentCheckbox = container.querySelector('.el-checkbox__original');
          break;
        }
      }
    }

    if (!paymentCheckbox) {
      return {
        error: 'Payment method not found',
        message: `Could not find payment method "${foundPaymentMethod}" on the page`,
      };
    }

    // 点击选择支付方式
    if (!paymentCheckbox.checked) {
      paymentCheckbox.click();
      await sleep(500);
    }

    // 查找"立即支付"按钮
    const payButton = Array.from(document.querySelectorAll('.submit-338d03'))
      .find(el => el.textContent.trim() === '立即支付');

    if (!payButton) {
      return {
        error: 'Pay button not found',
        message: 'Could not find "立即支付" button on the page',
      };
    }

    // 点击立即支付按钮
    payButton.click();

    // 等待支付页面加载
    await sleep(2000);

    return {
      status: 'success',
      message: `Selected payment method "${foundPaymentMethod}" and clicked pay button`,
      paymentMethod: foundPaymentMethod,
      note: 'Payment page should appear (QR code or password input)',
    };
  } catch (error) {
    return {
      error: 'Failed to pay',
      message: error.message,
    };
  }
}

// ─── Adapter Registration ────────────────────────────────────────────────────
// No ES module export — background injects this file via executeScript
// and window.__webmcpRegister is exposed by content/injector.js

// 检测当前是否在结算页面的 iframe 中
const isSettlementIframe = window.location.hostname.includes('pc-settlement-lite-pro.pf.jd.com');

if (isSettlementIframe) {
  // 在结算页面 iframe 中，只注册支付相关的工具
  window.__webmcpRegister({
    name: 'jd-settlement-adapter',
    match: ['pc-settlement-lite-pro.pf.jd.com'],
    tools: [
      {
        name: 'www.jd.com.pay_now',
        description:
          'Select payment method and click "立即支付" (Pay Now) button on the checkout confirmation page.',
        parameters: {
          type: 'object',
          properties: {
            paymentMethod: {
              type: 'string',
              description: 'Payment method to use. Options: "京东支付", "京东白条", "微信支付", "云闪付", "APP支付"',
              enum: ['京东支付', '京东白条', '微信支付', '云闪付', 'APP支付'],
            },
          },
          required: ['paymentMethod'],
        },
        handler: (args) => payNow(args),
      },
    ],
  });
} else {
  // 在主页面，注册所有其他工具
  window.__webmcpRegister({
    name: 'jd-adapter',
    match: ['jd.com'],
    tools: [
      {
        name: 'www.jd.com.navigate_to_homepage',
        description:
          'Navigate to the JD.com homepage. Use this before multi-step operations to ensure a clean starting state.',
        parameters: { type: 'object', properties: {}, required: [] },
        handler: () => navigateToHomepage(),
      },

      {
        name: 'www.jd.com.view_cart',
        description:
          'View shopping cart. Navigates to the cart page from the homepage navigation bar. Returns cart URL and page status. Cart items parsing will be implemented after HTML structure is provided.',
        parameters: { type: 'object', properties: {}, required: [] },
        handler: () => viewCart(),
      },

      {
        name: 'www.jd.com.view_orders',
        description:
          'View my orders. Navigates to the orders page and returns parsed order list including order ID, products, status, amount, and consignee. Supports both split orders (parent/child) and independent orders.',
        parameters: { type: 'object', properties: {}, required: [] },
        handler: () => viewOrders(),
      },

      {
        name: 'www.jd.com.open_product',
        description:
          'Open a product page by URL. Use this before buying a product.',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Product page URL (e.g., https://item.jd.com/100054010576.html)',
            },
          },
          required: ['url'],
        },
        handler: (args) => openProduct(args),
      },

      {
        name: 'www.jd.com.buy_now',
        description:
          'Click the "立即购买" (Buy Now) button on the current product page. Must be on a product page (item.jd.com). Must wait at least 7 seconds after Open Product. Use www.jd.com.open_product first to navigate to a product page. After clicking, a checkout iframe will appear.',
        parameters: { type: 'object', properties: {}, required: [] },
        handler: () => buyNow(),
      },

      {
        name: 'www.jd.com.pay_now',
        description:
          'Select payment method and click "立即支付" (Pay Now) button. NOTE: Due to iframe cross-origin restrictions, this tool works best when the checkout page is fully loaded. Wait 2-3 seconds after buy_now before calling this.',
        parameters: {
          type: 'object',
          properties: {
            paymentMethod: {
              type: 'string',
              description: 'Payment method to use. Options: "京东支付", "京东白条", "微信支付", "云闪付", "APP支付"',
              enum: ['京东支付', '京东白条', '微信支付', '云闪付', 'APP支付'],
            },
          },
          required: ['paymentMethod'],
        },
        handler: (args) => payNow(args),
      },
    ],
  });
}
