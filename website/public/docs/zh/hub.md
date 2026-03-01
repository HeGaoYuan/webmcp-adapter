# Hub

Hub 是 WebMCP Adapter 的中央仓库，用于存储和分发适配器（Adapter）。

## Hub 的作用

Hub 是整个 WebMCP 生态系统的核心组件，提供以下功能：

1. **适配器发现** — 让扩展和网站能够自动发现可用的适配器
2. **适配器分发** — 提供 `webmcp` CLI 下载和安装适配器
3. **集中管理** — 统一管理所有社区贡献的适配器

## Hub 的使用场景

Hub 会被以下组件使用：

| 组件 | 用途 | 访问方式 |
|-------|------|----------|
| **CLI** | 下载和安装适配器 | 通过 `WEBMCP_HUB` 环境变量配置 |
| **Chrome 扩展** | 检测当前网站是否有可用适配器 | 通过 Popup 配置，存储在 `chrome.storage.local` |
| **Website** | 展示适配器列表和详情 | 从本地 `/hub` 路径读取 |

## Hub 的目录结构

```
hub/
├── registry.json          # 中央注册表，列出所有可用适配器
└── adapters/             # 适配器代码目录
    ├── mail.163.com/   # 每个适配器一个文件夹
    │   ├── index.js
    │   ├── meta.json
    │   ├── README.md
    │   └── README.zh.md
    └── mail.google.com/
        ├── index.js
        ├── meta.json
        ├── README.md
        └── README.zh.md
```

### registry.json

```json
{
  "version": 1,
  "updated_at": "2026-02-24T08:15:35Z",
  "adapters": [
    {
      "id": "mail.163.com",
      "name": "163 Mail",
      "description": "NetEase 163 Mail: read emails, search, open messages, download attachments",
      "author": "webmcp-team",
      "match": ["mail.163.com"],
      "version": "2026-02-22T00:00:00Z",
      "verified_on": "2026-02-22",
      "homepage": "https://github.com/HeGaoYuan/webmcp-adapter/tree/main/hub/adapters/mail.163.com"
    }
  ]
}
```

字段说明：
- `id` — 适配器唯一标识符，通常为主域名
- `match` — 匹配的域名列表，支持子域名
- `version` — 最后发布时间（ISO 8601 格式）
- `verified_on` — 最后在真实网站上验证可用的日期

## 配置自定义 Hub

### CLI 配置

设置 `WEBMCP_HUB` 环境变量指向你的 Hub 地址：

```bash
# 官方 Hub（默认）
# export WEBMCP_HUB="https://webmcphub.dev"

# GitHub 仓库
export WEBMCP_HUB="https://github.com/HeGaoYuan/webmcp-adapter"

# 企业私有部署
export WEBMCP_HUB="https://hub.company.com"

# 内部 GitLab
export WEBMCP_HUB="https://gitlab.company.com/user/repo"
```

配置后，CLI 会自动从该 Hub 获取：
- `registry.json` — 适配器注册表
- `adapters/{id}/index.js` — 适配器代码

### Chrome 扩展配置

通过扩展 Popup 配置自定义 Hub：

1. 点击扩展图标打开 Popup
2. 点击右上角的 ⚙️ 设置按钮
3. 输入 Hub 地址（支持以下格式）
4. 点击「保存配置」

**支持的 Hub 地址格式**：
- `https://webmcphub.dev` — 官方 Hub
- `https://github.com/HeGaoYuan/webmcp-adapter` — GitHub 仓库
- `https://hub.company.com` — 企业私有部署
- `https://gitlab.company.com/user/repo` — 内部 GitLab

配置后，扩展会：
- 自动从 `${HUB_URL}/hub/registry.json` 获取适配器列表
- 根据当前网站 URL 检测是否有可用适配器
- 提示用户安装未安装的适配器

## 安全注意事项

⚠️ **自定义 Hub 存在安全风险**

使用自定义 Hub 时请注意：

1. **只信任可信来源** — 确认 Hub 由你或组织维护
2. **验证适配器代码** — 确认适配器代码不包含恶意逻辑
3. **定期审查** — 定期检查 Hub 上新增的适配器

恶意 Hub 可能：
- 注入有害代码到浏览器
- 窃取用户敏感信息
- 执行未授权操作

## 相关文档

- [适配器系统](/docs/adapter-system) — 了解适配器的工作原理
- [编写适配器](/docs/writing-an-adapter) — 如何创建新适配器
- [CLI 参考](/docs/cli-reference) — CLI 命令完整文档
