# 快速开始 - WebMCP 智能适配器生成器

## 🚀 5 分钟快速体验

### 步骤 1: 重新加载扩展 (30 秒)

```bash
1. 打开 Chrome 浏览器
2. 访问 chrome://extensions/
3. 找到 "WebMCP Adapter"
4. 点击刷新图标 🔄
```

### 步骤 2: 配置 AI API (2 分钟)

```bash
1. 右键点击扩展图标
2. 选择"选项"
3. 选择 AI 提供商：Claude (推荐)
4. Base URL: 留空（使用官方 API）或填写代理地址
5. 输入你的 API Key: sk-ant-...
6. 选择模型：Claude Sonnet 4.6 (推荐)
7. 点击"保存设置"
```

**获取 API Key**:
- Claude: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/

### 步骤 3: 生成第一个适配器 (2 分钟)

```bash
1. 访问 https://mail.163.com (或任何网站)
2. 点击扩展图标
3. 点击"🤖 智能生成适配器"按钮
4. 在新标签页中点击"🔍 开始分析"
5. 等待 5-10 秒，AI 会自动分析页面
6. 查看生成的工具（通常 2-3 个）
7. 观察元素高亮演示
8. 点击"✓ 批准"确认工具
9. 处理完所有工具后，点击"✓ 保存适配器"
10. 刷新页面，适配器即可生效！
```

### 步骤 4: 验证适配器 (30 秒)

```bash
1. 刷新 mail.163.com
2. 点击扩展图标
3. 应该看到：
   - 绿色徽章显示工具数量
   - 工具列表（如 search_emails, get_inbox_list）
4. 完成！🎉
```

## 📸 预期效果

### 分析前
```
扩展图标: 灰色
Popup: "此网站暂无适配器"
按钮: "🤖 智能生成适配器"
```

### 分析中
```
分析面板:
- 正在分析页面结构...
- 正在生成工具...
- 显示统计信息（交互元素数、工具数、置信度）
```

### 分析后
```
工具卡片:
┌─────────────────────────────────────┐
│ search_emails              95%      │
│ 搜索邮件                             │
│ 使用元素: e1 e2                      │
│ [✓ 批准] [⏭️ 跳过] [✗ 拒绝]         │
└─────────────────────────────────────┘
```

### 保存后
```
扩展图标: 绿色徽章 "3"
Popup: 显示 3 个工具
- search_emails
- get_inbox_list
- navigate_to_inbox
```

## 🎯 推荐测试网站

1. **邮箱类** (最佳效果)
   - https://mail.163.com
   - https://mail.google.com

2. **社交类**
   - https://twitter.com
   - https://www.reddit.com

3. **工具类**
   - https://github.com
   - https://stackoverflow.com

## ⚠️ 常见问题

### Q1: 点击"开始分析"后没有反应？

**检查**:
1. 打开 Chrome DevTools (F12)
2. 查看 Console 是否有错误
3. 确认已配置 AI API Key
4. 确认网络连接正常

### Q2: 提示 "Failed to get accessibility tree"？

**解决**:
1. 检查 manifest.json 是否包含 `"automation"` 权限
2. 重新加载扩展
3. 如果还不行，重新安装扩展

### Q3: AI 返回错误？

**检查**:
1. API Key 是否正确
2. API Key 是否有余额
3. 网络是否能访问 AI API
4. 尝试切换到不同的模型

### Q4: 元素高亮不显示？

**解决**:
1. 刷新页面重新分析
2. 确认页面已完全加载
3. 检查 Console 是否有错误

## 🔍 调试技巧

### 查看详细日志
```javascript
// 打开 Chrome DevTools (F12)
// 查看 Console 中的日志：
[PageAnalyzer] ...
[ToolGenerator] ...
[ToolExecutor] ...
[AnalysisPanel] ...
```

### 检查保存的配置
```javascript
// 在 Console 中运行：
chrome.storage.local.get(null, (data) => console.log(data));
```

### 手动测试 chrome.automation
```javascript
// 在 Console 中运行：
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  chrome.automation.getTree(tabs[0].id, (tree) => {
    console.log(tree);
  });
});
```

## 📚 更多文档

- **功能说明**: `extension/analyzer/README.md`
- **测试指南**: `extension/analyzer/TESTING.md`
- **实现总结**: `IMPLEMENTATION-SUMMARY.md`

## 🎉 成功标志

如果你看到以下内容，说明一切正常：

1. ✅ 扩展图标有绿色徽章
2. ✅ Popup 显示工具列表
3. ✅ 工具名称符合网站功能（如 search_emails）
4. ✅ Console 没有错误信息

恭喜！你已经成功生成了第一个智能适配器！🎊

## 💡 下一步

1. 在更多网站上测试
2. 尝试不同的 AI 模型
3. 提供反馈和建议
4. 贡献你的适配器

## 🐛 遇到问题？

1. 查看 `extension/analyzer/TESTING.md`
2. 检查 Console 错误信息
3. 提交 Issue: https://github.com/HeGaoYuan/webmcp-adapter/issues

---

**预计时间**: 5 分钟
**难度**: ⭐⭐☆☆☆ (简单)
**效果**: 🚀🚀🚀🚀🚀 (惊艳)
