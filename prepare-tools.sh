#!/bin/bash

echo "=== WebMCP Adapter 工具准备脚本 ==="
echo ""
echo "这个脚本会帮助你在启动 Claude Desktop 前准备好工具"
echo ""

# 检查Chrome是否运行
if ! pgrep -x "Google Chrome" > /dev/null; then
    echo "✗ Chrome 未运行"
    echo "  请先启动 Chrome"
    exit 1
fi
echo "✓ Chrome 正在运行"

# 检查扩展是否加载
echo ""
echo "请确认 Chrome 扩展已加载："
echo "  1. 打开 chrome://extensions"
echo "  2. 找到 WebMCP Adapter"
echo "  3. 确认已启用"
echo ""
read -p "扩展已加载？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "请先加载扩展"
    exit 1
fi

# 提示打开网站
echo ""
echo "请在 Chrome 中打开以下任一网站："
echo "  - Gmail: https://mail.google.com"
echo "  - 163邮箱: https://mail.163.com"
echo ""
echo "等待页面完全加载（约5-10秒）"
echo ""
read -p "网站已打开并加载完成？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "请先打开并加载网站"
    exit 1
fi

# 等待工具注册
echo ""
echo "等待工具注册..."
sleep 3

# 检查Service Worker日志
echo ""
echo "检查 Service Worker 状态："
echo "  1. 在 chrome://extensions 中找到 WebMCP Adapter"
echo "  2. 点击 'Service Worker' 查看日志"
echo "  3. 确认看到类似信息："
echo "     [WebMCP] Connected to native host"
echo "     [WebMCP] Tab XXXXX registered X tools"
echo ""
read -p "看到工具注册信息了吗？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "工具可能未注册。请检查："
    echo "  - 网站是否完全加载"
    echo "  - Service Worker 是否显示错误"
    echo "  - 是否打开了支持的网站（Gmail或163mail）"
    echo ""
    echo "如需帮助，查看日志："
    echo "  tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log"
    exit 1
fi

# 检查native host
echo ""
echo "检查 native host 状态..."
if ps aux | grep "node.*webmcp-adapter/native-host/index.js" | grep -v grep > /dev/null; then
    echo "✓ Native host 正在运行"
    
    # 检查日志
    echo ""
    echo "最新的 native host 日志："
    tail -10 ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log | grep -E "\[Bridge\]|\[MCP\]" | tail -5
else
    echo "✗ Native host 未运行"
    echo "  Claude Desktop 启动时会自动启动它"
fi

echo ""
echo "=== 准备完成 ==="
echo ""
echo "现在可以启动 Claude Desktop 了！"
echo ""
echo "在 Claude Desktop 中测试："
echo "  - 输入: '请列出可用的工具'"
echo "  - 或者: '搜索我的邮件'"
echo ""
echo "如果工具列表为空，请："
echo "  1. 等待 15 秒（MCP server 会等待工具注册）"
echo "  2. 刷新 Claude Desktop 对话"
echo "  3. 查看日志: tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log"
