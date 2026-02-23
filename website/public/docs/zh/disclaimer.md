# 免责声明

使用 WebMCP Adapter 前请阅读以下内容。

## 软件性质

WebMCP Adapter 是一个**实验性开源工具**，按现状提供，不附带任何形式的保证。它仍在积极开发中，可能包含漏洞、安全缺陷或意外行为。

## 软件的功能

WebMCP Adapter 向你在 Chrome 中访问的网页注入 JavaScript，并使 AI 客户端（如 Claude Desktop）能够代表你读取这些页面的内容并与之交互。AI 发起的操作在你的浏览器中以你的登录会话、使用你的账号权限执行。

## 风险与局限

### 意外操作

AI 模型可能误解指令，在你打开的网站上执行意外操作——删除内容、发送消息或修改数据。**你有责任监督所有 AI 发起的操作。**

### 凭据暴露（社区 adapter）

社区贡献的 adapter 在合并前会经过审核，但**不对任何 adapter 的安全性作出保证**。有缺陷或恶意的 adapter 原则上可以读取页面内容，包括 DOM 中显示的密码、认证 token 或个人信息。在敏感网站上使用前，请仔细审查 adapter 的代码。

### 网站兼容性

网站会频繁更改其 DOM 结构。某个 adapter 在特定日期可用，但随时可能失效。每个 adapter 元数据中的 `verified_on` 字段表示最后确认可用的日期，但不保证当前有效性。

### 无官方关联

WebMCP Adapter 是一个独立开源项目。它**与 Anthropic、Google、网易或 adapter 涉及的任何其他公司均无关联、未获认可、不受其支持**。

## 数据与隐私

- 所有通信在 `localhost` 上进行。**核心 WebMCP 基础设施不向任何远程服务器发送用户数据。**
- 各 adapter 受其自身代码约束。使用前请审阅 adapter 的 `index.js`。
- WebMCP Adapter 不收集遥测、分析或使用数据。

## 责任限制

WebMCP Adapter 的作者和贡献者不对因使用本软件而产生的任何直接、间接、附带或后果性损害承担责任，包括但不限于数据丢失、账号封禁、隐私泄露或财务损失。

## 合规使用

你同意仅在你拥有或有明确权限自动化操作的账号和网站上使用 WebMCP Adapter。违反网站服务条款使用本工具所产生的一切后果由你自行承担。

## 开源许可

WebMCP Adapter 基于 [MIT 许可证](https://github.com/HeGaoYuan/webmcp-adapter/blob/main/LICENSE) 授权。你可以在该许可证条款下自由使用、修改和分发本软件。
