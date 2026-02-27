# WebMCP 智能适配器生成器

## 功能概述

使用 AI 自动分析网页结构，生成专用的 WebMCP Adapter，无需手动编写代码。

## 实现的功能（Phase 1-3）

### Phase 1: 页面分析器
- ✅ 使用 `chrome.automation` API 获取可访问性树
- ✅ 识别交互元素（搜索框、按钮、链接、列表等）
- ✅ 分配 ref 编号（e1, e2, e3...）
- ✅ 按功能分类元素

### Phase 2: AI 工具生成器
- ✅ 调用 AI API（支持 Claude 和 OpenAI）
- ✅ 分析页面结构，识别常见操作模式
- ✅ 生成 2-3 个核心工具
- ✅ 计算置信度评分

### Phase 3: 自动演示和用户确认
- ✅ 高亮显示相关元素
- ✅ 模拟执行步骤
- ✅ 用户批准/拒绝/跳过机制
- ✅ 反馈收集（待实现重新生成）

## 使用方法

### 1. 配置 AI API

1. 右键点击扩展图标 → "选项"
2. 选择 AI 提供商（Claude 或 OpenAI）
3. 输入 API Key
4. 选择模型（推荐 Claude 3.5 Sonnet）
5. 点击"保存设置"

### 2. 生成适配器

1. 访问任意网站（如 mail.163.com）
2. 点击扩展图标
3. 如果没有适配器，会显示"智能生成适配器"按钮
4. 点击按钮，打开分析面板
5. 点击"开始分析"

### 3. 确认工具

1. AI 会自动分析页面并生成 2-3 个工具
2. 每个工具会自动演示（高亮相关元素）
3. 你可以选择：
   - ✓ 批准：保存这个工具
   - ⏭️ 跳过：不保存，继续下一个
   - ✗ 拒绝：提供反馈，AI 会改进（待实现）

### 4. 保存适配器

1. 确认完所有工具后，点击"保存适配器"
2. 刷新页面，适配器即可生效
3. 扩展图标会显示绿色徽章，表示适配器已激活

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Analysis Panel UI                       │
│                   (analysis-panel.html/js)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ Phase 1: 页面分析
                              │
                    ┌─────────▼─────────┐
                    │  PageAnalyzer     │
                    │  - chrome.automation API
                    │  - 构建可操作树
                    │  - RefManager
                    └─────────┬─────────┘
                              │
                              ├─ Phase 2: AI 工具生成
                              │
                    ┌─────────▼─────────┐
                    │  ToolGenerator    │
                    │  - 调用 AI API
                    │  - 识别操作模式
                    │  - 生成候选工具
                    └─────────┬─────────┘
                              │
                              ├─ Phase 3: 自动演示
                              │
                    ┌─────────▼─────────┐
                    │  ToolExecutor     │
                    │  - 高亮元素
                    │  - 模拟执行
                    │  - 用户确认
                    └───────────────────┘
```

## 核心文件

- `page-analyzer.js`: 页面分析器，使用 chrome.automation API
- `ref-manager.js`: Ref 管理器，类似 OpenClaw 的 ref 系统
- `tool-generator.js`: AI 工具生成器，调用 Claude/OpenAI API
- `tool-executor.js`: 工具执行器，演示和高亮
- `analysis-panel.html/js`: 分析面板 UI

## 与 OpenClaw 的对比

| 特性 | OpenClaw Browser | WebMCP Adapter Generator |
|------|------------------|--------------------------|
| 目标 | 通用浏览器自动化 | 生成网站专用适配器 |
| 技术 | Playwright + CDP | chrome.automation API |
| 使用方式 | AI 实时操作 | 一次性分析生成 |
| 输出 | 临时操作序列 | 可复用的 Adapter 代码 |
| 适用场景 | 任何网站，临时任务 | 常用网站，重复任务 |

## 待实现功能（Phase 4）

- [ ] 基于用户反馈重新生成工具（最多 3 次）
- [ ] 生成实际可执行的 Adapter 代码
- [ ] 支持更复杂的工具模式（表单填写、列表提取等）
- [ ] 支持 iframe 和 Shadow DOM
- [ ] 工具测试和验证
- [ ] 适配器版本管理

## 已知限制

1. 需要 `automation` 权限（用户安装时会看到权限提示）
2. 仅支持 Chrome/Edge（chrome.automation API 限制）
3. 需要配置 AI API Key（需要付费）
4. 目前只生成工具定义，还未生成实际可执行代码

## 调试

1. 打开 Chrome DevTools
2. 切换到 "Console" 标签
3. 查看 `[PageAnalyzer]`, `[ToolGenerator]`, `[ToolExecutor]` 前缀的日志

## 示例

访问 https://mail.163.com，生成的工具可能包括：

```json
[
  {
    "name": "search_emails",
    "description": "搜索邮件",
    "elements": ["e1", "e2"],
    "parameters": {
      "query": {
        "type": "string",
        "description": "搜索关键词",
        "required": true
      }
    },
    "confidence": 0.95
  },
  {
    "name": "get_inbox_list",
    "description": "获取收件箱邮件列表",
    "elements": ["e5"],
    "parameters": {},
    "confidence": 0.88
  }
]
```

## 贡献

欢迎提交 Issue 和 PR！
