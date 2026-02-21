#!/bin/bash

echo "=== 重启 WebMCP Adapter ==="
echo ""

echo "1. 停止 native host 进程..."
pkill -f 'node.*webmcp-adapter/native-host/index.js'
sleep 1

REMAINING=$(ps aux | grep "node.*webmcp-adapter/native-host/index.js" | grep -v grep)
if [ -n "$REMAINING" ]; then
    echo "   ✗ 仍有进程残留，强制终止..."
    pkill -9 -f 'node.*webmcp-adapter/native-host/index.js'
    sleep 1
else
    echo "   ✓ 进程已停止"
fi

echo ""
echo "2. 检查端口 3711..."
if lsof -i :3711 > /dev/null 2>&1; then
    echo "   ✗ 端口仍被占用，等待释放..."
    sleep 2
else
    echo "   ✓ 端口可用"
fi

echo ""
echo "3. 重新加载 Chrome 扩展..."
echo "   请手动操作："
echo "   - 打开 chrome://extensions"
echo "   - 找到 WebMCP Adapter"
echo "   - 点击 '重新加载' 按钮"
echo ""
read -p "   完成后按回车继续..."

echo ""
echo "4. 重启 Claude Desktop..."
echo "   请手动操作："
echo "   - 完全退出 Claude Desktop (Command+Q)"
echo "   - 重新启动 Claude Desktop"
echo ""
read -p "   完成后按回车继续..."

echo ""
echo "5. 打开支持的网站..."
echo "   在 Chrome 中打开以下任一网站："
echo "   - Gmail: https://mail.google.com"
echo "   - 163邮箱: https://mail.163.com"
echo ""
read -p "   完成后按回车继续..."

echo ""
echo "6. 验证连接..."
sleep 3

if ps aux | grep "node.*webmcp-adapter/native-host/index.js" | grep -v grep > /dev/null; then
    echo "   ✓ Native host 正在运行"
else
    echo "   ✗ Native host 未运行"
    echo "   Claude Desktop 应该会自动启动它"
fi

echo ""
echo "7. 查看最新日志..."
echo ""
tail -20 ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log

echo ""
echo "=== 重启完成 ==="
echo ""
echo "现在在 Claude Desktop 中测试："
echo "  - 输入: '请列出可用的工具'"
echo "  - 或者: '搜索我的邮件'"
echo ""
echo "如果仍有问题，运行: tail -f ~/Library/Logs/Claude/mcp-server-webmcp-adapter.log"
