# 测试指南

## 准备工作

### 1. 重新加载扩展

```bash
# 在 Chrome 中
1. 打开 chrome://extensions/
2. 找到 "WebMCP Adapter"
3. 点击刷新图标 🔄
```

### 2. 配置 AI API

```bash
1. 右键点击扩展图标
2. 选择"选项"
3. 输入你的 Claude API Key (sk-ant-...)
4. 选择模型：Claude 3.5 Sonnet
5. 点击"保存设置"
```

### 3. 检查权限

打开 `chrome://extensions/`，确认 WebMCP Adapter 有以下权限：
- ✅ 读取和更改您在所有网站上的数据
- ✅ 读取您的浏览历史记录

如果没有 `automation` 权限，可能需要重新安装扩展。

## 测试流程

### 测试 1: 基础页面分析

**目标**: 验证 PageAnalyzer 能正确分析页面

**步骤**:
1. 访问 https://mail.163.com
2. 打开 Chrome DevTools (F12)
3. 在 Console 中运行：
```javascript
const analyzer = new PageAnalyzer(chrome.devtools.inspectedWindow.tabId);
const result = await analyzer.analyze();
console.log(result);
```

**预期结果**:
```json
{
  "success": true,
  "pageInfo": {
    "url": "https://mail.163.com",
    "title": "网易邮箱",
    "domain": "mail.163.com"
  },
  "interactiveElements": {
    "search": [...],
    "navigation": [...],
    "actions": [...],
    "lists": [...],
    "forms": [...],
    "inputs": [...]
  },
  "stats": {
    "totalRefs": 50,
    "activeRefs": 50,
    "timestamp": 1234567890
  }
}
```

### 测试 2: AI 工具生成

**目标**: 验证 ToolGenerator 能调用 AI 并生成工具

**步骤**:
1. 确保已配置 AI API Key
2. 在 Console 中运行：
```javascript
const config = await chrome.storage.local.get(['aiConfig']);
const generator = new ToolGenerator(config.aiConfig);
const tools = await generator.generateTools(result);
console.log(tools);
```

**预期结果**:
```json
[
  {
    "name": "search_emails",
    "description": "搜索邮件",
    "elements": ["e1", "e2"],
    "parameters": {...},
    "confidence": 0.95,
    "reasoning": "页面有明显的搜索框和搜索按钮"
  },
  ...
]
```

### 测试 3: 完整流程（推荐）

**目标**: 测试完整的用户体验

**步骤**:
1. 访问 https://mail.163.com（或任何没有适配器的网站）
2. 点击扩展图标
3. 应该看到"此网站暂无适配器"
4. 点击"🤖 智能生成适配器"按钮
5. 在新标签页中打开分析面板
6. 点击"🔍 开始分析"
7. 等待分析完成（约 5-10 秒）
8. 查看生成的工具列表
9. 观察元素高亮演示
10. 点击"✓ 批准"或"⏭️ 跳过"
11. 处理完所有工具后，点击"✓ 保存适配器"
12. 刷新 mail.163.com
13. 再次点击扩展图标，应该看到绿色徽章和工具列表

**预期结果**:
- ✅ 分析面板正常打开
- ✅ 页面信息正确显示
- ✅ 生成 2-3 个工具
- ✅ 元素高亮正常工作
- ✅ 用户确认按钮响应正常
- ✅ 适配器保存成功
- ✅ 刷新后工具列表显示

## 常见问题排查

### 问题 1: "Failed to get accessibility tree"

**原因**: chrome.automation API 权限不足

**解决方案**:
1. 检查 manifest.json 是否包含 `"automation"` 权限
2. 重新加载扩展
3. 如果还不行，尝试重新安装扩展

### 问题 2: "AI API key not configured"

**原因**: 未配置 AI API Key

**解决方案**:
1. 右键扩展图标 → "选项"
2. 输入 API Key
3. 点击"保存设置"

### 问题 3: "Failed to parse AI response"

**原因**: AI 返回的格式不正确

**解决方案**:
1. 检查 API Key 是否有效
2. 检查网络连接
3. 查看 Console 中的详细错误信息
4. 尝试切换到不同的模型

### 问题 4: 元素高亮不显示

**原因**: 元素位置信息缺失或页面结构变化

**解决方案**:
1. 刷新页面重新分析
2. 检查 Console 是否有错误
3. 确认页面已完全加载

### 问题 5: "Element not found"

**原因**: Ref 在页面导航后失效

**解决方案**:
1. 重新运行分析
2. 确保在同一个页面上操作
3. 避免在分析过程中刷新页面

## 调试技巧

### 1. 查看详细日志

打开 Chrome DevTools，查看 Console 中的日志：
- `[PageAnalyzer]`: 页面分析相关
- `[ToolGenerator]`: AI 工具生成相关
- `[ToolExecutor]`: 工具执行相关
- `[AnalysisPanel]`: UI 控制相关

### 2. 检查 chrome.storage

```javascript
// 查看保存的配置
chrome.storage.local.get(null, (data) => console.log(data));

// 查看 AI 配置
chrome.storage.local.get(['aiConfig'], (data) => console.log(data));

// 查看保存的适配器
chrome.storage.local.get((data) => {
  const adapters = Object.keys(data)
    .filter(key => key.startsWith('adapter_'))
    .map(key => data[key]);
  console.log(adapters);
});
```

### 3. 手动测试 chrome.automation

```javascript
// 在 background script 或 popup 中运行
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  chrome.automation.getTree(tabs[0].id, (tree) => {
    console.log(tree);
  });
});
```

### 4. 测试 AI API 连接

```javascript
// 在 Console 中运行
const config = {
  provider: 'claude',
  apiKey: 'sk-ant-...',
  model: 'claude-3-5-sonnet-20241022'
};

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: config.model,
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: 'Hello!'
    }]
  })
});

console.log(await response.json());
```

## 性能测试

### 测试不同网站

建议测试以下类型的网站：

1. **邮箱类**: mail.163.com, mail.google.com
2. **社交类**: twitter.com, facebook.com
3. **电商类**: taobao.com, amazon.com
4. **新闻类**: news.ycombinator.com, reddit.com
5. **工具类**: github.com, stackoverflow.com

### 性能指标

记录以下指标：
- 页面分析时间（应 < 2 秒）
- AI 工具生成时间（应 < 10 秒）
- 元素高亮响应时间（应 < 500ms）
- 总体流程时间（应 < 30 秒）

## 反馈

如果发现问题，请提供以下信息：
1. Chrome 版本
2. 扩展版本
3. 测试的网站 URL
4. 详细的错误信息（Console 截图）
5. 重现步骤

提交 Issue: https://github.com/HeGaoYuan/webmcp-adapter/issues
