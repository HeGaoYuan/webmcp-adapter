# JD.com Adapter

This adapter provides tools to interact with JD.com (京东), China's largest online retailer.

## Features

- Navigate to JD.com homepage
- View shopping cart
- View my orders

## Tools

### `www.jd.com.navigate_to_homepage`

Navigate to the JD.com homepage. Use this before multi-step operations to ensure a clean starting state.

**Parameters:** None

**Returns:**
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

View shopping cart. Navigates to the cart page from the homepage navigation bar.

**Parameters:** None

**Returns:**
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

**Robustness Strategy:**
- Uses `.jdmcc-topbar` as unique navigation bar identifier
- Multiple strategies to locate cart link: `href` attribute, `aria-label`, or text content
- Waits for page to fully load

### `www.jd.com.view_orders`

View my orders. Navigates to the order list page from the homepage navigation bar.

**Parameters:** None

**Returns:**
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

**Robustness Strategy:**
- Uses `.jdmcc-topbar` as unique navigation bar identifier
- Multiple strategies to locate order link: `href` attribute, `aria-label`, or text content
- Waits for page to fully load

## Usage Example

```javascript
// Navigate to homepage
const result1 = await callTool('www.jd.com.navigate_to_homepage', {});

// View shopping cart
const result2 = await callTool('www.jd.com.view_cart', {});

// View orders
const result3 = await callTool('www.jd.com.view_orders', {});
```

## Verified On

- Date: 2026-03-04
- JD.com version: Current production

## Notes

- This adapter runs in an isolated world and can only access the DOM
- Cart and order items parsing to be implemented (HTML structure needed)
- Multiple strategies ensure robust navigation
