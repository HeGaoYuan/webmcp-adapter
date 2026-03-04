# 京东 Adapter

此 adapter 提供与京东（JD.com）交互的工具，京东是中国最大的在线零售商。

## 功能

- 导航到京东主页
- 查看购物车
- 查看我的订单

## 工具

### `www.jd.com.navigate_to_homepage`

导航到京东主页。在多步骤操作之前使用此工具以确保干净的起始状态。

**参数：** 无

**返回值：**
```json
{
  "status": "success",
  "message": "Navigated to JD.com homepage",
  "previousUrl": "https://...",
  "currentUrl": "https://www.jd.com/",
  "pageLoaded": true
}
```

### `www.jd.com.view_cart`

查看购物车。从主页导航栏跳转到购物车页面。

**参数：** 无

**返回值：**
```json
{
  "status": "success",
  "message": "Navigated to shopping cart",
  "previousUrl": "https://www.jd.com/",
  "currentUrl": "https://cart.jd.com/cart.action",
  "cartUrl": "https://cart.jd.com/cart.action",
  "pageLoaded": true,
  "note": "Cart items parsing not yet implemented - waiting for HTML structure"
}
```

**鲁棒性策略：**
- 使用 `.jdmcc-topbar` 作为导航栏的唯一标识
- 通过 `href` 属性、`aria-label` 或文本内容多重策略定位购物车链接
- 等待页面完全加载

### `www.jd.com.view_orders`

查看我的订单。从主页导航栏跳转到订单列表页面。

**参数：** 无

**返回值：**
```json
{
  "status": "success",
  "message": "Navigated to my orders",
  "previousUrl": "https://www.jd.com/",
  "currentUrl": "https://order.jd.com/center/list.action",
  "orderUrl": "https://order.jd.com/center/list.action",
  "pageLoaded": true,
  "note": "Order items parsing not yet implemented - waiting for HTML structure"
}
```

**鲁棒性策略：**
- 使用 `.jdmcc-topbar` 作为导航栏的唯一标识
- 通过 `href` 属性、`aria-label` 或文本内容多重策略定位订单链接
- 等待页面完全加载

## 使用示例

```javascript
// 导航到主页
const result1 = await callTool('www.jd.com.navigate_to_homepage', {});

// 查看购物车
const result2 = await callTool('www.jd.com.view_cart', {});

// 查看订单
const result3 = await callTool('www.jd.com.view_orders', {});
```

## 验证日期

- 日期：2026-03-04
- 京东版本：当前生产版本

## 注意事项

- 此 adapter 运行在隔离环境中，只能访问 DOM
- 购物车和订单的商品列表解析功能待实现（需要提供 HTML 结构）
- 使用多重策略确保导航的鲁棒性
